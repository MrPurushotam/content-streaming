// Woker to remove those entries of videos which have been proceed / have be stored in the bucket since 3hr. 

const { parentPort } = require("worker_threads");
const { fetchObjectsWhereUploadedTimeGreaterThan3Hours } = require("../utils/Queue");
const S3 = require("../libs/aws");
const prismaClient = require("../utils/PrismaClient");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const crypto = require('crypto');

const bucketName = process.env.AWS_S3_PRIMARYBUCKET_NAME;

// Lock file path and process identifier
const LOCK_DIR = path.join('/tmp', 'lock');
const LOCK_FILE = path.join(LOCK_DIR, 'cleaner.lock');
const PROCESS_ID = crypto.randomBytes(16).toString('hex');

// Ensure lock directory exists
const ensureLockDirectory = () => {
  try {
    fsExtra.ensureDirSync(LOCK_DIR);
    return true;
  } catch (error) {
    parentPort.postMessage({ type: "error", message: 'Failed to create lock directory: ' + error.message });
    return false;
  }
};

// Acquire lock
const acquireLock = async () => {
  try {
    if (!ensureLockDirectory()) {
      throw new Error('Could not create lock directory');
    }

    if (fs.existsSync(LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));

      // Check if lock is stale (older than 1 hour)
      if (Date.now() - lockData.timestamp > 3600000) {
        parentPort.postMessage({ type: "info", message: 'Found stale lock, removing...' });
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
    parentPort.postMessage({ type: "error", message: 'Lock acquisition failed: ' + error.message });
    return false;
  }
};

// Release lock
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
    parentPort.postMessage({ type: "error", message: 'Lock release failed: ' + error.message });
  }
  return false;
};

const MAX_RETRIES = 3;
let retryCount = 0;

async function Cleaner() {
  // Try to acquire lock
  if (!await acquireLock()) {
    parentPort.postMessage({ type: "info", message: "Another cleaner is already running" });
    return;
  }

  parentPort.postMessage({ type: "info", message: "Cleaning process started." });

  try {
    // fetch those objects from the queue which have uploadTime > 3hr 
    const tasksToDelete = await fetchObjectsWhereUploadedTimeGreaterThan3Hours("primary_bucket_queue");

    for (const task of tasksToDelete) {
      const { location, id } = task;

      // Delete the object from S3
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: location,
        });
        await S3.send(command);
        parentPort.postMessage({ type: "info", message: `Deleted S3 object: ${location}` });
      } catch (err) {
        parentPort.postMessage({ type: "error", message: `Failed to delete S3 object: ${location}. Error: ${err.message}` });
        continue;
      }

      try {
        await prismaClient.videoSourceInfo.update({
          where: { id: id },
          data: { deleted: true },
        });
        parentPort.postMessage({ type: "info", message: `Updated Prisma entry for ID: ${id}` });
      } catch (err) {
        parentPort.postMessage({ type: "error", message: `Failed to update Prisma entry for ID: ${id}. Error: ${err.message}` });
        continue;
      }
    }

    parentPort.postMessage({ type: "info", message: "Entries older than 3 hours have been removed." });
    retryCount = 0; // Reset retry count on success
  } catch (error) {
    parentPort.postMessage({ type: "error", message: 'Cleaning process failed: ' + error.message });
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      parentPort.postMessage({ type: "info", message: `Retrying cleaning process (${retryCount}/${MAX_RETRIES})...` });
      setTimeout(Cleaner, 5000); // Retry after 5 seconds
    } else {
      parentPort.postMessage({ type: "error", message: 'Max retries reached. Aborting cleaning process.' });
    }
  } finally {
    // Release lock
    releaseLock();
  }
}

// Run the Cleaner function once at the start of the server
Cleaner();

// Run the Cleaner function every 6 hours
setInterval(Cleaner, 6 * 3600 * 1000);

// Cleanup lock on process termination
process.on('SIGINT', () => {
  parentPort.postMessage({ type: "info", message: 'Process interrupted, cleaning up...' });
  releaseLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  parentPort.postMessage({ type: "info", message: 'Process terminated, cleaning up...' });
  releaseLock();
  process.exit(0);
});

