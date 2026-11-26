// Generates docs/postman_collection.json  ->  node backend/scripts/generate-postman.js
const fs = require('fs');
const path = require('path');

const hdr = (token) => [
  { key: 'Content-Type', value: 'application/json' },
  ...(token ? [{ key: 'Authorization', value: `Bearer {{${token}}}` }] : []),
];
const req = (name, method, url, { token, body, test } = {}) => ({
  name,
  event: test ? [{ listen: 'test', script: { type: 'text/javascript', exec: test.split('\n') } }] : undefined,
  request: {
    method,
    header: hdr(token),
    url: {
      raw: `{{baseUrl}}${url}`,
      host: ['{{baseUrl}}'],
      path: url.split('?')[0].split('/').filter(Boolean),
      query: url.includes('?') ? url.split('?')[1].split('&').map((p) => ({ key: p.split('=')[0], value: p.split('=')[1] })) : undefined,
    },
    body: body ? { mode: 'raw', raw: JSON.stringify(body, null, 2) } : undefined,
  },
});
const saveToken = (v) => `pm.test('status ok', () => pm.response.code < 300);\npm.collectionVariables.set('${v}', pm.response.json().data.token);`;

const collection = {
  info: {
    name: 'Helpdesk – Support Ticket Management API',
    description: 'Run "Login (admin)" and "Login (user)" first – tokens are stored in collection variables. Seed users: admin@helpdesk.com / Admin@12345 and user@helpdesk.com / User@12345 (npm run seed).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000/api' },
    { key: 'userToken', value: '' },
    { key: 'adminToken', value: '' },
    { key: 'ticketId', value: '' },
    { key: 'userId', value: '' },
  ],
  item: [
    {
      name: 'Auth',
      item: [
        req('Register', 'POST', '/auth/register', { body: { name: 'Jane Doe', email: 'jane@example.com', password: 'Passw0rd123' }, test: saveToken('userToken') }),
        req('Login (user)', 'POST', '/auth/login', { body: { email: 'user@helpdesk.com', password: 'User@12345' }, test: `${saveToken('userToken')}\npm.collectionVariables.set('userId', pm.response.json().data.user._id);` }),
        req('Login (admin)', 'POST', '/auth/login', { body: { email: 'admin@helpdesk.com', password: 'Admin@12345' }, test: saveToken('adminToken') }),
        req('Current user', 'GET', '/auth/me', { token: 'userToken' }),
      ],
    },
    {
      name: 'Tickets (user)',
      item: [
        req('Create ticket', 'POST', '/tickets', { token: 'userToken', body: { title: 'VPN keeps disconnecting', description: 'The VPN drops every few minutes since yesterday.', category: 'technical', priority: 'high' }, test: "pm.collectionVariables.set('ticketId', pm.response.json().data._id);" }),
        req('List my tickets (paginated)', 'GET', '/tickets?page=1&limit=10&sort=newest', { token: 'userToken' }),
        req('Search + filter', 'GET', '/tickets?search=vpn&status=open&priority=high', { token: 'userToken' }),
        req('Get ticket', 'GET', '/tickets/{{ticketId}}', { token: 'userToken' }),
        req('Edit ticket (only while open)', 'PATCH', '/tickets/{{ticketId}}', { token: 'userToken', body: { title: 'VPN keeps disconnecting on Wi-Fi', priority: 'urgent' } }),
        req('Delete ticket (only while open)', 'DELETE', '/tickets/{{ticketId}}', { token: 'userToken' }),
        req('Dashboard stats (own tickets)', 'GET', '/tickets/stats/summary', { token: 'userToken' }),
      ],
    },
    {
      name: 'Comments',
      item: [
        req('List comments', 'GET', '/tickets/{{ticketId}}/comments', { token: 'userToken' }),
        req('Add comment (user)', 'POST', '/tickets/{{ticketId}}/comments', { token: 'userToken', body: { message: 'Any update on this?' } }),
        req('Reply (admin)', 'POST', '/tickets/{{ticketId}}/comments', { token: 'adminToken', body: { message: 'We are looking into it.' } }),
        req('Ticket activity timeline', 'GET', '/tickets/{{ticketId}}/activity', { token: 'userToken' }),
      ],
    },
    {
      name: 'Admin',
      item: [
        req('List ALL tickets', 'GET', '/tickets', { token: 'adminToken' }),
        req('Filter by status + priority', 'GET', '/tickets?status=open&priority=high', { token: 'adminToken' }),
        req('Update status / priority', 'PATCH', '/tickets/{{ticketId}}', { token: 'adminToken', body: { status: 'in_progress', priority: 'high' } }),
        req('Mark as resolved', 'PATCH', '/tickets/{{ticketId}}', { token: 'adminToken', body: { status: 'resolved' } }),
        req('Dashboard stats (all tickets)', 'GET', '/tickets/stats/summary', { token: 'adminToken' }),
        req('List users', 'GET', '/admin/users', { token: 'adminToken' }),
        req('Change user role', 'PATCH', '/admin/users/{{userId}}/role', { token: 'adminToken', body: { role: 'admin' } }),
        req('Global activity log', 'GET', '/admin/activity?page=1&limit=15', { token: 'adminToken' }),
      ],
    },
    {
      name: 'Notifications',
      item: [
        req('List my notifications', 'GET', '/notifications', { token: 'userToken' }),
        req('Mark all as read', 'PATCH', '/notifications/read-all', { token: 'userToken' }),
      ],
    },
    { name: 'Health', item: [req('Health check', 'GET', '/health')] },
  ],
};

const out = path.join(__dirname, '..', '..', 'docs', 'postman_collection.json');
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
console.log('Wrote', out);
