# API Documentation

Base URL: `http://localhost:5000/api` · JSON everywhere · Auth: `Authorization: Bearer <token>`
Importable collection: [`postman_collection.json`](postman_collection.json) (26 requests, tokens auto-saved).

**Response shape**
```jsonc
{ "success": true,  "data": { … }, "pagination": { "page":1, "limit":10, "total":42, "pages":5 } }  // pagination on lists
{ "success": false, "message": "Validation failed", "errors": [ { "field": "title", "message": "…" } ] }
```
**Status codes:** 200 OK · 201 Created · 400 validation / bad id · 401 not authenticated · 403 forbidden · 404 not found · 409 conflict (state rule / duplicate) · 429 rate-limited.

**Enums** – status: `open | in_progress | resolved | closed` · priority: `low | medium | high | urgent` · category: `technical | billing | account | feature_request | general | other`

## Auth
| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, password }` – password ≥ 8 chars with a letter and a number. Always creates a `user`. → `{ token, user }` |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | any | current user |

## Tickets
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/tickets` | any | `{ title, description, category?, priority? }` → 201 |
| GET | `/tickets` | any | **User:** own tickets · **Admin:** all tickets. Query: `status, priority, category, search, sort=newest\|oldest\|updated, page=1, limit=10 (max 50)` |
| GET | `/tickets/:id` | owner / admin | ticket details |
| PATCH | `/tickets/:id` | owner / admin | **User** (only while `open`): any of `title, description, category, priority`. **Admin:** `status`, `priority`. Other fields are rejected/stripped. |
| DELETE | `/tickets/:id` | owner (only while `open`) / admin | also deletes the ticket's comments |
| GET | `/tickets/stats/summary` | any | dashboard numbers – scoped to the caller's tickets (admin: all) |
| GET | `/tickets/:id/comments` | owner / admin | oldest → newest |
| POST | `/tickets/:id/comments` | owner / admin | `{ message }` (1–2000). 409 if ticket is `closed` |
| GET | `/tickets/:id/activity` | owner / admin | activity timeline, newest first |

Example – admin resolves a ticket:
```http
PATCH /api/tickets/6560c1…  Authorization: Bearer <adminToken>
{ "status": "resolved" }
```
→ `200` with the ticket (`resolvedAt` set); events `ticket.status_changed` + `ticket.resolved` fire; the owner gets a notification.

Stats response:
```json
{ "total": 12, "createdLast7Days": 5, "avgResolutionHours": 6.4,
  "byStatus": { "open": 4, "in_progress": 3, "resolved": 3, "closed": 2 },
  "byPriority": { "low": 2, "medium": 5, "high": 4, "urgent": 1 },
  "byCategory": { "technical": 5, "billing": 2, "account": 1, "feature_request": 2, "general": 2, "other": 0 } }
```

## Notifications *(any authenticated user – own notifications only)*
| Method | Path | Description |
|---|---|---|
| GET | `/notifications?limit=20` | `{ data: [...], unreadCount }` |
| PATCH | `/notifications/:id/read` | mark one as read |
| PATCH | `/notifications/read-all` | mark all as read |

## Admin *(role = admin)*
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users?search=&page=&limit=` | list users |
| PATCH | `/admin/users/:id/role` | `{ role: "user" \| "admin" }` – cannot change your own role |
| GET | `/admin/activity?event=&page=&limit=` | global activity log |

## Utility
`GET /health` → `{ success: true, status: "ok" }` (used for uptime checks on the hosting platform).
