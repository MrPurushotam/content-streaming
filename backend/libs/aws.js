const { S3Client } = require('@aws-sdk/client-s3');

// AWS S3 Client configuration
const S3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Export configured S3 client instance
module.exports = S3;
