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
let knight, floor, wolves, swords, cameraX, killed, life, cuevaShown;
const WOLF_TOTAL = 10;
const FLOOR_HEIGHT = 50;

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
  cameraX = 0;
  knight = {
    x: 480, // Siempre centrado al inicio
    y: canvas.height - FLOOR_HEIGHT - 120,
    w: 70, h: 120,
    vx: 0,
    facing: 1,
    life: 5,
    canShoot: true,
    shootCooldown: 0,
  };
  floor = { x: 0, y: canvas.height - FLOOR_HEIGHT, w: 960, h: FLOOR_HEIGHT };
  wolves = [];
  for (let i = 0; i < Math.min(5, WOLF_TOTAL); i++) {
    wolves.push({
      x: 800 + i * 200,
      y: canvas.height - FLOOR_HEIGHT - 80,
      w: 80, h: 80,
      vx: -1.5 - Math.random(),
      alive: true,
      id: i
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
  // Título centrado, más pequeño
  let scale = 0.7;
  let tw = images["titulo.png"].width * scale;
  let th = images["titulo.png"].height * scale;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(
    images["titulo.png"],
    canvas.width/2 - tw/2,
    80,
    tw, th
  );
  ctx.restore();
  // Caballero tocando el piso
  ctx.drawImage(images["caballero.png"], canvas.width/2 - knight.w/2, canvas.height - FLOOR_HEIGHT - knight.h, knight.w, knight.h);
  // Texto de empezar
  ctx.font = "38px Arial Black";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Pulsa cualquier tecla para empezar", canvas.width / 2, 420);
  document.onkeydown = () => {
    gameState = "play";
    document.onkeydown = null;
  };
}

// Retorna la X de la cueva en el mundo
function getCuevaX() {
  return 2500;
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

  // Restricción del caballero para no salir de pantalla antes de derrotar 10 lobos
  let minX = cameraX + 40;
  let maxX = cameraX + canvas.width - knight.w - 40;
  if (!cuevaShown) {
    // Limita movimiento dentro de la pantalla
    knight.x = Math.max(minX, Math.min(maxX, knight.x + knight.vx));
  } else {
    // Puede avanzar hasta la cueva y salir del encuadre
    knight.x += knight.vx;
    let cuevaLimit = getCuevaX() + 100 - knight.w;
    if (knight.x > cuevaLimit) knight.x = cuevaLimit;
    if (knight.x < 0) knight.x = 0;
  }

  // La cámara sigue al caballero solo si derrotó 10 lobos
  if (cuevaShown) {
    // Centra al caballero en pantalla o hasta llegar a la cueva
    cameraX = Math.max(0, Math.min(knight.x + knight.w/2 - canvas.width/2, getCuevaX() - canvas.width + 150));
  } else {
    cameraX = 0;
  }

  // Piso infinito (se repite)
  floor.x = cameraX;

  // Lobos mueven y atacan
  wolves.forEach(wolf => {
    if (!wolf.alive) return;
    wolf.x += wolf.vx;
    // Regenerar si sale de pantalla o muerto
    if (wolf.x < cameraX - 120 || wolf.x > cameraX + canvas.width + 120 || !wolf.alive) {
      wolf.alive = false;
    }
    // Ataque lobo
    if (rectsCollide(
      {x: knight.x, y: knight.y, w: knight.w, h: knight.h},
      {x: wolf.x, y: wolf.y, w: wolf.w, h: wolf.h}
    )) {
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
      if (wolf.alive && rectsCollide(
        {x: sword.x, y: sword.y, w: sword.w, h: sword.h},
        {x: wolf.x, y: wolf.y, w: wolf.w, h: wolf.h}
      )) {
        wolf.alive = false;
        killed++;
        sword.x = -99999;
      }
    });
  });
  // Eliminar espadas fuera del mundo
  swords = swords.filter(s => s.x > cameraX - 100 && s.x < cameraX + canvas.width + 100);

  // Generar más lobos si faltan y no se han generado todos
  let vivos = wolves.filter(w => w.alive).length;
  while (wolves.length < WOLF_TOTAL) {
    let n = wolves.length;
    wolves.push({
      x: cameraX + canvas.width + Math.random()*500,
      y: canvas.height - FLOOR_HEIGHT - 80,
      w: 80, h: 80,
      vx: -1.2 - Math.random(),
      alive: true,
      id: n
    });
  }
  if (vivos < Math.min(4, WOLF_TOTAL - killed)) {
    // Reactiva lobos muertos si aún no has matado todos
    let respawned = wolves.filter(w => !w.alive && w.id < WOLF_TOTAL && killed < WOLF_TOTAL);
    for (let w of respawned.slice(0, Math.min(4-vivos, respawned.length))) {
      w.x = cameraX + canvas.width + Math.random()*500;
      w.vx = -1.2 - Math.random();
      w.alive = true;
    }
  }

  // Si mató 10 lobos, aparece cueva
  if (killed >= WOLF_TOTAL) {
    cuevaShown = true;
    // Si llega a la cueva gana
    if (knight.x + knight.w > getCuevaX()) {
      gameState = "win";
    }
  }
}

function drawGame() {
  // Fondo infinito
  let bgW = images["eclipse.png"].width;
  for (let bgX = Math.floor(cameraX/bgW)*bgW; bgX < cameraX + canvas.width; bgX += bgW) {
    ctx.drawImage(images["eclipse.png"], bgX - cameraX, 0, bgW, canvas.height);
  }
  // Piso infinito
  let pisoW = images["piso.png"].width;
  for (let px = Math.floor(cameraX/pisoW)*pisoW; px < cameraX + canvas.width; px += pisoW) {
    ctx.drawImage(images["piso.png"], px - cameraX, floor.y, pisoW, floor.h);
  }
  // Lobos en pantalla
  wolves.forEach(wolf => {
    if (wolf.alive && wolf.x > cameraX - 120 && wolf.x < cameraX + canvas.width + 120) {
      ctx.drawImage(images["lobo.png"], wolf.x - cameraX, wolf.y, wolf.w, wolf.h);
    }
  });
  // Espadas en pantalla
  swords.forEach(sword => {
    ctx.drawImage(images["espada.png"], sword.x - cameraX, sword.y, sword.w, sword.h);
  });
  // Caballero (solo uno, posición relativa a la cámara)
  ctx.save();
  if (knight.facing === -1) {
    ctx.translate(knight.x - cameraX + knight.w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(images["caballero.png"], 0, knight.y, knight.w, knight.h);
  } else {
    ctx.drawImage(images["caballero.png"], knight.x - cameraX, knight.y, knight.w, knight.h);
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
  ctx.fillText("Lobos derrotados: " + killed + " / " + WOLF_TOTAL, 310, 62);
  // Cueva
  if (cuevaShown) {
    ctx.drawImage(images["cueva.png"], getCuevaX() - cameraX, floor.y - 110, 100, 110);
    ctx.font = "22px Arial Black";
    ctx.fillStyle = "#fff";
    ctx.fillText("¡Entra a la cueva para ganar!", getCuevaX() - cameraX - 220, floor.y - 40);
  }
}

function showOverlay(text) {
  overlay.innerHTML = `
    <span>${text}</span>
    <button class="golden" onclick='restartGame()'>Jugar de nuevo</button>
  `;
  overlay.style.visibility = "visible";
}
window.restartGame = function() {
  overlay.style.visibility = "hidden";
  gameState = "intro";
  resetGame();
};