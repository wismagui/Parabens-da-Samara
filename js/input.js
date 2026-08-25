// Hand-rolled touch controls: a dynamic virtual joystick (left zone) for
// movement and a drag-to-look zone (right zone) for camera yaw. Each zone
// tracks its own pointerId so both work simultaneously on real multi-touch
// hardware. A keyboard fallback (WASD/arrows) is included for desktop testing.

const JOYSTICK_MAX_RADIUS = 55; // px

export class InputController {
  constructor({ joystickZone, cameraZone, joystickBase, joystickKnob }) {
    this.joystickZone = joystickZone;
    this.cameraZone = cameraZone;
    this.joystickBase = joystickBase;
    this.joystickKnob = joystickKnob;

    this.enabled = true;

    this.moveVector = { x: 0, y: 0 }; // x = strafe, y = forward, camera-relative, each -1..1
    this._pendingYawDelta = 0;

    this._joystickPointerId = null;
    this._joystickOrigin = { x: 0, y: 0 };

    this._cameraPointerId = null;
    this._cameraLast = { x: 0, y: 0 };

    this._keys = new Set();

    this._bindJoystick();
    this._bindCameraDrag();
    this._bindKeyboard();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this._resetJoystick();
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    }
  }

  _bindJoystick() {
    const zone = this.joystickZone;

    const onDown = (e) => {
      if (!this.enabled) return;
      if (this._joystickPointerId !== null) return;
      this._joystickPointerId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      const rect = zone.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._joystickOrigin = { x, y };
      this.joystickBase.style.left = `${x}px`;
      this.joystickBase.style.top = `${y}px`;
      this.joystickBase.style.opacity = '1';
      this.joystickKnob.style.left = `${x}px`;
      this.joystickKnob.style.top = `${y}px`;
      this.joystickKnob.style.opacity = '1';
      e.preventDefault();
    };

    const onMove = (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      const rect = zone.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let dx = x - this._joystickOrigin.x;
      let dy = y - this._joystickOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_MAX_RADIUS) {
        dx = (dx / dist) * JOYSTICK_MAX_RADIUS;
        dy = (dy / dist) * JOYSTICK_MAX_RADIUS;
      }
      this.joystickKnob.style.left = `${this._joystickOrigin.x + dx}px`;
      this.joystickKnob.style.top = `${this._joystickOrigin.y + dy}px`;

      this.moveVector.x = dx / JOYSTICK_MAX_RADIUS;
      this.moveVector.y = -dy / JOYSTICK_MAX_RADIUS; // screen down = backward
      e.preventDefault();
    };

    const onUp = (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      this._resetJoystick();
      e.preventDefault();
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
  }

  _resetJoystick() {
    this._joystickPointerId = null;
    this.moveVector.x = 0;
    this.moveVector.y = 0;
    this.joystickBase.style.opacity = '0';
    this.joystickKnob.style.opacity = '0';
  }

  _bindCameraDrag() {
    const zone = this.cameraZone;

    const onDown = (e) => {
      if (!this.enabled) return;
      if (this._cameraPointerId !== null) return;
      this._cameraPointerId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      this._cameraLast = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };

    const onMove = (e) => {
      if (e.pointerId !== this._cameraPointerId) return;
      const dx = e.clientX - this._cameraLast.x;
      this._cameraLast = { x: e.clientX, y: e.clientY };
      this._pendingYawDelta += dx;
      e.preventDefault();
    };

    const onUp = (e) => {
      if (e.pointerId !== this._cameraPointerId) return;
      this._cameraPointerId = null;
      e.preventDefault();
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => this._keys.add(e.code));
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));
  }

  /** Call once per frame. Returns accumulated camera yaw delta (px) since last call and clears it. */
  consumeYawDelta() {
    const d = this._pendingYawDelta;
    this._pendingYawDelta = 0;
    if (!this.enabled) return 0;
    let keyboardYaw = 0;
    if (this._keys.has('ArrowLeft') || this._keys.has('KeyQ')) keyboardYaw -= 6;
    if (this._keys.has('ArrowRight') || this._keys.has('KeyE')) keyboardYaw += 6;
    return d + keyboardYaw;
  }

  /** Returns {x, y} camera-relative move vector, combining joystick + keyboard fallback. */
  getMoveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.moveVector.x;
    let y = this.moveVector.y;
    if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) y = 1;
    if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) y = -1;
    if (this._keys.has('KeyA')) x = -1;
    if (this._keys.has('KeyD')) x = 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }
}
