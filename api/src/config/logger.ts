import pino from 'pino';

import { env, isProduction } from './env';

// Member data is sensitive personal data (Act 843). These paths are masked in every log line,
// but redaction is a safety net: never log a member record, phone number or message body (NFR-PRIV-01).
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.phone',
  '*.phoneNumber',
  'req.body',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  base: { service: 'broadcastly-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Development output is for people: local time, without service/pid/hostname on every line.
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
      },
});
