const { z } = require('zod');
const { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, ROLES, EVENTS } = require('../utils/constants');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(10);

const atLeastOne = (obj) => Object.keys(obj).length > 0;

const ticketFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
};

module.exports = {
  register: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    email,
    password,
  }),
  login: z.object({ email, password: z.string().min(1, 'Password is required') }),

  createTicket: z.object({
    ...ticketFields,
    category: ticketFields.category.default('general'),
    priority: ticketFields.priority.default('medium'),
  }),
  // Owners may edit the content of their ticket…
  userUpdateTicket: z
    .object(ticketFields)
    .partial()
    .refine(atLeastOne, 'Provide at least one field to update'),
  // …admins may only triage it (status / priority).
  adminUpdateTicket: z
    .object({ status: z.enum(TICKET_STATUSES), priority: ticketFields.priority })
    .partial()
    .refine(atLeastOne, 'Provide at least one field to update'),

  listTickets: z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(['newest', 'oldest', 'updated']).default('newest'),
    page,
    limit,
  }),

  comment: z.object({ message: z.string().trim().min(1, 'Comment cannot be empty').max(2000) }),

  listUsers: z.object({ search: z.string().trim().max(100).optional(), page, limit }),
  updateRole: z.object({ role: z.enum(Object.values(ROLES)) }),
  listActivity: z.object({ event: z.enum(Object.values(EVENTS)).optional(), page, limit }),
  listNotifications: z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }),
};
