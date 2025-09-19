import app from './app';
import prisma from './lib/prisma';

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`Shortener backend listening on http://localhost:${port}`);
});

// graceful shutdown
async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected. Exiting.');
      process.exit(0);
    } catch (e) {
      console.error('Error on shutdown:', e);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
