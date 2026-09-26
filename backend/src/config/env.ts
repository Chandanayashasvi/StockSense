import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set in backend/.env');
}

export const env = {
  port: Number(process.env.PORT ?? 8000),
  databaseUrl,
  jwtSecret: process.env.JWT_SECRET ?? 'development-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPassword: process.env.SMTP_PASSWORD ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',
};
