const { S3Client } = require('@aws-sdk/client-s3');

let S3;
if (process.env.NODE_ENV !== "dev") {
    S3 = new S3Client({
        region: process.env.AWS_REGION,
    });
} else {
    S3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
}

module.exports = S3;
