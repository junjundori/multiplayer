
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

const players = new Map();
const sockets = new Map();

const gameNames = [
  "도시 탐험", "자동차 피하기", "미로 탈출", "점프맵",
  "보물찾기", "좀비 생존", "우주 탐험", "축구 경기장",
  "농구 경기장", "경찰서 탈출", "은행 지키기", "소방서 구조",
  "병원 탐험", "도서관 탐험", "편의점 게임", "아파트 탐험",
  "레이싱", "장애물 피하기", "몬스터 사냥", "보스전",
  "스키비디 전쟁", "우주 전쟁", "기차 탈출", "학교 탐험",
  "놀이공원", "수영장", "공원 탐험", "섬 탐험",
  "화산 탈출", "빙하 탐험"
];

for (let i = 31; i <= 220; i++) {
  gameNames.push("미니 게임 " + i);
}

const html = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>멀티플레이 게임</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#151821;color:white;font-family:Arial,sans-serif}
button,input{font:inherit;border:0;border-radius:10px;padding:10px}
button{background:#477bfa;color:white;cursor:pointer}
input{background:#f4f5f7;color:#111;min-width:0}
#home{padding:20px;min-height:100vh;text-align:center}
#games{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;max-width:1100px;margin:24px auto}
.game{padding:20px 10px;border:2px solid #353b4a;background:linear-gradient(135deg,#30394c,#202431);border-radius:15px;cursor:pointer}
.game:hover{border-color:#7197ff;transform:translateY(-2px)}
#profile{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap}
#gameScreen{display:none;position:fixed;inset:0;background:#111}
#canvas{width:100%;height:100%;display:block}
#top{position:absolute;z-index:5;top:0;left:0;right:0;min-height:60px;background:#10131ddd;display:flex;align-items:center;gap:8px;padding:8px}
#title{font-weight:bold;flex:1}
#count{white-space:nowrap;background:#303646;padding:8px;border-radius:10px}
#chat{display:none;position:absolute;right:10px;top:70px;width:min(310px,calc(100vw - 20px));height:360px;padding:10px;background:#151923f2;border-radius:15px;z-index:10}
#messages{height:275px;overflow:auto;background:#252b38;border-radius:10px;padding:8px;overflow-wrap:anywhere}
.msg{margin-bottom:8px}
#chatInput{width:calc(100% - 68px);margin-top:8px}
#send{width:60px;margin-top:8px}
#joy{position:absolute;bottom:22px;left:22px;width:125px;height:125px;border-radius:50%;background:#0005;border:3px solid #ffffff55;touch-action:none}
#stick{position:absolute;left:30px;top:30px;width:59px;height:59px;border-radius:50%;background:#ffffff80}
#help{position:absolute;right:10px;bottom:10px;padding:8px;background:#0008;border-radius:8px;font-size:13px}
@media(max-width:550px){#top{gap:5px;padding:5px}#top button{padding:8px;font-size:13px}#title{font-size:14px}#count{font-size:12px;padding:6px}}
</style>
</head>
<body>
<div id="home">
  <h1>멀티플레이 게임</h1>
  <p>닉네임과 캐릭터를 설정하고 게임을 선택하세요.</p>
  <div id="profile">
    <input id="name" maxlength="12" placeholder="닉네임" value="플레이어">
    <input id="avatar" maxlength="8" placeholder="캐릭터 이모지" value="😀" style="width:145px">
  </div>
  <p id="connection">서버 연결 중...</p>
  <div id="games"></div>
</div>

<div id="gameScreen">
  <div id="top">
    <button id="homeButton">홈</button>
    <div id="title"></div>
    <div id="count">0명</div>
    <button id="chatButton">채팅</button>
  </div>
  <canvas id="canvas"></canvas>
  <div id="chat">
    <div id="messages"></div>
    <input id="chatInput" maxlength="100" placeholder="메시지 입력">
    <button id="send">전송</button>
  </div>
  <div id="joy"><div id="stick"></div></div>
  <div id="help">이동: WASD / 방향키</div>
</div>

<script>
const $ = id => document.getElementById(id);
const home = $("home");
const gameScreen = $("gameScreen");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

let ws = null;
let myId = null;
let currentGame = null;
let players = {};
let myX = 500;
let myY = 400;
let keys = {};
let joyX = 0;
let joyY = 0;
let joyActive = false;
let lastMoveSent = 0;

const gameNames = __GAME_NAMES__;

gameNames.forEach((name, i) => {
  const el = document.createElement("div");
  el.className = "game";
  const strong = document.createElement("b");
  strong.textContent = (i + 1) + ". " + name;
  const small = document.createElement("div");
  small.textContent = "멀티플레이";
  small.style.marginTop = "8px";
  small.style.color = "#aebfe9";
  el.append(strong, small);
  el.addEventListener("click", () => joinGame(name));
  $("games").appendChild(el);
});

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(protocol + "//" + location.host);

  ws.onopen = () => {
    $("connection").textContent = "서버 연결 완료";
    $("connection").style.color = "#70e6a2";
  };

  ws.onmessage = event => {
    let data;
    try { data = JSON.parse(event.data); }
    catch { return; }

    if (data.type === "welcome") {
      myId = data.id;
    }

    if (data.type === "players") {
      players = data.players || {};
      updateCount();
    }

    if (data.type === "move") {
      if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
      }
    }

    if (data.type === "chat") {
      if (data.game === currentGame) {
        addMessage(data.name, data.avatar, data.text);
      }
    }

    if (data.type === "error") {
      alert(data.message);
    }
  };

  ws.onclose = () => {
    $("connection").textContent = "서버 연결이 끊어졌습니다. 새로고침해 주세요.";
    $("connection").style.color = "#ff8c8c";
  };
}

function joinGame(game) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("서버에 연결될 때까지 기다려 주세요.");
    return;
  }

  const name = $("name").value.trim() || "플레이어";
  const avatar = $("avatar").value.trim() || "😀";

  if (!/\p{Extended_Pictographic}/u.test(avatar)) {
    alert("캐릭터 칸에 이모지를 입력해 주세요. 예: 😀 🤖 🐱");
    return;
  }

  currentGame = game;
  myX = 500;
  myY = 400;

  $("title").textContent = game;
  $("messages").replaceChildren();
  $("chat").style.display = "none";
  home.style.display = "none";
  gameScreen.style.display = "block";
  resize();

  ws.send(JSON.stringify({
    type: "join",
    name,
    avatar,
    game,
    x: myX,
    y: myY
  }));
}

function leaveGame() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "leave" }));
  }

  currentGame = null;
  gameScreen.style.display = "none";
  home.style.display = "block";
}

function updateCount() {
  let total = 0;
  for (const p of Object.values(players)) {
    if (p.game === currentGame) total++;
  }
  $("count").textContent = total + "명";
}

function addMessage(name, avatar, text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.textContent = avatar + " " + name + ": " + text;
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function sendChat() {
  const text = $("chatInput").value.trim();
  if (!text || !currentGame) return;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "chat", text }));
  }

  $("chatInput").value = "";
}

$("send").onclick = sendChat;
$("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter") sendChat();
});

$("chatButton").onclick = () => {
  $("chat").style.display =
    $("chat").style.display === "block" ? "none" : "block";
};

$("homeButton").onclick = leaveGame;

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => { keys = {}; });

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function updateMovement() {
  if (!currentGame) return;

  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy--;
  if (keys.s || keys.arrowdown) dy++;
  if (keys.a || keys.arrowleft) dx--;
  if (keys.d || keys.arrowright) dx++;

  dx += joyX;
  dy += joyY;

  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
    myX = Math.max(25, Math.min(1975, myX + dx * 5));
    myY = Math.max(25, Math.min(1375, myY + dy * 5));

    const now = performance.now();
    if (now - lastMoveSent > 40 &&
        ws && ws.readyState === WebSocket.OPEN) {
      lastMoveSent = now;
      ws.send(JSON.stringify({
        type: "move",
        x: myX,
        y: myY,
        game: currentGame
      }));
    }

    if (players[myId]) {
      players[myId].x = myX;
      players[myId].y = myY;
    }
  }
}

function drawMap(camX, camY) {
  const g = currentGame || "";

  if (g.includes("미로")) {
    ctx.fillStyle = "#18252d";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#546b77";
    for (let x = 0; x < 2000; x += 200) {
      for (let y = 0; y < 1400; y += 200) {
        if ((x / 200 + y / 200) % 3 !== 0) {
          ctx.fillRect(x-camX, y-camY, 125, 125);
        }
      }
    }
    ctx.fillStyle = "#51f0a6";
    ctx.fillRect(1850-camX, 1250-camY, 70, 70);
    return;
  }

  if (g.includes("레이싱") || g.includes("자동차")) {
    ctx.fillStyle = "#327d45";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#454953";
    ctx.fillRect(100-camX, 100-camY, 1800, 1200);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.setLineDash([30, 25]);
    ctx.strokeRect(140-camX, 140-camY, 1720, 1120);
    ctx.setLineDash([]);
    return;
  }

  if (g.includes("우주")) {
    ctx.fillStyle = "#10122c";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    for (let i = 0; i < 180; i++) {
      const x = (i * 197 + 37) % 2000;
      const y = (i * 113 + 71) % 1400;
      ctx.fillStyle = i % 3 ? "#ffffff" : "#8fdcff";
      ctx.fillRect(x-camX, y-camY, 3, 3);
    }
    ctx.fillStyle = "#7656c8";
    ctx.beginPath();
    ctx.arc(1000-camX, 650-camY, 180, 0, Math.PI*2);
    ctx.fill();
    return;
  }

  if (g.includes("축구") || g.includes("농구")) {
    ctx.fillStyle = g.includes("농구") ? "#bd783f" : "#33894b";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.strokeRect(100-camX, 100-camY, 1800, 1200);
    ctx.beginPath();
    ctx.moveTo(1000-camX, 100-camY);
    ctx.lineTo(1000-camX, 1300-camY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1000-camX, 700-camY, 150, 0, Math.PI*2);
    ctx.stroke();
    return;
  }

  if (g.includes("좀비") || g.includes("전쟁") || g.includes("보스")) {
    ctx.fillStyle = "#514c48";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    for (let x = 150; x < 1900; x += 350) {
      ctx.fillStyle = "#303238";
      ctx.fillRect(x-camX, 200-camY, 150, 110);
      ctx.fillStyle = "#817263";
      ctx.fillRect(x+180-camX, 850-camY, 100, 170);
    }
    return;
  }

  // 일반 도시·탐험 맵
  ctx.fillStyle = "#69bd70";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.fillStyle = "#777";
  for (let x = 0; x < 2000; x += 300) {
    ctx.fillRect(x-camX, 300-camY, 250, 100);
  }

  for (let x = 100; x < 1900; x += 400) {
    ctx.fillStyle = "#777";
    ctx.fillRect(x-camX, 600-camY, 220, 160);
    ctx.fillStyle = "#b8e6ff";
    ctx.fillRect(x+20-camX, 620-camY, 70, 50);
    ctx.fillRect(x+120-camX, 620-camY, 70, 50);
  }
}

function drawPlayer(x, y, avatar, name, isMe, camX, camY) {
  const sx = x-camX, sy = y-camY;
  if (sx < -100 || sy < -100 || sx > innerWidth+100 || sy > innerHeight+100) return;

  ctx.textAlign = "center";
  ctx.font = "38px sans-serif";
  ctx.fillText(avatar || "😀", sx, sy);

  ctx.font = "14px sans-serif";
  const label = name || "플레이어";
  const w = ctx.measureText(label).width + 14;
  ctx.fillStyle = isMe ? "#284fc9" : "#171923dd";
  ctx.fillRect(sx-w/2, sy-47, w, 21);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, sx, sy-32);
}

function render() {
  updateMovement();

  if (currentGame) {
    const camX = myX-innerWidth/2;
    const camY = myY-innerHeight/2;
    drawMap(camX, camY);

    for (const [id, p] of Object.entries(players)) {
      if (p.game !== currentGame) continue;
      drawPlayer(
        id === myId ? myX : p.x,
        id === myId ? myY : p.y,
        p.avatar,
        p.name,
        id === myId,
        camX,
        camY
      );
    }
  }

  requestAnimationFrame(render);
}
render();

// 모바일 조이스틱
const joy = $("joy");
const stick = $("stick");

function moveStick(e) {
  const rect = joy.getBoundingClientRect();
  let x = e.clientX-(rect.left+rect.width/2);
  let y = e.clientY-(rect.top+rect.height/2);
  const max = 42;
  const d = Math.hypot(x,y);
  if (d > max) { x = x/d*max; y = y/d*max; }

  stick.style.left = (30+x)+"px";
  stick.style.top = (30+y)+"px";
  joyX = x/max;
  joyY = y/max;
}

function resetStick() {
  joyActive = false;
  joyX = joyY = 0;
  stick.style.left = "30px";
  stick.style.top = "30px";
}

joy.addEventListener("pointerdown", e => {
  joyActive = true;
  joy.setPointerCapture(e.pointerId);
  moveStick(e);
});
joy.addEventListener("pointermove", e => {
  if (joyActive) moveStick(e);
});
joy.addEventListener("pointerup", resetStick);
joy.addEventListener("pointercancel", resetStick);

connect();
</script>
</body>
</html>`;

const page = html.replace(
  "__GAME_NAMES__",
  JSON.stringify(gameNames)
);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(page);
});

const wss = new WebSocket.Server({ server });

function send(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcast(data, except = null) {
  for (const client of wss.clients) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      send(client, data);
    }
  }
}

function broadcastPlayers() {
  const snapshot = {};

  for (const [id, p] of players) {
    snapshot[id] = { ...p };
  }

  broadcast({ type: "players", players: snapshot });
}

function uniqueName(requested, id) {
  const base = (requested || "플레이어").slice(0, 12);
  let candidate = base;
  let number = 2;

  const used = new Set();

  for (const [otherId, p] of players) {
    if (otherId !== id && p.name === candidate) {
      used.add(p.name);
    }
  }

  while (used.has(candidate) ||
         [...players.entries()].some(([otherId, p]) =>
           otherId !== id && p.name === candidate
         )) {
    const suffix = " (" + number++ + ")";
    candidate = base.slice(0, Math.max(1, 12-suffix.length)) + suffix;
  }

  return candidate;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

wss.on("connection", socket => {
  const id = crypto.randomUUID();

  sockets.set(id, socket);

  players.set(id, {
    id,
    name: "플레이어",
    avatar: "😀",
    game: null,
    x: 500,
    y: 400
  });

  send(socket, { type: "welcome", id });
  broadcastPlayers();

  socket.on("message", raw => {
    if (raw.length > 4096) return;

    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const p = players.get(id);
    if (!p || !data || typeof data.type !== "string") return;

    if (data.type === "join") {
      const game = cleanText(data.game, 100);
      if (!gameNames.includes(game)) {
        return send(socket, {
          type: "error",
          message: "존재하지 않는 게임입니다."
        });
      }

      const name = cleanText(data.name, 12) || "플레이어";
      const avatar = cleanText(data.avatar, 8) || "😀";

      p.name = uniqueName(name, id);
      p.avatar = avatar;
      p.game = game;
      p.x = 500;
      p.y = 400;

      send(socket, { type: "joined", id, name: p.name });
      broadcastPlayers();
      return;
    }

    if (data.type === "leave") {
      p.game = null;
      broadcastPlayers();
      return;
    }

    if (data.type === "move") {
      if (!p.game || data.game !== p.game) return;

      const x = Number(data.x);
      const y = Number(data.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      p.x = Math.max(25, Math.min(1975, x));
      p.y = Math.max(25, Math.min(1375, y));

      broadcast({
        type: "move",
        id,
        x: p.x,
        y: p.y,
        game: p.game
      }, socket);
      return;
    }

    if (data.type === "chat") {
      if (!p.game) return;

      const text = cleanText(data.text, 100);
      if (!text) return;

      for (const [otherId, otherSocket] of sockets) {
        const otherPlayer = players.get(otherId);

        if (otherPlayer &&
            otherPlayer.game === p.game) {
          send(otherSocket, {
            type: "chat",
            name: p.name,
            avatar: p.avatar,
            text,
            game: p.game
          });
        }
      }
    }
  });

  socket.on("close", () => {
    players.delete(id);
    sockets.delete(id);
    broadcastPlayers();
  });

  socket.on("error", () => {
    players.delete(id);
    sockets.delete(id);
    broadcastPlayers();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Multiplayer server running on port " + PORT);
});