const { S3Client } = require('@aws-sdk/client-s3');

const S3 = new S3Client({
    region: process.env.AWS_REGION 
});

module.exports = S3;
