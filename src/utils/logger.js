const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', debug: 'DEBUG' };

function timestamp() {
  return new Date().toISOString();
}

function format(level, ...args) {
  const prefix = `[${timestamp()}] ${LEVELS[level]}:`;
  console[level](prefix, ...args);
}

export default {
  info: (...args) => format('info', ...args),
  warn: (...args) => format('warn', ...args),
  error: (...args) => format('error', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') format('debug', ...args);
  }
};
