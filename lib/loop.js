var Emitter = require('emitter'),
raf = require('raf');

function Loop() {
    this.setFPS(60);
    this.running = false;
    this.tick = this._tick.bind(this);
    this.lastFrame = 0;
    this.accumulator = 0;
    this.rafId = null;
}

Emitter(Loop.prototype);

Loop.prototype.setFPS = function (fps) {
    this.fps = fps;
    this.delta = 1000 / this.fps;
};

Loop.prototype._tick = function () {
    var now;

    if (!this.isRunning()) {
        return;
    }

   /* now = Date.now();
    this.accumulator += now - this.lastFrame;
    if (this.accumulator > 250) {
        this.accumulator = 250;
    }
    this.lastFrame = now;

    while (this.canTick()) {
        this.emit('update', this.delta);
    }*/

    this.emit('render');
    this.rafId = raf(this.tick);
};

Loop.prototype.canTick = function () {
    if (this.accumulator >= this.delta) {
        this.accumulator -= this.delta;
        return true;
    }

    return false;
};

Loop.prototype.start = function (fps) {
    if (fps) {
        this.setFPS(fps);
    }

    if (this.isRunning()) {
        return;
    }

    this.lastFrame = Date.now();
    this.accumulator = 0;

    this.running = true;

    if( this.rafId ) {
      raf.cancel(this.rafId);
      this.rafId = null;
    }

    raf(this.tick);
};

Loop.prototype.stop = function () {
    this.running = false;

    if( this.rafId ) {
      raf.cancel(this.rafId);
      this.rafId = null;
    }
};

Loop.prototype.isRunning = function () {
    return this.running;
};

module.exports = Loop;
