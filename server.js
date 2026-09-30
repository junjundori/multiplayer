
const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const games = [
  { id: 1, name: "도시 탐험", icon: "🏙️", type: "city" },
  { id: 2, name: "미로 탈출", icon: "🌀", type: "maze" },
  { id: 3, name: "자동차 피하기", icon: "🚗", type: "race" },
  { id: 4, name: "우주 탐험", icon: "🚀", type: "space" },
  { id: 5, name: "축구 경기장", icon: "⚽", type: "soccer" },
  { id: 6, name: "농구 코트", icon: "🏀", type: "basketball" },
  { id: 7, name: "전투 지역", icon: "🛡️", type: "battle" },
  { id: 8, name: "공원 산책", icon: "🌳", type: "park" },
  { id: 9, name: "보물 찾기", icon: "💎", type: "treasure" },
  { id: 10, name: "경찰서", icon: "🚓", type: "police" },
  { id: 11, name: "은행 탐험", icon: "🏦", type: "bank" },
  { id: 12, name: "소방서", icon: "🚒", type: "fire" },
  { id: 13, name: "병원 탐험", icon: "🏥", type: "hospital" },
  { id: 14, name: "도서관", icon: "📚", type: "library" },
  { id: 15, name: "편의점", icon: "🏪", type: "store" },
  { id: 16, name: "아파트", icon: "🏢", type: "apartment" },
  { id: 17, name: "해변 탐험", icon: "🏖️", type: "beach" },
  { id: 18, name: "숲속 모험", icon: "🌲", type: "forest" },
  { id: 19, name: "눈 덮인 마을", icon: "❄️", type: "snow" },
  { id: 20, name: "화산 지대", icon: "🌋", type: "volcano" },
  { id: 21, name: "광산 탐험", icon: "⛏️", type: "mine" },
  { id: 22, name: "수중 도시", icon: "🐠", type: "ocean" },
  { id: 23, name: "놀이공원", icon: "🎡", type: "amusement" },
  { id: 24, name: "공항", icon: "✈️", type: "airport" },
  { id: 25, name: "기차역", icon: "🚆", type: "station" },
  { id: 26, name: "유령의 집", icon: "👻", type: "haunted" },
  { id: 27, name: "보석 동굴", icon: "💠", type: "cave" },
  { id: 28, name: "사막 탐험", icon: "🏜️", type: "desert" },
  { id: 29, name: "섬 생존", icon: "🏝️", type: "island" },
  { id: 30, name: "정원 꾸미기", icon: "🌷", type: "garden" }
];

const players = new Map();
const sockets = new Map();
const usedNames = new Map();

function safeText(value, max = 24) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

function makeUniqueName(requested, id) {
  const base = safeText(requested, 18) || "플레이어";
  let candidate = base;
  let number = 2;

  while (
    [...players.values()].some(
      p => p.id !== id && p.name === candidate
    )
  ) {
    candidate = `${base} (${number++})`;
  }

  return candidate;
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastPlayers() {
  const snapshot = [...players.values()].map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    x: p.x,
    y: p.y,
    game: p.game
  }));

  for (const ws of sockets.values()) {
    send(ws, { type: "players", players: snapshot });
  }
}

function removePlayer(id) {
  players.delete(id);
  sockets.delete(id);
  broadcastPlayers();
}

const html = String.raw`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>초록빛 멀티플레이어 월드</title>
<style>
*{box-sizing:border-box}
:root{color-scheme:dark}
body{
  margin:0;min-height:100vh;color:#effff4;
  font-family:Arial,"Malgun Gothic",sans-serif;
  background:radial-gradient(ellipse at top,#146c43 0%,#082c20 48%,#06150f 100%);
}
button,input{font:inherit}
button{
  cursor:pointer;color:white;border:1px solid #57d68d;
  background:linear-gradient(135deg,#159957,#087443);
  border-radius:12px;padding:10px 14px;
}
button:hover{filter:brightness(1.15)}
input{
  color:white;background:#102a20;border:1px solid #347a54;
  padding:10px;border-radius:10px;min-width:0;
}
header{
  padding:18px;display:flex;align-items:center;justify-content:space-between;
  gap:12px;flex-wrap:wrap;border-bottom:1px solid #3d875d;
  background:linear-gradient(110deg,#0d5135dd,#0a281fe8);
  position:sticky;top:0;z-index:5;backdrop-filter:blur(12px);
}
h1{font-size:clamp(20px,4vw,30px);margin:0}
h2{margin-top:0}
.sub{color:#b9e8cb;font-size:13px;margin-top:6px}
main{max-width:1400px;margin:auto;padding:18px}
.panel{
  background:linear-gradient(145deg,#143d2ddd,#0b241bdd);
  border:1px solid #367a50;border-radius:18px;padding:16px;margin-bottom:18px;
  box-shadow:0 10px 35px #0003;
}
.profile{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.profile input{width:160px}
.grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;
}
.game{
  text-align:left;min-height:132px;padding:14px;
  background:linear-gradient(145deg,#1a6945,#10412e 72%,#0c3024);
  border:1px solid #4aa76e;border-radius:16px;
  box-shadow:inset 0 1px #ffffff10,0 6px 15px #0002;
  transition:transform .15s,border-color .15s;
}
.game:hover{transform:translateY(-3px);border-color:#a0ffc0}
.game .icon{font-size:32px;display:block;margin-bottom:10px}
.game .name{font-weight:bold;display:block}
.game .num{display:block;color:#b7e7c8;font-size:12px;margin-top:7px}
#gameView{display:none}
#mapWrap{
  position:relative;width:100%;height:min(66vh,650px);min-height:360px;
  overflow:hidden;border-radius:16px;border:2px solid #55a878;
  background:#183c2a;isolation:isolate;
}
#world{
  display:block;width:100%;height:100%;touch-action:none;
}
#topInfo{
  position:absolute;left:10px;top:10px;z-index:2;
  background:#071d15dc;border:1px solid #4d9567;
  padding:8px 12px;border-radius:10px;pointer-events:none;
}
#playersInfo{
  position:absolute;right:10px;top:10px;z-index:2;
  background:#071d15dc;padding:8px 12px;border-radius:10px;
  border:1px solid #4d9567;font-size:12px;max-width:45%;
}
#chatPanel{margin-top:12px}
#chatMessages{
  height:140px;overflow:auto;background:#061a12;
  border:1px solid #2e6846;border-radius:10px;padding:10px;
  overflow-wrap:anywhere;
}
.chatrow{margin-bottom:6px}
.chatform{display:flex;gap:8px;margin-top:8px}
.chatform input{flex:1;width:100%}
#controls{
  display:flex;justify-content:space-between;align-items:center;
  gap:16px;margin-top:12px;flex-wrap:wrap;
}
#stick{
  width:140px;height:140px;border-radius:50%;position:relative;
  background:radial-gradient(circle,#2a6948,#102f21);
  border:2px solid #6db78a;touch-action:none;user-select:none;
}
#knob{
  width:54px;height:54px;position:absolute;left:41px;top:41px;
  border-radius:50%;background:linear-gradient(135deg,#8affad,#20a85c);
  box-shadow:0 3px 12px #0005;pointer-events:none;
}
#status{font-size:13px;color:#b9e8cb}
.hidden{display:none!important}
@media(max-width:600px){
 main{padding:10px}header{padding:12px}
 .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .game{min-height:118px;padding:10px}
 #mapWrap{height:56vh;min-height:300px}
}
</style>
</head>
<body>
<header>
  <div>
    <h1>초록빛 멀티플레이어 월드</h1>
    <div class="sub">30개의 서로 다른 탐험 맵 · 실시간 플레이</div>
  </div>
  <div id="status">서버 연결 중...</div>
</header>
<main>
  <section id="home">
    <div class="panel">
      <h2>플레이어 설정</h2>
      <div class="profile">
        <label for="nickname">닉네임</label>
        <input id="nickname" maxlength="18" value="플레이어" autocomplete="off">
        <label for="avatar">캐릭터</label>
        <select id="avatar" style="background:#102a20;color:white;padding:10px;border-radius:10px">
          <option>🧑</option><option>👨‍🚀</option><option>🦊</option>
          <option>🐱</option><option>🐸</option><option>🤖</option>
          <option>🐼</option><option>🐯</option><option>👻</option>
          <option>🧙</option><option>🦖</option><option>🐰</option>
        </select>
      </div>
    </div>
    <div class="panel">
      <h2>게임 선택</h2>
      <div id="gameGrid" class="grid"></div>
    </div>
  </section>

  <section id="gameView">
    <div class="panel">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><h2 id="gameTitle">맵</h2><div class="sub">WASD 또는 방향키로 이동하세요.</div></div>
        <button id="leaveBtn">게임 나가기</button>
      </div>
      <div id="mapWrap">
        <canvas id="world"></canvas>
        <div id="topInfo">맵을 불러오는 중...</div>
        <div id="playersInfo">접속 플레이어: 0명</div>
      </div>
      <div id="controls">
        <div id="stick"><div id="knob"></div></div>
        <div style="flex:1;min-width:180px">
          <div>이동: WASD / 방향키 / 조이스틱</div>
          <div class="sub">같은 맵에 들어온 플레이어가 함께 보여요.</div>
        </div>
      </div>
      <div id="chatPanel">
        <h3>맵 채팅</h3>
        <div id="chatMessages"></div>
        <form id="chatForm" class="chatform">
          <input id="chatInput" maxlength="180" placeholder="메시지를 입력하세요..." autocomplete="off">
          <button type="submit">전송</button>
        </form>
      </div>
    </div>
  </section>
</main>

<script>
const GAMES = __GAMES__;
const grid = document.getElementById("gameGrid");
const home = document.getElementById("home");
const gameView = document.getElementById("gameView");
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const topInfo = document.getElementById("topInfo");
const playersInfo = document.getElementById("playersInfo");
const messages = document.getElementById("chatMessages");
const nickname = document.getElementById("nickname");
const avatarSelect = document.getElementById("avatar");

let ws;
let myId = null;
let currentGame = null;
let allPlayers = [];
let me = {x:400,y:300};
let keys = {};
let joystick = {x:0,y:0};
let lastSent = 0;
let mapSeed = 1;
let worldW = 1600;
let worldH = 1000;
const playerSize = 26;
const rand = (seed) => {
  let n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

for (const game of GAMES) {
  const button = document.createElement("button");
  button.className = "game";
  button.innerHTML =
    '<span class="icon">' + game.icon + '</span>' +
    '<span class="name"></span><span class="num">게임 ' + game.id + '</span>';
  button.querySelector(".name").textContent = game.name;
  button.addEventListener("click", () => joinGame(game));
  grid.appendChild(button);
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(protocol + "//" + location.host);

  ws.addEventListener("open", () => {
    statusEl.textContent = "서버 연결됨";
    if (currentGame) sendJoin();
  });

  ws.addEventListener("message", event => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    if (data.type === "welcome") {
      myId = data.id;
      if (currentGame) sendJoin();
    }
    if (data.type === "players") {
      allPlayers = data.players || [];
      const visible = allPlayers.filter(p => p.game === currentGame?.id);
      playersInfo.textContent = "이 맵의 플레이어: " + visible.length + "명";
      const mine = allPlayers.find(p => p.id === myId);
      if (mine && mine.game === currentGame?.id) {
        nickname.value = mine.name;
      }
    }
    if (data.type === "chat" && data.game === currentGame?.id) {
      addChat(data.name, data.avatar, data.message);
    }
    if (data.type === "joined" && data.name) {
      nickname.value = data.name;
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "연결 끊김 · 새로고침해 주세요";
  });
  ws.addEventListener("error", () => {
    statusEl.textContent = "서버 연결 오류";
  });
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendJoin() {
  if (!currentGame || !myId) return;
  send({
    type: "join",
    game: currentGame.id,
    name: nickname.value,
    avatar: avatarSelect.value
  });
}

function joinGame(game) {
  currentGame = game;
  mapSeed = game.id * 71 + 19;
  me = {x:worldW/2,y:worldH/2};
  home.style.display = "none";
  gameView.style.display = "block";
  document.getElementById("gameTitle").textContent = game.icon + " " + game.name;
  topInfo.textContent = game.name;
  messages.innerHTML = "";
  resizeCanvas();
  sendJoin();
  draw();
}

function leaveGame() {
  send({type:"leave"});
  currentGame = null;
  gameView.style.display = "none";
  home.style.display = "block";
  allPlayers = allPlayers.map(p => p.id === myId ? {...p,game:null} : p);
}

document.getElementById("leaveBtn").addEventListener("click", leaveGame);

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}
window.addEventListener("resize", resizeCanvas);

function rect(x,y,w,h,color) {
  ctx.fillStyle = color;
  ctx.fillRect(x,y,w,h);
}
function circle(x,y,r,color) {
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
}
function line(x1,y1,x2,y2,color,width=2) {
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.stroke();
}
function text(str,x,y,color="#ffffff",size=14) {
  ctx.fillStyle=color;
  ctx.font="bold "+size+"px Arial";
  ctx.textAlign="center";
  ctx.fillText(str,x,y);
}
function roundedRect(x,y,w,h,r,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fill();
}
function drawTree(x,y,s=1) {
  circle(x,y+5*s,13*s,"#123c28");
  circle(x,y,12*s,"#25814b");
  circle(x-6*s,y+3*s,7*s,"#319657");
}
function drawBuilding(x,y,w,h,color,label) {
  rect(x+5,y+6,w,h,"#07190f66");
  roundedRect(x,y,w,h,5,color);
  for(let wy=y+13;wy<y+h-8;wy+=22){
    for(let wx=x+10;wx<x+w-7;wx+=19){
      rect(wx,wy,10,12,"#b8edc7");
    }
  }
  if(label) text(label,x+w/2,y+h+16,"#e5ffe9",12);
}
function drawBackground() {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,"#347c4a");
  grad.addColorStop(1,"#17412c");
  rect(0,0,w,h,grad);
}
function drawMap() {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  drawBackground();

  ctx.save();
  // World is clipped to the visible canvas: no stray shapes outside the map.
  ctx.beginPath();
  ctx.rect(0,0,w,h);
  ctx.clip();

  const sx=w/worldW, sy=h/worldH;
  ctx.scale(sx,sy);
  const type=currentGame?.type || "city";

  switch(type) {
    case "city":
      drawCity(); break;
    case "maze":
      drawMaze(); break;
    case "race":
      drawRace(); break;
    case "space":
      drawSpace(); break;
    case "soccer":
      drawSoccer(); break;
    case "basketball":
      drawBasketball(); break;
    case "battle":
      drawBattle(); break;
    case "park":
      drawPark(); break;
    case "treasure":
      drawTreasure(); break;
    case "police":
      drawPolice(); break;
    case "bank":
      drawBank(); break;
    case "fire":
      drawFire(); break;
    case "hospital":
      drawHospital(); break;
    case "library":
      drawLibrary(); break;
    case "store":
      drawStore(); break;
    case "apartment":
      drawApartment(); break;
    case "beach":
      drawBeach(); break;
    case "forest":
      drawForest(); break;
    case "snow":
      drawSnow(); break;
    case "volcano":
      drawVolcano(); break;
    case "mine":
      drawMine(); break;
    case "ocean":
      drawOcean(); break;
    case "amusement":
      drawAmusement(); break;
    case "airport":
      drawAirport(); break;
    case "station":
      drawStation(); break;
    case "haunted":
      drawHaunted(); break;
    case "cave":
      drawCave(); break;
    case "desert":
      drawDesert(); break;
    case "island":
      drawIsland(); break;
    case "garden":
      drawGarden(); break;
  }
  drawGrid();
  ctx.restore();
}
function drawGrid() {
  for(let x=0;x<=worldW;x+=100) line(x,0,x,worldH,"#ffffff0a",1);
  for(let y=0;y<=worldH;y+=100) line(0,y,worldW,y,"#ffffff0a",1);
}
function drawCity() {
  rect(0,0,worldW,worldH,"#427a4c");
  rect(0,420,worldW,170,"#303c3b");
  rect(600,0,150,worldH,"#303c3b");
  for(let x=0;x<worldW;x+=75) rect(x,500,38,5,"#e8d68c");
  for(let y=0;y<worldH;y+=70) rect(670,y,5,35,"#e8d68c");
  drawBuilding(90,90,160,220,"#426e83","상가");
  drawBuilding(300,110,180,190,"#7c7464","사무실");
  drawBuilding(900,100,170,230,"#4e728b","호텔");
  drawBuilding(1250,100,200,220,"#6d797c","아파트");
  drawPark( );
  drawTree(520,240);drawTree(820,750);drawTree(1100,720);drawTree(280,760);
}
function drawMaze() {
  rect(0,0,worldW,worldH,"#c7c99d");
  const cell=100;
  for(let y=0;y<worldH;y+=cell){
    for(let x=0;x<worldW;x+=cell){
      if(rand(x+y*3+mapSeed)>.42){
        rect(x+4,y+4,cell-8,cell-8,"#24533a");
        rect(x+9,y+9,cell-18,cell-18,"#34784a");
      } else {
        rect(x+4,y+4,cell-8,cell-8,"#e2dca5");
      }
    }
  }
  roundedRect(80,80,90,90,15,"#49d17b");
  text("START",125,130,"#06351c",15);
  roundedRect(1400,800,100,100,15,"#f0ce54");
  text("GOAL",1450,855,"#473100",15);
}
function drawRace() {
  rect(0,0,worldW,worldH,"#408a50");
  ctx.beginPath();
  ctx.ellipse(800,500,620,360,0,0,Math.PI*2);
  ctx.fillStyle="#343b3c";ctx.fill();
  ctx.beginPath();
  ctx.ellipse(800,500,470,235,0,0,Math.PI*2);
  ctx.fillStyle="#408a50";ctx.fill();
  ctx.beginPath();
  ctx.ellipse(800,500,545,300,0,0,Math.PI*2);
  ctx.strokeStyle="#f4e4a3";ctx.lineWidth=4;ctx.setLineDash([20,18]);ctx.stroke();ctx.setLineDash([]);
  roundedRect(720,170,160,45,8,"#f1f1e9");
  text("START",800,199,"#222222",17);
}
function drawSpace() {
  rect(0,0,worldW,worldH,"#101b46");
  for(let i=0;i<220;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*4+mapSeed)*worldH;
    circle(x,y,1+rand(i*8)*2,"#ffffff");
  }
  circle(400,300,90,"#3179d4");circle(370,270,22,"#6aa4ed");
  circle(1150,700,130,"#a95460");circle(1110,660,30,"#e38c75");
  ctx.beginPath();ctx.ellipse(1150,700,190,48,.25,0,Math.PI*2);
  ctx.strokeStyle="#d9a7a1";ctx.lineWidth=9;ctx.stroke();
  circle(830,210,48,"#e4c36a");
}
function drawSoccer() {
  rect(0,0,worldW,worldH,"#277b42");
  rect(100,70,1400,860,"#2d984d");
  for(let x=100;x<1500;x+=200) rect(x,70,100,860,"#258542");
  ctx.strokeStyle="#d9ffe0";ctx.lineWidth=5;ctx.strokeRect(100,70,1400,860);
  line(800,70,800,930,"#d9ffe0",4);
  ctx.beginPath();ctx.arc(800,500,120,0,Math.PI*2);ctx.strokeStyle="#d9ffe0";ctx.lineWidth=4;ctx.stroke();
  ctx.strokeRect(100,300,200,400);ctx.strokeRect(1300,300,200,400);
  rect(60,400,40,200,"#eeeeee");rect(1500,400,40,200,"#eeeeee");
}
function drawBasketball() {
  rect(0,0,worldW,worldH,"#a66b3f");
  rect(100,70,1400,860,"#dca46b");
  ctx.strokeStyle="#fff0d8";ctx.lineWidth=5;ctx.strokeRect(100,70,1400,860);
  line(800,70,800,930,"#fff0d8",4);
  for(const x of [250,1350]){
    ctx.beginPath();ctx.arc(x,500,160,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(x,500,80,-Math.PI/2,Math.PI/2);ctx.stroke();
    rect(x-60,465,8,70,"#ffffff");
    circle(x,500,9,"#ffffff");
  }
}
function drawBattle() {
  rect(0,0,worldW,worldH,"#4d5c50");
  for(let i=0;i<26;i++){
    const x=rand(i+mapSeed)*1450+30,y=rand(i*3+mapSeed)*850+30;
    rect(x,y,75+rand(i+6)*70,35+rand(i+9)*45,"#5e625b");
    rect(x+8,y+6,55,5,"#868980");
  }
  for(let i=0;i<9;i++){
    const x=100+i*165;
    rect(x,200,60,100,"#3d4942");
    rect(x+12,215,36,12,"#829078");
  }
  text("훈련 구역",800,80,"#ffffff",28);
}
function drawPark() {
  // Park features are placed within the world bounds.
  rect(0,0,worldW,worldH,"#438e4b");
  rect(0,450,worldW,100,"#d3bf8d");
  rect(730,0,110,worldH,"#d3bf8d");
  for(let i=0;i<24;i++){
    const x=50+rand(i+mapSeed)*1500,y=40+rand(i*5+mapSeed)*900;
    drawTree(x,y,.8+rand(i*2)*.6);
  }
  circle(1100,300,95,"#3289b9");
  circle(1100,300,75,"#46a6d0");
  for(let i=0;i<35;i++){
    const x=rand(i*9+mapSeed)*worldW,y=rand(i*13+mapSeed)*worldH;
    circle(x,y,4,["#f6a9c4","#f6dc76","#c9a7ff"][i%3]);
  }
}
function drawTreasure() {
  rect(0,0,worldW,worldH,"#c9b777");
  for(let i=0;i<40;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*2+mapSeed)*worldH;
    circle(x,y,18,"#b4a15d");
  }
  for(let i=0;i<12;i++){
    const x=100+rand(i*5+mapSeed)*1400,y=100+rand(i*8+mapSeed)*800;
    text("💎",x,y, "#ffffff",28);
  }
  roundedRect(680,430,240,140,20,"#7b4829");
  text("보물 상자",800,500,"#ffe7a8",24);
}
function drawPolice() {
  rect(0,0,worldW,worldH,"#9aaeb2");
  rect(70,70,1460,860,"#d2d9d8");
  drawBuilding(180,180,420,550,"#607d8b","경찰서");
  rect(650,160,780,580,"#9eafb2");
  for(let i=0;i<5;i++) rect(700+i*140,220,70,450,"#bac6c8");
  roundedRect(700,780,280,90,12,"#344d60");
  text("POLICE",840,835,"#ffffff",28);
}
function drawBank() {
  rect(0,0,worldW,worldH,"#9cba9d");
  rect(120,120,1360,760,"#e5e5d4");
  drawBuilding(400,170,800,430,"#9eae9e","은행");
  rect(550,650,500,120,"#536c5b");
  for(let i=0;i<4;i++) rect(590+i*110,675,70,55,"#d1d9b6");
  text("BANK",800,820,"#234a30",30);
}
function drawFire() {
  rect(0,0,worldW,worldH,"#b8a18a");
  rect(100,100,1400,800,"#d5c2a9");
  drawBuilding(300,200,1000,430,"#b64f3f","소방서");
  for(let i=0;i<3;i++){
    roundedRect(400+i*270,700,190,90,10,"#d84a39");
    rect(420+i*270,720,80,45,"#8cc5d9");
    circle(450+i*270,800,20,"#303030");
    circle(540+i*270,800,20,"#303030");
  }
}
function drawHospital() {
  rect(0,0,worldW,worldH,"#b8d9d4");
  rect(100,100,1400,800,"#e6f1ed");
  drawBuilding(360,180,880,520,"#d0e0df","병원");
  rect(730,300,140,45,"#e74b55");
  rect(777,250,45,145,"#e74b55");
  rect(150,740,1300,50,"#91b5ae");
}
function drawLibrary() {
  rect(0,0,worldW,worldH,"#9b7754");
  rect(100,100,1400,800,"#d6bb91");
  for(let r=0;r<4;r++){
    for(let c=0;c<7;c++){
      const x=160+c*185,y=170+r*165;
      roundedRect(x,y,145,115,6,"#69452d");
      for(let b=0;b<6;b++) rect(x+8+b*21,y+15,15,80,["#d4a85d","#9d4b3f","#527c64","#4b6e98"][b%4]);
    }
  }
  text("도서관",800,880,"#57391f",28);
}
function drawStore() {
  rect(0,0,worldW,worldH,"#b5c7a3");
  rect(100,100,1400,800,"#d8d4b5");
  roundedRect(250,150,1100,650,12,"#ece7d1");
  rect(250,150,1100,110,"#e6b74c");
  text("편의점",800,220,"#3c3825",35);
  for(let r=0;r<3;r++) for(let c=0;c<6;c++){
    const x=330+c*170,y=320+r*140;
    roundedRect(x,y,130,95,5,"#9b6e4e");
    for(let k=0;k<4;k++) rect(x+12+k*28,y+15,19,55,["#de6550","#e6c451","#6bb7a0","#6994c4"][k]);
  }
}
function drawApartment() {
  rect(0,0,worldW,worldH,"#8ba58e");
  rect(0,0,worldW,worldH,"#a6bba5");
  for(let i=0;i<5;i++){
    drawBuilding(80+i*300,180,210,590,["#a2b7b9","#8ca3b0","#c3b7a3"][i%3],"동 "+(i+1));
  }
  rect(0,820,worldW,60,"#66746a");
  for(let i=0;i<6;i++) drawTree(150+i*250,120);
}
function drawBeach() {
  rect(0,0,worldW,worldH,"#e8d29a");
  rect(0,0,worldW,300,"#48a8d0");
  rect(0,300,worldW,160,"#bde9df");
  for(let i=0;i<16;i++){
    circle(rand(i+mapSeed)*worldW,rand(i*3+mapSeed)*280,2,"#ffffff");
  }
  for(let i=0;i<7;i++){
    const x=100+i*220,y=520+rand(i+mapSeed)*300;
    drawTree(x,y,.9);
    line(x,y+20,x,y+80,"#8b5d36",8);
  }
  text("해변",800,500,"#8a693e",30);
}
function drawForest() {
  rect(0,0,worldW,worldH,"#163e2c");
  for(let i=0;i<100;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*4+mapSeed)*worldH;
    drawTree(x,y,.9+rand(i*3)*1.2);
  }
  rect(0,450,worldW,100,"#b8a276");
  rect(750,0,100,worldH,"#b8a276");
  circle(800,500,60,"#9b7c48");
}
function drawSnow() {
  rect(0,0,worldW,worldH,"#dcebf0");
  for(let i=0;i<80;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*4+mapSeed)*worldH;
    circle(x,y,2+rand(i*8)*3,"#ffffff");
  }
  for(let i=0;i<12;i++){
    const x=50+i*130,y=180+rand(i+mapSeed)*500;
    drawBuilding(x,y,85,95+rand(i*2)*90,"#91b7c7");
  }
  rect(0,800,worldW,200,"#f7ffff");
}
function drawVolcano() {
  rect(0,0,worldW,worldH,"#482b32");
  for(let i=0;i<25;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*5+mapSeed)*worldH;
    circle(x,y,20+rand(i*7)*35,"#65444a");
  }
  ctx.beginPath();
  ctx.moveTo(300,750);ctx.lineTo(800,140);ctx.lineTo(1300,750);ctx.closePath();
  ctx.fillStyle="#393137";ctx.fill();
  ctx.beginPath();
  ctx.moveTo(670,300);ctx.lineTo(800,180);ctx.lineTo(930,300);ctx.closePath();
  ctx.fillStyle="#f07838";ctx.fill();
  line(800,300,800,800,"#f07838",28);
  line(820,430,1000,650,"#e84d32",18);
}
function drawMine() {
  rect(0,0,worldW,worldH,"#403a36");
  for(let i=0;i<24;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*4+mapSeed)*worldH;
    roundedRect(x,y,70,65,12,"#5e5650");
    if(i%3===0) text("💎",x+35,y+42,"#ffffff",24);
  }
  line(0,500,worldW,500,"#c19b64",30);
  for(let x=50;x<worldW;x+=100){
    line(x,465,x,535,"#a47d4b",6);
  }
}
function drawOcean() {
  rect(0,0,worldW,worldH,"#137ea6");
  for(let i=0;i<65;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*5+mapSeed)*worldH;
    ctx.beginPath();ctx.ellipse(x,y,25,7,.1,0,Math.PI*2);
    ctx.strokeStyle="#8fe3eb88";ctx.lineWidth=3;ctx.stroke();
  }
  roundedRect(400,260,800,430,35,"#63b9c2");
  for(let i=0;i<6;i++){
    const x=500+i*120;
    roundedRect(x,320,70,90,12,"#b7ece0");
    rect(x+25,350,20,30,"#348da2");
  }
  for(let i=0;i<12;i++) text("🐠",rand(i+mapSeed)*worldW,rand(i*3+mapSeed)*worldH,"#ffffff",23);
}
function drawAmusement() {
  rect(0,0,worldW,worldH,"#9fcb92");
  rect(0,430,worldW,130,"#d4b98a");
  for(let i=0;i<8;i++){
    const x=100+i*200;
    circle(x,250,65,["#e45d66","#55b6df","#e7c44c","#ad86d5"][i%4]);
    circle(x,250,17,"#fff1c8");
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      circle(x+Math.cos(a)*48,250+Math.sin(a)*48,9,"#fff0bc");
    }
  }
  for(let i=0;i<6;i++) drawTree(140+i*260,720,.9);
}
function drawAirport() {
  rect(0,0,worldW,worldH,"#4d7e55");
  rect(100,80,1400,840,"#929a98");
  rect(150,100,1300,800,"#424a4a");
  for(let y=130;y<870;y+=100) rect(790,y,20,55,"#f4f1d9");
  roundedRect(250,170,400,170,12,"#b9c5c4");
  text("TERMINAL",450,265,"#33413e",28);
  for(let i=0;i<3;i++){
    const x=350+i*450,y=620+i%2*90;
    line(x-70,y,x+70,y,"#e6e8dc",5);
    line(x,y-70,x,y+70,"#e6e8dc",5);
    circle(x,y,12,"#e6e8dc");
  }
}
function drawStation() {
  rect(0,0,worldW,worldH,"#718e7d");
  rect(0,250,worldW,500,"#494e4c");
  for(let y=330;y<700;y+=170) rect(0,y,worldW,8,"#bab5a4");
  for(let x=100;x<worldW;x+=260){
    rect(x,180,12,650,"#6e6b60");
    rect(x-40,180,90,18,"#c1bba9");
  }
  roundedRect(400,100,800,100,12,"#b5c7b9");
  text("기차역",800,160,"#264535",30);
}
function drawHaunted() {
  rect(0,0,worldW,worldH,"#211e31");
  for(let i=0;i<15;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*4+mapSeed)*worldH;
    circle(x,y,20+rand(i*5)*35,"#39304b");
  }
  drawBuilding(250,240,300,420,"#42354e");
  drawBuilding(650,150,300,510,"#30263f");
  drawBuilding(1050,250,300,410,"#493348");
  for(let i=0;i<14;i++){
    circle(rand(i+mapSeed)*worldW,rand(i*3+mapSeed)*worldH,3,"#c7b7e8");
  }
  text("유령의 집",800,800,"#d6c8f3",28);
}
function drawCave() {
  rect(0,0,worldW,worldH,"#292f38");
  for(let i=0;i<40;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*3+mapSeed)*worldH;
    circle(x,y,30+rand(i*4)*45,"#434c57");
    if(i%4===0) text("💠",x,y,"#b5f5ff",24);
  }
  line(0,500,worldW,500,"#647483",22);
  for(let i=0;i<7;i++){
    const x=100+i*220;
    line(x,400,x+40,500,"#8fd9ed",10);
  }
}
function drawDesert() {
  rect(0,0,worldW,worldH,"#d9bd76");
  for(let i=0;i<14;i++){
    const x=rand(i+mapSeed)*worldW,y=rand(i*3+mapSeed)*worldH;
    ctx.beginPath();ctx.ellipse(x,y,120,35,0,0,Math.PI*2);
    ctx.fillStyle="#c7a65e";ctx.fill();
  }
  for(let i=0;i<8;i++){
    const x=100+i*200,y=250+rand(i+mapSeed)*500;
    rect(x,y,22,110,"#3b7442");
    rect(x-35,y+25,40,18,"#3b7442");
    rect(x+15,y+50,35,18,"#3b7442");
  }
  text("사막",800,130,"#87632f",30);
}
function drawIsland() {
  rect(0,0,worldW,worldH,"#1686a1");
  ctx.beginPath();ctx.ellipse(800,500,650,420,0,0,Math.PI*2);
  ctx.fillStyle="#d9c486";ctx.fill();
  ctx.beginPath();ctx.ellipse(800,500,560,340,0,0,Math.PI*2);
  ctx.fillStyle="#4a9854";ctx.fill();
  for(let i=0;i<20;i++){
    const a=rand(i+mapSeed)*Math.PI*2;
    const x=800+Math.cos(a)*rand(i*3+mapSeed)*500;
    const y=500+Math.sin(a)*rand(i*5+mapSeed)*290;
    drawTree(x,y,.8+rand(i*7)*.5);
  }
  circle(800,500,80,"#75b7a1");
}
function drawGarden() {
  rect(0,0,worldW,worldH,"#418d4d");
  rect(0,440,worldW,100,"#c7b58b");
  rect(750,0,100,worldH,"#c7b58b");
  for(let i=0;i<24;i++){
    const x=100+rand(i+mapSeed)*1400,y=70+rand(i*4+mapSeed)*850;
    circle(x,y,35,"#2f7541");
    circle(x-9,y-8,14,["#ed91c2","#e9d36b","#b9a0f1","#ffffff"][i%4]);
    circle(x+10,y+8,14,["#ed91c2","#e9d36b","#b9a0f1","#ffffff"][i%4]);
  }
  circle(1100,300,70,"#64b8d0");
  circle(1100,300,50,"#82d4df");
}

function drawPlayers() {
  const visible = allPlayers.filter(p => p.game === currentGame?.id);

  for (const p of visible) {
    const x = p.id === myId ? me.x : p.x;
    const y = p.id === myId ? me.y : p.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    // Opacity 0 means fully opaque: players must remain visible.
    ctx.globalAlpha = 1;
    circle(x,y+7,playerSize*.65,"#00000045");
    circle(x,y,playerSize*.55,p.id === myId ? "#8affad" : "#f4f4f4");
    circle(x,y,playerSize*.38,"#267d4a");
    text(p.avatar || "🧑",x,y+8,"#ffffff",24);
    text(p.name || "플레이어",x,y-28,"#ffffff",15);
    ctx.globalAlpha = 1;
  }
}

function draw() {
  if (!currentGame || !canvas.width || !canvas.height) return;
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if (!w || !h) return;

  ctx.setTransform(
    canvas.width/w,0,0,canvas.height/h,0,0
  );
  drawMap();

  ctx.save();
  // Camera follows the local player but clamps to the map edges.
  const scaleX=w/worldW, scaleY=h/worldH;
  const cameraX=Math.max(0,Math.min(worldW-w/scaleX,me.x-w/(2*scaleX)));
  const cameraY=Math.max(0,Math.min(worldH-h/scaleY,me.y-h/(2*scaleY)));

  // Clear and redraw a camera-sized world viewport.
  drawBackground();
  ctx.beginPath();
  ctx.rect(0,0,w,h);
  ctx.clip();

  ctx.save();
  ctx.scale(scaleX,scaleY);
  ctx.translate(-cameraX,-cameraY);
  drawWorldOnly();
  drawPlayers();
  ctx.restore();
  ctx.restore();
}
function drawWorldOnly() {
  // Reuse the selected map's own drawing function.
  const type=currentGame?.type;
  const fn={
    city:drawCity,maze:drawMaze,race:drawRace,space:drawSpace,
    soccer:drawSoccer,basketball:drawBasketball,battle:drawBattle,
    park:drawPark,treasure:drawTreasure,police:drawPolice,
    bank:drawBank,fire:drawFire,hospital:drawHospital,
    library:drawLibrary,store:drawStore,apartment:drawApartment,
    beach:drawBeach,forest:drawForest,snow:drawSnow,volcano:drawVolcano,
    mine:drawMine,ocean:drawOcean,amusement:drawAmusement,airport:drawAirport,
    station:drawStation,haunted:drawHaunted,cave:drawCave,
    desert:drawDesert,island:drawIsland,garden:drawGarden
  }[type];
  if(fn) fn();
  drawGrid();
}

function addChat(name, avatar, message) {
  const row=document.createElement("div");
  row.className="chatrow";
  const who=document.createElement("strong");
  who.textContent=(avatar || "🧑")+" "+(name || "플레이어")+": ";
  const body=document.createElement("span");
  body.textContent=message;
  row.append(who,body);
  messages.appendChild(row);
  messages.scrollTop=messages.scrollHeight;
  while(messages.children.length>100) messages.firstChild.remove();
}
document.getElementById("chatForm").addEventListener("submit",e=>{
  e.preventDefault();
  const input=document.getElementById("chatInput");
  const message=input.value.trim();
  if(!message || !currentGame) return;
  send({type:"chat",message});
  input.value="";
});

window.addEventListener("keydown",e=>{
  const key=e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key) &&
     !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) e.preventDefault();
  keys[key]=true;
});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
window.addEventListener("blur",()=>{keys={};joystick={x:0,y:0};resetStick();});

const stick=document.getElementById("stick");
const knob=document.getElementById("knob");
let pointerId=null;
function resetStick(){
  knob.style.left="41px";knob.style.top="41px";
}
stick.addEventListener("pointerdown",e=>{
  pointerId=e.pointerId;
  stick.setPointerCapture(pointerId);
  moveStick(e);
});
stick.addEventListener("pointermove",e=>{
  if(e.pointerId===pointerId) moveStick(e);
});
function moveStick(e){
  const r=stick.getBoundingClientRect();
  let dx=e.clientX-(r.left+r.width/2);
  let dy=e.clientY-(r.top+r.height/2);
  const max=40,len=Math.hypot(dx,dy)||1;
  if(len>max){dx=dx/len*max;dy=dy/len*max;}
  joystick={x:dx/max,y:dy/max};
  knob.style.left=(41+dx)+"px";
  knob.style.top=(41+dy)+"px";
}
function endStick(e){
  if(pointerId===e.pointerId){
    pointerId=null;joystick={x:0,y:0};resetStick();
  }
}
stick.addEventListener("pointerup",endStick);
stick.addEventListener("pointercancel",endStick);
stick.addEventListener("lostpointercapture",()=>{pointerId=null;joystick={x:0,y:0};resetStick();});

let lastFrame=0;
function loop(now){
  const dt=Math.min((now-lastFrame)/16.67,2);
  lastFrame=now;

  if(currentGame){
    let dx=0,dy=0;
    if(keys["w"]||keys["arrowup"]) dy--;
    if(keys["s"]||keys["arrowdown"]) dy++;
    if(keys["a"]||keys["arrowleft"]) dx--;
    if(keys["d"]||keys["arrowright"]) dx++;
    dx+=joystick.x;dy+=joystick.y;

    const length=Math.hypot(dx,dy);
    if(length>0){
      dx/=length;dy/=length;
      me.x=Math.max(playerSize,Math.min(worldW-playerSize,me.x+dx*5*dt));
      me.y=Math.max(playerSize,Math.min(worldH-playerSize,me.y+dy*5*dt));
    }

    if(now-lastSent>50){
      send({type:"move",x:me.x,y:me.y});
      lastSent=now;
    }
    draw();
  }
  requestAnimationFrame(loop);
}
connect();
requestAnimationFrame(loop);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("ok");
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache"
  });

  res.end(html.replace("__GAMES__", JSON.stringify(games)));
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  const id = Math.random().toString(36).slice(2) +
    Date.now().toString(36);

  sockets.set(id, ws);

  send(ws, { type: "welcome", id });
  broadcastPlayers();

  ws.on("message", raw => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const player = players.get(id);

    if (data.type === "join") {
      const gameId = Number(data.game);
      if (!games.some(g => g.id === gameId)) return;

      const requestedName = safeText(data.name, 18) || "플레이어";
      const avatar = safeText(data.avatar, 8) || "🧑";
      const uniqueName = makeUniqueName(requestedName, id);

      players.set(id, {
        id,
        name: uniqueName,
        avatar,
        game: gameId,
        x: 800,
        y: 500
      });

      send(ws, { type: "joined", name: uniqueName });
      broadcastPlayers();
      return;
    }

    if (data.type === "leave") {
      players.delete(id);
      broadcastPlayers();
      return;
    }

    if (data.type === "move" && player) {
      const x = Number(data.x);
      const y = Number(data.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      player.x = Math.max(26, Math.min(1574, x));
      player.y = Math.max(26, Math.min(974, y));
      broadcastPlayers();
      return;
    }

    if (data.type === "chat" && player) {
      const message = safeText(data.message, 180);
      if (!message) return;

      const packet = {
        type: "chat",
        game: player.game,
        name: player.name,
        avatar: player.avatar,
        message
      };

      // Only players in the same game receive the chat.
      for (const [otherId, other] of players.entries()) {
        if (other.game === player.game) {
          const otherSocket = sockets.get(otherId);
          if (otherSocket) send(otherSocket, packet);
        }
      }
    }
  });

  ws.on("close", () => removePlayer(id));
  ws.on("error", () => removePlayer(id));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Multiplayer server running on port " + PORT);
});