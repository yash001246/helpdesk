# Helpdesk – Support Ticket Management System

A mini helpdesk where **users raise support tickets** and **administrators triage and resolve them**.
Built for the *Full Stack Developer – Technical Assignment* (Node.js · Express · MongoDB · React).

| | |
|---|---|
| **Backend** | Node.js, Express 4, Mongoose (MongoDB), JWT, Zod, bcrypt |
| **Frontend** | React 18 + Vite, React Router, Axios |
| **Extras** | Event-driven workflow, activity log, in-app + optional email notifications, search / pagination / sorting, dashboard stats, Jest + Supertest tests |

- Live app: `<paste frontend URL here>` · Live API: `<paste API URL here>/api/health`  → see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- API docs: [docs/API.md](docs/API.md) · Postman collection: [docs/postman_collection.json](docs/postman_collection.json)
- Database design: [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)

---

## 1. Requirements coverage (from the assignment PDF)

| PDF section | Requirement | Where / how |
|---|---|---|
| 3A | Register & login | `POST /api/auth/register`, `/login` – `authController.js` |
| 3A | JWT authentication | HS256 token, 7d expiry, verified in `middleware/auth.js` (user re-loaded on every request) |
| 3A | Two roles: User, Admin | `User.role`; `authorize('admin')` middleware; role can't be chosen at registration |
| 3A | Role-based restrictions | Users → own tickets only; admin routes behind `authorize('admin')` |
| 3B | Create / view own tickets | `POST /tickets`, `GET /tickets` (auto-scoped to the caller) |
| 3B | Edit & delete "where appropriate" | Owner may edit/delete **only while status = `open`** (once support is working on it, content is frozen) |
| 3B | Track status | `open → in_progress → resolved → closed`, shown as badges + per-ticket activity timeline |
| 3B | Comment on own tickets | `POST /tickets/:id/comments` |
| 3B | Title, description, category, priority, status… | `Ticket` model (+ `createdBy`, `resolvedAt`, `closedAt`, timestamps) |
| 3C | Admin: view all, filter by status & priority | `GET /tickets?status=&priority=&category=&search=` (admin is not scoped) |
| 3C | Admin: update status & priority | `PATCH /tickets/:id` with admin schema (`status`, `priority`) |
| 3C | Admin: details + comments, manage any user's ticket | `GET /tickets/:id`, `/comments`, delete any ticket |
| 3D | Comments tied to ticket & user; admin can reply to any ticket | `Comment` has `ticket`, `author`, `authorRole` |
| 4 | Events: Created / Updated / Status Changed / Comment Added / Resolved | `events/` – see §3 (also `ticket.deleted`) |
| 4 | Actions: activity log / notifications | `ActivityLog` collection + `Notification` collection (+ email via SMTP if configured) |
| 5 | Maintainable code, REST design, validation, error handling, separation of concerns | routes → controllers → services → models; Zod validation; central error handler |
| 6 | **Bonus:** search & pagination, sorting & filtering, dashboard, email, tests, React UI | all implemented |
| 7 | Submission items | this README, `docs/API.md` + Postman, `docs/DATABASE_DESIGN.md`, `docs/DEPLOYMENT.md`, source repo |

---

## 2. Architecture

```
backend/src
├── config/        env + MongoDB connection
├── models/        User, Ticket, Comment, ActivityLog, Notification   (Mongoose schemas + indexes)
├── validators/    Zod schemas for every request body / query string
├── middleware/    auth (JWT + roles), validate, errorHandler
├── routes/        URL → controller mapping, per-route guards
├── controllers/   thin HTTP layer (parse request → call service → shape response)
├── services/      business rules: ticketService, commentService, statsService, mailer
├── events/        eventBus + handlers (activityLog, notifier) + wiring
└── app.js / server.js
```

Request flow: `route → authenticate → authorize/validate → controller → service → model`, and any thrown `ApiError`
ends in one `errorHandler`, so every error has the shape `{ "success": false, "message": "...", "errors": [...] }`.

## 3. Event-driven workflow

Services never write logs or notifications themselves. After a state change they call
`bus.publish(event, payload)`; handlers registered in `events/index.js` perform the actions.

| Event | Triggered when | Actions |
|---|---|---|
| `ticket.created` | a user submits a ticket | activity log · notify all admins |
| `ticket.updated` | title/description/category/priority edited | activity log · notify admins (if user edited) or the owner (if admin edited) |
| `ticket.status_changed` | admin changes status | activity log · notify the owner |
| `ticket.comment_added` | user or admin comments | activity log · notify the other side |
| `ticket.resolved` | status set to `resolved` | activity log · notify the owner (the plain status notification is suppressed to avoid duplicates) |
| `ticket.deleted` | ticket removed | activity log (kept after deletion) · notify owner if an admin deleted it |

Design points: handlers run through `Promise.allSettled`, so a failing handler **never breaks the API request**;
the actor never notifies themselves; e-mails are fire-and-forget and only sent when `SMTP_HOST` is set.
Adding a new action (e.g. Slack webhook) = one new handler file + one line in `events/index.js`.

## 4. Getting started

**Prerequisites:** Node 18+, MongoDB (local or Atlas).

```bash
# 1) backend
cd backend
cp .env.example .env        # set MONGODB_URI and JWT_SECRET
npm install
npm run seed                # admin + demo user + 3 sample tickets (optional)
npm run dev                 # http://localhost:5000

# 2) frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (Vite proxies /api to :5000)
```

**Seeded accounts** (`npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@helpdesk.com` | `Admin@12345` |
| User | `user@helpdesk.com` | `User@12345` |

Anyone who registers through the UI becomes a *User*. An admin can promote users on the **Users** page.

**Environment variables** (`backend/.env`)

| Name | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string *(required)* |
| `JWT_SECRET` | signing secret, use a long random string *(required)* |
| `JWT_EXPIRES_IN` | token lifetime, default `7d` |
| `CLIENT_URL` | allowed CORS origin(s), comma separated |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | optional email notifications |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | used by the seed script |

Frontend: `VITE_API_URL` (only needed when the API is on another domain, e.g. production).

### Tests
```bash
cd backend && npm test
```
25 integration tests (Jest + Supertest) cover auth, RBAC, ownership, validation, NoSQL-injection, filters/search,
comments, every event → activity log/notification, status rules, stats and admin user management.
By default they start an in-memory MongoDB (`mongodb-memory-server`, needs internet on first run to fetch the binary).
To use an existing instance instead: `MONGO_TEST_URI=mongodb://127.0.0.1:27017/helpdesk_test npm test`.

## 5. Security measures

- Passwords hashed with **bcrypt (cost 12)**; never returned by the API (`select: false` + `toJSON` transform).
- **JWT** (HS256, algorithm pinned on verify); the user is re-fetched per request, so deleted users/role changes apply immediately.
- **Role escalation blocked**: registration ignores any `role` in the body; admins can't change their own role.
- **Ownership enforced in the service layer** (`getAccessible`) for tickets, comments and activity – not only in the UI.
- **Input validation** with Zod on every body/query; unknown fields are stripped (so a user can't send `status` or `createdBy`).
- `express-mongo-sanitize` + schema typing prevent **NoSQL operator injection**; search input is regex-escaped.
- `helmet` headers, CORS allow-list, 100 kb body limit, **rate limiting** (30 req/15 min on `/auth`, 600 on the rest).
- Generic login error (no user enumeration); stack traces hidden in production.

## 6. Implementation decisions & assumptions

- **MongoDB + Mongoose** – tickets/comments are document-shaped and read together; indexes cover the real query patterns.
- **Users edit content, admins triage** – admins may change only `status`/`priority` (not rewrite a user's words); users can't touch status. Separate Zod schemas enforce this.
- **Edit/delete window** – users can edit/delete only `open` tickets (the interpretation of "where appropriate"); admins can delete any ticket. Deleting a ticket removes its comments but **keeps its activity log** for audit.
- **Closed tickets** don't accept new comments; resolved ones still do (a user can reply "still broken").
- **Services layer** keeps controllers thin and makes business rules testable.
- **In-process event bus** (Node `EventEmitter`) – right-sized for this scope. For multi-instance production it would be swapped for a queue (BullMQ / SQS); handlers wouldn't change.
- **Notifications are polled** every 30 s by the UI (no websockets) – simple and robust.
- **Sorting** supports newest / oldest / recently updated; priority is filterable rather than sortable (it's an enum, not a number).

## 7. Possible improvements
Refresh tokens / httpOnly cookies, email verification & password reset, ticket assignment to specific agents, file attachments, websockets for live updates, frontend component tests.
