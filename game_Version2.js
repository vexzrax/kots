// Lista de imágenes necesarias
const imgNames = [
  "titulo.png", "eclipse.png", "caballero.png", "espada.png", "lobo.png", "piso.png", "cueva.png"
];
const images = {};
let loaded = 0;

// Carga de imágenes con manejo de error
imgNames.forEach(name => {
  const img = new Image();
  img.src = name;
  img.onload = () => {
    loaded++;
    if (loaded === imgNames.length) startGame();
  };
  img.onerror = () => {
    showError(`No se pudo cargar la imagen: ${name}. Asegúrate de que esté en la carpeta.`);
  };
  images[name] = img;
});

function showError(msg) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#222";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font = "32px Arial Black";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("ERROR", canvas.width/2, canvas.height/2 - 40);
  ctx.font = "20px Arial";
  ctx.fillText(msg, canvas.width/2, canvas.height/2 + 10);
}

// Variables globales
let canvas, ctx;
let keys = {};
let gameState = "intro";
let overlay;

// Entidades del juego
let knight, floor, wolves, swords, bgX, killed, life, cuevaShown;

// Utilidad colisión
function rectsCollide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Juego principal
function startGame() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  overlay = document.getElementById('overlay');
  resetGame();

  document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (gameState === 'lose' || gameState === 'win') {
      if (e.key === 'Enter') restartGame();
    }
  });
  document.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });
  canvas.addEventListener('click', () => {
    if (gameState === 'lose' || gameState === 'win') restartGame();
  });

  requestAnimationFrame(loop);
}

function resetGame() {
  bgX = 0;
  knight = {
    x: canvas.width / 2 - 40,
    y: 370,
    w: 80, h: 120,
    vx: 0,
    facing: 1,
    life: 5,
    canShoot: true,
    shootCooldown: 0,
  };
  floor = { x: 0, y: 490, w: 960, h: 50 };
  wolves = [];
  for (let i = 0; i < 3; i++) {
    wolves.push({
      x: 600 + i * 150,
      y: 400,
      w: 80, h: 80,
      vx: -1.5 - Math.random(),
      alive: true,
    });
  }
  swords = [];
  killed = 0;
  life = knight.life;
  cuevaShown = false;
}

function loop(ts) {
  if (gameState === 'intro') {
    drawIntro(ts);
  } else if (gameState === 'play') {
    updateGame();
    drawGame();
  } else if (gameState === 'lose' || gameState === 'win') {
    drawGame();
    showOverlay(gameState === 'lose' ? "¡Perdiste!" : "¡Ganaste!");
  }
  requestAnimationFrame(loop);
}

function drawIntro(ts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Fondo
  ctx.drawImage(images["eclipse.png"], 0, 0, canvas.width, canvas.height);
  // Piso
  ctx.drawImage(images["piso.png"], 0, floor.y, floor.w, floor.h);
  // Título se acerca
  let scale = Math.min(1.8, 0.6 + ts / 2000);
  let tw = images["titulo.png"].width * scale;
  let th = images["titulo.png"].height * scale;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (scale-0.6)/1.2);
  ctx.drawImage(
    images["titulo.png"],
    canvas.width/2 - tw/2,
    120 - (scale-0.6)*40,
    tw, th
  );
  ctx.restore();
  // Caballero está quieto
  ctx.drawImage(images["caballero.png"], knight.x, knight.y, knight.w, knight.h);
  // Texto de empezar
  if (scale >= 1.2) {
    ctx.font = "38px Arial Black";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Pulsa cualquier tecla para empezar", canvas.width / 2, 420);
    document.onkeydown = () => {
      gameState = "play";
      document.onkeydown = null;
    };
  }
}

function updateGame() {
  // Movimiento caballero
  knight.vx = 0;
  if (keys['arrowleft'] || keys['a']) {
    knight.vx = -4;
    knight.facing = -1;
  }
  if (keys['arrowright'] || keys['d']) {
    knight.vx = 4;
    knight.facing = 1;
  }
  // Fondo se mueve (scroll)
  if (knight.vx !== 0) {
    bgX -= knight.vx * 0.7;
    knight.x += knight.vx;
    knight.x = Math.max(40, Math.min(canvas.width - 120, knight.x));
  }
  floor.x = bgX;
  // Lobos mueven y atacan
  wolves.forEach(wolf => {
    if (!wolf.alive) return;
    wolf.x += wolf.vx;
    // Regenerar si sale de pantalla o muerto
    if (wolf.x < -100 || wolf.x > canvas.width + 100 || !wolf.alive) {
      if (killed < 10) {
        wolf.x = canvas.width + Math.random()*200;
        wolf.vx = -1.5 - Math.random();
        wolf.alive = true;
      }
    }
    // Ataque lobo
    if (rectsCollide(knight, wolf)) {
      wolf.vx = 0;
      wolf.x += Math.random()*2-1;
      if (Math.random() < 0.02) {
        life--;
        if (life <= 0) {
          gameState = "lose";
        }
      }
    }
  });
  // Espada disparo
  if (keys['x'] && knight.canShoot) {
    swords.push({
      x: knight.x + knight.w/2 + knight.facing*30,
      y: knight.y + 40,
      w: 40, h: 20,
      vx: 8 * knight.facing
    });
    knight.canShoot = false;
    knight.shootCooldown = 20;
  }
  if (!keys['x']) knight.canShoot = true;
  if (knight.shootCooldown > 0) knight.shootCooldown--;
  // Espadas se mueven
  swords.forEach(sword => {
    sword.x += sword.vx;
  });
  // Colisiones espada-lobo
  swords.forEach(sword => {
    wolves.forEach(wolf => {
      if (wolf.alive && rectsCollide(sword, wolf)) {
        wolf.alive = false;
        killed++;
        sword.x = -999;
      }
    });
  });
  // Eliminar espadas fuera
  swords = swords.filter(s => s.x > -50 && s.x < canvas.width+50);
  // Generar más lobos si faltan
  while (wolves.length < 4 && killed < 10) {
    wolves.push({
      x: canvas.width + Math.random()*200,
      y: 400,
      w: 80, h: 80,
      vx: -1.2-Math.random(),
      alive: true,
    });
  }
  // Si mató 10 lobos, aparece cueva
  if (killed >= 10) {
    cuevaShown = true;
    // Si llega a la cueva gana
    if (knight.x + knight.w > canvas.width - 110) {
      gameState = "win";
    }
  }
}

function drawGame() {
  // Fondo
  ctx.drawImage(images["eclipse.png"], bgX, 0, canvas.width, canvas.height);
  // Piso
  ctx.drawImage(images["piso.png"], bgX, floor.y, floor.w, floor.h);
  // Lobos
  wolves.forEach(wolf => {
    if (wolf.alive) {
      ctx.drawImage(images["lobo.png"], wolf.x, wolf.y, wolf.w, wolf.h);
    }
  });
  // Espadas
  swords.forEach(sword => {
    ctx.drawImage(images["espada.png"], sword.x, sword.y, sword.w, sword.h);
  });
  // Caballero
  ctx.save();
  if (knight.facing === -1) {
    ctx.translate(knight.x + knight.w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(images["caballero.png"], 0, knight.y, knight.w, knight.h);
  } else {
    ctx.drawImage(images["caballero.png"], knight.x, knight.y, knight.w, knight.h);
  }
  ctx.restore();
  // Barra de vida
  ctx.fillStyle = "#900";
  ctx.fillRect(40, 40, 200, 28);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(40, 40, Math.max(0, life * 40), 28);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, 200, 28);
  ctx.font = "22px Arial Black";
  ctx.fillStyle = "#fff";
  ctx.fillText("Vida", 45, 62);
  // Puntos
  ctx.font = "22px Arial Black";
  ctx.fillStyle = "#fff";
  ctx.fillText("Lobos derrotados: " + killed + " / 10", 310, 62);
  // Cueva
  if (cuevaShown) {
    ctx.drawImage(images["cueva.png"], canvas.width - 110, floor.y - 110, 100, 110);
    ctx.font = "22px Arial Black";
    ctx.fillStyle = "#fff";
    ctx.fillText("¡Entra a la cueva para ganar!", canvas.width-320, floor.y-40);
  }
}

function showOverlay(text) {
  overlay.innerHTML = text +
    "<button onclick='restartGame()'>Jugar de nuevo</button>";
  overlay.style.visibility = "visible";
}
window.restartGame = function() {
  overlay.style.visibility = "hidden";
  gameState = "intro";
  resetGame();
};