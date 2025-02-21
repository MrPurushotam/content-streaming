const { HeadObjectCommand } = require("@aws-sdk/client-s3");
const S3 = require("../libs/aws");

async function checkIfObjectExists(bucketName, objectKey) {
    try {
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: objectKey
        })
        
        await S3.send(command);
        console.log(`Object "${objectKey}" exists in bucket "${bucketName}".`);
        return true;
    } catch (error) {
        if (error.name === "NotFound" || error.name === "NoSuchKey") {
            console.log(`Object "${objectKey}" does not exist in bucket "${bucketName}".`);
            return false;
        }
        console.error("Error checking object existence:", error);
    }
}

module.exports={checkIfObjectExists}