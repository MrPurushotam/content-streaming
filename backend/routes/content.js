const Router = require("express");
const S3 = require("../libs/aws");
const router = Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const prismaClient = require("../utils/PrismaClient");
const { checkIfObjectExists } = require("../utils/awsFunctions");
const uploadThumbnail = require("../middleware/multer");
const authorizeHeader = require("../middleware/authentication");
const { uploadMessageToQueue } = require("../utils/Queue");
const adminAuthorizer = require("../middleware/admin");
const { commonStrictLimit } = require("../middleware/rateLimiting");

router.use(authorizeHeader);
router.use(adminAuthorizer, commonStrictLimit);

// route to create a presigned url and send to frontend. 
router.get("/createurl", async (req, res) => {
    try {
        const { nanoid } = await import('nanoid');
        const uniqueId = nanoid();

        const objectKey = `temp/${uniqueId}`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_PRIMARYBUCKET_NAME,
            Key: objectKey,
            ContentType: "video/*"
        });

        const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 3 * 3600});

        const videoSourceInfo = await prismaClient.VideoSourceInfo.create({
            data: {
                userId: req.id,
                uniqueId: uniqueId,
                location: objectKey
            }
        });

        const updatePrimaryBucketQueue = await uploadMessageToQueue("primary_bucket_queue", videoSourceInfo)
        console.log("Updated task to queue ", updatePrimaryBucketQueue)
        res.header("x-unique-id", uniqueId);
        res.status(200).json({ success: true, url: presignedUrl, uniqueId: uniqueId });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ success: false, error: 'Failed to generate presigned URL' });
    }
});

// THOUGHT :- we can create a cookie of uniqueId which will be easy to share to backend and we can validate the time and value as well. THinl about it 
// route to upload video metadata like title, description, thumbnail
router.post("/metadata", uploadThumbnail.fields([{ name: "thumbnail", maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description, public } = req.body;
        const uniqueId = req.header("x-unique-id") || req.body.uniqueId;
        if (!title || !description || !uniqueId) {
            return res.status(400).json({ error: 'Missing required fields in request body.', success: false });
        }
        const thumbnailUrl = req.files?.thumbnail?.[0]?.key || "";
        console.log(thumbnailUrl);
        const uniqueIdExists = await prismaClient.content.findUnique({ where: { uniqueId } })
        if (uniqueIdExists) {
            res.status(400).json({ error: "UniqueId already exists. You have already uploaded content. Please start from the beginning", message: "UniqueId already exists. You have already uploaded content. Please start from the beginning", success: false })
            return
        }
        const content = await prismaClient.Content.create({
            data: {
                userId: req.id,
                title: title,
                description: description,
                thumbnail: thumbnailUrl,
                uniqueId,
                public: public === "true",
            },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                uniqueId: true,
                userId: true,
                status: true,
                public: true,
                uploadTime: true
            }
        });

        res.status(201).json({ content, success: true, message: "Updated metadata successfully. Upload video to bucket." });
    } catch (error) {
        console.error('Error uploading metadata:', error);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
})

// route to confrim update and store it in queue
router.post("/confirmsource", async (req, res) => {
    try {
        const { uniqueId, uploaded, contentId } = req.body;
        console.log(req.body);
        if (!uniqueId || uploaded === undefined || !contentId) {
            return res.status(400).json({ error: 'Missing some field in request body.', success: false });
        }

        const confrim = await prismaClient.VideoSourceInfo.findUnique({
            where: {
                uniqueId: uniqueId
            },
            select: {
                location: true
            }
        })

        const exists = await checkIfObjectExists(process.env.AWS_S3_PRIMARYBUCKET_NAME, confrim.location)
        if (!exists) {
            return res.status(400).json({ error: 'Object does not exist in bucket.', message: 'Object does not exist in bucket.', success: false });
        }

        // THOUGHT here we have to update videoSourceInfo. Not content table it doesn't have much sense to update content table here after the video has to be uploaded to new bucket throught a pipeline

        await prismaClient.videoSourceInfo.update({
            where: {
                uniqueId: uniqueId
            },
            data: {
                status: exists && uploaded ? "uploaded" : "failed"
            }
        })
        console.log("Updated videoSourceInfo and added to queue.");
        const messageObject = { videoUrl: `${process.env.AWS_S3_PRIMARYBUCKET_NAME}/${confrim.location}`, uniqueId, userId: req.id, contentId }
        const updatedToQueue = await uploadMessageToQueue("ffmpeg_queue", messageObject)
        console.log("Updated task to queue ", updatedToQueue)
        res.removeHeader('x-unique-id')
        res.status(200).json({ success: true, message: 'Updated videoSourceInfo successfully. Please wait untill the video goes live it shall take some time.' });
    } catch (error) {
        console.error('Error confirming source:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
})

// get status of video uploaded recently
// ->This route will be used to get the status of the video uploaded recently for the time being i am fetching status form db like videoSourceInfo and Content table status.

router.get("/status/:contentId?", async (req, res) => {
    try {
        if (!req.params.contentId) {
            return res.status(400).json({ error: "Content Id is missing", success: false });
        }

        // here we can rather poll redis pub/sub or queue to get current info 

        const content = await prismaClient.Content.findUnique({
            where: {
                id: parseInt(req.params.contentId, 10)
            },
            select: {
                status: true
            }
        })
        // TODO: check if it should be content.status or content
        return res.status(200).json({ status: content.status, success: true });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
})

module.exports = router;