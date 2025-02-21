const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require("@ffmpeg-installer/ffmpeg");
const prismaClient = require('../utils/PrismaClient');
const S3 = require('../libs/aws');
const { promisify } = require("util");
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { pipeline } = require('stream');
const fsExtra = require('fs-extra');

const streamPipeline = promisify(pipeline);

// CHANGE: Added structured logger
const logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[ERROR] ${message}`, meta),
  debug: (message, meta = {}) => console.debug(`[DEBUG] ${message}`, meta)
};

ffmpeg.setFfmpegPath(ffmpegPath.path);
logger.info("FFmpeg initialized", { path: ffmpegPath.path });

async function downloadFile(videoUrl, downloadPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const [bucket, ...keyParts] = videoUrl.split('/');
      const key = keyParts.join('/');
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await S3.send(command);
      if (!response.Body) {
        throw new Error("No body found in S3 response");
      }
      
      const fileStream = fs.createWriteStream(downloadPath);
      await streamPipeline(response.Body, fileStream);
      resolve(downloadPath);
    } catch (e) {
      reject(e);
    }
  });
}

// CHANGE: Improved error handling and added retry logic
async function uploadToS3(bucket, key, filePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream,
      });
      
      const response = await S3.send(command);
      logger.debug(`Upload successful`, { bucket, key });
      return `https://${bucket}.s3.amazonaws.com/${key}`;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`S3 Upload Failed after ${retries} attempts: ${error.message}`);
      }
      logger.error(`Upload attempt ${attempt} failed, retrying...`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function processVideo(inputPath, outputDir, resolutions = ['360p', '720p', '1080p'], segmentDuration = 10) {
  const resolutionMap = {
    '360p': { size: '640x360', bitrate: '800k' },
    '720p': { size: '1280x720', bitrate: '2500k' },
    '1080p': { size: '1920x1080', bitrate: '5000k' }
  };
  
  let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

  const promises = resolutions.map((resolution) => {
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
          '-c:v h264',
          '-c:a aac',
          '-b:v ' + config.bitrate,
          '-b:a 128k',
          '-profile:v main',
          '-level 3.1',
          '-start_number 0',
          `-hls_time ${segmentDuration}`,
          '-hls_list_size 0',
          '-hls_segment_type mpegts',
          '-hls_playlist_type vod',
          '-f hls',
          `-s ${config.size}`,
          '-threads 0',
          '-preset fast'
        ])
        .output(outputPath)
        .on('start', () => logger.info(`Processing started`, { resolution }))
        .on('progress', (progress) => {
          logger.debug(`Processing progress`, { resolution, progress: `${progress.percent?.toFixed(2)}%` });
        })
        .on('end', () => resolve({ resolution, outputPath }))
        .on('error', (err) => reject(err))
        .run();
    });
  });

  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPlaylistPath, masterPlaylist);

  return Promise.all(promises);
}

// CHANGE: Added helper function for parallel uploads
async function uploadHLSFiles(bucket, uniqueId, resolution, outputPath) {
  const segmentFiles = fs.readdirSync(path.dirname(outputPath));
  const uploadPromises = segmentFiles.map(segment => {
    const segmentPath = path.join(path.dirname(outputPath), segment);
    const segmentKey = `video/${uniqueId}/${resolution}/${segment}`;
    return uploadToS3(bucket, segmentKey, segmentPath);
  });
  
  return Promise.all(uploadPromises);
}

async function runWorker(data) {
  const { videoUrl, uniqueId, contentId, userId } = data;
  const primaryBucket = process.env.AWS_S3_PRIMARYBUCKET_NAME;
  const secondaryBucket = process.env.AWS_S3_SECONDARYBUCKET_NAME;
  const tempDir = path.join(__dirname, 'temp', uniqueId);
  const inputPath = path.join(tempDir, path.basename(videoUrl));
  const outputDir = path.join(tempDir, 'output');
  
  try {
    await fsExtra.ensureDir(tempDir);
    await fsExtra.ensureDir(outputDir);
    
    logger.info('Starting video processing', { uniqueId, contentId });
    
    // CHANGE: Added initial database status update
    await prismaClient.Content.update({
      where: { id: parseInt(contentId, 10) },
      data: { status: 'processing' }
    });

    await downloadFile(videoUrl, inputPath);
    logger.info('Video downloaded successfully');

    const processedFiles = await processVideo(inputPath, outputDir);
    logger.info('Video processing completed');

    // CHANGE: Upload master playlist
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    const masterKey = `video/${uniqueId}/master.m3u8`;
    await uploadToS3(secondaryBucket, masterKey, masterPlaylistPath);
    logger.info('Master playlist uploaded');

    // CHANGE: Parallel upload implementation
    const uploadPromises = processedFiles.map(async ({ resolution, outputPath }) => {
      const key = `video/${uniqueId}/${resolution}/playlist.m3u8`;
      await uploadToS3(secondaryBucket, key, outputPath);
      await uploadHLSFiles(secondaryBucket, uniqueId, resolution, outputPath);
      return {
        resolution,
        url: `/video/${uniqueId}/${resolution}/playlist.m3u8`,
      };
    });

    const bitRates = await Promise.all(uploadPromises);
    logger.info('All HLS files uploaded successfully');

    // CHANGE: Use transaction for database updates
    const masterManifestUrl = `/video/${uniqueId}/master.m3u8`;
    await prismaClient.$transaction(async (prisma) => {
      await prisma.Content.update({
        where: { id: parseInt(contentId, 10) },
        data: {
          manifestUrl: masterManifestUrl,
          status: 'published',
        },
      });

      await Promise.all(bitRates.map(({ resolution, url }) =>
        prisma.BiteRateVideo.create({
          data: {
            resolution,
            url,
            contentId,
          },
        })
      ));
    });

    // CHANGE: Enhanced success message
    parentPort.postMessage({
      status: 'success',
      message: `Processed video for ${uniqueId}`,
      // THOUGHT: we should remove this data thing from here i feeel cox its unnessary
      data: {
        contentId,
        masterManifestUrl,
        bitRates,
        processedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    parentPort.postMessage({ status: 'failure', error: error.message });
  } finally {
    await fsExtra.remove(tempDir);
    logger.info('Cleanup completed', { tempDir });
  }
}

parentPort.on('message', (data) => runWorker(data));