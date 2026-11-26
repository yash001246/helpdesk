const { EventEmitter } = require('events');

/**
 * Tiny in-process event bus.
 *
 * `publish()` runs every listener and waits for all of them with Promise.allSettled, so
 *  - a failing handler can never break the HTTP request that produced the event, and
 *  - tests can await the side-effects (activity log, notifications) deterministically.
 */
class AppEventBus extends EventEmitter {
  async publish(event, payload) {
    const results = await Promise.allSettled(
      this.listeners(event).map((handler) => Promise.resolve().then(() => handler(payload)))
    );
    results.forEach((r) => {
      if (r.status === 'rejected') console.error(`[events] handler for "${event}" failed:`, r.reason?.message || r.reason);
    });
  }
}

module.exports = new AppEventBus();
