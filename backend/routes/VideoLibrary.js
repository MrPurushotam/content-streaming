const S3 = require("../libs/aws");
const authorizeHeader = require("../middleware/authentication");
const uploadThumbnail = require("../middleware/multer");
const prismaClient = require("../utils/PrismaClient");
const { DeleteObjectsCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { redisClient } = require("../utils/Queue");
const adminAuthorizer = require("../middleware/admin");
const router = require("express").Router();
const path = require('path');
const { generousLimit } = require("../middleware/rateLimiting");
require("dotenv").config();

// code to fetch videos and display in home page 

// return all the video uploaded by user including details
const cdn_url = process.env.CDN_BASE_URL;

router.get("/", generousLimit, async (req, res) => {
    try {
        const content = await prismaClient.Content.findMany({
            where: {
                AND: { public: true, status: "published", deleted: false }
            },
            orderBy: {
                uploadTime: "desc"
            },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                views: true,
                uploadTime: true,
                manifestUrl: true
            }
        });

        const data = content.map((entry) => {
            // Get the URL path after the bucket name
            return {
                ...entry,
                manifestUrl: entry.manifestUrl ? path.join(cdn_url, entry.manifestUrl) : "",
                thumbnail: entry.thumbnail ? path.join(cdn_url, entry.thumbnail) : ""
            };
        });

        return res.status(200).json({ success: true, content: data });
    } catch (error) {
        console.log("Error while fetching content.", error);
        return res.status(500).json({ success: false, message: "Internal Error occured." });
    }
})

router.use(authorizeHeader);
router.use(adminAuthorizer, generousLimit);

// delete video along with everything
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const exists = await prismaClient.Content.findUnique({
            where: { id: id },
            select: {
                id: true,
                thumbnail: true,
                status: true,
                uniqueId: true,
                manifestUrl: true,
                deleted: true,
                bitRates: {
                    select: {
                        id: true,
                        url: true,
                        resolution: true
                    }
                }
            }
        })
        if (!exists) {
            return res.status(403).json({ success: false, error: "Content with id doesn't exists.", message: "Content with id doesn't exists." })
        }
        if (exists.deleted && exists.status === "deleted") {
            return res.status(403).json({ success: false, error: "Content already deleted.", message: "Content already deleted." })
        }
        console.log(exists)
        const filesToDelete = [];
        if (exists?.thumbnail.trim()) {
            filesToDelete.push({ Key: exists.thumbnail })
        }
        if (exists?.manifestUrl.trim()) {
            filesToDelete.push({ key: `video/${exists.uniqueId}` })
        }
        console.log(filesToDelete);
        if (filesToDelete.length > 0) {
            const deleteParams = {
                Bucket: process.env.AWS_S3_SECONDARYBUCKET_NAME,
                Delete: {
                    Objects: filesToDelete
                }
            };
            const command = new DeleteObjectsCommand(deleteParams)
            await S3.send(command);
        }

        const content = await prismaClient.Content.update({
            where: { id },
            data: {
                status: "deleted",
                deleted: true,
                public: false
            }, select: {
                id: true,
                status: true,
                uniqueId: true
            }
        })
        return res.status(200).json({ success: true, message: "Content deleted.", content })
    } catch (error) {
        console.log("Error while deleting content.", error)
        return res.status(500).json({ success: false, message: "Internal Error occured." })
    }

})

// edit thumbnail,description,title

// TODO: here i am abruptly throwing error which might cause server to crash so need to handle it properly
router.put("/:id", uploadThumbnail.single("thumbnail"), async (req, res) => {
    try {
        const updates = req.body;
        const id = parseInt(req.params.id, 10);
        const data = {};
        if (updates.title) data.title = updates.title;
        if (updates.description) data.description = updates.description;
        if (updates.public) data.public = updates.public === "true";
        if (req.file) data.thumbnail = req.file.key;

        const exists = await prismaClient.Content.findUnique({ where: { id } });
        if (!exists) {
            return res.status(403).json({ success: false, error: "Content doesn't exists.", message: "Content doesn't exists." })
        }
        if (req.file && exists?.thumbnail.trim()) {
            const prevThumbnail = exists.thumbnail;

            const deleteParams = {
                Bucket: process.env.AWS_S3_SECONDARYBUCKET_NAME,
                Key: prevThumbnail
            };
            await S3.send(new DeleteObjectCommand(deleteParams));
        }

        //TODO: logic to delete prevThumbnail
        const updatedData = await prismaClient.Content.update({ where: { id }, data });

        const updatedContent = {
            title: updatedData.title,
            description: updatedData.description,
            public: updatedData.public,
            status: updatedData.success,
            id: updatedData.id,
            thumbnail: updatedData.thumbnail ? path.join(cdn_url, updatedData.thumbnail) : "",
            views: updatedData.views,
            uploadTime: updatedData.uploadTime,
            manifestUrl: updatedData.manifestUrl ? path.join(cdn_url, updatedData.manifestUrl) : ""
        }

        return res.status(200).json({ success: true, message: "Updated content.", content: updatedContent });

    } catch (error) {
        console.log("Error while updating content.", error)
        return res.status(500).json({ success: false, message: "Internal Error occured." })
    }
})

module.exports = router