// Idempotent seed: creates an admin, a demo user and a few sample tickets.
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');

(async () => {
  await connectDB(env.mongoUri);

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@helpdesk.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({ name: process.env.ADMIN_NAME || 'Admin', email: adminEmail, password: adminPassword, role: 'admin' });
    console.log(`Created admin  ${adminEmail} / ${adminPassword}`);
  } else console.log(`Admin ${adminEmail} already exists`);

  let demo = await User.findOne({ email: 'user@helpdesk.com' });
  if (!demo) {
    demo = await User.create({ name: 'Demo User', email: 'user@helpdesk.com', password: 'User@12345' });
    console.log('Created user   user@helpdesk.com / User@12345');
  }

  if (!(await Ticket.exists({ createdBy: demo._id }))) {
    await Ticket.insertMany([
      { title: 'Cannot reset my password', description: 'The reset email never arrives even after several attempts.', category: 'account', priority: 'high', createdBy: demo._id },
      { title: 'Invoice shows wrong amount', description: 'My October invoice is higher than the agreed plan price.', category: 'billing', priority: 'medium', createdBy: demo._id },
      { title: 'Add dark mode', description: 'It would be great to have a dark theme for the dashboard.', category: 'feature_request', priority: 'low', createdBy: demo._id },
    ]);
    console.log('Created 3 sample tickets');
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
