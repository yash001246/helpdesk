process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, app, User, ActivityLog, Notification;

const strongPw = 'Passw0rdOK';
const reg = async (name, email) => {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: strongPw });
  return { token: res.body.data.token, user: res.body.data.user };
};
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let alice, bob, admin;
const ticketBody = { title: 'Printer broken', description: 'The office printer does not print anything.', category: 'technical', priority: 'high' };

beforeAll(async () => {
  // Uses an in-memory MongoDB by default; set MONGO_TEST_URI to run against an existing instance.
  if (process.env.MONGO_TEST_URI) process.env.MONGODB_URI = process.env.MONGO_TEST_URI;
  else {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../src/app');
  User = require('../src/models/User');
  ActivityLog = require('../src/models/ActivityLog');
  Notification = require('../src/models/Notification');

  alice = await reg('Alice', 'alice@test.com');
  bob = await reg('Bob', 'bob@test.com');
  const a = await User.create({ name: 'Admin', email: 'admin@test.com', password: strongPw, role: 'admin' });
  const login = await request(app).post('/api/auth/login').send({ email: a.email, password: strongPw });
  admin = { token: login.body.data.token, user: login.body.data.user };
});

afterAll(async () => {
  if (process.env.MONGO_TEST_URI) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Authentication', () => {
  test('register ignores a client supplied role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Eve', email: 'eve@test.com', password: strongPw, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.user.password).toBeUndefined();
  });
  test('duplicate email -> 409', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Al', email: 'alice@test.com', password: strongPw });
    expect(res.status).toBe(409);
  });
  test('weak password -> 400 with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Al', email: 'x@test.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
  test('wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'Wrong1234' });
    expect(res.status).toBe(401);
  });
  test('protected route without token -> 401', async () => {
    expect((await request(app).get('/api/tickets')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('garbage'))).status).toBe(401);
  });
  test('NoSQL operator injection in login is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: strongPw });
    expect(res.status).toBe(400);
  });
});

describe('Tickets, access control and events', () => {
  let ticketId;

  test('user creates a ticket -> event logs activity and notifies admins', async () => {
    const res = await request(app).post('/api/tickets').set(auth(alice.token)).send(ticketBody);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('open');
    ticketId = res.body.data._id;

    expect(await ActivityLog.countDocuments({ ticket: ticketId, event: 'ticket.created' })).toBe(1);
    expect(await Notification.countDocuments({ user: admin.user._id, ticket: ticketId })).toBe(1);
  });

  test('invalid ticket payload -> 400', async () => {
    const res = await request(app).post('/api/tickets').set(auth(alice.token)).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('users only see their own tickets, admins see all', async () => {
    const mine = await request(app).get('/api/tickets').set(auth(alice.token));
    const others = await request(app).get('/api/tickets').set(auth(bob.token));
    const all = await request(app).get('/api/tickets').set(auth(admin.token));
    expect(mine.body.pagination.total).toBe(1);
    expect(others.body.pagination.total).toBe(0);
    expect(all.body.pagination.total).toBe(1);
  });

  test("another user cannot read, edit, delete or comment on someone's ticket", async () => {
    const h = auth(bob.token);
    expect((await request(app).get(`/api/tickets/${ticketId}`).set(h)).status).toBe(403);
    expect((await request(app).patch(`/api/tickets/${ticketId}`).set(h).send({ title: 'hacked' })).status).toBe(403);
    expect((await request(app).delete(`/api/tickets/${ticketId}`).set(h)).status).toBe(403);
    expect((await request(app).post(`/api/tickets/${ticketId}/comments`).set(h).send({ message: 'hi' })).status).toBe(403);
  });

  test('owner can edit content; status field is not accepted from users', async () => {
    const ok = await request(app).patch(`/api/tickets/${ticketId}`).set(auth(alice.token)).send({ title: 'Printer is broken' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.title).toBe('Printer is broken');

    const sneaky = await request(app).patch(`/api/tickets/${ticketId}`).set(auth(alice.token)).send({ status: 'resolved' });
    expect(sneaky.status).toBe(400); // schema strips unknown keys -> nothing left to update
    expect(await ActivityLog.countDocuments({ ticket: ticketId, event: 'ticket.updated' })).toBe(1);
  });

  test('regular user cannot use admin endpoints', async () => {
    expect((await request(app).get('/api/admin/users').set(auth(alice.token))).status).toBe(403);
    expect((await request(app).get('/api/admin/activity').set(auth(alice.token))).status).toBe(403);
  });

  test('admin filters by status and priority', async () => {
    const hit = await request(app).get('/api/tickets?status=open&priority=high').set(auth(admin.token));
    const miss = await request(app).get('/api/tickets?status=resolved').set(auth(admin.token));
    expect(hit.body.pagination.total).toBe(1);
    expect(miss.body.pagination.total).toBe(0);
  });

  test('search is case-insensitive and regex-safe', async () => {
    const hit = await request(app).get('/api/tickets?search=PRINTER').set(auth(alice.token));
    const weird = await request(app).get('/api/tickets?search=(.*').set(auth(alice.token));
    expect(hit.body.pagination.total).toBe(1);
    expect(weird.status).toBe(200);
  });

  test('comments: owner and admin can reply, events fire', async () => {
    const c1 = await request(app).post(`/api/tickets/${ticketId}/comments`).set(auth(alice.token)).send({ message: 'Any update?' });
    const c2 = await request(app).post(`/api/tickets/${ticketId}/comments`).set(auth(admin.token)).send({ message: 'Looking into it.' });
    expect(c1.status).toBe(201);
    expect(c2.body.data.authorRole).toBe('admin');

    const list = await request(app).get(`/api/tickets/${ticketId}/comments`).set(auth(alice.token));
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0].author.name).toBe('Alice');

    expect(await Notification.countDocuments({ user: alice.user._id, event: 'ticket.comment_added' })).toBe(1);
    expect(await ActivityLog.countDocuments({ ticket: ticketId, event: 'ticket.comment_added' })).toBe(2);
  });

  test('admin changes status/priority -> status_changed + notification', async () => {
    const res = await request(app).patch(`/api/tickets/${ticketId}`).set(auth(admin.token)).send({ status: 'in_progress', priority: 'urgent' });
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe('urgent');
    expect(await ActivityLog.countDocuments({ ticket: ticketId, event: 'ticket.status_changed' })).toBe(1);
    expect(await Notification.countDocuments({ user: alice.user._id, event: 'ticket.status_changed' })).toBe(1);
  });

  test('owner can no longer edit or delete once the ticket is in progress', async () => {
    const h = auth(alice.token);
    expect((await request(app).patch(`/api/tickets/${ticketId}`).set(h).send({ title: 'Another title' })).status).toBe(409);
    expect((await request(app).delete(`/api/tickets/${ticketId}`).set(h)).status).toBe(409);
  });

  test('resolving fires ticket.resolved once and sets resolvedAt', async () => {
    const res = await request(app).patch(`/api/tickets/${ticketId}`).set(auth(admin.token)).send({ status: 'resolved' });
    expect(res.body.data.resolvedAt).toBeDefined();
    expect(await ActivityLog.countDocuments({ ticket: ticketId, event: 'ticket.resolved' })).toBe(1);
    expect(await Notification.countDocuments({ user: alice.user._id, event: 'ticket.resolved' })).toBe(1);
    // the status_changed -> resolved notification is deliberately suppressed (no duplicates)
    expect(await Notification.countDocuments({ user: alice.user._id, event: 'ticket.status_changed' })).toBe(1);
  });

  test('closed tickets reject comments', async () => {
    await request(app).patch(`/api/tickets/${ticketId}`).set(auth(admin.token)).send({ status: 'closed' });
    const res = await request(app).post(`/api/tickets/${ticketId}/comments`).set(auth(alice.token)).send({ message: 'late' });
    expect(res.status).toBe(409);
  });

  test('activity timeline is visible to the owner', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}/activity`).set(auth(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
  });

  test('notifications: list, unread count, mark all read', async () => {
    const list = await request(app).get('/api/notifications').set(auth(alice.token));
    expect(list.body.unreadCount).toBeGreaterThan(0);
    await request(app).patch('/api/notifications/read-all').set(auth(alice.token));
    const after = await request(app).get('/api/notifications').set(auth(alice.token));
    expect(after.body.unreadCount).toBe(0);
  });

  test('stats are scoped by role', async () => {
    const mine = await request(app).get('/api/tickets/stats/summary').set(auth(alice.token));
    const theirs = await request(app).get('/api/tickets/stats/summary').set(auth(bob.token));
    expect(mine.body.data.total).toBe(1);
    expect(mine.body.data.byStatus.closed).toBe(1);
    expect(theirs.body.data.total).toBe(0);
  });

  test('owner can delete an open ticket; comments are removed, audit log is kept', async () => {
    const t = await request(app).post('/api/tickets').set(auth(bob.token)).send(ticketBody);
    const id = t.body.data._id;
    await request(app).post(`/api/tickets/${id}/comments`).set(auth(bob.token)).send({ message: 'bump' });
    const del = await request(app).delete(`/api/tickets/${id}`).set(auth(bob.token));
    expect(del.status).toBe(200);
    expect((await request(app).get(`/api/tickets/${id}`).set(auth(bob.token))).status).toBe(404);
    expect(await ActivityLog.countDocuments({ ticket: id, event: 'ticket.deleted' })).toBe(1);
  });

  test('invalid ObjectId -> 400', async () => {
    expect((await request(app).get('/api/tickets/not-an-id').set(auth(alice.token))).status).toBe(400);
  });
});

describe('Admin management', () => {
  test('admin can list users and promote one; cannot change own role', async () => {
    const users = await request(app).get('/api/admin/users').set(auth(admin.token));
    expect(users.body.data.length).toBeGreaterThanOrEqual(4);

    const promote = await request(app).patch(`/api/admin/users/${bob.user._id}/role`).set(auth(admin.token)).send({ role: 'admin' });
    expect(promote.body.data.role).toBe('admin');

    const self = await request(app).patch(`/api/admin/users/${admin.user._id}/role`).set(auth(admin.token)).send({ role: 'user' });
    expect(self.status).toBe(400);
  });
});
