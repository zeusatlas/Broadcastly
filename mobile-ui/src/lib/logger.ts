// The only sanctioned way to log. Silent outside development.
// Never pass phone numbers, member names, tokens or message bodies (NFR-PRIV-01).

type LogArgs = [message: string, context?: Record<string, unknown>];

export const logger = {
  debug: (...args: LogArgs) => {
    if (__DEV__) console.debug(...args);
  },
  warn: (...args: LogArgs) => {
    if (__DEV__) console.warn(...args);
  },
  // TODO(crash reporting): forward to the chosen crash reporter once one is agreed.
  error: (...args: LogArgs) => {
    if (__DEV__) console.error(...args);
  },
};
