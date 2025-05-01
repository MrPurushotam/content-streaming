import { PrismaClient } from '../src/generated/client';
export * from '@prisma/client';

// Extend NodeJS global type properly
declare global {
  // Only in development should you use a global cache
  // In production (like serverless), always instantiate a new client
  // This is only safe in environments like Next.js dev server
  var prismaClient: PrismaClient | undefined;
}

let prisma: PrismaClient;

export function GetPrismaClient(connectionUrl?: string): PrismaClient {
  // @ts-ignore
  if (typeof window !== 'undefined') {
    throw new Error('Prisma client should not be used in the browser');
  }

  const dbUrl = connectionUrl || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('No database URL provided. Pass a connection URL or set DATABASE_URL environment variable');
  }

  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      },
      log: ['error']
    });
  }

  if (!global.prismaClient) {
    global.prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      },
      log: ['error']
    });

    // @ts-ignore
    global.prismaClient.$on('query', (e: any) => {
      console.log('Time query took to run is', e.duration, 'ms');
    });
  }

  return global.prismaClient;
}

// Default client using env variable
prisma = GetPrismaClient();

// ---- Helper functions ----

// export const GetApprovedUsers = async (client: PrismaClient = prisma) => {
//   return client.user.findMany({
//     where: { approved: true }
//   });
// };

export { prisma };
