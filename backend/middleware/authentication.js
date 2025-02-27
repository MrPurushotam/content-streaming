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
            req.username = data.username;
            next();
        } else {
            res.status(401).json({ message: "No authorization header provided", success: false, jwtError: true });
        }
    } catch (error) {
        console.error("Error occurred", error.message);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: "Token has expired", success: false, jwtError: true });
        } else {
            res.status(401).json({ message: "Invalid token", success: false, jwtError: true });
        }
    }
};

module.exports = authorizeHeader;