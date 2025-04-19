const { fetchObjectsWhereUploadedTimeGreaterThan3Hours, uploadMessageToQueue } = require("./utils/Queue");
const S3 = require("./libs/aws");
const prismaClient = require("./utils/PrismaClient");
const { DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const express = require("express");

const bucketName = process.env.AWS_S3_PRIMARYBUCKET_NAME;
const MAX_RETRIES = 3;
const DLQ_QUEUE = "error_fallback";

async function checkS3ObjectExists(location) {
  try {
    await S3.send(new HeadObjectCommand({ Bucket: bucketName, Key: location }));
    return true;
  } catch (err) {
    return err.name === 'NotFound' ? false : null;
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
  try {
    console.log("Fetching objects older than 3 hours...");
    const tasks = await fetchObjectsWhereUploadedTimeGreaterThan3Hours("primary_bucket_queue", process.env.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);

    if (!tasks || tasks.length === 0) {
      console.log("No objects found for cleanup.");
      return;
    }

    let successCount = 0;
    const recordsToUpdate = [];

    for (const task of tasks) {
      const { location, id } = task;
      const exists = await checkS3ObjectExists(location);
      if (exists === null) {
        console.log(`Error checking existence of ${location}, skipping task.`);
        continue;
      }

      if (exists) {
        if (!await deleteS3Object(location)) {
          console.log(`Failed to delete ${location}, adding to DLQ`);
          await uploadMessageToQueue(DLQ_QUEUE, task); 
          continue;
        }
      } else {
        console.log(`Object ${location} not found in bucket, skipping requeue.`);
        continue;
      }

      recordsToUpdate.push(id);
    }

    if (recordsToUpdate.length > 0) {
      try {
        const result = await prismaClient.videoSourceInfo.updateMany({
          where: {
            id: { in: recordsToUpdate }
          },
          data: { deleted: true }
        });

        successCount = result.count;
        console.log(`Successfully updated ${successCount} database records`);
      } catch (dbError) {
        console.error("Error updating database records:", dbError);
        for (const task of tasks) {
          if (recordsToUpdate.includes(task.id)) {
            await uploadMessageToQueue("primary_bucket_queue", task); // Add the entire task back to the queue
          }
        }
      }
    }

    console.log(`Cleanup complete: ${successCount} objects deleted.`);
    return { message: "Cleanup completed" };
  } catch (error) {
    console.error("Error in Cleaner function:", error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying cleanup... Attempt #${retryCount + 1}`);
      return Cleaner(retryCount + 1);
    } else {
      console.log("Max retries reached, logging failed tasks.");
    }
  }
}

// Lambda handler function
module.exports.handler = async (event, context) => {
  // For Lambda runtime
  if (process.env.NODE_ENV !== "dev") {
    console.log("Running in Lambda environment");

    // Health check endpoint for Lambda
    if (event?.httpMethod === "GET" && event?.path === "/health") {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "healthy", success: true })
      };
    }

    // Execute cleanup in Lambda
    console.log("Starting Cleanup Task in Lambda...");
    await Cleaner();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: "completed", success: true })
    };
  }
};

// Configure for local development
if (process.env.NODE_ENV === "dev") {
  console.log("Running in local development environment");

  const app = express();

  const corsOption = {
    origin: (origin, callback) => {
      console.log("Origin:", process.env.ALLOWED_URL);
      const allowedOrigin = process.env.ALLOWED_URL.split(",").filter(Boolean);
      if (!origin || allowedOrigin.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Cors Error origin not allowed."))
      }
    },
    credentials: true,
    methods: ["GET"],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Content-Type']
  };

  // Import and use the cors middleware properly
  const cors = require('cors');
  app.use(cors(corsOption));

  // Health check endpoint for local dev
  app.get("/health", (req, res) => {
    Cleaner();
    res.json({ status: "healthy", success: true });
  });

  // Cleanup endpoint for local dev
  app.get("/cleanup", async (req, res) => {
    try {
      await Cleaner();
      res.json({ status: "completed", success: true });
    } catch (error) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ status: "error", success: false, message: error.message });
    }
  });

  // Start server for local development
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`S3 Cleanup server running on port ${PORT}`));
}
