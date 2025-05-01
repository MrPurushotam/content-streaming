const { GetPrismaClient } = require('@mrpurushotam/prisma-package');

let prismaClient;

if (!global.prismaClient) {
    global.prismaClient = new GetPrismaClient(process.env.DATABASE_URL);
}

prismaClient = global.prismaClient;

module.exports = prismaClient;