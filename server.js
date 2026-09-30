
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
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="theme-color" content="#063f31">
<title>Green World Multiplayer</title>
<style>
:root {
  --green-950:#04291f;
  --green-900:#064332;
  --green-800:#075b40;
  --green-700:#087e50;
  --green-600:#0ba568;
  --green-500:#20c981;
  --mint:#a7ffd5;
  --glass:rgba(9,51,39,.78);
  --line:rgba(170,255,215,.2);
}
*{box-sizing:border-box}
body{
  margin:0;
  color:#f2fff8;
  font-family:Arial,"Malgun Gothic",sans-serif;
  background:
    radial-gradient(ellipse at 15% 0%,#16875b 0%,transparent 43%),
    radial-gradient(ellipse at 90% 25%,#105a49 0%,transparent 42%),
    linear-gradient(145deg,#031e18,#073e30 50%,#031d1a);
  min-height:100vh;
}
button,input{font:inherit}
button{
  border:1px solid #b8ffe044;
  color:white;
  cursor:pointer;
  border-radius:12px;
  padding:10px 15px;
  background:linear-gradient(135deg,#20c981,#087e50);
  box-shadow:0 5px 18px #001e1633;
  transition:transform .15s,filter .15s;
}
button:hover{filter:brightness(1.14);transform:translateY(-1px)}
button:active{transform:scale(.97)}
input{
  min-width:0;
  color:#f3fff8;
  background:#062f26;
  border:1px solid #65dca477;
  border-radius:12px;
  padding:12px;
  outline:none;
}
input:focus{border-color:#91ffd0;box-shadow:0 0 0 3px #20c98130}
input::placeholder{color:#a4c8b7}
#home{
  min-height:100vh;
  padding:30px 20px 55px;
  background:
    radial-gradient(ellipse at 50% -20%,#3affaa25,transparent 65%);
}
.hero{
  max-width:1120px;
  margin:0 auto 25px;
  padding:30px 25px;
  border:1px solid #b8ffe033;
  border-radius:28px;
  background:linear-gradient(125deg,#0c7951dd,#07503edb 55%,#06372fe8);
  box-shadow:0 20px 60px #001b143f,inset 0 1px #ffffff20;
  overflow:hidden;
  position:relative;
}
.hero:after{
  content:"";
  position:absolute;
  width:280px;height:280px;
  border-radius:50%;
  right:-100px;top:-130px;
  background:#61ffc033;
  filter:blur(10px);
  pointer-events:none;
}
.logo{
  font-size:clamp(27px,5vw,43px);
  font-weight:900;
  letter-spacing:-1px;
  margin:0 0 10px;
}
.logo span{color:#aaffd3}
.subtitle{color:#d2f5e3;line-height:1.6}
.pill{
  display:inline-block;
  padding:6px 11px;
  border-radius:30px;
  background:#b2ffce18;
  border:1px solid #aaffd044;
  font-size:12px;
  margin-bottom:12px;
}
.profile{
  display:flex;
  gap:9px;
  flex-wrap:wrap;
  margin-top:22px;
}
.profile input{flex:1;width:150px}
#connection{
  font-size:13px;
  color:#b8fbd6;
  margin-top:15px;
}
.sectionTitle{
  max-width:1120px;
  margin:30px auto 14px;
  font-size:22px;
  font-weight:800;
}
#games{
  max-width:1120px;
  margin:0 auto;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(165px,1fr));
  gap:13px;
}
.game{
  position:relative;
  min-height:112px;
  overflow:hidden;
  text-align:left;
  padding:17px 14px;
  border-radius:18px;
  border:1px solid #aaffd027;
  background:
    linear-gradient(145deg,#167b52e8,#07513fe8 65%,#063b32f5);
  box-shadow:0 7px 20px #001b1530,inset 0 1px #ffffff12;
  cursor:pointer;
  transition:transform .2s,border-color .2s,box-shadow .2s;
}
.game:before{
  content:"";
  position:absolute;
  width:90px;height:90px;
  right:-40px;bottom:-40px;
  border-radius:50%;
  background:#7dffc027;
}
.game:hover{
  transform:translateY(-4px);
  border-color:#87ffc2aa;
  box-shadow:0 12px 28px #001a144d,0 0 15px #31e88b18;
}
.gameIcon{font-size:28px;margin-bottom:10px}
.gameName{font-weight:750;line-height:1.4;overflow-wrap:anywhere}
.gameTag{font-size:11px;color:#b9f9d4;margin-top:7px}

#gameScreen{
  display:none;
  position:fixed;
  inset:0;
  overflow:hidden;
  background:#082b20;
}
#canvas{display:block;width:100%;height:100%}
#top{
  position:absolute;
  z-index:5;
  top:10px;left:10px;right:10px;
  min-height:59px;
  display:flex;align-items:center;gap:9px;
  padding:9px;
  border-radius:18px;
  border:1px solid #b5ffdb38;
  background:linear-gradient(110deg,#064c39ee,#063529e8);
  box-shadow:0 10px 30px #00180f40,inset 0 1px #ffffff17;
  backdrop-filter:blur(15px);
}
#title{font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere}
#count{
  white-space:nowrap;
  font-size:13px;
  border:1px solid #b6ffcc40;
  background:#0b7951;
  padding:9px 11px;
  border-radius:11px;
}
#chat{
  display:none;
  position:absolute;
  z-index:10;
  right:12px;top:82px;
  width:min(330px,calc(100vw - 24px));
  height:370px;
  padding:12px;
  border:1px solid #b4ffce45;
  border-radius:19px;
  background:linear-gradient(150deg,#064d3df5,#042b25f7);
  box-shadow:0 18px 50px #00140f75;
  backdrop-filter:blur(15px);
}
.chatTitle{font-weight:800;margin:2px 0 10px}
#messages{
  height:280px;
  overflow:auto;
  padding:10px;
  border-radius:12px;
  background:#021f19aa;
  border:1px solid #baffd41a;
  overflow-wrap:anywhere;
}
.msg{margin-bottom:9px;line-height:1.4;font-size:14px}
.chatRow{display:flex;gap:6px}
#chatInput{width:0;flex:1;margin-top:8px}
#send{margin-top:8px;padding:9px 12px}
#joy{
  position:absolute;
  z-index:5;
  left:23px;bottom:24px;
  width:130px;height:130px;
  border-radius:50%;
  border:2px solid #c0ffdb63;
  background:radial-gradient(circle,#1ac17a70,#034e3e99);
  box-shadow:0 5px 24px #00190f44,inset 0 1px #ffffff20;
  touch-action:none;
}
#stick{
  position:absolute;
  left:32px;top:32px;
  width:60px;height:60px;
  border-radius:50%;
  border:2px solid #d3ffe7aa;
  background:linear-gradient(135deg,#8effc9dd,#18bd7cdd);
  box-shadow:0 4px 14px #00251b77;
}
#help{
  position:absolute;right:12px;bottom:12px;
  padding:9px 12px;
  font-size:12px;
  border:1px solid #baffd42c;
  background:#043b2dd9;
  border-radius:12px;
  color:#d8ffe9;
}
@media(max-width:560px){
  #home{padding:14px 12px 35px}
  .hero{padding:22px 16px;border-radius:22px}
  #games{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .game{min-height:102px;padding:13px 11px}
  #top{left:5px;right:5px;top:5px;gap:5px;padding:6px}
  #top button{padding:9px 10px;font-size:12px}
  #title{font-size:13px}
  #count{font-size:11px;padding:8px 6px}
  #joy{left:15px;bottom:18px;width:116px;height:116px}
  #stick{left:27px;top:27px}
  #help{font-size:10px;right:5px;bottom:5px}
}
</style>
</head>
<body>

<div id="home">
  <div class="hero">
    <div class="pill">● ONLINE MULTIPLAYER</div>
    <h1 class="logo">GREEN <span>WORLD</span></h1>
    <div class="subtitle">
      나만의 캐릭터를 설정하고 다양한 세계를 탐험하세요.<br>
      친구들과 같은 맵에서 만나고 채팅할 수 있어요.
    </div>
    <div class="profile">
      <input id="name" maxlength="12" placeholder="닉네임" value="플레이어">
      <input id="avatar" maxlength="8" placeholder="캐릭터 이모지" value="😀">
    </div>
    <div id="connection">서버 연결 중...</div>
  </div>
  <div class="sectionTitle">탐험할 세계 <span style="color:#9dffd0">220</span></div>
  <div id="games"></div>
</div>

<div id="gameScreen">
  <div id="top">
    <button id="homeButton">← 홈</button>
    <div id="title">게임</div>
    <div id="count">0명</div>
    <button id="chatButton">채팅</button>
  </div>
  <canvas id="canvas"></canvas>
  <div id="chat">
    <div class="chatTitle">게임 채팅</div>
    <div id="messages"></div>
    <div class="chatRow">
      <input id="chatInput" maxlength="100" placeholder="메시지 입력">
      <button id="send">전송</button>
    </div>
  </div>
  <div id="joy"><div id="stick"></div></div>
  <div id="help">WASD / 방향키로 이동</div>
</div>

<script>
const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

let ws = null;
let myId = null;
let currentGame = null;
let players = {};
let myX = 500, myY = 400;
let keys = {};
let joyX = 0, joyY = 0, joyActive = false;
let lastMoveSent = 0;
let lastFrame = performance.now();

const gameNames = __GAME_NAMES__;

const iconForGame = name => {
  if(name.includes("미로")) return "🧩";
  if(name.includes("레이싱") || name.includes("자동차")) return "🏎️";
  if(name.includes("우주")) return "🚀";
  if(name.includes("축구")) return "⚽";
  if(name.includes("농구")) return "🏀";
  if(name.includes("좀비")) return "🧟";
  if(name.includes("전쟁")) return "⚔️";
  if(name.includes("학교")) return "🏫";
  if(name.includes("병원")) return "🏥";
  if(name.includes("은행")) return "🏦";
  if(name.includes("소방")) return "🚒";
  if(name.includes("경찰")) return "🚓";
  if(name.includes("수영")) return "🏊";
  if(name.includes("보물")) return "💎";
  if(name.includes("기차")) return "🚆";
  if(name.includes("화산")) return "🌋";
  if(name.includes("빙하")) return "🧊";
  if(name.includes("섬")) return "🏝️";
  if(name.includes("공원")) return "🌳";
  if(name.includes("놀이공원")) return "🎡";
  if(name.includes("점프")) return "🦘";
  if(name.includes("보스")) return "👾";
  if(name.includes("몬스터")) return "🐲";
  if(name.includes("아파트")) return "🏢";
  if(name.includes("편의점")) return "🏪";
  if(name.includes("도서관")) return "📚";
  return "🌿";
};

gameNames.forEach((name, index) => {
  const el = document.createElement("div");
  el.className = "game";

  const icon = document.createElement("div");
  icon.className = "gameIcon";
  icon.textContent = iconForGame(name);

  const label = document.createElement("div");
  label.className = "gameName";
  label.textContent = name;

  const tag = document.createElement("div");
  tag.className = "gameTag";
  tag.textContent = String(index + 1).padStart(3,"0") + " / MULTIPLAYER";

  el.append(icon, label, tag);
  el.addEventListener("click", () => joinGame(name));
  $("games").appendChild(el);
});

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(protocol + "//" + location.host);

  ws.onopen = () => {
    $("connection").textContent = "● 서버 연결 완료";
    $("connection").style.color = "#aaffd2";
  };

  ws.onmessage = event => {
    let data;
    try { data = JSON.parse(event.data); }
    catch { return; }

    if(data.type === "welcome") myId = data.id;

    if(data.type === "players") {
      players = data.players || {};
      updateCount();
    }

    if(data.type === "move" && players[data.id]) {
      players[data.id].x = data.x;
      players[data.id].y = data.y;
    }

    if(data.type === "joined") {
      myId = data.id;
    }

    if(data.type === "chat" && data.game === currentGame) {
      addMessage(data.name, data.avatar, data.text);
    }

    if(data.type === "error") alert(data.message);
  };

  ws.onclose = () => {
    $("connection").textContent = "연결이 끊어졌어요. 페이지를 새로고침해 주세요.";
    $("connection").style.color = "#ffaaaa";
  };
}

function joinGame(game) {
  if(!ws || ws.readyState !== WebSocket.OPEN) {
    alert("서버 연결을 기다려 주세요.");
    return;
  }

  const name = $("name").value.trim() || "플레이어";
  const avatar = $("avatar").value.trim() || "😀";

  if(!/\p{Extended_Pictographic}/u.test(avatar)) {
    alert("이모지를 입력해 주세요. 예: 😀 🤖 🐱");
    return;
  }

  currentGame = game;
  myX = 500;
  myY = 400;

  $("title").textContent = game;
  $("messages").replaceChildren();
  $("chat").style.display = "none";
  $("home").style.display = "none";
  $("gameScreen").style.display = "block";

  resize();

  ws.send(JSON.stringify({
    type:"join", name, avatar, game, x:myX, y:myY
  }));
}

function leaveGame() {
  if(ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type:"leave"}));
  }

  currentGame = null;
  $("gameScreen").style.display = "none";
  $("home").style.display = "block";
}

function updateCount() {
  let total = 0;
  for(const p of Object.values(players)) {
    if(p.game === currentGame) total++;
  }
  $("count").textContent = total + "명";
}

function addMessage(name, avatar, text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.textContent = (avatar || "😀") + " " + name + ": " + text;
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function sendChat() {
  const text = $("chatInput").value.trim();
  if(!text || !currentGame) return;

  if(ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type:"chat", text}));
  }
  $("chatInput").value = "";
}

$("send").onclick = sendChat;
$("chatInput").addEventListener("keydown", e => {
  if(e.key === "Enter") sendChat();
});
$("chatButton").onclick = () => {
  $("chat").style.display =
    $("chat").style.display === "block" ? "none" : "block";
};
$("homeButton").onclick = leaveGame;

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener("blur", () => { keys = {}; });

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resize);
resize();

function rect(x,y,w,h,color,camX,camY) {
  ctx.fillStyle = color;
  ctx.fillRect(x-camX,y-camY,w,h);
}

function road(x,y,w,h,camX,camY) {
  rect(x,y,w,h,"#4b5353",camX,camY);
  rect(x,y,w,5,"#e5e8db",camX,camY);
  rect(x,y+h-5,w,5,"#e5e8db",camX,camY);

  if(w > h) {
    ctx.fillStyle = "#e5dca2";
    for(let i=x+20;i<x+w-10;i+=70) {
      ctx.fillRect(i-camX,y+h/2-2-camY,35,4);
    }
  } else {
    ctx.fillStyle = "#e5dca2";
    for(let i=y+20;i<y+h-10;i+=70) {
      ctx.fillRect(x+w/2-2-camX,i-camY,4,35);
    }
  }
}

function tree(x,y,camX,camY) {
  rect(x-5,y+12,10,22,"#73503a",camX,camY);
  ctx.fillStyle = "#0c603d";
  ctx.beginPath();
  ctx.arc(x-camX,y-camY,19,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#29a96b";
  ctx.beginPath();
  ctx.arc(x-7-camX,y-7-camY,12,0,Math.PI*2);
  ctx.fill();
}

function building(x,y,w,h,camX,camY,color) {
  rect(x+7,y+8,w,h,"#183c32",camX,camY);
  rect(x,y,w,h,color,camX,camY);
  rect(x,y,w,10,"#d8e4d9",camX,camY);
  rect(x+8,y+16,w-16,4,"#ffffff2a",camX,camY);

  const cols = Math.max(2,Math.floor(w/38));
  const rows = Math.max(2,Math.floor(h/35));

  for(let c=0;c<cols;c++) {
    for(let r=0;r<rows;r++) {
      rect(
        x+12+c*((w-24)/cols),
        y+25+r*((h-32)/rows),
        Math.max(9,(w-30)/cols-7),
        Math.max(8,Math.min(17,(h-35)/rows-7)),
        (c+r)%3===0 ? "#b8f1df" : "#376b61",
        camX,camY
      );
    }
  }

  rect(x+w/2-10,y+h-26,20,26,"#314c43",camX,camY);
}

function drawCity(camX,camY) {
  rect(0,0,2000,1400,"#79c979",camX,camY);

  // 공원
  rect(60,60,360,190,"#43ae69",camX,camY);
  rect(70,70,340,170,"#75d48c",camX,camY);

  for(let i=0;i<12;i++) {
    tree(90+(i%4)*95,90+Math.floor(i/4)*55,camX,camY);
  }

  // 도로망
  road(0,280,2000,120,camX,camY);
  road(450,0,120,1400,camX,camY);
  road(1100,0,120,1400,camX,camY);
  road(0,900,2000,120,camX,camY);

  // 횡단보도
  for(let i=0;i<7;i++) {
    rect(430+i*17,300,9,80,"#f3f3d9",camX,camY);
    rect(1080+i*17,300,9,80,"#f3f3d9",camX,camY);
  }

  // 건물 블록
  building(100,460,230,180,camX,camY,"#dfb77d");
  building(650,455,300,200,camX,camY,"#c7d6cc");
  building(1330,455,260,210,camX,camY,"#d7c5a5");
  building(100,1080,250,190,camX,camY,"#b4d1bf");
  building(650,1080,310,190,camX,camY,"#d4b4a0");
  building(1330,1080,260,190,camX,camY,"#d1d9c5");

  // 공원 벤치
  rect(770,760,65,10,"#754d34",camX,camY);
  rect(775,770,5,13,"#68472f",camX,camY);
  rect(820,770,5,13,"#68472f",camX,camY);

  for(let i=0;i<8;i++) {
    tree(60+i*230,1340,camX,camY);
  }
}

function drawMaze(camX,camY) {
  rect(0,0,2000,1400,"#102a2b",camX,camY);

  for(let x=0;x<2000;x+=80) {
    for(let y=0;y<1400;y+=80) {
      rect(x,y,76,76,"#1a3939",camX,camY);
    }
  }

  // 정해진 패턴의 통로와 벽
  for(let x=80;x<1900;x+=160) {
    for(let y=80;y<1250;y+=160) {
      if((x/160+y/160)%3!==0) {
        rect(x,y,105,22,"#648c79",camX,camY);
        rect(x,y,22,105,"#648c79",camX,camY);
        rect(x+3,y+3,99,5,"#a1c6a9",camX,camY);
      }
    }
  }

  rect(80,80,100,100,"#29bd7b",camX,camY);
  rect(1810,1210,100,100,"#e9d66d",camX,camY);
}

function drawRacing(camX,camY) {
  rect(0,0,2000,1400,"#37894c",camX,camY);

  // 잔디 장식
  for(let x=0;x<2000;x+=90) {
    rect(x,100,2,1100,"#4ca45c",camX,camY);
  }

  rect(90,90,1820,1220,"#bfc9bc",camX,camY);
  rect(115,115,1770,1170,"#353d42",camX,camY);
  rect(300,300,1400,800,"#39864b",camX,camY);

  // 안쪽 코스 장식
  ctx.strokeStyle="#f5f0d9";
  ctx.lineWidth=5;
  ctx.setLineDash([24,20]);
  ctx.strokeRect(150-camX,150-camY,1700,1100);
  ctx.setLineDash([]);

  // 바깥쪽 빨강/흰색 커브 패턴
  for(let i=0;i<22;i++) {
    const x=140+i*78;
    rect(x,105,38,10,i%2?"#ffffff":"#ed6262",camX,camY);
    rect(x,1285,38,10,i%2?"#ffffff":"#ed6262",camX,camY);
  }

  // 출발선
  for(let i=0;i<8;i++) {
    rect(170+i*25,160,25,25,i%2?"#ffffff":"#202020",camX,camY);
  }
}

function drawSpace(camX,camY) {
  rect(0,0,2000,1400,"#0b1030",camX,camY);

  for(let i=0;i<260;i++) {
    const x=(i*197+37)%2000;
    const y=(i*113+71)%1400;
    ctx.fillStyle=i%5===0?"#83f5e4":"#ffffff";
    ctx.fillRect(x-camX,y-camY,i%7===0?3:2,i%7===0?3:2);
  }

  // 성운
  ctx.fillStyle="#6843a633";
  ctx.beginPath();
  ctx.ellipse(400-camX,350-camY,260,130,-.4,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#285bba";
  ctx.beginPath();
  ctx.arc(1000-camX,650-camY,150,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#61bce9";
  ctx.beginPath();
  ctx.arc(960-camX,605-camY,115,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#c5a7ff";
  ctx.lineWidth=13;
  ctx.beginPath();
  ctx.ellipse(1000-camX,650-camY,220,55,-.3,0,Math.PI*2);
  ctx.stroke();

  ctx.fillStyle="#a9b5cf";
  ctx.beginPath();
  ctx.arc(1500-camX,300-camY,65,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#ffffff33";
  ctx.beginPath();
  ctx.arc(1480-camX,280-camY,22,0,Math.PI*2);
  ctx.fill();
}

function drawSports(camX,camY,basketball) {
  rect(0,0,2000,1400,basketball?"#b77742":"#27864c",camX,camY);

  rect(100,100,1800,1200,basketball?"#c68b52":"#338f56",camX,camY);

  ctx.strokeStyle="#ffffffd9";
  ctx.lineWidth=5;
  ctx.strokeRect(100-camX,100-camY,1800,1200);

  ctx.beginPath();
  ctx.moveTo(1000-camX,100-camY);
  ctx.lineTo(1000-camX,1300-camY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(1000-camX,700-camY,150,0,Math.PI*2);
  ctx.stroke();

  if(basketball) {
    for(const x of [250,1750]) {
      ctx.strokeRect(x-100-camX,450-camY,200,500);
      ctx.beginPath();
      ctx.arc(x-camX,700-camY,75,0,Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x-camX,700-camY,18,0,Math.PI*2);
      ctx.stroke();
    }
  } else {
    rect(100,500,18,400,"#f6fff1",camX,camY);
    rect(1882,500,18,400,"#f6fff1",camX,camY);
    ctx.strokeRect(100-camX,450-camY,250,500);
    ctx.strokeRect(1650-camX,450-camY,250,500);
  }
}

function drawBattle(camX,camY) {
  rect(0,0,2000,1400,"#55564e",camX,camY);

  // 파손된 땅
  for(let i=0;i<35;i++) {
    const x=(i*173+60)%1900;
    const y=(i*227+80)%1300;
    ctx.fillStyle=i%2?"#45483f":"#666258";
    ctx.beginPath();
    ctx.moveTo(x-camX,y-camY);
    ctx.lineTo(x+35-camX,y+8-camY);
    ctx.lineTo(x+15-camX,y+30-camY);
    ctx.lineTo(x-10-camX,y+18-camY);
    ctx.closePath();
    ctx.fill();
  }

  // 잔해와 엄폐물
  for(let i=0;i<12;i++) {
    const x=100+(i%4)*450;
    const y=180+Math.floor(i/4)*400;
    rect(x,y,115,75,"#353a39",camX,camY);
    rect(x+9,y+9,97,12,"#8b8b78",camX,camY);
    rect(x+20,y+26,70,35,"#4b504c",camX,camY);
  }

  // 경고 구역
  ctx.strokeStyle="#e6bd63";
  ctx.lineWidth=4;
  ctx.setLineDash([18,14]);
  ctx.strokeRect(35-camX,35-camY,1930,1330);
  ctx.setLineDash([]);
}

function drawPark(camX,camY) {
  rect(0,0,2000,1400,"#65bd73",camX,camY);

  // 산책로
  road(0,650,2000,70,camX,camY);
  road(800,0,70,1400,camX,camY);

  // 연못
  ctx.fillStyle="#50c8d3";
  ctx.beginPath();
  ctx.ellipse(1300-camX,350-camY,230,145,-.25,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#a4fff0";
  ctx.lineWidth=5;
  ctx.stroke();

  for(let x=100;x<1900;x+=250) {
    tree(x,250,camX,camY);
    tree(x,1050,camX,camY);
  }

  // 꽃밭
  for(let i=0;i<60;i++) {
    const x=(i*137+60)%2000;
    const y=(i*91+50)%1400;
    ctx.fillStyle=["#f9b5cf","#fff0a0","#ffffff","#c8a7ff"][i%4];
    ctx.beginPath();
    ctx.arc(x-camX,y-camY,4,0,Math.PI*2);
    ctx.fill();
  }
}

function drawGeneric(camX,camY) {
  // 미니 게임도 기본 배경의 패턴을 달리함
  rect(0,0,2000,1400,"#328e64",camX,camY);

  for(let x=0;x<2000;x+=100) {
    for(let y=0;y<1400;y+=100) {
      rect(x,y,94,94,(x/100+y/100)%2===0?"#3d9c6b":"#378f64",camX,camY);
    }
  }

  rect(150,150,1700,1100,"#68c88b",camX,camY);
  rect(190,190,1620,1020,"#56b77a",camX,camY);

  for(let i=0;i<16;i++) {
    const x=250+(i%4)*400;
    const y=300+Math.floor(i/4)*250;
    rect(x,y,110,85,"#187b54",camX,camY);
    rect(x+8,y+8,94,10,"#8cf3b5",camX,camY);
  }
}

function drawMap(camX,camY) {
  const g=currentGame||"";

  if(g.includes("미로") || g.includes("탈출")) {
    drawMaze(camX,camY);
  } else if(g.includes("레이싱") || g.includes("자동차")) {
    drawRacing(camX,camY);
  } else if(g.includes("우주")) {
    drawSpace(camX,camY);
  } else if(g.includes("축구")) {
    drawSports(camX,camY,false);
  } else if(g.includes("농구")) {
    drawSports(camX,camY,true);
  } else if(g.includes("좀비") || g.includes("전쟁") ||
            g.includes("보스") || g.includes("몬스터")) {
    drawBattle(camX,camY);
  } else if(g.includes("공원") || g.includes("놀이공원") ||
            g.includes("섬") || g.includes("수영장")) {
    drawPark(camX,camY);
  } else if(g.includes("미니 게임")) {
    drawGeneric(camX,camY);
  } else {
    drawCity(camX,camY);
  }
}

function drawPlayer(x,y,avatar,name,isMe,camX,camY) {
  const sx=x-camX, sy=y-camY;
  if(sx < -100 || sy < -100 || sx > innerWidth+100 || sy > innerHeight+100) return;

  // 발밑 그림자
  ctx.fillStyle="#001a1266";
  ctx.beginPath();
  ctx.ellipse(sx,sy+3,17,6,0,0,Math.PI*2);
  ctx.fill();

  ctx.textAlign="center";
  ctx.font="38px sans-serif";
  ctx.fillText(avatar||"😀",sx,sy);

  const label=name||"플레이어";
  ctx.font="bold 13px Arial,sans-serif";
  const w=ctx.measureText(label).width+18;

  ctx.fillStyle=isMe?"#087b51ee":"#052e26e8";
  ctx.fillRect(sx-w/2,sy-48,w,21);

  ctx.strokeStyle=isMe?"#9dffd0":"#b5dfc7";
  ctx.lineWidth=1;
  ctx.strokeRect(sx-w/2,sy-48,w,21);

  ctx.fillStyle="#f3fff8";
  ctx.fillText(label,sx,sy-33);
}

function updateMovement(dt) {
  if(!currentGame) return;

  let dx=0,dy=0;

  if(keys.w||keys.arrowup) dy--;
  if(keys.s||keys.arrowdown) dy++;
  if(keys.a||keys.arrowleft) dx--;
  if(keys.d||keys.arrowright) dx++;

  dx+=joyX;
  dy+=joyY;

  const len=Math.hypot(dx,dy);

  if(len>0) {
    dx/=len;
    dy/=len;

    const speed=220*dt/1000;
    myX=Math.max(25,Math.min(1975,myX+dx*speed));
    myY=Math.max(25,Math.min(1375,myY+dy*speed));

    const now=performance.now();

    if(now-lastMoveSent>45&&ws&&ws.readyState===WebSocket.OPEN) {
      lastMoveSent=now;
      ws.send(JSON.stringify({
        type:"move",x:myX,y:myY,game:currentGame
      }));
    }

    if(players[myId]) {
      players[myId].x=myX;
      players[myId].y=myY;
    }
  }
}

function render(now) {
  const dt=Math.min(now-lastFrame,50);
  lastFrame=now;

  if(currentGame) {
    updateMovement(dt);

    const camX=myX-innerWidth/2;
    const camY=myY-innerHeight/2;

    drawMap(camX,camY);

    for(const [id,p] of Object.entries(players)) {
      if(p.game!==currentGame) continue;

      drawPlayer(
        id===myId?myX:p.x,
        id===myId?myY:p.y,
        p.avatar,p.name,id===myId,camX,camY
      );
    }
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 모바일 조이스틱
const joy=$("joy");
const stick=$("stick");

function moveStick(e) {
  const r=joy.getBoundingClientRect();
  let x=e.clientX-(r.left+r.width/2);
  let y=e.clientY-(r.top+r.height/2);
  const max=42;
  const d=Math.hypot(x,y);

  if(d>max) {
    x=x/d*max;
    y=y/d*max;
  }

  stick.style.left=(32+x)+"px";
  stick.style.top=(32+y)+"px";
  joyX=x/max;
  joyY=y/max;
}

function resetStick() {
  joyActive=false;
  joyX=joyY=0;
  stick.style.left="32px";
  stick.style.top="32px";
}

joy.addEventListener("pointerdown",e=>{
  joyActive=true;
  joy.setPointerCapture(e.pointerId);
  moveStick(e);
});
joy.addEventListener("pointermove",e=>{
  if(joyActive) moveStick(e);
});
joy.addEventListener("pointerup",resetStick);
joy.addEventListener("pointercancel",resetStick);

connect();
</script>
</body>
</html>`;

const page = html.replace("__GAME_NAMES__", JSON.stringify(gameNames));

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

  for (const [id, player] of players) {
    snapshot[id] = { ...player };
  }

  broadcast({ type: "players", players: snapshot });
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function uniqueName(requested, id) {
  const base = cleanText(requested, 12) || "플레이어";
  let candidate = base;
  let number = 2;

  const used = new Set();

  for (const [otherId, player] of players) {
    if (otherId !== id) used.add(player.name);
  }

  while (used.has(candidate)) {
    const suffix = " (" + number++ + ")";
    candidate = base.slice(0, Math.max(1, 12 - suffix.length)) + suffix;
  }

  return candidate;
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

    const player = players.get(id);
    if (!player || !data || typeof data.type !== "string") return;

    if (data.type === "join") {
      const game = cleanText(data.game, 100);

      if (!gameNames.includes(game)) {
        return send(socket, {
          type: "error",
          message: "존재하지 않는 게임입니다."
        });
      }

      player.name = uniqueName(data.name, id);
      player.avatar = cleanText(data.avatar, 8) || "😀";
      player.game = game;
      player.x = 500;
      player.y = 400;

      send(socket, { type: "joined", id, name: player.name });
      broadcastPlayers();
      return;
    }

    if (data.type === "leave") {
      player.game = null;
      broadcastPlayers();
      return;
    }

    if (data.type === "move") {
      if (!player.game || data.game !== player.game) return;

      const x = Number(data.x);
      const y = Number(data.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      player.x = Math.max(25, Math.min(1975, x));
      player.y = Math.max(25, Math.min(1375, y));

      broadcast({
        type: "move",
        id,
        x: player.x,
        y: player.y,
        game: player.game
      }, socket);

      return;
    }

    if (data.type === "chat") {
      if (!player.game) return;

      const message = cleanText(data.text, 100);
      if (!message) return;

      for (const [otherId, otherSocket] of sockets) {
        const other = players.get(otherId);

        if (other && other.game === player.game) {
          send(otherSocket, {
            type: "chat",
            name: player.name,
            avatar: player.avatar,
            text: message,
            game: player.game
          });
        }
      }
    }
  });

  function removePlayer() {
    players.delete(id);
    sockets.delete(id);
    broadcastPlayers();
  }

  socket.on("close", removePlayer);
  socket.on("error", removePlayer);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Green World multiplayer server running on port " + PORT);
});