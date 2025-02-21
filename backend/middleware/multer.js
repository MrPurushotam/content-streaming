const multer = require('multer');
const multerS3 = require('multer-s3');
const S3 = require('../libs/aws');

// the thumbnail will be stored in final bucket i.e secondary inside the folder or in commmon folder called thumbnail
// THOUGHT: currently i have implemented a logic such that the thumbnails name is always same due to which whenever someone updates thumbnail then it shall replace the same thumbnail with new one ig so 
// UPDATE: added timestamp with name of thumbnail
const uploadThumbnail = multer({
    storage: multerS3({
        s3: S3,
        bucket: process.env.AWS_S3_SECONDARYBUCKET_NAME,
        key: function (req, file, cb) {
            const uniqueId = req.headers['x-unique-id']
            if (!uniqueId) {
                return cb(new Error('Unique ID is required'), null);
            }
            const fileUrl = `thumbnail/${uniqueId}-thumbnail-${Date.now()}`;
            cb(null, fileUrl);
        }
    }),
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB size limit
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

module.exports = uploadThumbnail;