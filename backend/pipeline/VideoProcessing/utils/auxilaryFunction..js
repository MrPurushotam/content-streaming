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
    try {
        // Step 1: Fetch job from queue
        message = await getTopMessage("ffmpeg_queue");
        if (!message) {
            console.log("No messages in queue.");
            return { message: "No messages in queue" };
        }

        ({ videoUrl, uniqueId, contentId, userId } = message);
        const retryCount = message.retryCount || 0;
        console.log("Processing video:", uniqueId);

        const MAX_RETRIES = 3;
        if (retryCount >= MAX_RETRIES) {
            console.log(`Job ${uniqueId} exceeded maximum retry count (${MAX_RETRIES})`);

            await deleteTopMessageFromQueue("ffmpeg_queue");

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
            return { message: `Job ${uniqueId} abandoned after ${MAX_RETRIES} attempts` };
        }

        await deleteTopMessageFromQueue("ffmpeg_queue");

        const isProcessing = await redis.get(uniqueId);
        if (isProcessing) {
            console.log(`Job ${uniqueId} is already being processed.`);
            return;
        }

        // Set a lock with expiration
        await redis.set(uniqueId, "processing", "EX", 900);

        const primaryBucket = process.env.AWS_S3_PRIMARYBUCKET_NAME;
        const secondaryBucket = process.env.AWS_S3_SECONDARYBUCKET_NAME;

        tempDir = path.join('/tmp', uniqueId);
        const inputPath = path.join(tempDir, 'input');
        const outputDir = path.join(tempDir, 'output');

        await fsExtra.ensureDir(tempDir);
        await fsExtra.ensureDir(outputDir);

        // Step 2: Download file from S3
        await downloadFile(videoUrl, inputPath);
        console.log("Video downloaded successfully:", inputPath);

        // Step 3: Process video with FFmpeg
        console.log("Video processing started");
        const processedFiles = await processVideo(inputPath, outputDir);
        console.log("Video processing completed");

        // Step 4: Upload HLS files to S3
        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
        const masterKey = `video/${uniqueId}/master.m3u8`;
        console.log(masterPlaylistPath, masterKey)
        await uploadToS3(secondaryBucket, masterKey, masterPlaylistPath);
        console.log("uploaded file to s3")
        const uploadPromise = processedFiles.map(async ({ resolution, outputPath }) => {
            const playlistKey = `video/${uniqueId}/${resolution}/playlist.m3u8`;
            await uploadToS3(secondaryBucket, playlistKey, outputPath);

            await uploadHLSFiles(secondaryBucket, uniqueId, resolution, outputPath);

            return {
                resolution,
                url: `/video/${uniqueId}/${resolution}/playlist.m3u8`
            };

        })

        const bitRates = await Promise.all(uploadPromise);
        console.log(bitRates)

        // Step 5: Update database
        const masterManifestUrl = `/video/${uniqueId}/master.m3u8`;
        console.log(masterManifestUrl)

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

        // Step 6: Remove job from queue
        await deleteTopMessageFromQueue("ffmpeg_queue");

        await redis.del(uniqueId);
        console.log("Cleanup completed:", tempDir);

        try {
            fetch(`${process.env.S3CLEANUP_FUNCTION_URL}/health`, {
                method: "GET ", headers: {
                    'Content-Type': 'application/json'
                }
            }).then(() => console.log("Sent request to S3 Cleanup server"))
                .catch(err => console.error("Error sending request to video processing server:", err));

        } catch (error) {
            console.error("Failed to trigger s3 cleanup function:", error);
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
            console.log(`Re-queueing job ${uniqueId} due to failure.`);
            await uploadMessageToQueue("ffmpeg_queue", { videoUrl, uniqueId, contentId, userId, retryCount });
        }

    } finally {
        try {
            if (uniqueId) {
                await redis.del(uniqueId);
            }

            if (tempDir) {
                await fsExtra.remove(tempDir);
                console.log(`Cleanup completed for ${tempDir}`);
            }
        } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError);
        }
    }
}

async function downloadFile(videoUrl, downloadPath) {
    try {
        const [bucket, ...keyParts] = videoUrl.split('/');
        const key = keyParts.join('/');
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await S3.send(command);

        if (!response.Body) throw new Error("No body found in S3 response");

        const fileStream = fs.createWriteStream(downloadPath);
        await streamPipeline(response.Body, fileStream);
    } catch (error) {
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


module.exports={processVideoJob}