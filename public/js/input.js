// ============================================
// TRAP RUN — Input Handler
// ============================================
const Input = (() => {
  const keys = {};
  const justPressed = {};
  const justReleased = {};
  const touchState = { left: false, right: false, jump: false };
  let enabled = true;

  function init() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (!enabled) return;
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }
      if (!keys[key]) {
        justPressed[key] = true;
      }
      keys[key] = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      const key = e.key.toLowerCase();
      keys[key] = false;
      justReleased[key] = true;
    });

    // Touch controls
    setupTouchButton('touch-btn-left', 'left');
    setupTouchButton('touch-btn-right', 'right');
    setupTouchButton('touch-btn-jump', 'jump');

    // Show touch controls on mobile
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const touchEl = document.getElementById('touch-controls');
      if (touchEl) touchEl.classList.remove('hidden');
    }
  }

  function setupTouchButton(id, action) {
    const el = document.getElementById(id);
    if (!el) return;

    const start = (e) => {
      e.preventDefault();
      touchState[action] = true;
      if (action === 'jump') justPressed[' '] = true;
    };
    const end = (e) => {
      e.preventDefault();
      touchState[action] = false;
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }

  function isLeft() {
    return keys['arrowleft'] || keys['a'] || touchState.left;
  }

  function isRight() {
    return keys['arrowright'] || keys['d'] || touchState.right;
  }

  function isJump() {
    return keys[' '] || keys['arrowup'] || keys['w'] || touchState.jump;
  }

  function isJumpPressed() {
    return justPressed[' '] || justPressed['arrowup'] || justPressed['w'];
  }

  function isKey(key) {
    return keys[key.toLowerCase()];
  }

  function isKeyPressed(key) {
    return justPressed[key.toLowerCase()];
  }

  function clearFrame() {
    for (const k in justPressed) justPressed[k] = false;
    for (const k in justReleased) justReleased[k] = false;
  }

  function setEnabled(val) {
    enabled = val;
  }

  function reset() {
    for (const k in keys) keys[k] = false;
    for (const k in justPressed) justPressed[k] = false;
    touchState.left = false;
    touchState.right = false;
    touchState.jump = false;
  }

  return { init, isLeft, isRight, isJump, isJumpPressed, isKey, isKeyPressed, clearFrame, setEnabled, reset };
})();
