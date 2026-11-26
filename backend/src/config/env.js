require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Helpdesk <no-reply@helpdesk.local>',
  },
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
}

module.exports = config;
