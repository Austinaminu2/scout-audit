type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, ...args: unknown[]) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  if (level === 'error') console.error(line, ...args);
  else if (level === 'warn') console.warn(line, ...args);
  else console.log(line, ...args);
}

export default {
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') log('debug', ...args);
  },
};
