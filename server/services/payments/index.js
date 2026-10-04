const config = require('../../config');
const mockProvider = require('./mockProvider');

/**
 * Provider registry. `stripe` is required lazily so the project never breaks
 * when the optional dependency is absent.
 */
function getProvider(name = config.payments.provider) {
  if (name === 'stripe') {
    // eslint-disable-next-line global-require
    return require('./stripeProvider');
  }
  return mockProvider;
}

const isSandbox = (name = config.payments.provider) => getProvider(name).name === 'mock';

module.exports = { getProvider, isSandbox, mockProvider };
