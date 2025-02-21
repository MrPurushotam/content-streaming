const jwt = require("jsonwebtoken");
require("dotenv").config();

const createToken = (data) => {
    // data shall be in from of object
    return jwt.sign(data, process.env.TOKEN_SECRET);
}

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        return { success: true, data: decoded };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { success: false, error: "Token has expired" };
        }
        return { success: false, error: error.message };
    }
}

module.exports = { createToken, verifyToken };