export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'physics_lms:',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'physics-lms-super-secret-access-token-key-2026-el-shahat',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'physics-lms-super-secret-refresh-token-key-2026-el-shahat',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  security: {
    deviceRestrictionMode: process.env.DEVICE_RESTRICTION_MODE || 'REPLACE', // REPLACE or BLOCK
    streamSecretKey: process.env.STREAM_SECRET_KEY || 'physics-secure-stream-hmac-key-2026-shahat-physics',
    signedUrlExpirationSeconds: parseInt(process.env.SIGNED_URL_EXPIRATION_SECONDS || '7200', 10),
    videoStoragePath: process.env.VIDEO_STORAGE_PATH || 'public/uploads/videos',
  },
});
