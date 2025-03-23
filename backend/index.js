const express = require("express");
const app = express();
const UserRouter = require("./routes/user")
const ContentRouter = require("./routes/content")
const VideoRouter = require("./routes/VideoLibrary")
const CheckVariousService = require("./routes/checkVariousService")
const cors = require("cors");
const { disconnectRedis } = require("./utils/Queue");
const { Worker } = require("worker_threads");
const { connectToRedis } = require("./utils/Queue");
const serverless = require("serverless-http")


// const port = process.env.PORT || 4000;
require("dotenv").config();
let PrimaryWorker;

connectToRedis()
    .then(async () => {
        // Ensure Redis is actually ready
        try {
            require("./pipeline/index");
            PrimaryWorker = new Worker(require.resolve("./Worker/Primary-Bucket-Cleaner.js"));

        } catch (err) {
            console.error("Redis is not ready:", err);
            await disconnectRedis();
            process.exit(1);
        }

        // Now it's safe to initialize dependent services
        // await CreateQueue("ffmpeg_queue");
        // await CreateQueue("primary_bucket_queue");
    })
    .catch(async (err) => {
        console.error("Strange error occurred:", err.message);
        await disconnectRedis();
        process.exit(1);
    });



PrimaryWorker?.on('message', (message) => {
    if (message.type === 'error') {
        console.error('Worker error:', message.message);
    } else if (message.type === 'info') {
        console.log('Worker info:', message.message);
    }
});

PrimaryWorker?.on('error', (error) => {
    console.error('Worker threw an error:', error);
});

PrimaryWorker?.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
    }
});

const corsOption = {
    origin: (origin, callback) => {
        const allowedOrigin = process.env.FRONTEND_URL.split(",").filter(Boolean);
        if (!origin || allowedOrigin.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Cors Error origin not allowed."))
        }
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-unique-id', 'x-admin-token'],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-unique-id', 'x-admin-token']
};

app.use(cors(corsOption));
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Api is running." });
})

app.use("/api/v1/check", CheckVariousService)

app.use("/api/v1/user", UserRouter);
// for uploading content to s3
app.use("/api/v1/content", ContentRouter);
// for updating content posted 
app.use("/api/v1/video", VideoRouter);

// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// })

module.exports.handler = serverless(app);