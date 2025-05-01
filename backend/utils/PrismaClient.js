// const { PrismaClient } = require('@prisma/client');
const { GetPrismaClient } = require('@mrpurushotam/prisma-package');

let prismaClient;

if (!global.prismaClient) {
    global.prismaClient = GetPrismaClient(process.env.DATABASE_URL);
}

prismaClient = global.prismaClient;

module.exports = prismaClient;