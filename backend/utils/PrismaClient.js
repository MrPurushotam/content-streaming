const { PrismaClient } = require('@prisma/client');

let prismaClient;

if (!global.prismaClient) {
    global.prismaClient = new PrismaClient();
}

prismaClient = global.prismaClient;

module.exports = prismaClient;