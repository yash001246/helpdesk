const router = require('express').Router();
const c = require('../controllers/ticketController');
const s = require('../validators/schemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Role decides which fields may be changed: owners edit content, admins triage.
const validateUpdate = (req, res, next) =>
  validate(req.user.role === 'admin' ? s.adminUpdateTicket : s.userUpdateTicket)(req, res, next);

router.get('/stats/summary', c.stats); // declared before /:id on purpose
router.route('/').get(validate(s.listTickets, 'query'), c.list).post(validate(s.createTicket), c.create);

router.use('/:id', validateObjectId('id'));
router.route('/:id').get(c.get).patch(validateUpdate, c.update).delete(c.remove);
router.route('/:id/comments').get(c.listComments).post(validate(s.comment), c.addComment);
router.get('/:id/activity', c.activity);

module.exports = router;
