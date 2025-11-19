import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
  expiration: process.env.JWT_EXPIRATION || '24h',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
