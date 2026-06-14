// ═══════════════════════════════════════════════════
// OBJECT DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════
function drawObject(ctx, id, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 2;
  switch(id) {
    case 'duck':      drawDuck(ctx, s); break;
    case 'ball':      drawBall(ctx, s); break;
    case 'star':      drawStar(ctx, s); break;
    case 'heart':     drawHeart(ctx, s); break;
    case 'diamond':   drawDiamond(ctx, s); break;
    case 'crown':     drawCrown(ctx, s); break;
    case 'rocket':    drawRocket(ctx, s); break;
    case 'moon':      drawMoon(ctx, s); break;
    case 'flower':    drawFlower(ctx, s); break;
    case 'butterfly': drawButterfly(ctx, s); break;
    case 'apple':     drawApple(ctx, s); break;
    case 'cloud':     drawCloud(ctx, s); break;
    case 'fish':      drawFish(ctx, s); break;
    case 'mushroom':  drawMushroom(ctx, s); break;
    case 'snowflake': drawSnowflake(ctx, s); break;
    case 'sun':       drawSun(ctx, s); break;
    case 'turtle':    drawTurtle(ctx, s); break;
    case 'balloon':   drawBalloon(ctx, s); break;
    case 'icecream':  drawIceCream(ctx, s); break;
    case 'lightning': drawLightning(ctx, s); break;
    case 'planet':    drawPlanet(ctx, s); break;
    case 'gift':      drawGift(ctx, s); break;
    case 'cat':       drawCat(ctx, s); break;
    case 'tree':      drawTree(ctx, s); break;
  }
  ctx.restore();
}

function drawDuck(ctx, s) {
  // Body
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.ellipse(0, s*0.1, s*0.5, s*0.35, 0, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.beginPath(); ctx.arc(s*0.32, -s*0.18, s*0.22, 0, Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s*0.41, -s*0.25, s*0.04, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s*0.405, -s*0.255, s*0.015, 0, Math.PI*2); ctx.fill();
  // Beak
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath(); ctx.moveTo(s*0.52, -s*0.18); ctx.lineTo(s*0.68, -s*0.12); ctx.lineTo(s*0.52, -s*0.06); ctx.closePath(); ctx.fill();
  // Wing
  ctx.strokeStyle = '#DAA520'; ctx.lineWidth = s*0.06;
  ctx.beginPath(); ctx.moveTo(-s*0.1, s*0.05); ctx.quadraticCurveTo(s*0.05, -s*0.15, s*0.22, -s*0.02); ctx.stroke();
  // Tail
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(-s*0.5, s*0.08, s*0.12, s*0.08, -0.5, 0, Math.PI*2); ctx.fill();
}

function drawBall(ctx, s) {
  const grad = ctx.createRadialGradient(-s*0.2, -s*0.2, s*0.1, 0, 0, s);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#ff6b6b'); grad.addColorStop(1, '#cc0000');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI*2); ctx.fill();
  // Pentagon seams
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = s*0.05;
  const seams = [[0,0,s*0.55],[-s*0.5,-s*0.5,s*0.4],[s*0.5,-s*0.5,s*0.4],[-s*0.4,s*0.55,s*0.35],[s*0.4,s*0.55,s*0.35]];
  for (const [cx,cy,r] of seams) {
    ctx.beginPath(); for (let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);} ctx.closePath(); ctx.stroke();
  }
}

function drawStar(ctx, s) {
  const grad = ctx.createRadialGradient(0, -s*0.2, 0, 0, 0, s);
  grad.addColorStop(0, '#fff7a0'); grad.addColorStop(0.5, '#FFD700'); grad.addColorStop(1, '#d97706');
  ctx.fillStyle = grad; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = s*0.5;
  ctx.beginPath();
  for (let i=0;i<10;i++){
    const a = i*Math.PI/5 - Math.PI/2;
    const r = i%2===0 ? s : s*0.42;
    ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
  }
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
}

function drawHeart(ctx, s) {
  const grad = ctx.createRadialGradient(-s*0.2, -s*0.2, 0, 0, 0, s);
  grad.addColorStop(0, '#ff8fa8'); grad.addColorStop(0.5, '#ff2d55'); grad.addColorStop(1, '#cc0033');
  ctx.fillStyle = grad; ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = s*0.4;
  ctx.beginPath();
  ctx.moveTo(0, s*0.28);
  ctx.bezierCurveTo(-s*1.05, -s*0.1, -s*1.05, -s*0.85, 0, -s*0.38);
  ctx.bezierCurveTo(s*1.05, -s*0.85, s*1.05, -s*0.1, 0, s*0.28);
  ctx.fill(); ctx.shadowBlur = 0;
}

function drawDiamond(ctx, s) {
  ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = s*0.6;
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s*0.7, -s*0.1); ctx.lineTo(0, s); ctx.lineTo(-s*0.7, -s*0.1);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  // Facets
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(0,-s); ctx.lineTo(s*0.7,-s*0.1); ctx.lineTo(0,-s*0.05); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.moveTo(0,-s*0.05); ctx.lineTo(-s*0.7,-s*0.1); ctx.lineTo(0,s); ctx.closePath(); ctx.fill();
}

function drawCrown(ctx, s) {
  ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = s*0.4;
  ctx.beginPath();
  ctx.moveTo(-s, s*0.3); ctx.lineTo(-s, -s*0.1); ctx.lineTo(-s*0.5, s*0.2);
  ctx.lineTo(0, -s); ctx.lineTo(s*0.5, s*0.2); ctx.lineTo(s, -s*0.1);
  ctx.lineTo(s, s*0.3); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  // Jewels
  const jewels = [[-s*0.7,s*0.1,'#ff2d55'],[0,-s*0.65,'#00d4ff'],[s*0.7,s*0.1,'#34d399']];
  for (const [jx,jy,jc] of jewels) {
    ctx.fillStyle = jc; ctx.beginPath(); ctx.arc(jx,jy,s*0.12,0,Math.PI*2); ctx.fill();
  }
}

function drawRocket(ctx, s) {
  // Body
  const grad = ctx.createLinearGradient(-s*0.3, -s, s*0.3, s);
  grad.addColorStop(0,'#e0e0e0'); grad.addColorStop(1,'#808080');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0,-s); ctx.quadraticCurveTo(s*0.35,-s*0.6,s*0.35,s*0.2);
  ctx.lineTo(-s*0.35,s*0.2); ctx.quadraticCurveTo(-s*0.35,-s*0.6,0,-s);
  ctx.fill();
  // Fins
  ctx.fillStyle = '#cc3333';
  ctx.beginPath(); ctx.moveTo(s*0.35,s*0.2); ctx.lineTo(s*0.7,s*0.7); ctx.lineTo(s*0.35,s*0.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s*0.35,s*0.2); ctx.lineTo(-s*0.7,s*0.7); ctx.lineTo(-s*0.35,s*0.5); ctx.closePath(); ctx.fill();
  // Window
  ctx.fillStyle = '#00d4ff'; ctx.beginPath(); ctx.arc(0,-s*0.2,s*0.18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-s*0.05,-s*0.25,s*0.07,0,Math.PI*2); ctx.fill();
  // Flame
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath(); ctx.moveTo(-s*0.2,s*0.2); ctx.quadraticCurveTo(-s*0.05,s*0.8,0,s*0.95);
  ctx.quadraticCurveTo(s*0.05,s*0.8,s*0.2,s*0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.moveTo(-s*0.1,s*0.2); ctx.quadraticCurveTo(0,s*0.6,0,s*0.72);
  ctx.quadraticCurveTo(s*0.1,s*0.6,s*0.1,s*0.2); ctx.closePath(); ctx.fill();
}

function drawMoon(ctx, s) {
  ctx.fillStyle = '#FFFACD'; ctx.shadowColor = '#FFFACD'; ctx.shadowBlur = s*0.5;
  ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0d0d26';
  ctx.beginPath(); ctx.arc(s*0.3, -s*0.1, s*0.8, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  // Craters
  ctx.fillStyle = 'rgba(200,190,120,0.4)';
  ctx.beginPath(); ctx.arc(-s*0.3, -s*0.1, s*0.12, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-s*0.1, s*0.4, s*0.08, 0, Math.PI*2); ctx.fill();
}

function drawFlower(ctx, s) {
  const petals = 6;
  for (let i=0;i<petals;i++) {
    const a = i*Math.PI*2/petals;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = i%2===0 ? '#ff69b4' : '#ff1493';
    ctx.beginPath(); ctx.ellipse(0,-s*0.5,s*0.2,s*0.42,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  const cg = ctx.createRadialGradient(0,0,0,0,0,s*0.28);
  cg.addColorStop(0,'#fff176'); cg.addColorStop(1,'#FFD700');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0,0,s*0.28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i=0;i<8;i++) {
    ctx.beginPath(); ctx.arc(Math.cos(i*Math.PI/4)*s*0.15, Math.sin(i*Math.PI/4)*s*0.15, s*0.04, 0, Math.PI*2); ctx.fill();
  }
}

function drawButterfly(ctx, s) {
  const wings = [[0.7, 0.55, '#FF8C00','#ff6600'],[0.5, 0.85, '#ffd700','#ff8c00']];
  for (const side of [-1,1]) {
    ctx.save(); ctx.scale(side, 1);
    // Upper wing
    ctx.fillStyle = wings[0][2];
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(s*0.2,-s*0.6,s*wings[0][0],-s*wings[0][1],s*0.5,s*0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(s*0.3,-s*0.25,s*0.1,0,Math.PI*2); ctx.fill();
    // Lower wing
    ctx.fillStyle = wings[1][2];
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(s*0.15,s*0.2,s*wings[1][0],s*wings[1][1],s*0.3,s*0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Body
  ctx.fillStyle = '#4a3000';
  ctx.beginPath(); ctx.ellipse(0,0,s*0.07,s*0.5,0,0,Math.PI*2); ctx.fill();
  // Antennae
  ctx.strokeStyle = '#4a3000'; ctx.lineWidth = s*0.04;
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.moveTo(0,-s*0.45);
    ctx.quadraticCurveTo(side*s*0.2,-s*0.85,side*s*0.3,-s*0.95); ctx.stroke();
    ctx.fillStyle = '#ff2d55'; ctx.beginPath(); ctx.arc(side*s*0.3,-s*0.95,s*0.06,0,Math.PI*2); ctx.fill();
  }
}

function drawApple(ctx, s) {
  const g = ctx.createRadialGradient(-s*0.2,-s*0.2,s*0.1,0,0,s);
  g.addColorStop(0,'#ff8a80'); g.addColorStop(0.5,'#ff3b30'); g.addColorStop(1,'#b71c1c');
  ctx.fillStyle = g; ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = s*0.3;
  ctx.beginPath();
  ctx.moveTo(0,-s*0.85); ctx.bezierCurveTo(s*0.7,-s*0.85,s,0,s,s*0.4);
  ctx.bezierCurveTo(s,s*0.9,0,s,0,s);
  ctx.bezierCurveTo(0,s,-s,s*0.9,-s,s*0.4);
  ctx.bezierCurveTo(-s,0,-s*0.7,-s*0.85,0,-s*0.85);
  ctx.fill(); ctx.shadowBlur = 0;
  // Leaf
  ctx.fillStyle = '#4caf50';
  ctx.beginPath(); ctx.moveTo(0,-s*0.85); ctx.bezierCurveTo(s*0.4,-s*1.3,s*0.1,-s*0.5,0,-s*0.85); ctx.fill();
  // Stem
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = s*0.07;
  ctx.beginPath(); ctx.moveTo(0,-s*0.85); ctx.lineTo(s*0.1,-s*1.1); ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(-s*0.25,-s*0.2,s*0.12,s*0.2,-0.5,0,Math.PI*2); ctx.fill();
}

function drawCloud(ctx, s) {
  ctx.fillStyle = '#e8f0fe'; ctx.shadowColor = '#c5d4f0'; ctx.shadowBlur = s*0.4;
  const bubbles = [[0,0,s*0.55],[s*0.45,-s*0.18,s*0.38],[-s*0.45,-s*0.18,s*0.38],[s*0.72,s*0.15,s*0.28],[-s*0.72,s*0.15,s*0.28]];
  for (const [bx,by,br] of bubbles) { ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill(); }
  ctx.shadowBlur = 0;
  // Flat bottom
  ctx.fillStyle = '#e8f0fe'; ctx.fillRect(-s*0.98,s*0.08,s*1.96,s*0.55);
}

function drawFish(ctx, s) {
  const g = ctx.createLinearGradient(-s,0,s,0);
  g.addColorStop(0,'#ff8c00'); g.addColorStop(0.5,'#ff6600'); g.addColorStop(1,'#0099ff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0,0,s,s*0.45,0,0,Math.PI*2); ctx.fill();
  // Tail
  ctx.fillStyle = '#0066cc';
  ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(-s*1.5,-s*0.45); ctx.lineTo(-s*1.5,s*0.45); ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s*0.5,0,s*0.14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s*0.52,0,s*0.08,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s*0.55,-s*0.04,s*0.03,0,Math.PI*2); ctx.fill();
  // Fin
  ctx.fillStyle = 'rgba(255,140,0,0.6)';
  ctx.beginPath(); ctx.moveTo(s*0.1,-s*0.45); ctx.lineTo(s*0.4,-s*0.85); ctx.lineTo(s*0.55,-s*0.45); ctx.closePath(); ctx.fill();
}

function drawMushroom(ctx, s) {
  // Cap
  const g = ctx.createRadialGradient(-s*0.2,-s*0.3,0,0,-s*0.2,s);
  g.addColorStop(0,'#ff8a80'); g.addColorStop(0.5,'#f44336'); g.addColorStop(1,'#b71c1c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0,-s*0.2,s*0.8,Math.PI,0); ctx.fill();
  // Spots
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [sx,sy,sr] of [[-s*0.3,-s*0.45,s*0.12],[s*0.25,-s*0.55,s*0.1],[s*0.1,-s*0.25,s*0.08],[-s*0.5,-s*0.2,s*0.09]]) {
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
  }
  // Stem
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath(); ctx.moveTo(-s*0.3,s*0.6); ctx.lineTo(-s*0.28,-s*0.2); ctx.lineTo(s*0.28,-s*0.2); ctx.lineTo(s*0.3,s*0.6); ctx.closePath(); ctx.fill();
  // Gills
  ctx.strokeStyle = 'rgba(200,150,100,0.3)'; ctx.lineWidth = s*0.03;
  for (let i=-3;i<=3;i++) { ctx.beginPath(); ctx.moveTo(i*s*0.08,-s*0.2); ctx.lineTo(i*s*0.09,s*0.6); ctx.stroke(); }
}

function drawSnowflake(ctx, s) {
  ctx.strokeStyle = '#a0d8ef'; ctx.lineWidth = s*0.07; ctx.lineCap = 'round';
  ctx.shadowColor = '#a0d8ef'; ctx.shadowBlur = s*0.5;
  for (let i=0;i<6;i++) {
    ctx.save(); ctx.rotate(i*Math.PI/3);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-s); ctx.stroke();
    // Branches
    for (const by of [-s*0.35,-s*0.65]) {
      for (const side of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(0,by); ctx.lineTo(side*s*0.2,by-s*0.2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a0d8ef'; ctx.beginPath(); ctx.arc(0,0,s*0.1,0,Math.PI*2); ctx.fill();
}

function drawSun(ctx, s) {
  // Rays
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = s*0.1; ctx.lineCap = 'round';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = s*0.5;
  for (let i=0;i<8;i++) {
    const a = i*Math.PI/4;
    ctx.beginPath(); ctx.moveTo(Math.cos(a)*s*0.55,Math.sin(a)*s*0.55);
    ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s); ctx.stroke();
  }
  // Circle
  const g = ctx.createRadialGradient(-s*0.15,-s*0.15,0,0,0,s*0.5);
  g.addColorStop(0,'#fffde7'); g.addColorStop(0.5,'#FFD700'); g.addColorStop(1,'#f57c00');
  ctx.fillStyle = g; ctx.shadowBlur = s*0.6;
  ctx.beginPath(); ctx.arc(0,0,s*0.48,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  // Face
  ctx.fillStyle = 'rgba(120,60,0,0.5)';
  ctx.beginPath(); ctx.arc(-s*0.14,-s*0.1,s*0.07,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.14,-s*0.1,s*0.07,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(0,s*0.12,s*0.14,0,Math.PI); ctx.fill();
}

function drawTurtle(ctx, s) {
  const sg = ctx.createRadialGradient(0,-s*0.1,s*0.1,0,-s*0.1,s*0.65);
  sg.addColorStop(0,'#8BC34A'); sg.addColorStop(1,'#33691E');
  ctx.fillStyle = sg; ctx.shadowColor='#4CAF50'; ctx.shadowBlur=s*0.3;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.62,s*0.52,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=s*0.04;
  ctx.beginPath(); ctx.ellipse(0,-s*0.05,s*0.3,s*0.25,0,0,Math.PI*2); ctx.stroke();
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*0.3,Math.sin(a)*s*0.3);ctx.lineTo(Math.cos(a)*s*0.6,Math.sin(a)*s*0.6);ctx.stroke();}
  ctx.fillStyle='#4CAF50'; ctx.beginPath(); ctx.ellipse(s*0.65,-s*0.05,s*0.22,s*0.17,0.2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.75,-s*0.12,s*0.06,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(s*0.77,-s*0.12,s*0.03,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4CAF50';
  for(const[lx,ly,la] of [[-s*0.3,s*0.5,0.3],[s*0.3,s*0.5,-0.3],[-s*0.55,-s*0.1,0.8],[-s*0.5,s*0.35,0.4]]){ctx.beginPath();ctx.ellipse(lx,ly,s*0.12,s*0.2,la,0,Math.PI*2);ctx.fill();}
  ctx.beginPath(); ctx.ellipse(-s*0.7,s*0.1,s*0.1,s*0.07,0.3,0,Math.PI*2); ctx.fill();
}

function drawBalloon(ctx, s) {
  const g=ctx.createRadialGradient(-s*0.2,-s*0.4,s*0.1,0,-s*0.15,s*0.85);
  g.addColorStop(0,'#ff8fa8'); g.addColorStop(0.5,'#ff2d55'); g.addColorStop(1,'#b30021');
  ctx.fillStyle=g; ctx.shadowColor='#ff2d55'; ctx.shadowBlur=s*0.35;
  ctx.beginPath(); ctx.arc(0,-s*0.18,s*0.78,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.ellipse(-s*0.28,-s*0.52,s*0.18,s*0.28,-0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#cc0022'; ctx.beginPath(); ctx.arc(0,s*0.6,s*0.08,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#aaa'; ctx.lineWidth=s*0.03;
  ctx.beginPath(); ctx.moveTo(0,s*0.6); ctx.quadraticCurveTo(s*0.12,s*0.82,0,s); ctx.stroke();
}

function drawIceCream(ctx, s) {
  ctx.fillStyle='#d4956a';
  ctx.beginPath(); ctx.moveTo(-s*0.45,s*0.1); ctx.lineTo(0,s); ctx.lineTo(s*0.45,s*0.1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#a0634a'; ctx.lineWidth=s*0.03;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-s*0.45+i*s*0.11,s*0.1+i*s*0.22);ctx.lineTo(s*0.45-i*s*0.11,s*0.1+i*s*0.22);ctx.stroke();}
  const sg=ctx.createRadialGradient(-s*0.1,-s*0.4,s*0.1,0,-s*0.3,s*0.65);
  sg.addColorStop(0,'#fff8e1'); sg.addColorStop(0.4,'#ffd54f'); sg.addColorStop(1,'#ffb300');
  ctx.fillStyle=sg; ctx.shadowColor='#ffd54f'; ctx.shadowBlur=s*0.25;
  ctx.beginPath(); ctx.arc(0,-s*0.32,s*0.6,Math.PI,0); ctx.lineTo(s*0.45,s*0.1); ctx.lineTo(-s*0.45,s*0.1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0,-s*0.32,s*0.6,0,Math.PI,true); ctx.fill(); ctx.shadowBlur=0;
  const cols=['#ff2d55','#34c759','#007aff','#ff9500'];
  for(let i=0;i<8;i++){const a=i*Math.PI*2/8;ctx.fillStyle=cols[i%4];ctx.save();ctx.translate(Math.cos(a)*s*0.35,-s*0.32+Math.sin(a)*s*0.35);ctx.rotate(a);ctx.fillRect(-s*0.03,-s*0.1,s*0.06,s*0.2);ctx.restore();}
}

function drawLightning(ctx, s) {
  ctx.shadowColor='#FFD700'; ctx.shadowBlur=s*0.65;
  const g=ctx.createLinearGradient(0,-s,0,s);
  g.addColorStop(0,'#fff176'); g.addColorStop(0.5,'#FFD700'); g.addColorStop(1,'#ff8f00');
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.moveTo(s*0.15,-s); ctx.lineTo(-s*0.28,-s*0.05); ctx.lineTo(s*0.12,-s*0.05);
  ctx.lineTo(-s*0.38,s); ctx.lineTo(s*0.38,-s*0.02); ctx.lineTo(-s*0.12,-s*0.02); ctx.lineTo(s*0.38,-s);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
}

function drawPlanet(ctx, s) {
  const g=ctx.createRadialGradient(-s*0.2,-s*0.2,s*0.1,0,0,s*0.65);
  g.addColorStop(0,'#e040fb'); g.addColorStop(0.5,'#9c27b0'); g.addColorStop(1,'#4a148c');
  ctx.fillStyle=g; ctx.shadowColor='#9c27b0'; ctx.shadowBlur=s*0.4;
  ctx.beginPath(); ctx.arc(0,0,s*0.65,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.1)';
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(0,i*s*0.17,s*0.65,s*0.07,0,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#ce93d8'; ctx.lineWidth=s*0.09; ctx.shadowColor='#ce93d8'; ctx.shadowBlur=s*0.2;
  ctx.beginPath(); ctx.ellipse(0,0,s*1.05,s*0.27,0.28,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
}

function drawGift(ctx, s) {
  const g=ctx.createLinearGradient(-s,0,s,0);
  g.addColorStop(0,'#ef5350'); g.addColorStop(1,'#b71c1c');
  ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(-s*0.75,-s*0.15,s*1.5,s*1.1,s*0.08); ctx.fill();
  ctx.fillStyle='#e53935'; ctx.beginPath(); ctx.roundRect(-s*0.82,-s*0.38,s*1.64,s*0.26,s*0.06); ctx.fill();
  ctx.strokeStyle='#ffd54f'; ctx.lineWidth=s*0.1;
  ctx.beginPath(); ctx.moveTo(0,-s*0.38); ctx.lineTo(0,s*0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s*0.82,s*0.22); ctx.lineTo(s*0.82,s*0.22); ctx.stroke();
  ctx.fillStyle='#ffd54f';
  for(const side of[-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(0,-s*0.38);ctx.quadraticCurveTo(s*0.45,-s*0.78,s*0.5,-s*0.38);ctx.quadraticCurveTo(s*0.35,-s*0.46,0,-s*0.38);ctx.fill();ctx.restore();}
  ctx.fillStyle='#ff8f00'; ctx.beginPath(); ctx.arc(0,-s*0.38,s*0.11,0,Math.PI*2); ctx.fill();
}

function drawCat(ctx, s) {
  ctx.fillStyle='#ff9800'; ctx.beginPath(); ctx.ellipse(0,s*0.42,s*0.55,s*0.48,0,0,Math.PI*2); ctx.fill();
  const hg=ctx.createRadialGradient(-s*0.1,-s*0.2,s*0.05,0,-s*0.15,s*0.52);
  hg.addColorStop(0,'#ffb74d'); hg.addColorStop(1,'#f57c00');
  ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-s*0.15,s*0.52,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e65100';
  for(const side of[-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(s*0.15,-s*0.6);ctx.lineTo(s*0.52,-s);ctx.lineTo(s*0.5,-s*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='#ff8a65';ctx.beginPath();ctx.moveTo(s*0.2,-s*0.62);ctx.lineTo(s*0.46,-s*0.88);ctx.lineTo(s*0.44,-s*0.58);ctx.closePath();ctx.fill();ctx.fillStyle='#e65100';ctx.restore();}
  ctx.fillStyle='#00e676';
  ctx.beginPath(); ctx.ellipse(-s*0.2,-s*0.22,s*0.1,s*0.15,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s*0.2,-s*0.22,s*0.1,s*0.15,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(-s*0.2,-s*0.22,s*0.05,s*0.12,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s*0.2,-s*0.22,s*0.05,s*0.12,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff69b4'; ctx.beginPath(); ctx.moveTo(0,-s*0.05); ctx.lineTo(-s*0.07,s*0.03); ctx.lineTo(s*0.07,s*0.03); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=s*0.025;
  for(const[x1,y1,x2,y2] of[[-s*0.08,-s*0.02,-s*0.6,-s*0.06],[-s*0.08,s*0.04,-s*0.6,s*0.1],[s*0.08,-s*0.02,s*0.6,-s*0.06],[s*0.08,s*0.04,s*0.6,s*0.1]]){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  ctx.strokeStyle='#e65100'; ctx.lineWidth=s*0.14; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(s*0.5,s*0.7); ctx.quadraticCurveTo(s*1.1,s*0.5,s*0.9,s*0.1); ctx.stroke();
}

function drawTree(ctx, s) {
  ctx.shadowColor='#4CAF50'; ctx.shadowBlur=s*0.3;
  [['#43a047',0,-s,s*0.9,-s*0.1],['#2e7d32',0,-s*0.62,s*0.72,s*0.22],['#1b5e20',0,-s*0.24,s*1.0,s*0.58]].forEach(([c,cx,ty,w,by])=>{
    ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(cx,ty); ctx.lineTo(cx-w/2,by); ctx.lineTo(cx+w/2,by); ctx.closePath(); ctx.fill();
  }); ctx.shadowBlur=0;
  const tg=ctx.createLinearGradient(-s*0.15,0,s*0.15,0);
  tg.addColorStop(0,'#5d4037'); tg.addColorStop(1,'#3e2723');
  ctx.fillStyle=tg; ctx.beginPath(); ctx.roundRect(-s*0.15,s*0.56,s*0.3,s*0.42,s*0.04); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.moveTo(0,-s); ctx.lineTo(-s*0.14,-s*0.74); ctx.lineTo(s*0.14,-s*0.74); ctx.closePath(); ctx.fill();
}

