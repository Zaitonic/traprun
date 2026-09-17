// ============================================
// TRAP RUN — Player Entity
// ============================================
const Player = (() => {
  const WIDTH = 24;
  const HEIGHT = 32;
  const MOVE_SPEED = 4;
  const JUMP_FORCE = -11;
  const MAX_JUMPS = 2;
  const COYOTE_TIME = 6;      // frames
  const JUMP_BUFFER = 8;      // frames
  const MAX_SPEED_X = 5;

  let x = 0, y = 0;
  let vx = 0, vy = 0;
  let grounded = false;
  let coyoteTimer = 0;
  let jumpBufferTimer = 0;
  let jumpsUsed = 0;
  let facingRight = true;
  let state = 'idle';  // idle, running, jumping, falling, dead
  let dead = false;
  let gravityFlipped = false;
  let invertedControls = false;
  let groundedPlatform = null;
  let animFrame = 0;
  let animTimer = 0;
  let squash = 1;
  let stretch = 1;
  let squashTimer = 0;
  let eyeBlink = 0;
  let wasGrounded = false;
  let shockTimer = 0;
  let shockStrength = 0;

  function reset(spawnX, spawnY) {
    x = spawnX;
    y = spawnY;
    vx = 0;
    vy = 0;
    grounded = false;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    jumpsUsed = 0;
    facingRight = true;
    state = 'idle';
    dead = false;
    gravityFlipped = false;
    invertedControls = false;
    groundedPlatform = null;
    squash = 1;
    stretch = 1;
    wasGrounded = false;
    shockTimer = 0;
    shockStrength = 0;
  }

  function update(dt) {
    if (dead) return;

    if (shockTimer > 0) {
      shockTimer--;
    } else {
      shockStrength = 0;
    }

    wasGrounded = grounded;

    // Horizontal movement
    let moveX = 0;
    if (Input.isLeft()) moveX -= 1;
    if (Input.isRight()) moveX += 1;


    if (moveX !== 0) {
      vx += moveX * 1.2;
      facingRight = moveX > 0;
    } else {
      vx *= Physics.FRICTION;
    }

    // Clamp horizontal speed
    vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, vx));
    if (Math.abs(vx) < 0.1) vx = 0;

    // Gravity
    const gravDir = gravityFlipped ? -1 : 1;
    vy += Physics.GRAVITY * gravDir;
    vy = Math.max(-Physics.MAX_FALL_SPEED, Math.min(Physics.MAX_FALL_SPEED, vy));

    // Jump buffer
    if (Input.isJumpPressed()) {
      jumpBufferTimer = JUMP_BUFFER;
    }
    if (jumpBufferTimer > 0) jumpBufferTimer--;

    // Coyote time
    if (grounded) {
      coyoteTimer = COYOTE_TIME;
    } else {
      if (coyoteTimer > 0) coyoteTimer--;
    }

    // One ground jump plus one mid-air jump. Landing restores both jumps.
    const canGroundJump = coyoteTimer > 0;
    const canAirJump = !canGroundJump && jumpsUsed < MAX_JUMPS;
    if (jumpBufferTimer > 0 && (canGroundJump || canAirJump)) {
      vy = gravityFlipped ? -JUMP_FORCE : JUMP_FORCE;
      jumpBufferTimer = 0;
      coyoteTimer = 0;
      jumpsUsed = canGroundJump ? 1 : jumpsUsed + 1;
      grounded = false;
      squash = 0.7;
      stretch = 1.3;
      squashTimer = 10;
      AudioManager.jump();
    }

    // Variable jump height
    if (!Input.isJump() && !gravityFlipped && vy < -3) {
      vy *= 0.7;
    }
    if (!Input.isJump() && gravityFlipped && vy > 3) {
      vy *= 0.7;
    }

    // Apply velocity
    x += vx;
    y += vy;

    // Animation state
    if (grounded) {
      state = Math.abs(vx) > 0.5 ? 'running' : 'idle';
    } else {
      state = (gravityFlipped ? vy > 0 : vy < 0) ? 'jumping' : 'falling';
    }

    // Squash/stretch recovery
    if (squashTimer > 0) {
      squashTimer--;
    } else {
      squash += (1 - squash) * 0.2;
      stretch += (1 - stretch) * 0.2;
    }

    // Animation
    animTimer++;
    if (animTimer >= 6) {
      animTimer = 0;
      animFrame = (animFrame + 1) % 4;
    }

    // Eye blink
    if (Math.random() < 0.005) eyeBlink = 8;
    if (eyeBlink > 0) eyeBlink--;

    // Reset grounded — it will be set again by collision
    grounded = false;
    gravityFlipped = false;
  }

  function setGrounded(val) {
    if (val && !wasGrounded) {
      // Landing squash
      squash = 1.3;
      stretch = 0.7;
      squashTimer = 6;
      AudioManager.land();
      Particles.landDust(x + WIDTH / 2, y + HEIGHT);
    }
    if (val) jumpsUsed = 0;
    grounded = val;
  }

  function die() {
    if (dead) return;
    dead = true;
    state = 'dead';
    Particles.deathBurst(x + WIDTH / 2, y + HEIGHT / 2);
    Camera.shake(10, 400);
    AudioManager.death();
  }

  // A short visual panic response when an unexpected trap springs nearby.
  // It deliberately does not modify movement so players still own the escape.
  function shock(intensity = 1) {
    if (dead) return;
    shockStrength = Math.max(shockStrength, Math.min(2, intensity));
    shockTimer = Math.max(shockTimer, Math.round(10 + intensity * 8));
    squash = 0.82;
    stretch = 1.18;
    squashTimer = Math.max(squashTimer, 8);
  }

  function render(ctx) {
    if (dead) return;

    ctx.save();
    
    const centerX = x + WIDTH / 2;
    const centerY = y + HEIGHT / 2;
    
    const shocked = shockTimer > 0;
    const jitter = shocked ? (shockTimer % 2 === 0 ? shockStrength : -shockStrength) : 0;
    ctx.translate(centerX + jitter, centerY);
    ctx.scale(squash, stretch);

    const drawX = -WIDTH / 2;
    const drawY = -HEIGHT / 2;

    // Mini human: head, hair, shirt and legs only. No arms are drawn so the
    // silhouette stays small and readable against the dangerous environments.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(drawX + 4, drawY + HEIGHT - 2, WIDTH - 8, 3);

    // Head and hair
    ctx.fillStyle = '#2b1721';
    ctx.fillRect(drawX + 4, drawY + 1, 16, 13);
    ctx.fillStyle = '#f0ae86';
    ctx.fillRect(drawX + 6, drawY + 4, 12, 11);
    ctx.fillStyle = '#ffc7a1';
    ctx.fillRect(drawX + 7, drawY + 5, 5, 7);
    ctx.fillStyle = '#20131d';
    ctx.fillRect(drawX + 5, drawY + 1, 14, 5);
    ctx.fillRect(drawX + 4, drawY + 4, 3, 7);

    // Eyes - expressive normally, wide and panicked when a trap fires.
    const eyeY = drawY + 8;
    const eyeSize = shocked ? 8 : (eyeBlink > 0 ? 1 : 5);
    const eyeOffset = facingRight ? 2 : -2;

    if (shocked) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(drawX + 6 + eyeOffset, eyeY - 1, 5, eyeSize);
      ctx.fillRect(drawX + WIDTH - 11 + eyeOffset, eyeY - 1, 5, eyeSize);
      ctx.fillStyle = '#111111';
      ctx.fillRect(drawX + 7 + eyeOffset, eyeY + 2, 2, 4);
      ctx.fillRect(drawX + WIDTH - 10 + eyeOffset, eyeY + 2, 2, 4);
      ctx.fillStyle = '#7b1f38';
      ctx.fillRect(drawX + 9, drawY + 13, 6, 2);

      // A tiny red exclamation mark makes the surprise readable at a glance.
      ctx.fillStyle = '#ff3d6e';
      ctx.fillRect(-1, drawY - 10, 3, 7);
      ctx.fillRect(-1, drawY - 1, 3, 3);
    } else {
      ctx.fillStyle = '#111111';
      ctx.fillRect(drawX + 7 + eyeOffset, eyeY, 3, eyeSize);
      ctx.fillRect(drawX + WIDTH - 10 + eyeOffset, eyeY, 3, eyeSize);

      // White eye reflections
      if (eyeBlink <= 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX + 8 + eyeOffset, eyeY + 1, 1, 1);
        ctx.fillRect(drawX + WIDTH - 9 + eyeOffset, eyeY + 1, 1, 1);
      }

      ctx.fillStyle = '#8b3e45';
      ctx.fillRect(drawX + 9, drawY + 13, 6, 2);
    }

    // Shirt and trousers. The intentional absence of arms is part of the look.
    ctx.fillStyle = '#3d77dd';
    ctx.fillRect(drawX + 6, drawY + 16, 12, 9);
    ctx.fillStyle = '#78a6ff';
    ctx.fillRect(drawX + 7, drawY + 17, 4, 7);
    ctx.fillStyle = '#1e2d55';
    ctx.fillRect(drawX + 6, drawY + 25, 12, 3);

    const legOffset = state === 'running' ? Math.round(Math.sin(animFrame * Math.PI / 2) * 2) : 0;
    ctx.fillStyle = '#25345b';
    ctx.fillRect(drawX + 7, drawY + 28, 4, 4 + legOffset);
    ctx.fillRect(drawX + 14, drawY + 28, 4, 4 - legOffset);
    ctx.fillStyle = '#171827';
    ctx.fillRect(drawX + 6, drawY + HEIGHT - 2 + legOffset, 6, 2);
    ctx.fillRect(drawX + 13, drawY + HEIGHT - 2 - legOffset, 6, 2);

    ctx.restore();
  }

  return {
    reset,
    update,
    render,
    die,
    shock,
    setGrounded,
    get x() { return x; },
    set x(v) { x = v; },
    get y() { return y; },
    set y(v) { y = v; },
    get vx() { return vx; },
    set vx(v) { vx = v; },
    get vy() { return vy; },
    set vy(v) { vy = v; },
    get w() { return WIDTH; },
    get h() { return HEIGHT; },
    get dead() { return dead; },
    get grounded() { return grounded; },
    get gravityFlipped() { return gravityFlipped; },
    set gravityFlipped(v) { gravityFlipped = v; },
    get invertedControls() { return invertedControls; },
    set invertedControls(v) { invertedControls = v; },
    get groundedPlatform() { return groundedPlatform; },
    set groundedPlatform(v) { groundedPlatform = v; }
  };
})();
