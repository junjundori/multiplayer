const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const W = 1600, H = 1000;

const games = [
  ["도시 탐험","🏙️","city"],["미로 탈출","🌀","maze"],
  ["자동차 피하기","🚗","dodge"],["우주 탐험","🚀","space"],
  ["축구 경기장","⚽","soccer"],["농구 코트","🏀","basket"],
  ["전투 지역","🛡️","battle"],["공원 산책","🌳","park"],
  ["보물 찾기","💎","treasure"],["경찰서","🚓","police"],
  ["은행 탐험","🏦","bank"],["소방서","🚒","fire"],
  ["병원 탐험","🏥","hospital"],["도서관","📚","library"],
  ["편의점","🏪","store"],["아파트","🏢","apartment"],
  ["해변 탐험","🏖️","beach"],["숲속 모험","🌲","forest"],
  ["눈 덮인 마을","❄️","snow"],["화산 지대","🌋","volcano"],
  ["광산 탐험","⛏️","mine"],["수중 도시","🐠","ocean"],
  ["놀이공원","🎡","amusement"],["공항","✈️","airport"],
  ["기차역","🚆","station"],["유령의 집","👻","haunted"],
  ["보석 동굴","💠","cave"],["사막 탐험","🏜️","desert"],
  ["섬 생존","🏝️","island"],["정원 꾸미기","🌷","garden"]
].map((g,i)=>({id:i+1,name:g[0],icon:g[1],type:g[2]}));

const players = new Map();
const sockets = new Map();

function clean(v,n=180) {
  return String(v ?? "").replace(/[<>]/g,"").trim().slice(0,n);
}

function send(ws,obj) {
  if(ws && ws.readyState===WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcast() {
  const list=[...players.values()].map(p=>({...p}));
  for(const ws of sockets.values()) {
    send(ws,{type:"players",players:list});
  }
}

function uniqueName(name,id) {
  const base=clean(name,18)||"플레이어";
  let value=base,n=2;

  while([...players.values()].some(p=>p.id!==id&&p.name===value)) {
    value=base+" ("+n+++")";
  }

  return value;
}

const page=String.raw`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>멀티플레이어 월드</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  color:#edfff3;
  font-family:Arial,"Malgun Gothic",sans-serif;
  background:radial-gradient(at top,#176c43,#08291d 65%,#04150e)
}
header{
  padding:18px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
  background:linear-gradient(110deg,#12623d,#09271b);
  border-bottom:1px solid #54b77b;
  position:sticky;
  top:0;
  z-index:5
}
h1{margin:0;font-size:26px}
h2{margin-top:0}
main{max-width:1400px;margin:auto;padding:16px}
.panel{
  padding:16px;
  margin-bottom:16px;
  border:1px solid #347d50;
  border-radius:17px;
  background:linear-gradient(145deg,#153c2b,#0b2319);
  box-shadow:0 8px 24px #0003
}
input,select{
  padding:10px;
  border-radius:10px;
  background:#0b2419;
  color:white;
  border:1px solid #478c5d;
  max-width:100%
}
button{
  color:white;
  cursor:pointer;
  border:1px solid #5bbd7c;
  border-radius:12px;
  padding:10px 14px;
  background:linear-gradient(135deg,#159957,#087443)
}
button:hover{filter:brightness(1.15)}
.profile{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(155px,1fr));
  gap:12px
}
.game{
  text-align:left;
  min-height:120px;
  background:linear-gradient(145deg,#1b6845,#0d3827);
  padding:14px;
  border-radius:15px
}
.game .icon{display:block;font-size:32px;margin-bottom:9px}
.game .name{font-weight:bold}
.number{display:block;margin-top:8px;color:#bce8c9;font-size:12px}
#gameView{display:none}
#mapWrap{
  width:100%;
  height:min(65vh,650px);
  min-height:320px;
  position:relative;
  overflow:hidden;
  border:2px solid #4b9d69;
  border-radius:14px;
  background:#152e20
}
#world{
  width:100%;
  height:100%;
  display:block;
  touch-action:none
}
.overlay{
  position:absolute;
  top:10px;
  background:#071b13df;
  padding:9px 12px;
  border:1px solid #47875c;
  border-radius:10px;
  pointer-events:none;
  font-size:13px
}
#topInfo{left:10px}
#playersInfo{right:10px}
#chatMessages{
  height:140px;
  overflow:auto;
  padding:10px;
  background:#06170f;
  border:1px solid #316847;
  border-radius:10px;
  overflow-wrap:anywhere
}
.chatrow{margin-bottom:6px}
.chatform{display:flex;gap:8px;margin-top:8px}
.chatform input{flex:1;width:100%;min-width:0}
#controls{
  display:flex;
  align-items:center;
  gap:18px;
  margin-top:12px;
  flex-wrap:wrap
}
#stick{
  width:130px;
  height:130px;
  position:relative;
  flex:none;
  border-radius:50%;
  background:radial-gradient(#32734d,#0b2d1e);
  border:2px solid #70b78a;
  touch-action:none
}
#knob{
  position:absolute;
  width:48px;
  height:48px;
  left:39px;
  top:39px;
  border-radius:50%;
  background:linear-gradient(135deg,#9affb7,#1b9d55);
  pointer-events:none
}
#status{font-size:13px;color:#c5f2d2}
@media(max-width:600px){
  main{padding:9px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .game{padding:10px;min-height:112px}
  header{padding:12px}
}
</style>
</head>
<body>
<header>
  <div>
    <h1>초록빛 멀티플레이어 월드</h1>
    <div style="font-size:13px;color:#bde9cc;margin-top:5px">
      30개의 게임 · 실시간 멀티플레이어
    </div>
  </div>
  <div id="status">연결 중...</div>
</header>

<main>
<section id="home">
  <div class="panel">
    <h2>플레이어 설정</h2>
    <div class="profile">
      <label for="nickname">닉네임</label>
      <input id="nickname" maxlength="18" value="플레이어">

      <label for="avatar">캐릭터</label>
      <select id="avatar">
        <option>🧑</option>
        <option>🤖</option>
        <option>🦊</option>
        <option>🐱</option>
        <option>🐸</option>
        <option>🐼</option>
        <option>👨‍🚀</option>
        <option>🐰</option>
        <option>🦖</option>
        <option>👻</option>
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
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
        <h2 id="gameTitle">게임</h2>
        <div id="objective">목표를 확인하세요.</div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="restartBtn" style="display:none">다시 시작</button>
        <button id="leaveBtn">게임 나가기</button>
      </div>
    </div>

    <div id="mapWrap">
      <canvas id="world"></canvas>
      <div id="topInfo" class="overlay">맵</div>
      <div id="playersInfo" class="overlay">플레이어: 0명</div>
    </div>

    <div id="controls">
      <div id="stick"><div id="knob"></div></div>
      <div style="flex:1">
        WASD / 방향키 / 조이스틱으로 이동
        <br>
        <div style="font-size:13px;color:#bde9cc;margin-top:5px">
          목표물에 가까이 가서 탐험하세요.
        </div>
      </div>
    </div>

    <div style="margin-top:16px">
      <h3>맵 채팅</h3>
      <div id="chatMessages"></div>
      <form id="chatForm" class="chatform">
        <input id="chatInput" maxlength="180" placeholder="메시지 입력..." autocomplete="off">
        <button>전송</button>
      </form>
    </div>
  </div>
</section>
</main>

<script>
const GAMES=__GAMES__, WORLD_W=1600,WORLD_H=1000;
const $=id=>document.getElementById(id);
const canvas=$("world");
const ctx=canvas.getContext("2d");

let ws,myId=null,current=null,players=[],me={x:800,y:500},keys={};
let joy={x:0,y:0},lastMove=0,lastTime=0,obstacles=[],goal={x:1400,y:500};
let progress=0,gameOver=false;
let oCollected=new Set();

const grid=$("gameGrid");

for(const g of GAMES){
  const b=document.createElement("button");
  b.className="game";

  const icon=document.createElement("span");
  icon.className="icon";
  icon.textContent=g.icon;

  const name=document.createElement("span");
  name.className="name";
  name.textContent=g.name;

  const number=document.createElement("span");
  number.className="number";
  number.textContent="게임 "+g.id;

  b.append(icon,name,number);
  b.onclick=()=>joinGame(g);
  grid.appendChild(b);
}

function connect(){
  const scheme=location.protocol==="https:"?"wss:":"ws:";
  ws=new WebSocket(scheme+"//"+location.host);

  ws.onopen=()=>{
    $("status").textContent="서버 연결됨";
    if(current)sendJoin();
  };

  ws.onmessage=e=>{
    let d;
    try{d=JSON.parse(e.data)}catch{return}

    if(d.type==="welcome"){
      myId=d.id;
      if(current)sendJoin();
    }

    if(d.type==="players"){
      players=d.players||[];
      const same=players.filter(p=>p.game===current?.id);

      $("playersInfo").textContent="이 맵의 플레이어: "+same.length+"명";

      const own=players.find(p=>p.id===myId);
      if(own && own.game===current?.id){
        $("nickname").value=own.name;
      }
    }

    if(d.type==="joined"&&d.name){
      $("nickname").value=d.name;
    }

    if(d.type==="chat"&&d.game===current?.id){
      addChat(d.name,d.avatar,d.message);
    }
  };

  ws.onclose=()=>{
    $("status").textContent="연결 끊김";
  };

  ws.onerror=()=>{
    $("status").textContent="연결 오류";
  };
}

function send(d){
  if(ws&&ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify(d));
  }
}

function sendJoin(){
  if(current&&myId){
    send({
      type:"join",
      game:current.id,
      name:$("nickname").value,
      avatar:$("avatar").value
    });
  }
}

function joinGame(g){
  current=g;
  me=g.type==="maze"?{x:48,y:48}:{x:800,y:500};
  progress=0;
  gameOver=false;
  oCollected=new Set();

  $("home").style.display="none";
  $("gameView").style.display="block";
  $("gameTitle").textContent=g.icon+" "+g.name;
  $("topInfo").textContent=g.name;
  $("restartBtn").style.display="none";
  $("chatMessages").replaceChildren();
  $("objective").textContent=objectives[g.type]||"맵을 탐험하세요.";

  makeObstacles();
  resize();
  sendJoin();
  draw();
}

function leaveGame(){
  send({type:"leave"});
  current=null;
  $("gameView").style.display="none";
  $("home").style.display="block";
}

$("leaveBtn").onclick=leaveGame;
$("restartBtn").onclick=()=>{
  if(current)joinGame(current);
};

const objectives={
  city:"목표: 도로와 건물 사이를 자유롭게 탐험하세요.",
  maze:"목표: 벽에 부딪히지 않고 노란색 출구에 도착하세요.",
  dodge:"목표: 움직이는 장애물과 자동차를 피하세요.",
  space:"목표: 우주선을 찾아 행성 사이를 탐험하세요.",
  soccer:"목표: 축구공 가까이 다가가 경기장을 탐험하세요.",
  basket:"목표: 농구 코트와 골대를 찾아보세요.",
  battle:"목표: 장애물을 피하며 전장을 탐험하세요.",
  park:"목표: 나무와 연못이 있는 공원을 산책하세요.",
  treasure:"목표: 보석을 모아 점수를 올리세요.",
  police:"목표: 경찰서 안팎을 탐험하세요.",
  bank:"목표: 은행 내부의 금고 구역을 찾아보세요.",
  fire:"목표: 소방서와 소방차를 찾아보세요.",
  hospital:"목표: 병실과 접수 구역을 탐험하세요.",
  library:"목표: 책장 사이를 돌아다니세요.",
  store:"목표: 편의점 진열대 사이를 탐험하세요.",
  apartment:"목표: 아파트 단지 사이를 탐험하세요.",
  beach:"목표: 모래사장과 바다를 탐험하세요.",
  forest:"목표: 울창한 숲길을 찾아보세요.",
  snow:"목표: 눈 마을을 탐험하세요.",
  volcano:"목표: 용암 구역을 피해 탐험하세요.",
  mine:"목표: 광산에서 보석을 찾아보세요.",
  ocean:"목표: 수중 도시를 탐험하세요.",
  amusement:"목표: 놀이공원의 놀이기구를 찾아보세요.",
  airport:"목표: 활주로와 터미널을 탐험하세요.",
  station:"목표: 기차역과 승강장을 탐험하세요.",
  haunted:"목표: 유령의 집을 탐험하세요.",
  cave:"목표: 동굴 속 보석을 찾아보세요.",
  desert:"목표: 사막의 오아시스를 찾아보세요.",
  island:"목표: 섬을 탐험하세요.",
  garden:"목표: 정원의 꽃과 연못을 찾아보세요."
};

function makeObstacles(){
  obstacles=[];
  const type=current.type;

  if(type==="maze"){
    // 16 x 10 DFS maze
    const cols=16,rows=10,cell=100,thick=12;

    const cells=Array.from(
      {length:rows},
      ()=>Array.from(
        {length:cols},
        ()=>({
          seen:false,
          walls:{top:true,right:true,bottom:true,left:true}
        })
      )
    );

    let seed=current.id*7919+17;
    const rand=()=>{
      seed=(seed*48271)%2147483647;
      return seed/2147483647;
    };

    const stack=[{x:0,y:0}];
    cells[0][0].seen=true;

    while(stack.length){
      const cur=stack[stack.length-1];

      const choices=[
        {x:cur.x,y:cur.y-1,wall:"top",opposite:"bottom"},
        {x:cur.x+1,y:cur.y,wall:"right",opposite:"left"},
        {x:cur.x,y:cur.y+1,wall:"bottom",opposite:"top"},
        {x:cur.x-1,y:cur.y,wall:"left",opposite:"right"}
      ].filter(n=>
        n.x>=0&&n.x<cols&&n.y>=0&&n.y<rows&&
        !cells[n.y][n.x].seen
      );

      if(!choices.length){
        stack.pop();
        continue;
      }

      const next=choices[Math.floor(rand()*choices.length)];

      cells[cur.y][cur.x].walls[next.wall]=false;
      cells[next.y][next.x].walls[next.opposite]=false;
      cells[next.y][next.x].seen=true;
      stack.push({x:next.x,y:next.y});
    }

    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const c=cells[y][x];
        const px=x*cell,py=y*cell;

        if(c.walls.top&&y===0){
          obstacles.push({x:px,y:py,w:cell,h:thick});
        }

        if(c.walls.left&&x===0){
          obstacles.push({x:px,y:py,w:thick,h:cell});
        }

        if(c.walls.right){
          obstacles.push({
            x:px+cell-thick,y:py,w:thick,h:cell
          });
        }

        if(c.walls.bottom){
          obstacles.push({
            x:px,y:py+cell-thick,w:cell,h:thick
          });
        }
      }
    }
  }

  if(type==="dodge"){
    for(let i=0;i<13;i++){
      obstacles.push({
        x:100+i*110,
        y:100+(i%3)*280,
        w:65,h:110,
        moving:true,
        phase:i
      });
    }
  }

  if(type==="battle"||type==="mine"||type==="cave"){
    for(let i=0;i<24;i++){
      obstacles.push({
        x:100+(i*173)%1350,
        y:100+(i*239)%780,
        w:50+(i%3)*15,
        h:45+(i%4)*12
      });
    }
  }

  if(type==="volcano"){
    for(let i=0;i<12;i++){
      obstacles.push({
        x:130+i*115,
        y:180+(i%3)*250,
        w:70,h:65
      });
    }
  }
}

function resize(){
  const r=canvas.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio||1,2);

  canvas.width=Math.max(1,Math.round(r.width*dpr));
  canvas.height=Math.max(1,Math.round(r.height*dpr));
  draw();
}

window.addEventListener("resize",resize);

function rr(x,y,w,h,r,c){
  ctx.fillStyle=c;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fill();
}

function rect(x,y,w,h,c){
  ctx.fillStyle=c;
  ctx.fillRect(x,y,w,h);
}

function circ(x,y,r,c){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=c;
  ctx.fill();
}

function line(x,y,a,b,c,width=2){
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(a,b);
  ctx.strokeStyle=c;
  ctx.lineWidth=width;
  ctx.stroke();
}

function label(s,x,y,c="#fff",size=20){
  ctx.fillStyle=c;
  ctx.font="bold "+size+"px Arial";
  ctx.textAlign="center";
  ctx.fillText(s,x,y);
}

function building(x,y,w,h,c,title){
  rr(x,y,w,h,5,c);

  for(let yy=y+16;yy<y+h-15;yy+=35){
    for(let xx=x+12;xx<x+w-10;xx+=35){
      rect(xx,yy,20,22,"#c3edc9");
    }
  }

  if(title)label(title,x+w/2,y+h+22,"#fff",17);
}

function tree(x,y){
  circ(x,y+12,17,"#23502f");
  circ(x,y,21,"#25844a");
  circ(x-9,y+3,12,"#369c58");
}

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,WORLD_H);
  g.addColorStop(0,"#357b49");
  g.addColorStop(1,"#214b30");
  rect(0,0,WORLD_W,WORLD_H,g);
}

function drawMap(){
  const t=current.type;
  drawBackground();

  switch(t){

    case "city":
      rect(0,0,WORLD_W,WORLD_H,"#777d7c");
      rect(0,390,WORLD_W,220,"#343b3e");
      rect(610,0,210,WORLD_H,"#343b3e");

      rect(0,370,WORLD_W,20,"#c6c8bd");
      rect(0,610,WORLD_W,20,"#c6c8bd");
      rect(590,0,20,WORLD_H,"#c6c8bd");
      rect(820,0,20,WORLD_H,"#c6c8bd");

      for(let x=15;x<WORLD_W;x+=90){
        rect(x,495,48,6,"#f4d66f");
      }

      for(let y=15;y<WORLD_H;y+=90){
        rect(710,y,6,48,"#f4d66f");
      }

      building(35,35,230,285,"#526f83","상가");
      building(300,55,250,270,"#77766c","사무실");
      building(870,35,250,300,"#4d7289","호텔");
      building(1150,35,400,300,"#77838a","아파트");
      building(40,690,260,250,"#8c796a","주차장");
      building(330,690,220,250,"#9b9a8c","상점");
      building(880,700,260,230,"#7b8b92","병원");
      building(1170,700,350,230,"#8a8175","오피스");

      for(let x=25;x<580;x+=55){
        rect(x,350,28,12,"#d7d7ce");
        rect(x,640,28,12,"#d7d7ce");
      }
      break;

    case "maze":
      rect(0,0,WORLD_W,WORLD_H,"#d8d0a2");

      for(const o of obstacles){
        rr(o.x,o.y,o.w,o.h,3,"#245638");
      }

      rr(45,45,100,70,8,"#45ce77");
      label("START",95,88,"#073c1d",18);
      rr(1430,850,100,90,8,"#f5d34b");
      label("EXIT",1480,905,"#493600",18);
      goal={x:1480,y:895};
      break;

    case "dodge":
      rect(0,0,WORLD_W,WORLD_H,"#294e38");

      for(let x=160;x<1500;x+=180){
        rect(x,0,5,WORLD_H,"#a8b3a0");
      }

      rect(0,470,WORLD_W,60,"#e7dfad");

      for(const o of obstacles){
        rr(o.x,o.y,o.w,o.h,12,"#b2b8ba");
        rr(o.x+7,o.y+8,o.w-14,30,6,"#76c8de");
        circ(o.x+14,o.y+o.h-4,11,"#171b1b");
        circ(o.x+o.w-14,o.y+o.h-4,11,"#171b1b");
      }
      break;

    case "space":
      rect(0,0,WORLD_W,WORLD_H,"#101b46");

      for(let i=0;i<180;i++){
        circ((i*137+31)%WORLD_W,(i*271+13)%WORLD_H,1+i%3,"#fff");
      }

      circ(350,280,100,"#347ed2");
      circ(320,250,24,"#8ac7ff");
      circ(1200,650,135,"#a64f61");

      ctx.beginPath();
      ctx.ellipse(1200,650,190,40,.3,0,Math.PI*2);
      ctx.strokeStyle="#dfb5b2";
      ctx.lineWidth=8;
      ctx.stroke();

      label("🚀",800,500);
      break;

    case "soccer":
      rect(80,60,1440,880,"#278844");

      for(let x=80;x<1520;x+=180){
        rect(x,60,90,880,"#30974b");
      }

      ctx.strokeStyle="#fff";
      ctx.lineWidth=5;
      ctx.strokeRect(80,60,1440,880);
      line(800,60,800,940,"#fff",4);

      ctx.beginPath();
      ctx.arc(800,500,120,0,Math.PI*2);
      ctx.stroke();

      ctx.strokeRect(80,300,220,400);
      ctx.strokeRect(1300,300,220,400);
      label("⚽",800,500,undefined,42);
      break;

    case "basket":
      rect(80,60,1440,880,"#bd8250");

      ctx.strokeStyle="#fff0d8";
      ctx.lineWidth=5;
      ctx.strokeRect(80,60,1440,880);
      line(800,60,800,940,"#fff0d8",4);

      for(const x of [250,1350]){
        ctx.beginPath();
        ctx.arc(x,500,155,0,Math.PI*2);
        ctx.stroke();
        rect(x-60,460,8,80,"#fff");
        circ(x,500,10,"#fff");
      }
      break;

    case "battle":
      rect(0,0,WORLD_W,WORLD_H,"#535f53");

      for(const o of obstacles){
        rr(o.x,o.y,o.w,o.h,3,"#646d65");
      }

      label("훈련 구역",800,80);
      break;

    case "park":
      rect(0,450,WORLD_W,100,"#d2bc8d");
      rect(750,0,100,WORLD_H,"#d2bc8d");

      for(let i=0;i<35;i++){
        tree(70+(i*197)%1450,60+(i*137)%850);
      }

      circ(1100,300,95,"#2e85b8");
      circ(1100,300,75,"#4ab2d5");
      break;

    case "treasure":
      rect(0,0,WORLD_W,WORLD_H,"#c8b475");

      for(let i=0;i<25;i++){
        circ((i*197)%WORLD_W,(i*137)%WORLD_H,22,"#b3a05e");
      }

      rr(650,420,300,160,15,"#78502d");
      label("보물 상자",800,505,"#ffe5a1",30);

      for(let i=0;i<14;i++){
        label("💎",100+(i*107)%1400,100+(i*173)%800,"#fff",27);
      }
      break;

    case "police":
      rect(0,0,WORLD_W,WORLD_H,"#9cbbb9");
      building(150,120,500,600,"#536f83","경찰서");
      rr(800,150,620,480,10,"#cbd9d6");
      label("접수처",1100,220,"#314a49");
      rr(900,700,300,100,10,"#334c61");
      label("POLICE",1050,760);
      break;

    case "bank":
      rect(0,0,WORLD_W,WORLD_H,"#a2c3a1");
      building(300,130,1000,440,"#a5b3a3","은행");

      for(let i=0;i<6;i++){
        rr(300+i*170,700,130,110,8,"#4c6556");
      }

      label("금고 구역",800,875,"#254b30");
      break;

    case "fire":
      rect(0,0,WORLD_W,WORLD_H,"#b9a18a");
      building(260,100,1080,480,"#bd5946","소방서");

      for(let i=0;i<3;i++){
        rr(320+i*350,680,260,120,12,"#d94d39");
        rect(350+i*350,700,95,50,"#9dd9e9");
        circ(390+i*350,805,22,"#222");
        circ(520+i*350,805,22,"#222");
      }
      break;

    case "hospital":
      rect(0,0,WORLD_W,WORLD_H,"#c8e4dd");
      building(300,100,1000,530,"#dcece8","병원");
      rect(720,250,160,45,"#e64f5b");
      rect(778,192,45,160,"#e64f5b");

      for(let i=0;i<5;i++){
        rr(180+i*250,740,170,95,12,"#7da7a3");
      }
      break;

    case "library":
      rect(0,0,WORLD_W,WORLD_H,"#b9996c");

      for(let r=0;r<4;r++){
        for(let c=0;c<7;c++){
          const x=90+c*205,y=100+r*205;
          rr(x,y,170,150,5,"#69462f");

          for(let k=0;k<6;k++){
            rect(
              x+12+k*25,y+15,18,120,
              ["#d3a457","#9f4c3e","#4e8061","#526d9a"][k%4]
            );
          }
        }
      }
      break;

    case "store":
      rect(0,0,WORLD_W,WORLD_H,"#b7c5a3");
      rr(170,100,1260,800,12,"#eae4ce");
      rect(170,100,1260,120,"#e8b94c");
      label("편의점",800,180,"#40351e",35);

      for(let r=0;r<3;r++){
        for(let c=0;c<6;c++){
          const x=230+c*195,y=280+r*180;
          rr(x,y,150,115,5,"#9c7051");

          for(let k=0;k<4;k++){
            rect(
              x+12+k*32,y+15,22,80,
              ["#e15e50","#e6c451","#6bb7a0","#6994c4"][k]
            );
          }
        }
      }
      break;

    case "apartment":
      rect(0,0,WORLD_W,WORLD_H,"#9db29b");

      for(let i=0;i<5;i++){
        building(
          50+i*310,150,220,580,
          ["#a4babc","#8ca3b0","#c6b8a4"][i%3],
          "동 "+(i+1)
        );
      }

      rect(0,830,WORLD_W,60,"#66746a");
      break;

    case "beach":
      rect(0,0,WORLD_W,300,"#3ba6d0");
      rect(0,300,WORLD_W,150,"#bce9de");
      rect(0,450,WORLD_W,550,"#e8d19a");

      for(let i=0;i<7;i++){
        tree(100+i*220,600+(i%3)*80);
      }

      for(let i=0;i<12;i++){
        label("☀️",80+i*125,170+(i%3)*30,"#fff",24);
      }
      break;

    case "forest":
      rect(0,0,WORLD_W,WORLD_H,"#17412c");

      for(let i=0;i<100;i++){
        tree((i*191)%WORLD_W,(i*263)%WORLD_H);
      }

      rect(0,460,WORLD_W,80,"#b8a276");
      rect(760,0,80,WORLD_H,"#b8a276");
      break;

    case "snow":
      rect(0,0,WORLD_W,WORLD_H,"#dcebf0");

      for(let i=0;i<14;i++){
        building(40+i*110,200+(i%4)*80,85,130,"#8fb8c9");
      }

      for(let i=0;i<100;i++){
        circ((i*151)%WORLD_W,(i*191)%WORLD_H,2+i%3,"#fff");
      }

      rect(0,850,WORLD_W,150,"#f7ffff");
      break;

    case "volcano":
      rect(0,0,WORLD_W,WORLD_H,"#482c32");

      ctx.beginPath();
      ctx.moveTo(250,850);
      ctx.lineTo(800,120);
      ctx.lineTo(1350,850);
      ctx.closePath();
      ctx.fillStyle="#383238";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(690,300);
      ctx.lineTo(800,180);
      ctx.lineTo(910,300);
      ctx.closePath();
      ctx.fillStyle="#f07838";
      ctx.fill();

      line(800,300,800,850,"#e95435",30);

      for(const o of obstacles){
        rr(o.x,o.y,o.w,o.h,10,"#f07838");
      }
      break;

    case "mine":
      rect(0,0,WORLD_W,WORLD_H,"#403a36");

      for(let i=0;i<45;i++){
        const x=(i*137)%WORLD_W;
        const y=(i*211)%WORLD_H;

        circ(x,y,20+i%20,"#5e5650");

        if(i%4===0){
          label("💎",x,y,"#fff",22);
        }
      }

      line(0,500,WORLD_W,500,"#c19b64",28);

      for(let x=50;x<WORLD_W;x+=100){
        line(x,465,x,535,"#a47d4b",6);
      }
      break;

    case "ocean":
      rect(0,0,WORLD_W,WORLD_H,"#137ea6");

      for(let i=0;i<70;i++){
        ctx.beginPath();
        ctx.ellipse(
          (i*173)%WORLD_W,
          (i*197)%WORLD_H,
          28,8,0,0,Math.PI*2
        );
        ctx.strokeStyle="#8fe3eb88";
        ctx.lineWidth=3;
        ctx.stroke();
      }

      rr(400,260,800,430,35,"#63b9c2");

      for(let i=0;i<6;i++){
        rr(500+i*120,320,70,90,10,"#b7ece0");
      }

      for(let i=0;i<12;i++){
        label("🐠",(i*127)%WORLD_W,(i*183)%WORLD_H,"#fff",24);
      }
      break;

    case "amusement":
      rect(0,0,WORLD_W,WORLD_H,"#9fcb92");
      rect(0,430,WORLD_W,130,"#d4b98a");

      for(let i=0;i<8;i++){
        const x=100+i*200;

        circ(x,250,65,["#e45d66","#55b6df","#e7c44c","#ad86d5"][i%4]);
        circ(x,250,17,"#fff1c8");

        for(let k=0;k<8;k++){
          const a=k*Math.PI/4;
          circ(x+Math.cos(a)*48,250+Math.sin(a)*48,9,"#fff0bc");
        }
      }
      break;

    case "airport":
      rect(0,0,WORLD_W,WORLD_H,"#4d7e55");
      rect(100,80,1400,840,"#424a4a");

      for(let y=130;y<870;y+=100){
        rect(790,y,20,55,"#f4f1d9");
      }

      rr(250,170,400,170,12,"#b9c5c4");
      label("TERMINAL",450,265,"#33413e",28);

      for(let i=0;i<3;i++){
        const x=350+i*450;
        line(x-70,620,x+70,620,"#fff",5);
        line(x,550,x,690,"#fff",5);
      }
      break;

    case "station":
      rect(0,0,WORLD_W,WORLD_H,"#718e7d");
      rect(0,250,WORLD_W,500,"#494e4c");

      for(let y=330;y<700;y+=170){
        rect(0,y,WORLD_W,8,"#bab5a4");
      }

      for(let x=100;x<WORLD_W;x+=260){
        rect(x,180,12,650,"#6e6b60");
        rect(x-40,180,90,18,"#c1bba9");
      }

      rr(400,100,800,100,12,"#b5c7b9");
      label("기차역",800,160,"#264535",30);
      break;

    case "haunted":
      rect(0,0,WORLD_W,WORLD_H,"#211e31");
      building(180,250,330,430,"#42354e");
      building(630,160,330,520,"#30263f");
      building(1080,250,330,430,"#493348");

      for(let i=0;i<25;i++){
        circ((i*131)%WORLD_W,(i*179)%WORLD_H,3,"#c7b7e8");
      }

      label("유령의 집",800,820,"#d6c8f3",30);
      break;

    case "cave":
      rect(0,0,WORLD_W,WORLD_H,"#292f38");

      for(let i=0;i<40;i++){
        const x=(i*173)%WORLD_W;
        const y=(i*197)%WORLD_H;

        circ(x,y,30+i%35,"#434c57");

        if(i%4===0){
          label("💠",x,y,"#b5f5ff",23);
        }
      }

      line(0,500,WORLD_W,500,"#647483",22);
      break;

    case "desert":
      rect(0,0,WORLD_W,WORLD_H,"#d9bd76");

      for(let i=0;i<14;i++){
        ctx.beginPath();
        ctx.ellipse(
          (i*173)%WORLD_W,
          (i*211)%WORLD_H,
          120,35,0,0,Math.PI*2
        );
        ctx.fillStyle="#c7a65e";
        ctx.fill();
      }

      for(let i=0;i<8;i++){
        const x=100+i*200;
        const y=250+(i%3)*140;

        rect(x,y,22,110,"#3b7442");
        rect(x-35,y+25,40,18,"#3b7442");
        rect(x+15,y+50,35,18,"#3b7442");
      }

      circ(1250,750,65,"#36a9bd");
      label("오아시스",1250,840,"#755a2e",20);
      break;

    case "island":
      rect(0,0,WORLD_W,WORLD_H,"#1686a1");

      ctx.beginPath();
      ctx.ellipse(800,500,650,420,0,0,Math.PI*2);
      ctx.fillStyle="#d9c486";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(800,500,560,340,0,0,Math.PI*2);
      ctx.fillStyle="#4a9854";
      ctx.fill();

      for(let i=0;i<20;i++){
        tree(
          800+Math.cos(i*1.7)*400,
          500+Math.sin(i*1.7)*230
        );
      }
      break;

    case "garden":
      rect(0,0,WORLD_W,WORLD_H,"#418d4d");
      rect(0,440,WORLD_W,100,"#c7b58b");
      rect(750,0,100,WORLD_H,"#c7b58b");

      for(let i=0;i<40;i++){
        const x=100+(i*127)%1400;
        const y=70+(i*173)%850;

        circ(x,y,25,"#2f7541");
        circ(x-8,y-6,12,["#ed91c2","#e9d36b","#b9a0f1","#fff"][i%4]);
      }

      circ(1100,300,70,"#64b8d0");
      break;
  }

  // 맵의 바깥쪽 경계
  ctx.strokeStyle="#ffffff44";
  ctx.lineWidth=8;
  ctx.strokeRect(4,4,WORLD_W-8,WORLD_H-8);
}

function circleRect(x,y,r,o){
  const nx=Math.max(o.x,Math.min(x,o.x+o.w));
  const ny=Math.max(o.y,Math.min(y,o.y+o.h));

  return (x-nx)**2+(y-ny)**2<r*r;
}

function blocked(x,y){
  if(
    current.type==="maze"||
    current.type==="battle"||
    current.type==="mine"||
    current.type==="cave"||
    current.type==="volcano"
  ){
    return obstacles.some(o=>circleRect(x,y,18,o));
  }

  return false;
}

function drawPlayers(){
  for(const p of players){
    if(p.game!==current?.id)continue;

    const x=p.id===myId?me.x:p.x;
    const y=p.id===myId?me.y:p.y;

    if(!Number.isFinite(x)||!Number.isFinite(y))continue;

    ctx.globalAlpha=1;
    circ(x,y+7,15,"#0005");
    circ(x,y,18,p.id===myId?"#8affad":"#ffffff");
    circ(x,y,14,p.id===myId?"#267d4a":"#5c7f68");

    ctx.fillStyle="#fff";
    ctx.font="25px Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(p.avatar||"🧑",x,y);

    ctx.font="bold 16px Arial";
    ctx.textBaseline="alphabetic";
    ctx.lineWidth=4;
    ctx.strokeStyle="#10271c";
    ctx.strokeText(p.name||"플레이어",x,y-28);

    ctx.fillStyle="#fff";
    ctx.fillText(p.name||"플레이어",x,y-28);
  }

  ctx.globalAlpha=1;
}

function draw(){
  if(!current)return;

  const cw=canvas.clientWidth;
  const ch=canvas.clientHeight;

  if(!cw||!ch)return;

  const sx=canvas.width/cw;
  const sy=canvas.height/ch;

  ctx.setTransform(sx,0,0,sy,0,0);
  rect(0,0,cw,ch,"#152e20");

  // 가로와 세로의 비율을 동일하게 유지
  const scale=Math.min(cw/WORLD_W,ch/WORLD_H);
  const ox=(cw-WORLD_W*scale)/2;
  const oy=(ch-WORLD_H*scale)/2;

  const viewW=Math.min(WORLD_W,cw/scale);
  const viewH=Math.min(WORLD_H,ch/scale);

  const camX=Math.max(0,Math.min(WORLD_W-viewW,me.x-viewW/2));
  const camY=Math.max(0,Math.min(WORLD_H-viewH,me.y-viewH/2));

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox,oy,WORLD_W*scale,WORLD_H*scale);
  ctx.clip();

  ctx.translate(ox,oy);
  ctx.scale(scale,scale);
  ctx.translate(-camX,-camY);

  drawMap();

  if(current.type==="dodge"){
    const time=performance.now()/450;

    for(const o of obstacles){
      o.y=100+((time*35+o.phase*137)%760);
    }
  }

  if(current.type==="treasure"){
    for(let i=0;i<14;i++){
      const x=100+(i*107)%1400;
      const y=100+(i*173)%800;

      if(!oCollected.has(i)){
        label("💎",x,y,"#fff",27);
      }
    }
  }

  if(current.type==="maze"){
    rr(1430,850,100,90,8,"#f5d34b");
    label("EXIT",1480,905,"#493600",18);
  }

  drawPlayers();
  ctx.restore();

  if(current.type==="dodge"){
    const hit=obstacles.some(o=>circleRect(me.x,me.y,17,o));

    if(hit&&!gameOver){
      gameOver=true;
      $("topInfo").textContent="충돌! 다시 시작 버튼을 누르세요.";
      $("restartBtn").style.display="inline-block";
    }else if(!gameOver){
      $("topInfo").textContent=
        "자동차 피하기 · 생존 "+Math.floor(performance.now()/1000)+"초";
    }
  }

  if(current.type==="maze"&&Math.hypot(me.x-1480,me.y-895)<48){
    $("topInfo").textContent="미로 탈출 성공!";
  }

  if(current.type==="treasure"){
    for(let i=0;i<14;i++){
      const x=100+(i*107)%1400;
      const y=100+(i*173)%800;

      if(!oCollected.has(i)&&Math.hypot(me.x-x,me.y-y)<38){
        oCollected.add(i);
        progress++;
        $("topInfo").textContent="보석 "+progress+"개 수집";
      }
    }
  }
}

function addChat(name,avatar,message){
  const row=document.createElement("div");
  row.className="chatrow";

  const who=document.createElement("strong");
  who.textContent=(avatar||"🧑")+" "+(name||"플레이어")+": ";

  const body=document.createElement("span");
  body.textContent=message;

  row.append(who,body);
  $("chatMessages").appendChild(row);
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;

  while($("chatMessages").children.length>100){
    $("chatMessages").firstChild.remove();
  }
}

$("chatForm").onsubmit=e=>{
  e.preventDefault();

  const input=$("chatInput");
  const message=input.value.trim();

  if(!message||!current)return;

  send({type:"chat",message});
  input.value="";
};

window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();

  if(
    ["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)&&
    !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)
  ){
    e.preventDefault();
  }

  keys[k]=true;
});

window.addEventListener("keyup",e=>{
  keys[e.key.toLowerCase()]=false;
});

window.addEventListener("blur",()=>{
  keys={};
  joy={x:0,y:0};
  resetKnob();
});

const stick=$("stick");
const knob=$("knob");
let pointer=null;

function resetKnob(){
  knob.style.left="39px";
  knob.style.top="39px";
}

function moveStick(e){
  const r=stick.getBoundingClientRect();

  let dx=e.clientX-r.left-r.width/2;
  let dy=e.clientY-r.top-r.height/2;

  const len=Math.hypot(dx,dy)||1;
  const max=38;

  if(len>max){
    dx=dx/len*max;
    dy=dy/len*max;
  }

  joy={x:dx/max,y:dy/max};
  knob.style.left=(39+dx)+"px";
  knob.style.top=(39+dy)+"px";
}

stick.onpointerdown=e=>{
  pointer=e.pointerId;
  stick.setPointerCapture(pointer);
  moveStick(e);
};

stick.onpointermove=e=>{
  if(pointer===e.pointerId)moveStick(e);
};

function stopStick(e){
  if(pointer===e.pointerId){
    pointer=null;
    joy={x:0,y:0};
    resetKnob();
  }
}

stick.onpointerup=stopStick;
stick.onpointercancel=stopStick;

stick.onlostpointercapture=()=>{
  pointer=null;
  joy={x:0,y:0};
  resetKnob();
};

function loop(now){
  const dt=Math.min((now-lastTime)/16.67,2)||1;
  lastTime=now;

  if(current&&!gameOver){
    let dx=0,dy=0;

    if(keys.w||keys.arrowup)dy--;
    if(keys.s||keys.arrowdown)dy++;
    if(keys.a||keys.arrowleft)dx--;
    if(keys.d||keys.arrowright)dx++;

    dx+=joy.x;
    dy+=joy.y;

    const len=Math.hypot(dx,dy);

    if(len){
      dx/=len;
      dy/=len;

      const speed=current.type==="dodge"?4.3:5;

      const nx=Math.max(20,Math.min(WORLD_W-20,me.x+dx*speed*dt));
      const ny=Math.max(20,Math.min(WORLD_H-20,me.y+dy*speed*dt));

      if(!blocked(nx,me.y))me.x=nx;
      if(!blocked(me.x,ny))me.y=ny;
    }

    if(now-lastMove>60){
      send({type:"move",x:me.x,y:me.y});
      lastMove=now;
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

const server=http.createServer((req,res)=>{
  if(req.url==="/health"){
    res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end("ok");
  }

  res.writeHead(200,{
    "Content-Type":"text/html; charset=utf-8",
    "Cache-Control":"no-cache"
  });

  res.end(page.replace("__GAMES__",JSON.stringify(games)));
});

const wss=new WebSocket.Server({server});

wss.on("connection",ws=>{
  const id=Math.random().toString(36).slice(2)+Date.now().toString(36);

  sockets.set(id,ws);
  send(ws,{type:"welcome",id});

  ws.on("message",raw=>{
    let d;
    try{
      d=JSON.parse(raw.toString());
    }catch{
      return;
    }

    if(d.type==="join"){
      const game=games.find(g=>g.id===Number(d.game));
      if(!game)return;

      const name=uniqueName(d.name,id);
      const avatar=clean(d.avatar,8)||"🧑";

      players.set(id,{
        id,name,avatar,
        game:game.id,
        x:800,y:500
      });

      send(ws,{type:"joined",name});
      broadcast();
      return;
    }

    if(d.type==="leave"){
      players.delete(id);
      broadcast();
      return;
    }

    const p=players.get(id);

    if(d.type==="move"&&p){
      const x=Number(d.x);
      const y=Number(d.y);

      if(!Number.isFinite(x)||!Number.isFinite(y))return;

      p.x=Math.max(20,Math.min(W-20,x));
      p.y=Math.max(20,Math.min(H-20,y));

      broadcast();
      return;
    }

    if(d.type==="chat"&&p){
      const message=clean(d.message);
      if(!message)return;

      const packet={
        type:"chat",
        game:p.game,
        name:p.name,
        avatar:p.avatar,
        message
      };

      for(const [otherId,other] of players){
        if(other.game===p.game){
          send(sockets.get(otherId),packet);
        }
      }
    }
  });

  ws.on("close",()=>{
    players.delete(id);
    sockets.delete(id);
    broadcast();
  });

  ws.on("error",()=>{
    players.delete(id);
    sockets.delete(id);
    broadcast();
  });
});

server.listen(PORT,"0.0.0.0",()=>{
  console.log("Server running on "+PORT);
});