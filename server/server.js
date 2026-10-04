/**
 * HTTP entry point.
 * Boots the database, starts Express, and installs graceful shutdown handlers.
 */
const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const server = http.createServer(app);

async function start() {
  const banner = `
\x1b[35m  _   _  _____  __  __  _   _  ____
 | \\ | || ____| \\ \\/ / | | | |/ ___|
 |  \\| ||  _|    \\  /  | | | |\\___ \\
 | |\\  || |___   /  \\  | |_| | ___) |
 |_| \\_||_____| /_/\\_\\  \\___/ |____/  COMMERCE\x1b[0m
`;

  try {
    await connectDatabase();

    server.listen(config.port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(banner);
      // eslint-disable-next-line no-console
      console.log(`  \x1b[32mAPI\x1b[0m      http://localhost:${config.port}/api`);
      // eslint-disable-next-line no-console
      console.log(`  \x1b[32mDocs\x1b[0m     http://localhost:${config.port}/api/docs`);
      // eslint-disable-next-line no-console
      console.log(`  \x1b[32mClient\x1b[0m   ${config.clientUrl}`);
      // eslint-disable-next-line no-console
      console.log(`  \x1b[32mPayments\x1b[0m ${config.payments.provider}${config.payments.provider === 'mock' ? ' (sandbox)' : ''}`);
      // eslint-disable-next-line no-console
      console.log(`  \x1b[32mEnv\x1b[0m      ${config.env}\n`);
      app.assertEnvironment();
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('\x1b[31mFatal startup error\x1b[0m:', error.message);
    process.exit(1);
  }
}

/** Close the server + DB before exiting so in-flight requests can finish. */
async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n\x1b[33m[shutdown]\x1b[0m received ${signal}, closing gracefully...`);
  server.close(async () => {
    try {
      await disconnectDatabase();
    } finally {
      process.exit(0);
    }
  });
  // Hard exit if something hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('\x1b[31m[unhandledRejection]\x1b[0m', reason);
});
process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error('\x1b[31m[uncaughtException]\x1b[0m', error);
  shutdown('uncaughtException');
});

start();

module.exports = server;
