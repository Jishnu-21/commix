const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message, error = {}, meta = {}) => {
    console.error(JSON.stringify({ message, error, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({ message, ...meta, timestamp: new Date().toISOString() }));
  },
  debug: (message, meta = {}) => {
    console.debug(JSON.stringify({ message, ...meta, timestamp: new Date().toISOString() }));
  }
};

module.exports = logger;
