const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>준희 멀티플레이 게임</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  background:#111;
  color:white;
  font-family:Arial,sans-serif;
  overflow:hidden;
}
#home{
  width:100vw;
  height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:25px;
  overflow:auto;
}
h1{margin:10px 0 20px}
input,select,button{
  font-size:18px;
  padding:10px;
  border-radius:10px;
  border:0;
  margin:5px;
}
button{
  cursor:pointer;
  background:#4b7bec;
  color:white;
}
#games{
  width:min(900px,95vw);
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
  gap:10px;
  margin-top:20px;
}
.game{
  background:#252525;
  padding:18px;
  border-radius:15px;
  cursor:pointer;
  text-align:center;
  border:2px solid transparent;
}
.game:hover{
  border-color:#4b7bec;
  background:#303030;
}

#gameScreen{
  display:none;
  width:100vw;
  height:100vh;
  position:relative;
}
#top{
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:60px;
  background:rgba(0,0,0,.75);
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px;
  z-index:5;
}
#title{
  font-weight:bold;
  flex:1;
}
#count{
  background:#333;
  padding:8px 12px;
  border-radius:10px;
}
#canvas{
  display:block;
  width:100%;
  height:100%;
  background:#65b96e;
}

#chat{
  position:absolute;
  right:10px;
  top:70px;
  width:300px;
  height:390px;
  background:rgba(15,15,15,.9);
  border-radius:15px;
  padding:10px;
  z-index:10;
  display:none;
}
#messages{
  height:310px;
  overflow:auto;
  background:#202020;
  border-radius:10px;
  padding:8px;
}
.msg{
  margin-bottom:7px;
  word-break:break-word;
}
#chatInput{
  width:calc(100% - 75px);
  margin:8px 0 0;
}
#send{
  width:60px;
  margin:8px 0 0 5px;
  padding:9px 4px;
}

#joy{
  position:absolute;
  left:25px;
  bottom:25px;
  width:130px;
  height:130px;
  border-radius:50%;
  background:rgba(0,0,0,.25);
  border:3px solid rgba(255,255,255,.35);
  z-index:5;
}
#stick{
  position:absolute;
  width:60px;
  height:60px;
  left:32px;
  top:32px;
  border-radius:50%;
  background:rgba(255,255,255,.5);
}

#help{
  position:absolute;
  bottom:10px;
  right:10px;
  background:rgba(0,0,0,.5);
  padding:8px 12px;
  border-radius:10px;
}
</style>
</head>

<body>

<div id="home">
  <h1>🌍 멀티플레이 게임</h1>

  <div>
    <input id="name" maxlength="12" placeholder="닉네임">
    <select id="avatar">
      <option>😀</option>
      <option>😎</option>
      <option>🤠</option>
      <option>👽</option>
      <option>🤖</option>
      <option>🐱</option>
      <option>🐶</option>
      <option>🧑</option>
    </select>
  </div>

  <p>게임을 선택하면 같은 게임에 있는 사람들이 보여요.</p>

  <div id="games"></div>
</div>

<div id="gameScreen">

  <div id="top">
    <button onclick="leaveGame()">🏠 홈</button>
    <div id="title">게임</div>
    <div id="count">0명</div>
    <button onclick="toggleChat()">💬</button>
  </div>

  <canvas id="canvas"></canvas>

  <div id="chat">
    <div id="messages"></div>
    <input id="chatInput" maxlength="100" placeholder="채팅 입력">
    <button id="send">전송</button>
  </div>

  <div id="joy">
    <div id="stick"></div>
  </div>

  <div id="help">
    이동: WASD / 방향키
  </div>

</div>

<script>
const home = document.getElementById("home");
const gameScreen = document.getElementById("gameScreen");
const games = document.getElementById("games");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const nameInput = document.getElementById("name");
const avatarInput = document.getElementById("avatar");
const title = document.getElementById("title");
const count = document.getElementById("count");

const chat = document.getElementById("chat");
const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const send = document.getElementById("send");

let ws;
let myId = null;
let currentGame = null;

let players = {};

let me = {
  x: 500,
  y: 400
};

let keys = {};
let joyX = 0;
let joyY = 0;

const gameNames = [
  "도시 탐험",
  "자동차 피하기",
  "미로 탈출",
  "점프맵",
  "보물찾기",
  "좀비 생존",
  "우주 탐험",
  "축구 경기장",
  "농구 경기장",
  "경찰서 탈출",
  "은행 지키기",
  "소방서 구조",
  "병원 탐험",
  "도서관 탐험",
  "편의점 게임",
  "아파트 탐험",
  "레이싱",
  "장애물 피하기",
  "몬스터 사냥",
  "보스전",
  "스키비디 전쟁",
  "우주 전쟁",
  "기차 탈출",
  "학교 탐험",
  "놀이공원",
  "수영장",
  "공원 탐험",
  "섬 탐험",
  "화산 탈출",
  "빙하 탐험"
];

for(let i=31;i<=220;i++){
  gameNames.push("미니 게임 " + i);
}

gameNames.forEach((gameName,index)=>{
  const div = document.createElement("div");
  div.className = "game";
  div.innerHTML =
    "<b>" + (index+1) + ". " + gameName + "</b><br><small>멀티플레이</small>";

  div.onclick = ()=>joinGame(gameName);

  games.appendChild(div);
});

function connect(){
  const protocol =
    location.protocol === "https:" ? "wss://" : "ws://";

  ws = new WebSocket(protocol + location.host);

  ws.onopen = ()=>{
    console.log("서버 연결됨");
  };

  ws.onmessage = event=>{
    const data = JSON.parse(event.data);

    if(data.type === "welcome"){
      myId = data.id;
    }

    if(data.type === "players"){
      players = data.players || {};
      updateCount();
    }

    if(data.type === "move"){
      if(players[data.id]){
        players[data.id].x = data.x;
        players[data.id].y = data.y;
      }
    }

    if(data.type === "chat"){
      addMessage(data.name, data.avatar, data.text);
    }
  };

  ws.onclose = ()=>{
    console.log("서버 연결 종료");
  };
}

function joinGame(gameName){

  if(!nameInput.value.trim()){
    nameInput.value = "플레이어";
  }

  if(!ws || ws.readyState !== WebSocket.OPEN){
    alert("서버에 연결되지 않았어.");
    return;
  }

  currentGame = gameName;

  me.x = 500;
  me.y = 400;

  home.style.display = "none";
  gameScreen.style.display = "block";

  title.textContent = gameName;

  ws.send(JSON.stringify({
    type:"join",
    name:nameInput.value.trim(),
    avatar:avatarInput.value,
    game:gameName,
    x:me.x,
    y:me.y
  }));

  resize();
}

function leaveGame(){

  currentGame = null;
  gameScreen.style.display = "none";
  home.style.display = "flex";

  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify({
      type:"leave"
    }));
  }
}

function updateCount(){

  let n = 0;

  for(const id in players){
    if(players[id].game === currentGame){
      n++;
    }
  }

  count.textContent = n + "명";
}

function addMessage(name,avatar,text){

  const div = document.createElement("div");
  div.className = "msg";

  div.textContent =
    avatar + " " + name + ": " + text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function toggleChat(){

  chat.style.display =
    chat.style.display === "block"
      ? "none"
      : "block";
}

send.onclick = sendChat;

chatInput.addEventListener("keydown",e=>{
  if(e.key === "Enter"){
    sendChat();
  }
});

function sendChat(){

  const text = chatInput.value.trim();

  if(!text) return;

  if(ws && ws.readyState === WebSocket.OPEN){

    ws.send(JSON.stringify({
      type:"chat",
      text:text
    }));
  }

  chatInput.value = "";
}

window.addEventListener("keydown",e=>{
  keys[e.key.toLowerCase()] = true;

  if(e.key === "Enter" &&
     document.activeElement !== chatInput){
    toggleChat();
  }
});

window.addEventListener("keyup",e=>{
  keys[e.key.toLowerCase()] = false;
});

function resize(){

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize",resize);

resize();

function movement(){

  if(!currentGame) return;

  let dx = 0;
  let dy = 0;

  if(keys["w"] || keys["arrowup"]) dy -= 1;
  if(keys["s"] || keys["arrowdown"]) dy += 1;
  if(keys["a"] || keys["arrowleft"]) dx -= 1;
  if(keys["d"] || keys["arrowright"]) dx += 1;

  dx += joyX;
  dy += joyY;

  const length = Math.hypot(dx,dy);

  if(length > 0){

    dx /= length;
    dy /= length;

    me.x += dx * 4;
    me.y += dy * 4;

    me.x = Math.max(30,Math.min(1970,me.x));
    me.y = Math.max(30,Math.min(1370,me.y));

    if(ws && ws.readyState === WebSocket.OPEN){

      ws.send(JSON.stringify({
        type:"move",
        x:me.x,
        y:me.y,
        game:currentGame
      }));
    }
  }
}

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#69bd70";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cameraX =
    me.x - canvas.width / 2;

  const cameraY =
    me.y - canvas.height / 2;

  // 맵
  ctx.fillStyle = "#4b9d57";
  ctx.fillRect(
    -cameraX,
    -cameraY,
    2000,
    1400
  );

  // 길
  ctx.fillStyle = "#777";

  for(let x=0;x<2000;x+=300){
    ctx.fillRect(
      x-cameraX,
      300-cameraY,
      250,
      100
    );
  }

  // 건물
  for(let x=100;x<1900;x+=400){

    ctx.fillStyle="#777";
    ctx.fillRect(
      x-cameraX,
      600-cameraY,
      220,
      160
    );

    ctx.fillStyle="#bbb";
    ctx.fillRect(
      x+20-cameraX,
      620-cameraY,
      70,
      50
    );

    ctx.fillRect(
      x+120-cameraX,
      620-cameraY,
      70,
      50
    );
  }

  // 다른 플레이어
  for(const id in players){

    const p = players[id];

    if(p.game !== currentGame) continue;

    if(id === myId){
      drawPlayer(
        me.x-cameraX,
        me.y-cameraY,
        p.avatar || avatarInput.value,
        p.name || nameInput.value
      );
    }else{
      drawPlayer(
        p.x-cameraX,
        p.y-cameraY,
        p.avatar,
        p.name
      );
    }
  }

  requestAnimationFrame(draw);
}

function drawPlayer(x,y,avatar,name){

  ctx.font = "38px Arial";
  ctx.textAlign = "center";
  ctx.fillText(avatar || "😀",x,y);

  ctx.font = "14px Arial";

  const width =
    ctx.measureText(name || "플레이어").width + 12;

  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(
    x-width/2,
    y-48,
    width,
    20
  );

  ctx.fillStyle = "white";
  ctx.fillText(
    name || "플레이어",
    x,
    y-33
  );
}

setInterval(movement,30);

draw();

connect();


// 조이스틱
const joy = document.getElementById("joy");
const stick = document.getElementById("stick");

let joyActive = false;

function updateJoy(clientX,clientY){

  const rect = joy.getBoundingClientRect();

  const centerX =
    rect.left + rect.width/2;

  const centerY =
    rect.top + rect.height/2;

  let x = clientX-centerX;
  let y = clientY-centerY;

  const max = 45;
  const distance = Math.hypot(x,y);

  if(distance > max){

    x = x/distance*max;
    y = y/distance*max;
  }

  stick.style.left =
    (32+x) + "px";

  stick.style.top =
    (32+y) + "px";

  joyX = x/max;
  joyY = y/max;
}

function resetJoy(){

  joyActive = false;

  joyX = 0;
  joyY = 0;

  stick.style.left = "32px";
  stick.style.top = "32px";
}

joy.addEventListener("pointerdown",e=>{
  joyActive = true;
  joy.setPointerCapture(e.pointerId);
  updateJoy(e.clientX,e.clientY);
});

joy.addEventListener("pointermove",e=>{
  if(joyActive){
    updateJoy(e.clientX,e.clientY);
  }
});

joy.addEventListener("pointerup",resetJoy);
joy.addEventListener("pointercancel",resetJoy);

</script>
</body>
</html>`;

const server = http.createServer((req,res)=>{
  res.writeHead(200,{
    "Content-Type":"text/html; charset=utf-8"
  });

  res.end(html);
});

const wss = new WebSocket.Server({server});

const players = new Map();

let nextId = 1;

wss.on("connection",socket=>{

  const id = String(nextId++);

  players.set(id,{
    id,
    name:"플레이어",
    avatar:"😀",
    game:null,
    x:500,
    y:400
  });

  socket.send(JSON.stringify({
    type:"welcome",
    id
  }));

  broadcastPlayers();

  socket.on("message",raw=>{

    let data;

    try{
      data = JSON.parse(raw.toString());
    }catch{
      return;
    }

    const p = players.get(id);

    if(!p) return;

    if(data.type === "join"){

      p.name =
        String(data.name || "플레이어").slice(0,12);

      p.avatar =
        String(data.avatar || "😀").slice(0,4);

      p.game =
        String(data.game || "").slice(0,100);

      p.x = Number(data.x) || 500;
      p.y = Number(data.y) || 400;

      broadcastPlayers();
    }

    if(data.type === "move"){

      if(p.game !== data.game) return;

      p.x = Number(data.x) || p.x;
      p.y = Number(data.y) || p.y;

      broadcast({
        type:"move",
        id,
        x:p.x,
        y:p.y
      },socket);
    }

    if(data.type === "chat"){

      const text =
        String(data.text || "").slice(0,100);

      if(!text) return;

      broadcast({
        type:"chat",
        name:p.name,
        avatar:p.avatar,
        text
      });
    }

    if(data.type === "leave"){

      p.game = null;

      broadcastPlayers();
    }
  });

  socket.on("close",()=>{
    players.delete(id);
    broadcastPlayers();
  });
});

function broadcast(data,except=null){

  const text = JSON.stringify(data);

  wss.clients.forEach(client=>{

    if(client.readyState !== WebSocket.OPEN) return;

    if(except && client === except) return;

    client.send(text);
  });
}

function broadcastPlayers(){

  const obj = {};

  players.forEach((p,id)=>{
    obj[id] = p;
  });

  broadcast({
    type:"players",
    players:obj
  });
}

server.listen(PORT,()=>{
  console.log("");
  console.log("================================");
  console.log("멀티플레이 서버 실행!");
  console.log("http://localhost:" + PORT);
  console.log("================================");
});