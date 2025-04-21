const express = require("express");
const app = express();
const UserRouter = require("./routes/user");
const ContentRouter = require("./routes/content");
const VideoRouter = require("./routes/VideoLibrary");
const CheckVariousService = require("./routes/checkVariousService")
const cors = require("cors");
const { disconnectRedis } = require("./utils/Queue");
const { connectToRedis } = require("./utils/Queue");
const serverless = require("serverless-http");

require("dotenv").config();

connectToRedis()
    .catch(async (err) => {
        console.error("Strange error occurred:", err.message);
        await disconnectRedis();
        process.exit(1);
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
app.use("/api/v1/content", ContentRouter);
app.use("/api/v1/video", VideoRouter);

if (process.env.NODE_ENV === "dev") {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports.handler = serverless(app);