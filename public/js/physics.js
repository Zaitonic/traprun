// ============================================
// TRAP RUN — Physics & Collision
// ============================================
const Physics = (() => {
  const GRAVITY = 0.6;
  const MAX_FALL_SPEED = 12;
  const FRICTION = 0.85;

  // AABB overlap test
  function aabb(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // Resolve player-platform collision
  // Returns { grounded, hitCeiling, hitWallLeft, hitWallRight }
  function resolvePlayerPlatforms(player, platforms) {
    const result = { grounded: false, hitCeiling: false, hitWallLeft: false, hitWallRight: false };

    for (const plat of platforms) {
      if (!plat.solid) continue;

      const px = player.x;
      const py = player.y;
      const pw = player.w;
      const ph = player.h;

      if (!aabb({ x: px, y: py, w: pw, h: ph }, plat)) continue;

      // Calculate overlap on each axis
      const overlapLeft = (px + pw) - plat.x;
      const overlapRight = (plat.x + plat.w) - px;
      const overlapTop = (py + ph) - plat.y;
      const overlapBottom = (plat.y + plat.h) - py;

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapY < minOverlapX) {
        // Vertical resolution
        if (overlapTop < overlapBottom) {
          // Landing on top
          player.y = plat.y - ph;
          if (player.vy > 0) {
            player.vy = 0;
            result.grounded = true;
            player.groundedPlatform = plat;
          }
        } else {
          // Hit ceiling
          player.y = plat.y + plat.h;
          if (player.vy < 0) {
            player.vy = 0;
            result.hitCeiling = true;
          }
        }
      } else {
        // Horizontal resolution
        if (overlapLeft < overlapRight) {
          player.x = plat.x - pw;
          result.hitWallRight = true;
        } else {
          player.x = plat.x + plat.w;
          result.hitWallLeft = true;
        }
        player.vx = 0;
      }
    }

    return result;
  }

  // Check if point is inside rect
  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  return {
    GRAVITY,
    MAX_FALL_SPEED,
    FRICTION,
    aabb,
    resolvePlayerPlatforms,
    pointInRect
  };
})();
