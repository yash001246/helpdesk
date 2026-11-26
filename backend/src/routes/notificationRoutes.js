const router = require('express').Router();
const c = require('../controllers/notificationController');
const s = require('../validators/schemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', validate(s.listNotifications, 'query'), c.list);
router.patch('/read-all', c.markAllRead);
router.patch('/:id/read', validateObjectId('id'), c.markRead);

module.exports = router;
