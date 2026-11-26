const router = require('express').Router();
const c = require('../controllers/adminController');
const s = require('../validators/schemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/users', validate(s.listUsers, 'query'), c.listUsers);
router.patch('/users/:id/role', validateObjectId('id'), validate(s.updateRole), c.updateRole);
router.get('/activity', validate(s.listActivity, 'query'), c.activity);

module.exports = router;
