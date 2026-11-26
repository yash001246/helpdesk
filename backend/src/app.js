const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const isTest = env.nodeEnv === 'test';

app.set('trust proxy', 1); // correct client IPs behind Render/Heroku/nginx
app.use(helmet());
app.use(cors({ origin: env.clientUrls }));
app.use(express.json({ limit: '100kb' }));
app.use(mongoSanitize()); // strips $ and . keys -> blocks NoSQL operator injection
if (!isTest) app.use(morgan('dev'));

const limiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', limiter(30)); // brute-force protection for login/register
app.use('/api', limiter(600), routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
