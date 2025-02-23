const rateLimit = require("express-rate-limit");

const generateKey = (req) => req.ip + req.originalUrl;

const generousLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 19,
    keyGenerator: generateKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later",
});

const strictLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    keyGenerator: generateKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
});

const commonStrictLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
});

module.exports = { generousLimit, strictLimit, commonStrictLimit };