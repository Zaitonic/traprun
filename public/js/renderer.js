// ============================================
// TRAP RUN — Canvas Renderer & Stage Art Direction
// ============================================
const Renderer = (() => {
  let canvas;
  let ctx;
  let width = 800;
  let height = 600;
  let flashAlpha = 0;
  let flashColor = '#ff0000';
  let pixelScareTimer = 0;
  let pixelScareDuration = 0;
  let pixelScareStyle = 'eye';
  let bgStars = [];
  let activeStage = 0;

  // Every room has a deliberately different mood. The layout remains readable,
  // while color and environmental texture signal that the rules may have changed.
  const STAGE_THEMES = [
    { name: 'Ash Nursery', top: '#090b17', mid: '#26101c', bottom: '#100a18', terrain: '#433340', edge: '#a85b68', shadow: '#231925', accent: '#ff5267', accent2: '#ffc06c', star: '#ffd3b4', pattern: 'embers', fire: ['#ff374e', '#ff9d37', '#fff1a6'] },
    { name: 'Mire Green', top: '#071713', mid: '#12352b', bottom: '#07110d', terrain: '#254e40', edge: '#75c785', shadow: '#102b22', accent: '#a7ff6d', accent2: '#38d6b8', star: '#c9ff94', pattern: 'spores', fire: ['#caff4c', '#56e65c', '#eaff9c'] },
    { name: 'Neon Alley', top: '#080819', mid: '#20134b', bottom: '#0e0825', terrain: '#333060', edge: '#ff5bcf', shadow: '#19152f', accent: '#ff5bcf', accent2: '#5df2ff', star: '#8ff7ff', pattern: 'grid', fire: ['#ff5bcf', '#9b7bff', '#d9f7ff'] },
    { name: 'Black Ice', top: '#06131e', mid: '#12354b', bottom: '#07101b', terrain: '#2a5367', edge: '#8de5ff', shadow: '#132b3b', accent: '#65d9ff', accent2: '#d7fbff', star: '#c9f5ff', pattern: 'snow', fire: ['#3ecbff', '#86edff', '#efffff'] },
    { name: 'Copper Works', top: '#19100b', mid: '#4a2915', bottom: '#150d0a', terrain: '#5c3c28', edge: '#e6a15b', shadow: '#2c1b13', accent: '#ffad52', accent2: '#f3d27b', star: '#ffe1a1', pattern: 'gears', fire: ['#ff6b3d', '#ffb13e', '#fff0a4'] },
    { name: 'Clockwork Red', top: '#1b080f', mid: '#4c1422', bottom: '#16070d', terrain: '#63303a', edge: '#f87972', shadow: '#30151f', accent: '#ff7471', accent2: '#ffd36b', star: '#ffcac3', pattern: 'ticks', fire: ['#ff3448', '#ff8a45', '#ffe07e'] },
    { name: 'Moonfall', top: '#0b1029', mid: '#1b2457', bottom: '#0b1020', terrain: '#424a79', edge: '#c5ccff', shadow: '#212750', accent: '#b9c8ff', accent2: '#8cf1ff', star: '#f2f3ff', pattern: 'moons', fire: ['#7989ff', '#a5c8ff', '#f0f4ff'] },
    { name: 'Signal Loss', top: '#100725', mid: '#300b54', bottom: '#12071f', terrain: '#4d2d72', edge: '#e682ff', shadow: '#26133f', accent: '#e366ff', accent2: '#4ef0ff', star: '#f0a6ff', pattern: 'scanlines', fire: ['#d82dff', '#ff71cf', '#d6fbff'] },
    { name: 'Blood Rail', top: '#19070a', mid: '#4d1018', bottom: '#150609', terrain: '#682c31', edge: '#ff8d7e', shadow: '#351317', accent: '#ff4f5f', accent2: '#ffbf65', star: '#ffc1bd', pattern: 'rain', fire: ['#ff253f', '#ff6c35', '#ffdc79'] },
    { name: 'Grave Circuit', top: '#0e111a', mid: '#292e42', bottom: '#11131c', terrain: '#45495b', edge: '#c1bdaf', shadow: '#242633', accent: '#d2c9b5', accent2: '#8be3d4', star: '#f4ecda', pattern: 'runes', fire: ['#66e5ce', '#b2ffdd', '#f8fff0'] },
    { name: 'Violet Static', top: '#11071e', mid: '#38105d', bottom: '#150827', terrain: '#55347a', edge: '#d896ff', shadow: '#2c1744', accent: '#d77bff', accent2: '#ff8eca', star: '#f2beff', pattern: 'static', fire: ['#b540ff', '#ee71ff', '#ffe4ff'] },
    { name: 'Cold Forge', top: '#07121b', mid: '#184154', bottom: '#08161e', terrain: '#346274', edge: '#91efff', shadow: '#173a49', accent: '#6ce4ff', accent2: '#b4fff0', star: '#dbffff', pattern: 'shards', fire: ['#3bbcff', '#7ce8ff', '#f1ffff'] },
    { name: 'Void Chapel', top: '#080511', mid: '#1c1232', bottom: '#090612', terrain: '#382c4c', edge: '#a696c5', shadow: '#1b1628', accent: '#c293ff', accent2: '#e7c8ff', star: '#eee1ff', pattern: 'stained', fire: ['#8d60ff', '#da9dff', '#fff1ff'] },
    { name: 'Rust Temple', top: '#19100d', mid: '#4d261c', bottom: '#180c0b', terrain: '#6a3b2c', edge: '#e5a06d', shadow: '#351b17', accent: '#ed9a5d', accent2: '#ffe18a', star: '#ffd4ad', pattern: 'runes', fire: ['#f24f36', '#ffa445', '#fff0a0'] },
    { name: 'Cinder Chase', top: '#18090a', mid: '#5a1916', bottom: '#160708', terrain: '#682a25', edge: '#ff8064', shadow: '#311413', accent: '#ff5645', accent2: '#ffcf65', star: '#ffcab1', pattern: 'embers', fire: ['#ff1f32', '#ff7136', '#ffe26f'] },
    { name: 'Acid Dream', top: '#10190a', mid: '#344d12', bottom: '#0e1608', terrain: '#4d6930', edge: '#d8ff73', shadow: '#263717', accent: '#c7ff56', accent2: '#78ffd7', star: '#e8ffab', pattern: 'spores', fire: ['#a5ff32', '#64f56d', '#edff9c'] },
    { name: 'Synth Furnace', top: '#100616', mid: '#4b1542', bottom: '#15081c', terrain: '#66365f', edge: '#ff91e7', shadow: '#341d36', accent: '#ff72d3', accent2: '#67e9ff', star: '#f2baff', pattern: 'grid', fire: ['#ff3cc7', '#ff7f9e', '#b2f7ff'] },
    { name: 'Bone Tower', top: '#17120f', mid: '#413127', bottom: '#15100d', terrain: '#5d5041', edge: '#efe3c4', shadow: '#30271f', accent: '#ead9ab', accent2: '#ff9d6a', star: '#fff3ce', pattern: 'bones', fire: ['#ff714d', '#ffbc64', '#ffffbc'] },
    { name: 'Mirage Room', top: '#120d21', mid: '#3a2453', bottom: '#100c1b', terrain: '#5e4972', edge: '#e1b4ff', shadow: '#30263d', accent: '#eaa1ff', accent2: '#8ccfff', star: '#f5d5ff', pattern: 'mirage', fire: ['#bd65ff', '#ff9dd1', '#fff4cd'] },
    { name: 'Devil Engine', top: '#1a0508', mid: '#5f120f', bottom: '#130507', terrain: '#6d2425', edge: '#ff7059', shadow: '#320d10', accent: '#ff3e40', accent2: '#ffc35a', star: '#ffd0aa', pattern: 'hellgate', fire: ['#ff142e', '#ff5d24', '#ffd85a'] }
  ];

  function getTheme() {
    return STAGE_THEMES[activeStage % STAGE_THEMES.length];
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 90; i++) {
      bgStars.push({
        x: Math.random() * 2200,
        y: Math.random() * 1500,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.55 + 0.18,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        lane: Math.floor(Math.random() * 6)
      });
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    Camera.setCanvas(width, height);
  }

  function setStage(index) {
    activeStage = Math.max(0, index);
  }

  function clear() {
    const theme = getTheme();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.top);
    grad.addColorStop(0.54, theme.mid);
    grad.addColorStop(1, theme.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, Math.max(width, height) * 0.65);
    glow.addColorStop(0, `${theme.accent}22`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function renderBackground(cameraX, cameraY) {
    const theme = getTheme();
    const time = Date.now() * 0.001;
    ctx.save();

    for (const star of bgStars) {
      const parallax = 0.22 + star.lane * 0.025;
      const sx = ((star.x - cameraX * parallax) % (width + 120)) - 40;
      const sy = ((star.y - cameraY * parallax) % (height + 120)) - 40;
      const twinkle = (Math.sin(time * star.twinkleSpeed * 60 + star.x) + 1) / 2;
      ctx.globalAlpha = star.brightness * (0.45 + twinkle * 0.55);
      ctx.fillStyle = theme.star;
      ctx.fillRect(sx, sy, star.size, star.size);
    }

    ctx.globalAlpha = 1;
    renderStagePattern(theme, time, cameraX, cameraY);
    ctx.restore();
  }

  function renderStagePattern(theme, time, cameraX, cameraY) {
    const offsetX = -(cameraX * 0.08 % 64);
    const offsetY = -(cameraY * 0.06 % 64);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = theme.accent2;
    ctx.fillStyle = theme.accent;
    ctx.lineWidth = 1;

    switch (theme.pattern) {
      case 'grid':
        for (let x = offsetX; x < width; x += 48) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = offsetY; y < height; y += 48) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        break;
      case 'embers':
      case 'spores':
        for (let i = 0; i < 24; i++) {
          const x = ((i * 83 + time * (theme.pattern === 'embers' ? 14 : -8)) % (width + 40)) - 20;
          const y = height - ((i * 57 + time * 18) % (height + 80));
          ctx.globalAlpha = 0.1 + (i % 4) * 0.03;
          ctx.fillRect(x, y, 2 + i % 3, 2 + i % 3);
        }
        break;
      case 'rain':
        ctx.globalAlpha = 0.12;
        for (let x = offsetX; x < width + 40; x += 36) {
          const y = ((x * 3 + time * 95) % (height + 80)) - 40;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 28); ctx.stroke();
        }
        break;
      case 'scanlines':
      case 'static':
        ctx.globalAlpha = 0.1;
        for (let y = 0; y < height; y += theme.pattern === 'static' ? 7 : 14) {
          ctx.fillRect(0, y + Math.sin(time * 4 + y) * 2, width, 1);
        }
        break;
      case 'snow':
      case 'shards':
        for (let i = 0; i < 28; i++) {
          const x = ((i * 71 + time * 9) % (width + 30)) - 15;
          const y = ((i * 43 + time * (theme.pattern === 'snow' ? 18 : 7)) % (height + 30)) - 15;
          ctx.fillRect(x, y, 2, theme.pattern === 'shards' ? 9 : 2);
        }
        break;
      case 'runes':
      case 'stained':
        for (let x = offsetX; x < width + 40; x += 80) {
          for (let y = offsetY; y < height; y += 80) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.strokeRect(-5, -5, 10, 10);
            ctx.restore();
          }
        }
        break;
      case 'gears':
      case 'ticks':
        for (let i = 0; i < 7; i++) {
          const x = (i * 137 + 60) % (width + 100) - 50;
          const y = 80 + (i * 97) % Math.max(160, height - 160);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(time * (i % 2 ? -0.35 : 0.35));
          ctx.strokeRect(-13, -13, 26, 26);
          ctx.restore();
        }
        break;
      case 'moons':
      case 'mirage':
        for (let i = 0; i < 6; i++) {
          const x = 80 + i * 150 - (cameraX * 0.06 % 150);
          const y = 90 + (i % 3) * 105 + Math.sin(time + i) * 8;
          ctx.beginPath(); ctx.arc(x, y, 10 + i % 3 * 4, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      case 'bones':
        for (let i = 0; i < 10; i++) {
          const x = (i * 111 + 35) % width;
          const y = 70 + (i * 67) % Math.max(120, height - 140);
          ctx.fillRect(x, y, 22, 3);
          ctx.beginPath(); ctx.arc(x, y + 1, 4, 0, Math.PI * 2); ctx.arc(x + 22, y + 1, 4, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'hellgate':
        ctx.globalAlpha = 0.15;
        for (let x = offsetX; x < width; x += 64) {
          ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x + 20, height - 90); ctx.lineTo(x + 40, height); ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }

  function renderPlatforms(platforms) {
    const theme = getTheme();
    for (const plat of platforms) {
      if (!plat.solid) continue;

      const isWall = plat.h > plat.w * 2;
      const isFloor = plat.w > 200;
      if (isWall) {
        ctx.fillStyle = theme.shadow;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = theme.terrain;
        for (let row = 0; row < plat.h; row += 16) {
          const offset = (Math.floor(row / 16) % 2) * 8;
          for (let col = offset; col < plat.w; col += 16) {
            ctx.fillRect(plat.x + col + 1, plat.y + row + 1, 14, 14);
          }
        }
        ctx.fillStyle = theme.edge;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(plat.x, plat.y, 3, plat.h);
        ctx.globalAlpha = 1;
      } else if (isFloor) {
        ctx.fillStyle = theme.shadow;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = theme.terrain;
        ctx.fillRect(plat.x, plat.y + 3, plat.w, plat.h - 3);
        ctx.fillStyle = theme.edge;
        ctx.fillRect(plat.x, plat.y, plat.w, 3);
        ctx.globalAlpha = 0.32;
        for (let x = plat.x; x < plat.x + plat.w; x += 22) {
          ctx.fillRect(x, plat.y + 7, 13, 2);
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = theme.shadow;
        ctx.fillRect(plat.x + 2, plat.y + 3, plat.w, plat.h);
        ctx.fillStyle = theme.terrain;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = theme.edge;
        ctx.fillRect(plat.x, plat.y, plat.w, 3);
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(plat.x + 4, plat.y + 5, Math.max(0, plat.w - 8), 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  function renderExit(exitObj) {
    const theme = getTheme();
    const time = Date.now() * 0.003;
    const glow = Math.sin(time) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = 0.24 * glow;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(exitObj.x - 9, exitObj.y - 9, exitObj.w + 18, exitObj.h + 18);
    ctx.restore();
    ctx.fillStyle = theme.shadow;
    ctx.fillRect(exitObj.x, exitObj.y, exitObj.w, exitObj.h);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(exitObj.x + 3, exitObj.y + 3, exitObj.w - 6, exitObj.h - 3);
    ctx.fillStyle = theme.accent2;
    ctx.fillRect(exitObj.x + exitObj.w - 10, exitObj.y + exitObj.h / 2 - 3, 4, 6);
    ctx.fillStyle = theme.accent2;
    ctx.globalAlpha = glow;
    ctx.font = '16px sans-serif';
    ctx.fillText('✦', exitObj.x + exitObj.w / 2 - 6, exitObj.y - 4);
    ctx.globalAlpha = 1;
  }

  // Canvas 2D with layered perspective shapes: a compact, 3D-looking spawn fire.
  function renderSpawnFire(x, y) {
    const theme = getTheme();
    const time = Date.now() * 0.006;
    const flicker = Math.sin(time * 2.4) * 2;
    ctx.save();
    ctx.translate(x, y);

    const glow = ctx.createRadialGradient(0, -7, 1, 0, -7, 34);
    glow.addColorStop(0, `${theme.fire[1]}aa`);
    glow.addColorStop(0.45, `${theme.fire[0]}55`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-36, -44, 72, 58);

    ctx.save();
    ctx.scale(1, 0.38);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath(); ctx.ellipse(0, 14, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.fire[0];
    ctx.beginPath(); ctx.ellipse(0, 10, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const outer = 23 + flicker;
    ctx.fillStyle = theme.fire[0];
    ctx.beginPath();
    ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-21, -4, -8, -outer); ctx.quadraticCurveTo(2, -15, 14, -outer + 5); ctx.quadraticCurveTo(21, -4, 13, 10); ctx.closePath(); ctx.fill();

    ctx.fillStyle = theme.fire[1];
    ctx.beginPath();
    ctx.moveTo(-9, 10); ctx.quadraticCurveTo(-11, -3, -2, -18 - flicker); ctx.quadraticCurveTo(8, -7, 9, 10); ctx.closePath(); ctx.fill();

    ctx.fillStyle = theme.fire[2];
    ctx.beginPath();
    ctx.moveTo(-4, 10); ctx.quadraticCurveTo(-3, 0, 2, -9 - flicker * 0.5); ctx.quadraticCurveTo(7, 1, 5, 10); ctx.closePath(); ctx.fill();

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = theme.fire[2];
    for (let i = 0; i < 4; i++) {
      const sx = Math.sin(time + i * 2.1) * (7 + i * 2);
      const sy = -22 - ((time * 13 + i * 11) % 20);
      ctx.fillRect(sx, sy, 2, 3);
    }
    ctx.restore();
  }

  function renderTraps(traps) {
    for (const trap of traps) Traps.renderTrap(ctx, trap);
  }

  function flash(color = '#ff0000', intensity = 0.3) {
    flashColor = color;
    flashAlpha = intensity;
  }

  function renderFlash() {
    if (flashAlpha > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      flashAlpha *= 0.9;
      if (flashAlpha < 0.01) flashAlpha = 0;
    }
  }

  // Brief, original arcade-horror interruption used by harmless proximity
  // traps. It is screen-space art, so it stays readable while the camera moves.
  function triggerPixelScare(style = 'eye') {
    pixelScareStyle = style;
    pixelScareDuration = 18;
    pixelScareTimer = pixelScareDuration;
    flash('#ff4569', 0.24);
  }

  function renderPixelScare() {
    if (pixelScareTimer <= 0) return;

    const life = pixelScareTimer / pixelScareDuration;
    const flicker = (pixelScareTimer % 3 === 0 ? 0.18 : 0);
    const unit = Math.max(6, Math.floor(Math.min(width, height) / 92));
    const faceW = unit * 26;
    const faceH = unit * 20;
    const faceX = Math.round(width / 2 - faceW / 2 + (pixelScareTimer % 2 === 0 ? unit : -unit));
    const faceY = Math.round(height / 2 - faceH / 2);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(0.8, life + 0.16);
    ctx.fillStyle = '#120711';
    ctx.fillRect(0, 0, width, height);

    // Chunky glitch bands make the image feel like an old arcade cabinet
    // breaking up, without relying on external art assets.
    ctx.globalAlpha = 0.34 + flicker;
    ctx.fillStyle = '#ff3d62';
    for (let row = 0; row < 6; row++) {
      const barY = (row * 97 + pixelScareTimer * 19) % height;
      const barX = (row * 151 + pixelScareTimer * 29) % width;
      ctx.fillRect(barX - 80, barY, 180 + row * 24, unit);
    }

    ctx.globalAlpha = 0.96;
    ctx.fillStyle = '#250b24';
    ctx.fillRect(faceX - unit * 2, faceY - unit * 2, faceW + unit * 4, faceH + unit * 4);
    ctx.fillStyle = '#ff9a69';
    ctx.fillRect(faceX, faceY, faceW, faceH);
    ctx.fillStyle = '#fff1cf';
    ctx.fillRect(faceX + unit * 2, faceY + unit * 2, faceW - unit * 4, faceH - unit * 5);

    if (pixelScareStyle === 'teeth') {
      ctx.fillStyle = '#16111c';
      ctx.fillRect(faceX + unit * 3, faceY + unit * 5, faceW - unit * 6, unit * 5);
      ctx.fillStyle = '#ff3159';
      ctx.fillRect(faceX + unit * 5, faceY + unit * 7, faceW - unit * 10, unit * 2);
      ctx.fillStyle = '#fff8dc';
      for (let tooth = 0; tooth < 7; tooth++) {
        ctx.fillRect(faceX + unit * (4 + tooth * 3), faceY + unit * 12, unit * 2, unit * 4);
      }
    } else if (pixelScareStyle === 'skull') {
      ctx.fillStyle = '#171222';
      ctx.fillRect(faceX + unit * 4, faceY + unit * 5, unit * 6, unit * 5);
      ctx.fillRect(faceX + unit * 16, faceY + unit * 5, unit * 6, unit * 5);
      ctx.fillStyle = '#ff3159';
      ctx.fillRect(faceX + unit * 6, faceY + unit * 7, unit * 2, unit * 2);
      ctx.fillRect(faceX + unit * 18, faceY + unit * 7, unit * 2, unit * 2);
      ctx.fillStyle = '#291326';
      ctx.fillRect(faceX + unit * 11, faceY + unit * 11, unit * 4, unit * 3);
      ctx.fillStyle = '#1b1622';
      ctx.fillRect(faceX + unit * 6, faceY + unit * 15, unit * 14, unit * 3);
    } else {
      ctx.fillStyle = '#1a1021';
      ctx.fillRect(faceX + unit * 3, faceY + unit * 6, faceW - unit * 6, unit * 8);
      ctx.fillStyle = '#ff3159';
      ctx.fillRect(faceX + unit * 6, faceY + unit * 8, faceW - unit * 12, unit * 4);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(faceX + unit * 11, faceY + unit * 9, unit * 4, unit * 2);
    }

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffe76d';
    ctx.font = `800 ${Math.max(13, unit * 1.5)}px Oxanium, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('LOOK UP', width / 2, faceY + faceH + unit * 4);
    ctx.restore();

    pixelScareTimer--;
  }

  function renderLevelName(name, alpha = 1) {
    const theme = getTheme();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.accent2;
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${theme.name} — ${name}`, width / 2, height - 30);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  return {
    init,
    clear,
    resize,
    setStage,
    renderBackground,
    renderPlatforms,
    renderExit,
    renderSpawnFire,
    renderTraps,
    flash,
    renderFlash,
    triggerPixelScare,
    renderPixelScare,
    renderLevelName,
    get ctx() { return ctx; },
    get canvas() { return canvas; },
    get width() { return width; },
    get height() { return height; }
  };
})();
