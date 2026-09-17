// ============================================
// TRAP RUN — Camera System
// ============================================
const Camera = (() => {
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let shakeX = 0;
  let shakeY = 0;
  let shakeIntensity = 0;
  let shakeDuration = 0;
  let shakeTimer = 0;
  let levelWidth = 800;
  let levelHeight = 600;
  let canvasWidth = 800;
  let canvasHeight = 600;
  let shakeEnabled = true;

  function setLevel(w, h) {
    levelWidth = w;
    levelHeight = h;
  }

  function setCanvas(w, h) {
    canvasWidth = w;
    canvasHeight = h;
  }

  function follow(px, py, lerp = 0.1) {
    targetX = px - canvasWidth / 2;
    targetY = py - canvasHeight / 2;

    // Clamp to level bounds
    targetX = Math.max(0, Math.min(targetX, levelWidth - canvasWidth));
    targetY = Math.max(0, Math.min(targetY, levelHeight - canvasHeight));

    // If level is smaller than canvas, center it
    if (levelWidth <= canvasWidth) targetX = (levelWidth - canvasWidth) / 2;
    if (levelHeight <= canvasHeight) targetY = (levelHeight - canvasHeight) / 2;

    x += (targetX - x) * lerp;
    y += (targetY - y) * lerp;
  }

  function shake(intensity = 6, duration = 300) {
    if (!shakeEnabled) return;
    shakeIntensity = intensity;
    shakeDuration = duration;
    shakeTimer = duration;
  }

  function update(dt) {
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      const progress = shakeTimer / shakeDuration;
      const currentIntensity = shakeIntensity * progress;
      shakeX = (Math.random() - 0.5) * currentIntensity * 2;
      shakeY = (Math.random() - 0.5) * currentIntensity * 2;
    } else {
      shakeX = 0;
      shakeY = 0;
    }
  }

  function apply(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(-Math.round(x + shakeX), -Math.round(y + shakeY));
  }

  function reset() {
    x = 0;
    y = 0;
    targetX = 0;
    targetY = 0;
    shakeX = 0;
    shakeY = 0;
    shakeTimer = 0;
  }

  function snapTo(px, py) {
    targetX = px - canvasWidth / 2;
    targetY = py - canvasHeight / 2;
    targetX = Math.max(0, Math.min(targetX, levelWidth - canvasWidth));
    targetY = Math.max(0, Math.min(targetY, levelHeight - canvasHeight));
    if (levelWidth <= canvasWidth) targetX = (levelWidth - canvasWidth) / 2;
    if (levelHeight <= canvasHeight) targetY = (levelHeight - canvasHeight) / 2;
    x = targetX;
    y = targetY;
  }

  function setShakeEnabled(val) {
    shakeEnabled = val;
  }

  return {
    follow, shake, update, apply, reset, setLevel, setCanvas, snapTo, setShakeEnabled,
    get x() { return x + shakeX; },
    get y() { return y + shakeY; }
  };
})();
