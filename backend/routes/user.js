const Router = require("express");
const prismaClient = require("../utils/PrismaClient");
const bcrypt = require("bcryptjs");
const authorizeHeader = require("../middleware/authentication");
const { createToken } = require("../utils/common");
const adminAuthorizer = require("../middleware/admin");
const router = Router();
const path = require('path');
const { strictLimit, generousLimit } = require("../middleware/rateLimiting");

router.post("/login",strictLimit, async (req, res) => {
    try {
        console.log(req.body)
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Please provide email and password", success: false });
        }
        const user = await prismaClient.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials.", success: false });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials.", success: false });
        }
        if (user.role === "user") {
            const token = createToken({ id: user.id, email: user.email, role: user.role, username: user.username });
            return res.status(200).json({ success: true, approved: false, message: "There is nothing here for you. Please look at history in sidebar,Thankyou.", token: token, user: { email: user.email, role: user.role, id: user.id, username: user.username } });
        }
        if (!user.approved && user.role === "admin") {
            return res.status(200).json({ success: true, approved: false, message: "Your account isn't approved please come again later." });
        }
        const token = createToken({ id: user.id, email: user.email, role: user.role, username: user.username, });
        const userData = {
            email: user.email,
            role: user.role,
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            approved: user.approved,
            lastLoggedIn: true
        }
        // here we can send cookie rather sending token.
        const adminToken = createToken({ id: user.id, role: user.role })
        res.setHeader("x-admin-token", adminToken);
        return res.status(200).json({ success: true, user: userData, token: token, adminToken, approved: user.approved });
    } catch (e) {
        console.error(e.message);
        return res.status(500).json({ error: "Internal server error.", success: false });
    }
})

router.post("/signup",strictLimit, async (req, res) => {
    try {
        const { email, password, fullname, role, username } = req.body;
        if (!email || !password || !fullname || !role || !username) {
            return res.status(400).json({ error: "Please provide all fields", success: false });
        }
        const usernameRegex = /^[a-zA-Z0-9]{7,14}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: "Username must be between 7 and 14 characters and should include letters and digits only.", success: false });
        }
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email", success: false });
        }
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters long, should include letters, digits and special character(@$!%*?&).", success: false });
        }
        const user = await prismaClient.user.findUnique({
            where: {
                email: email
            }
        });

        if (user) {
            return res.status(400).json({ error: "User already exists", success: false });
        }
        const hashPassword = await bcrypt.hash(password, 10);
        await prismaClient.user.create({
            data: {
                email: email,
                password: hashPassword,
                fullname: fullname,
                role: role,
                username: username
            }
        });
        if (role === "user") {
            return res.status(200).json({ success: true, message: "User created. Please Login." });
        }
        return res.status(200).json({ success: true, approved: false, message: "User created wait until you get approved by admin team to post content.Come back later." });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error", success: false });
    }
})

router.use(authorizeHeader);

router.get("/",strictLimit, (req, res) => {
    try {
        return res.status(200).json({ data: { email: req.email, role: req.role, id: req.id }, success: true });
    } catch (error) {
        console.error(e.message);
        return res.status(500).json({ error: "Internal server error", success: false });
    }
})

router.get("/logout",strictLimit, (req, res) => {
    try {
        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error(e.message);
        return res.status(500).json({ error: "Internal server error", success: false });
    }
})

// send list of unapproved users THOUGHT here we can add pagination such that if user list is too long then we can send list in multiple requests. 
//TODO: Add a admin role check before it else it won't be of any sense 

router.use(adminAuthorizer,generousLimit);
router.get("/list/:choice?", async (req, res) => {
    try {
        const choice = req.params.choice || "default";
        let choiceArray = ["admin"];
        if (choice === "all") {
            choiceArray.push("user");
        }

        // Pagination parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch users with pagination
        const list = await prismaClient.User.findMany({
            where: {
                approved: false,
                role: {
                    in: choiceArray
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullname: true,
                role: true,
                createdAt: true,
            },
            skip,
            take: limit
        });

        // Get total count for pagination info
        const total = await prismaClient.User.count({
            where: {
                approved: false,
                role: {
                    in: choiceArray
                }
            }
        });

        return res.status(200).json({
            success: true,
            list,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error", success: false });
    }
});

router.put("/approve", async (req, res) => {
    try {
        const approveList = req.body.approveList;
        if (!Array.isArray(approveList) || approveList.length === 0) {
            return res.status(400).json({
                error: "Invalid input: approveList must be an array of objects",
                success: false
            });
        }
        for (const item of approveList) {
            if (!item.id || typeof item.status !== 'boolean') {
                return res.status(400).json({
                    error: "Invalid input: each object must have id and status",
                    success: false
                });
            }
        }
        const updatePromises = approveList.map(user => {
            return prismaClient.User.update({
                where: { id: user.id },
                data: { approved: user.status }
            });
        });

        await Promise.all(updatePromises);

        return res.status(200).json({ success: true, message: "Users updated successfully" });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error", success: false });
    }
});

// fetch user uploaded content

router.get("/uploads", async (req, res) => {
    try {
        const content = await prismaClient.Content.findMany({
            where: {
                userId: req.id
            },
            orderBy: {
                uploadTime: "desc"
            },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                uniqueId: true,
                views: true,
                uploadTime: true,
                public: true,
                status: true,
                manifestUrl: true,
                updatedAt: true
            }
        });
        const cdn_url = process.env.CDN_BASE_URL;

        const data = content.map((entry) => {
            // Get the URL path after the bucket name
            return {
                ...entry,
                manifestUrl: entry?.manifestUrl ? path.join(cdn_url, entry.manifestUrl) : "",
                thumbnail: entry?.thumbnail ? path.join(cdn_url, entry.thumbnail) : ""
            };
        });

        return res.status(200).json({ success: true, content: data });
    } catch (error) {
        console.log("Error while fetching content.", error);
        return res.status(500).json({ success: false, message: "Internal Error occurred." });
    }
});

module.exports = router;