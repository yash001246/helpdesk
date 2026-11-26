const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/tickets', require('./ticketRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/admin', require('./adminRoutes'));

module.exports = router;
