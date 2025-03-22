const { Worker } = require('worker_threads');
const { getTopMessage, deleteTopMessageFromQueue, getQueueLength, uploadMessageToQueue } = require('../utils/Queue');
const prismaClient = require('../utils/PrismaClient');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');

// Lock file path and process identifier
const LOCK_DIR = path.join('/tmp', 'lock');
const LOCK_FILE = path.join(LOCK_DIR, 'processor.lock');
const PROCESS_ID = crypto.randomBytes(16).toString('hex');

// Track if we're currently processing
let isProcessing = false;

const ensureLockDirectory = () => {
  try {
    fsExtra.ensureDirSync(LOCK_DIR);
    return true;
  } catch (error) {
    console.error('Failed to create lock directory:', error);
    return false;
  }
};


// Lock management with deadlock prevention
const acquireLock = async () => {
  try {
    if (!ensureLockDirectory()) {
      throw new Error('Could not create lock directory');
    }

    if (fs.existsSync(LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));

      // Check if lock is stale (older than 1 hour)
      if (Date.now() - lockData.timestamp > 3600000) {
        console.log('Found stale lock, removing...');
        fs.unlinkSync(LOCK_FILE);
      } else {
        return false;
      }
    }

    // Create new lock
    fs.writeFileSync(LOCK_FILE, JSON.stringify({
      timestamp: Date.now(),
      processId: PROCESS_ID,
      startedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error('Lock acquisition failed:', error);
    return false;
  }
};

const releaseLock = () => {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      if (lockData.processId === PROCESS_ID) {
        fs.unlinkSync(LOCK_FILE);
        return true;
      }
    }
  } catch (error) {
    console.error('Lock release failed:', error);
  }
  return false;
};

const processVideo = async (message) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(require.resolve('./main.js'));

    worker.postMessage(message);
    console.log("Started processing video:", message.uniqueId);

    worker.on('message', async (result) => {
      if (result.status === 'success') {
        console.log(`Video processed successfully: ${message.uniqueId}`);
        await deleteTopMessageFromQueue("ffmpeg_queue");
        resolve(true);
      } else {
        console.error(`Processing failed for video: ${message.uniqueId}`);
        await deleteTopMessageFromQueue("ffmpeg_queue");
        await uploadMessageToQueue("ffmpeg_queue", message);
        resolve(false);
      }
    });

    worker.on('error', (error) => {
      console.error(`Worker error for video ${message.uniqueId}:`, error.message);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code} for video ${message.uniqueId}`);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
};

const processQueue = async () => {
  // Prevent multiple processing attempts
  if (isProcessing) {
    console.log("Already processing a video");
    return;
  }

  // Try to acquire lock
  if (!await acquireLock()) {
    console.log("Another processor is already running");
    return;
  }

  try {
    isProcessing = true;
    const queueLength = await getQueueLength("ffmpeg_queue");

    if (queueLength > 0) {
      const message = await getTopMessage("ffmpeg_queue");
      if (!message) {
        throw new Error("Failed to get message from queue");
      }

      const dbCheck = await prismaClient.Content.findUnique({
        where: { uniqueId: message.uniqueId },
        select: { deleted: true }
      });

      if (dbCheck?.deleted) {
        console.log("Content is deleted, skipping processing");
        await deleteTopMessageFromQueue("ffmpeg_queue");
      } else {
        await processVideo(message);
      }
    }
  } catch (error) {
    console.error("Processing error:", error);
  } finally {
    isProcessing = false;
    releaseLock();
  }
};

// Scheduler with deadlock prevention
const scheduleNextRun = () => {
  setTimeout(async () => {
    // Check for stale lock before proceeding
    if (fs.existsSync(LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      if (Date.now() - lockData.timestamp > 3600000) {
        console.log('Cleaning up stale lock before next run');
        fs.unlinkSync(LOCK_FILE);
      }
    }

    await processQueue();
    scheduleNextRun();
  }, 5000); // Check every 5 seconds
};

// Start the processor
scheduleNextRun();

// Cleanup lock on process termination
process.on('SIGINT', () => {
  console.log('Process interrupted, cleaning up...');
  releaseLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Process terminated, cleaning up...');
  releaseLock();
  process.exit(0);
});