const { verifyToken } = require("../utils/common");

const adminAuthorizer = (req, res, next) => {
    try {
        const authHeader = req.headers["x-admin-token"];
        if (!authHeader) {
            return res.status(401).json({ message: "No admin token provided", success: false });
        }
        if (authHeader) {
            verifyToken(authHeader);
            req.isAdmin = true;
            next();
        } else {
            res.status(401).json({ message: "Admin token invalid.", success: false });
        }
    } catch (error) {
        console.error("Error occurred", error.message);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: "Token has expired", success: false });
        } else {
            res.status(401).json({ message: "Invalid token", success: false });
        }
    }
};

module.exports = adminAuthorizer;