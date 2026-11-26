const nodemailer = require('nodemailer');
const env = require('../config/env');

// Email is optional: it is only active when SMTP_HOST is configured.
const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

async function sendMail({ to, subject, text }) {
  if (!transporter) return false;
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  return true;
}

module.exports = { sendMail, emailEnabled: Boolean(transporter) };
