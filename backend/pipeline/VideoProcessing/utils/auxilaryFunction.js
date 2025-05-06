const { getTopMessage, deleteTopMessageFromQueue, uploadMessageToQueue, getRedisClient } = require('./Queue');
const prismaClient = require('./PrismaClient');
const S3 = require('../libs/aws');
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { promisify } = require("util");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require("@ffmpeg-installer/ffmpeg");
const { pipeline } = require('stream');

const redis = getRedisClient();
const streamPipeline = promisify(pipeline);
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Main video processing function
async function processVideoJob() {
    let uniqueId = null;
    let videoUrl = null;
    let contentId = null;
    let userId = null;
    let tempDir = null;
    let message = null;
    let cancelTopMessageRemove = false;
    try {
        // Step 1: Fetch job from queue
        console.log("Fetching job from queue...");
        message = await getTopMessage("ffmpeg_queue");
        if (!message) {
            console.log("No messages in queue.");
            return { message: "No messages in queue" };
        }

        ({ videoUrl, uniqueId, contentId, userId } = message);
        console.log(`Job details - Unique ID: ${uniqueId}, Content ID: ${contentId}, User ID: ${userId}, Video URL: ${videoUrl}`);

        const retryCount = message.retryCount || 0;
        console.log("Processing video:", uniqueId);

        const MAX_RETRIES = 3;
        if (retryCount >= MAX_RETRIES) {
            console.log(`Job ${uniqueId} exceeded maximum retry count (${MAX_RETRIES})`);

            // Update DB to mark as permanently failed
            try {
                await prismaClient.Content.update({
                    where: { id: parseInt(contentId, 10) },
                    data: {
                        status: 'failed',
                    }
                });
            } catch (error) {
                console.error(`Failed to mark content ${contentId} as permanently failed:`, error);
            }
            cancelTopMessageRemove=true;
            return { message: `Job ${uniqueId} abandoned after ${MAX_RETRIES} attempts` };
        }

        const isProcessing = await redis.get(uniqueId);
        if (isProcessing) {
            console.log(`Job ${uniqueId} is already being processed.`);
            return;
        }

        console.log(`Setting lock for job ${uniqueId}...`);
        await redis.set(uniqueId, "processing", "EX", 900);

        const primaryBucket = process.env.AWS_S3_PRIMARYBUCKET_NAME;
        const secondaryBucket = process.env.AWS_S3_SECONDARYBUCKET_NAME;

        tempDir = path.join('/tmp', uniqueId);
        const inputPath = path.join(tempDir, 'input');
        const outputDir = path.join(tempDir, 'output');

        console.log(`Creating temporary directories for job ${uniqueId}...`);
        await fsExtra.ensureDir(tempDir);
        await fsExtra.ensureDir(outputDir);

        // Step 2: Download file from S3
        console.log(`Downloading video from S3: ${videoUrl}`);
        const downloadResult = await downloadFile(videoUrl, inputPath);
        if (!downloadResult) {
            console.log("Skipping job due to missing file.");
            return { message: "Skipped job due to missing file", uniqueId };
        }
        console.log("Video downloaded successfully:", inputPath);

        // Step 3: Process video with FFmpeg
        console.log("Starting video processing...");
        const processedFiles = await processVideo(inputPath, outputDir);
        console.log("Video processing completed successfully.");

        // Step 4: Upload HLS files to S3
        console.log("Uploading processed files to S3...");
        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
        const masterKey = `video/${uniqueId}/master.m3u8`;
        console.log(`Uploading master playlist: ${masterPlaylistPath} to ${masterKey}`);
        await uploadToS3(secondaryBucket, masterKey, masterPlaylistPath);

        const uploadPromise = processedFiles.map(async ({ resolution, outputPath }) => {
            console.log(`Uploading resolution ${resolution} playlist to S3...`);
            const playlistKey = `video/${uniqueId}/${resolution}/playlist.m3u8`;
            await uploadToS3(secondaryBucket, playlistKey, outputPath);
            await uploadHLSFiles(secondaryBucket, uniqueId, resolution, outputPath);
            return { resolution, url: `/video/${uniqueId}/${resolution}/playlist.m3u8` };
        });

        const bitRates = await Promise.all(uploadPromise);
        console.log("All files uploaded successfully:", bitRates);

        // Step 5: Update database
        console.log("Updating database with processed video details...");
        const masterManifestUrl = `/video/${uniqueId}/master.m3u8`;
        await prismaClient.$transaction(async (prisma) => {
            await Promise.all(
                bitRates.map(({ resolution, url }) => prisma.BiteRateVideo.create({
                    data: { resolution, url, contentId: parseInt(contentId, 10) },
                }))
            );

            await prisma.Content.update({
                where: { id: parseInt(contentId, 10) },
                data: { manifestUrl: masterManifestUrl, status: 'published' },
            });
        });
        console.log("Database updated successfully.");

        console.log("Releasing lock for job:", uniqueId);
        await redis.del(uniqueId);

        console.log("Triggering S3 cleanup function...");
        try {
            fetch(`${process.env.S3CLEANUP_FUNCTION_URL}/health`, {
                method: "GET", headers: { 'Content-Type': 'application/json' }
            }).then(() => console.log("Sent request to S3 Cleanup server"))
                .catch(err => console.error("Error sending request to video processing server:", err));
        } catch (error) {
            console.error("Failed to trigger S3 cleanup function:", error);
        }

        return { message: "Processing completed", uniqueId };
    } catch (error) {
        console.error("Processing error:", error);

        if (contentId) {
            try {
                await prismaClient.$transaction(async (prisma) => {
                    await prisma.Content.update({
                        where: { id: parseInt(contentId, 10) },
                        data: { status: 'uploading' },
                    });
                    console.log(`Content ${contentId} marked as uploading`);
                });
            } catch (dbError) {
                console.error("Error updating content status:", dbError);
            }
        }

        if (uniqueId && videoUrl && contentId && userId) {
            const retryCount = message && message.retryCount ? message.retryCount + 1 : 1;
            console.log(`Re-queueing job ${uniqueId} with updated retry count: ${retryCount}`);
            message.retryCount = retryCount; // Update the retry count in the message object
            await uploadMessageToQueue("ffmpeg_queue", message); // Re-upload the updated message
        }

    } finally {
        console.log("Performing cleanup...");
        try {
            if (uniqueId) {
                console.log(`Releasing lock for job ${uniqueId}...`);
                await redis.del(uniqueId);
            }

            if (tempDir) {
                console.log(`Removing temporary directory: ${tempDir}`);
                await fsExtra.remove(tempDir);
            }

            console.log("Deleting message from queue...");
            if(!cancelTopMessageRemove){
                await deleteTopMessageFromQueue("ffmpeg_queue");
            }
        } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError);
        }
    }
}

async function downloadFile(videoUrl, downloadPath) {
    try {
        const [bucket, ...keyParts] = videoUrl.split('/');
        if (!bucket || keyParts.length === 0) {
            throw new Error(`Invalid video URL format: ${videoUrl}`);
        }

        const key = keyParts.join('/');
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        console.log(`Sending GetObjectCommand to S3 for bucket: ${bucket}, key: ${key}`);
        const response = await S3.send(command);

        if (!response.Body) {
            console.error(`File not found in S3 for bucket: ${bucket}, key: ${key}`);
            throw new Error("File not found");
        }

        console.log(`File found in S3. Writing to path: ${downloadPath}`);
        const fileStream = fs.createWriteStream(downloadPath);
        await streamPipeline(response.Body, fileStream);
        console.log(`File successfully downloaded to: ${downloadPath}`);
        return true; 
    } catch (error) {
        console.error(`Error in downloadFile function: ${error.message}`);
        if (error.message === "File not found") {
            console.log("Removing job from queue due to missing file...");
            await deleteTopMessageFromQueue("ffmpeg_queue");
            return false;
        }
        throw new Error(`Download failed: ${error.message}`);
    }
}

async function uploadToS3(bucket, key, filePath) {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: fileStream });
    await S3.send(command);
    return `https://${bucket}.s3.amazonaws.com/${key}`;
}

async function uploadHLSFiles(bucket, uniqueId, resolution, outputPath) {
    const segmentFiles = fs.readdirSync(path.dirname(outputPath));
    await Promise.all(segmentFiles.filter(file => file != 'playlist.m3u8').map(segment => uploadToS3(bucket, `video/${uniqueId}/${resolution}/${segment}`, path.join(path.dirname(outputPath), segment)))
    );

    return {
        resolution,
        url: `/video/${uniqueId}/${resolution}/playlist.m3u8`
    }
}

function processVideo(inputPath, outputDir) {
    const resolutions = ['360p', '720p', '1080p'];
    const resolutionMap = {
        '360p': { size: '640x360', bitrate: '800k' },
        '720p': { size: '1280x720', bitrate: '2500k' },
        '1080p': { size: '1920x1080', bitrate: '5000k' }
    };
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

    const promises = resolutions.map(resolution => {
        const resolutionDir = path.join(outputDir, resolution);
        fs.mkdirSync(resolutionDir, { recursive: true });

        const config = resolutionMap[resolution];
        const playlistName = 'playlist.m3u8';
        const outputPath = path.join(resolutionDir, playlistName);
        const bandwidth = parseInt(config.bitrate.replace('k', '000'));
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${config.size}\n${resolution}/${playlistName}\n`;

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v h264', '-c:a aac', `-b:v ${config.bitrate}`, '-b:a 128k',
                    '-profile:v main', '-level 3.1', '-start_number 0', '-hls_time 10',
                    '-hls_list_size 0', '-hls_segment_type mpegts', '-hls_playlist_type vod',
                    '-f hls', `-s ${config.size}`, '-threads 0', '-preset fast'
                ])
                .output(outputPath)
                .on('end', async () => {
                    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);
                    resolve({ resolution, outputPath })
                })
                .on('error', (err) => {
                    console.error(`FFmpeg failed: ${err.message}`);
                    reject(new Error(`FFmpeg processing error: ${err.message}`));
                })
                .run();
        });
    });
    return Promise.all(promises);
}

module.exports = { processVideoJob };