// ============================================
// TRAP RUN — Particle System
// ============================================
const Particles = (() => {
  const particles = [];
  const MAX_PARTICLES = 500;

  function spawn(x, y, count, options = {}) {
    const {
      color = '#ff3d6e',
      colors = null,
      minSpeed = 1,
      maxSpeed = 5,
      minSize = 2,
      maxSize = 6,
      life = 40,
      gravity = 0.15,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
      friction = 0.98,
      fadeOut = true,
      shape = 'square' // 'square' or 'circle'
    } = options;

    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const dir = angle + (Math.random() - 0.5) * spread;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

      particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        size: minSize + Math.random() * (maxSize - minSize),
        color: c,
        life: life + Math.random() * life * 0.5,
        maxLife: life,
        gravity,
        friction,
        fadeOut,
        shape,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }

  function deathBurst(x, y) {
    spawn(x, y, 30, {
      colors: ['#ff3d6e', '#ff6b8a', '#ff1744', '#ff8a65', '#ffab40'],
      minSpeed: 2,
      maxSpeed: 8,
      minSize: 3,
      maxSize: 8,
      life: 50,
      gravity: 0.2
    });
  }

  function landDust(x, y) {
    spawn(x, y, 6, {
      colors: ['#888899', '#aaaabb', '#666677'],
      minSpeed: 0.5,
      maxSpeed: 2,
      minSize: 2,
      maxSize: 4,
      life: 20,
      gravity: 0.05,
      spread: Math.PI,
      angle: -Math.PI / 2
    });
  }

  function levelComplete(x, y) {
    spawn(x, y, 40, {
      colors: ['#00ff88', '#00e5ff', '#ffaa00', '#ff3d6e', '#7c4dff'],
      minSpeed: 2,
      maxSpeed: 7,
      minSize: 3,
      maxSize: 7,
      life: 60,
      gravity: 0.1
    });
  }

  function platformBreak(x, y, w) {
    for (let i = 0; i < w; i += 8) {
      spawn(x + i, y, 2, {
        colors: ['#555570', '#444460', '#666680'],
        minSpeed: 1,
        maxSpeed: 3,
        minSize: 3,
        maxSize: 6,
        life: 40,
        gravity: 0.3,
        spread: Math.PI,
        angle: Math.PI / 2,
        shape: 'square'
      });
    }
  }

  function trapSpark(x, y) {
    spawn(x, y, 8, {
      colors: ['#ff3d6e', '#ffaa00', '#ff6b8a'],
      minSpeed: 1,
      maxSpeed: 4,
      minSize: 1,
      maxSize: 3,
      life: 15,
      gravity: 0.1
    });
  }

  function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.rotation += p.rotSpeed;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function render(ctx) {
    for (const p of particles) {
      const alpha = p.fadeOut ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  function clear() {
    particles.length = 0;
  }

  return { spawn, deathBurst, landDust, levelComplete, platformBreak, trapSpark, update, render, clear };
})();
