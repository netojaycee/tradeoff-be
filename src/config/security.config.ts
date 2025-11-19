import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12') || 12,
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '900') || 900,
  rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT || '100') || 100,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') || 10485760, // 10MB
  allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ],
}));
