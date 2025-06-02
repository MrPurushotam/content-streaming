const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { processVideoJob } = require('./utils/auxilaryFunction');
require('dotenv').config();

const app = express();

// CORS setup
const corsOption = {
    origin: (origin, callback) => {
        const allowedOrigin = process.env.ALLOWED_URL.split(',').filter(Boolean);
        if (!origin || allowedOrigin.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Cors Error origin not allowed.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Content-Type']
};
app.use(cors(corsOption));

// Global variable to track ongoing processing
let processingInProgress = false;

app.get('/health', (req, res) => {
    console.log('Health check requested');
    if (process.env.NODE_ENV === "dev") {
        processVideoJob()
            .then(result => {
                console.log('Processing completed:', result);
                processingInProgress = false;
            })
            .catch(error => {
                console.error('Processing error:', error);
                processingInProgress = false;
            });
    }
    res.json({ status: 'healthy', success: true, processingActive: processingInProgress });
});

// New endpoint to check processing status
app.get('/status', (req, res) => {
    res.json({
        processingActive: processingInProgress,
        success: true
    });
});

app.post('/process', async (req, res) => {
    try {
        // Don't start a new process if one is already running
        if (processingInProgress) {
            return res.json({
                message: "Processing already in progress",
                success: true,
                status: "in_progress"
            });
        }

        processingInProgress = true;

        // Use a non-blocking approach - don't await here
        processVideoJob()
            .then(result => {
                console.log('Processing completed:', result);
                processingInProgress = false;
            })
            .catch(error => {
                console.error('Processing error:', error);
                processingInProgress = false;
            });

        res.json({
            message: "Processing started",
            success: true,
            status: "started"
        });
    } catch (error) {
        console.error('Process initiation error:', error);
        processingInProgress = false;
        res.status(500).json({ error: error.message });
    }
});

if (process.env.NODE_ENV === 'dev') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Video Processing server running on http://localhost:${PORT}`);
    });
}

const httpHandler = serverless(app);

module.exports.handler = async (event, context) => {
    // Enable callbackWaitsForEmptyEventLoop to false to prevent Lambda from waiting
    // for event loop to be empty before returning
    context.callbackWaitsForEmptyEventLoop = false;

    const isHttp = event?.requestContext?.http?.method;

    if (isHttp) {
        return httpHandler(event, context);
    }

    // Direct Lambda invocation (queue polling)
    try {
        console.log("Direct Lambda invocation - starting video processing");

        const startTime = Date.now();
        // Use 5 minutes less than the actual Lambda timeout to ensure graceful completion
        const timeoutBuffer = process.env.TIMEOUT_BUFFER_SECONDS || 300; // 5 minutes buffer by default
        const maxDuration = (context.getRemainingTimeInMillis() - (timeoutBuffer * 1000));

        console.log(`Lambda will run for max ${maxDuration / 1000} seconds with ${timeoutBuffer} seconds buffer`);

        let emptyQueueCount = 0;
        let processedCount = 0;
        let isTimeoutImminent = false;

        while (Date.now() - startTime < maxDuration) {
            // Check if we're getting close to timeout
            if (context.getRemainingTimeInMillis() < (timeoutBuffer * 1000)) {
                console.log("Lambda timeout approaching, stopping gracefully");
                isTimeoutImminent = true;
                break;
            }

            const result = await processVideoJob();

            if (result?.message === "No messages in queue") {
                emptyQueueCount++;
                const backoffTime = Math.min(emptyQueueCount * 2000, 30000); // Reduced max backoff to 30s
                console.log(`Queue empty (${emptyQueueCount}). Waiting ${backoffTime}ms...`);

                await new Promise(res => setTimeout(res, backoffTime));
                if (emptyQueueCount > 5) {
                    console.log("Queue idle too long, exiting.");
                    break;
                }
            } else if (result?.jobCompleted) {
                emptyQueueCount = 0;
                processedCount++;
                console.log(`Completed job ${processedCount}. Continuing...`);
            } else if (result?.jobInProgress) {
                // Job started but couldn't complete in time
                console.log("Job in progress but Lambda timeout approaching. Exiting gracefully.");
                isTimeoutImminent = true;
                break;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: isTimeoutImminent ? 'Lambda execution stopped due to timeout' : 'Lambda execution completed',
                processed: processedCount,
                timeRun: (Date.now() - startTime) / 1000,
                timeoutOccurred: isTimeoutImminent
            })
        };

    } catch (error) {
        console.error('Processing error during Lambda:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: process.env.NODE_ENV === 'dev' ? error.stack : undefined
            })
        };
    }
};
