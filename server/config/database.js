const mongoose = require('mongoose');
const config = require('./index');

/**
 * Establish the MongoDB connection using Mongoose.
 * Fails fast with a readable message instead of an unhandled rejection.
 */
async function connectDatabase(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      autoIndex: !config.isProduction,
    });

    const { host, port, name } = connection.connection;
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[mongo]\x1b[0m connected -> mongodb://${host}:${port}/${name}`);

    mongoose.connection.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[mongo] connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      // eslint-disable-next-line no-console
      console.warn('[mongo] disconnected');
    });

    return connection;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('\x1b[31m[mongo] unable to connect to MongoDB\x1b[0m');
    // eslint-disable-next-line no-console
    console.error(`  URI      : ${uri.replace(/\/\/[^@]*@/, '//***:***@')}`);
    // eslint-disable-next-line no-console
    console.error(`  Reason   : ${error.message}`);
    // eslint-disable-next-line no-console
    console.error('  Tip      : run `npm run db:start` to launch a local MongoDB, or set MONGO_URI in .env');
    throw error;
  }
}

async function disconnectDatabase() {
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
