const { verifyToken } = require("../utils/common");

const authorizeHeader = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (authHeader) {
            const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
            if (!token) {
                return res.status(401).json({ message: "No token provided", success: false });
            }
            const { data } = verifyToken(token);
            req.id = data.id;
            req.email = data.email;
            req.role = data.role;
            next();
        } else {
            res.status(401).json({ message: "No authorization header provided", success: false });
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

module.exports = authorizeHeader;