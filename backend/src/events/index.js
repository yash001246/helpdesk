const bus = require('./eventBus');
const { EVENTS } = require('../utils/constants');
const activityLog = require('./handlers/activityLog');
const notifier = require('./handlers/notifier');

// Event -> actions wiring lives in one place, so adding a new action is a one-line change.
Object.values(EVENTS).forEach((event) => {
  bus.on(event, activityLog(event));
  bus.on(event, notifier(event));
});

module.exports = bus;
