const { getRedisClient } = require("../utils/Queue");
const router = require("express").Router();

router.get("/ping",async(req,res)=>{
    try {
        const redis = getRedisClient();
        await redis.ping();
        res.status(200).json({success:true,message:"redis is up and working."})
    } catch (error) {
        console.log("Error while pinging redis.", error);
        return res.status(500).json({ success: false, message: "Internal Error occurred." });
    }
})

router.get("/:queuename?", async (req, res) => {
    try {
        const { queuename } = req.params;
        if (!queuename) {
            return res.status(400).json({ success: false, message: "Queue name is required." });
        }
        
        const redisClient = getRedisClient();
        if (!redisClient.isOpen) await redisClient.connect();

        const data = await redisClient.lRange(queuename, 0, -1);
        const parsedData = data.map(item => JSON.parse(item));

        return res.status(200).json({ success: true, data: parsedData });
    } catch (error) {
        console.log("Error while fetching content.", error);
        return res.status(500).json({ success: false, message: "Internal Error occurred." });
    }
});

router.delete("/:queuename?", async (req, res) => {
    try {
        const { queuename } = req.params;
        if (!queuename) {
            return res.status(400).json({ success: false, message: "Queue name is required." });
        }
        const redisClient = getRedisClient();
        if (!redisClient.isOpen) await redisClient.connect();
        await redisClient.del(queuename);
        return res.status(200).json({ success: true, message: "Queue deleted successfully" });

    } catch (error) {
        console.log("Error while deleting queue.", error);
        return res.status(500).json({ success: false, message: "Internal Error occurred." });
    }
})

module.exports = router;