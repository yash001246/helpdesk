const router = require('express').Router();
const c = require('../controllers/authController');
const s = require('../validators/schemas');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.post('/register', validate(s.register), c.register);
router.post('/login', validate(s.login), c.login);
router.get('/me', authenticate, c.me);

module.exports = router;
