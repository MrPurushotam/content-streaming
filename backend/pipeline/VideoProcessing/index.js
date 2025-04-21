const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { processVideoJob } = require('./utils/auxilaryFunction.');
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

app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'healthy', success: true });
});

app.post('/process', async (req, res) => {
    try {
        const result = await processVideoJob();
        res.json(result || { message: "Processing complete", success: true });
    } catch (error) {
        console.error('Processing error:', error);
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
    const isHttp = event?.requestContext?.http?.method;

    if (isHttp) {
        return httpHandler(event, context);
    }

    // Direct Lambda invocation (queue polling)
    try {
        console.log("Direct Lambda invocation - starting video processing");

        const startTime = Date.now();
        const maxDuration = (process.env.MAX_LAMBDA_DURATION || 840) * 1000; // 14 mins
        let emptyQueueCount = 0;
        let processedCount = 0;

        while (Date.now() - startTime < maxDuration) {
            const result = await processVideoJob();

            if (result?.message === "No messages in queue") {
                emptyQueueCount++;
                const backoffTime = Math.min(emptyQueueCount * 2000, 60000);
                console.log(`Queue empty (${emptyQueueCount}). Waiting ${backoffTime}ms...`);
                await new Promise(res => setTimeout(res, backoffTime));
                if (emptyQueueCount > 5) {
                    console.log("Queue idle too long, exiting.");
                    break;
                }
            } else {
                emptyQueueCount = 0;
                processedCount++;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Lambda execution completed',
                processed: processedCount,
                timeRun: (Date.now() - startTime) / 1000
            })
        };

    } catch (error) {
        console.error('Processing error during Lambda:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
