const { PrismaClient } = require('@prisma/client');

let prismaClient;

if (!global.prismaClient) {
    global.prismaClient = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        log: process.env.NODE_ENV === 'dev' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error']
    });
    global.prismaClient.$on('query',(e)=>{
        console.log('Time query took to run is ',e.duration,'ms');
    })
}

prismaClient = global.prismaClient;

module.exports = prismaClient;