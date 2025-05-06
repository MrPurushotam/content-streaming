const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
require("dotenv").config();

const { fetchObjectsWhereUploadedTimeGreaterThan3Hours, uploadMessageToQueue, removeMessageFromQueue } = require("./utils/Queue");
const S3 = require("./libs/aws");
const prismaClient = require("./utils/PrismaClient");
const { DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const bucketName = process.env.AWS_S3_PRIMARYBUCKET_NAME;
const MAX_RETRIES = 3;
const DLQ_QUEUE = "error_fallback";

// CORS config
const corsOption = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.ALLOWED_URL.split(",").filter(Boolean);
    if (!origin || allowedOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Cors Error origin not allowed."));
    }
  },
  credentials: true,
  methods: ["GET"],
  allowedHeaders: ["Content-Type"],
  exposedHeaders: ["Content-Type"],
};
app.use(cors(corsOption));

// Utility functions
async function checkS3ObjectExists(location) {
  try {
    await S3.send(new HeadObjectCommand({ Bucket: bucketName, Key: location }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.name === "NoSuchKey") return false;
    return null;
  }
}

async function deleteS3Object(location) {
  try {
    await S3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: location }));
    return true;
  } catch {
    return false;
  }
}

async function Cleaner(retryCount = 0) {
  let tasks = [];
  try {
    console.log("Fetching objects older than 3 hours...");
    tasks = await fetchObjectsWhereUploadedTimeGreaterThan3Hours(
      "primary_bucket_queue",
      process.env.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
    );

    if (!tasks || tasks.length === 0) {
      console.log("No objects found for cleanup.");
      return;
    }

    let successCount = 0;
    const recordsToUpdate = [];
    const tasksToRequeue = [];

    for (const task of tasks) {
      const { location, id } = task.messageObj;
      const rawMessage = task.rawMessage;

      console.log(`Processing task with ID: ${id}, location: ${location}`);

      const exists = await checkS3ObjectExists(location);
      if (exists === null) {
        console.log(`Error checking existence of ${location}, skipping.`);
        continue;
      }
      let shouldRequeue = false;

      if (exists) {
        console.log(`Object ${location} exists. Attempting to delete...`);
        if (!(await deleteS3Object(location))) {
          console.log(`Failed to delete ${location}, requeuing message to primary queue.`);
          shouldRequeue = true;
        }else{
          console.log(`Successfully deleted ${location}.`);
          recordsToUpdate.push(parseInt(id,10));
        }
      } else {
        console.log(`Object ${location} not found, skipping requeue.`);
        recordsToUpdate.push(parseInt(id,10));
      }

      const removed = await removeMessageFromQueue("primary_bucket_queue", rawMessage);
      if (!removed) {
        console.warn(`Failed to remove message for task ID: ${id} from queue.`);
        continue;
      }
      if (shouldRequeue) {
        await uploadMessageToQueue("primary_bucket_queue", task.messageObj);
        continue;
      }
      tasksToRequeue.push(task);
    }

    if (recordsToUpdate.length > 0) {
      try {
        console.log(`Updating database for records: ${recordsToUpdate}`);
        const result = await prismaClient.videoSourceInfo.updateMany({
          where: { id: { in: recordsToUpdate } },
          data: { deleted: true },
        });

        successCount = result.count;
        console.log(`Database update successful. ${successCount} records updated.`);
      } catch (dbError) {
        console.error("Database update error:", dbError);
        for (const task of tasksToRequeue) {
          console.log(`Requeuing task with ID: ${task.messageObj.id} due to database error.`);
          await uploadMessageToQueue("primary_bucket_queue", task.messageObj);
        }
      }
    }

    console.log(`Cleanup complete: ${successCount} objects deleted.`);
    return { message: "Cleanup completed" };
  } catch (error) {
    console.error("Error in Cleaner:", error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying (#${retryCount + 1})...`);
      return Cleaner(retryCount + 1);
    } else {
      console.log("Max retries reached. Requeuing tasks to primary queue.");
      for (const task of tasks) {
        console.log(`Requeuing task with ID: ${task.messageObj.id} to primary queue.`);
        await uploadMessageToQueue("primary_bucket_queue", task.messageObj); // Requeue to primary queue
      }
    }
  }
}

// Express endpoints (for local + HTTP Lambda)
app.get("/health", (req, res) => {
  Cleaner();
  res.json({ status: "healthy", success: true });
});

app.get("/cleanup", async (req, res) => {
  try {
    await Cleaner();
    res.json({ status: "completed", success: true });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ status: "error", success: false, message: error.message });
  }
});

// Local run
if (process.env.NODE_ENV === "dev") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`S3 Cleanup server running at http://localhost:${PORT}`));
}

// Lambda handler (HTTP & direct trigger support)
const httpHandler = serverless(app);

module.exports.handler = async (event, context) => {
  const isHttp = event?.requestContext?.http?.method;

  if (isHttp) {
    return httpHandler(event, context);
  }

  // Direct Lambda trigger
  console.log("Starting Cleanup via direct Lambda trigger...");
  await Cleaner();
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed", success: true }),
  };
};
