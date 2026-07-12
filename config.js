const tg=window.Telegram.WebApp;tg.expand();
const ADMIN_PASS="admin123";
const COIN_VALUE=0.000025;
const DAILY_LIMIT=100;
const REWARD_PER_AD=10; // CHANGED: Must match backend. Backend gives 10 APU
const MIN_WITHDRAW=100;
const MIN_SWAP=200;
const MINER_INTERVAL=36e5;
const COOLDOWN_TIME=5e3;
const YOUR_TON_WALLET="UQCnRX9PZUv8GAyv4kz4OZ3u8r0vA-CcUu-lzunVsTNIo7sw";
const BACKEND_URL = "https://adspayu-backend-5y7g.onrender.com"; // ADDED
const USER_ID = localStorage.getItem('userId') || 'user_' + Date.now(); // ADDED
localStorage.setItem('userId', USER_ID);

const MINERS=[{id:0,name:"Starter Miner",cost:0,reward:28,icon:"🎁",roi:"Free",type:"starter",unlockAds:200},{id:1,name:"Miner Basic",cost:1,reward:139,icon:"⚡",roi:"150%"},{id:2,name:"Miner Pro",cost:3,reward:417,icon:"⚡",roi:"150%"},{id:3,name:"Miner Elite",cost:8,reward:1112,icon:"⚡",roi:"150%"},{id:4,name:"Miner Master",cost:15,reward:2084,icon:"👑",roi:"150%"},{id:5,name:"Miner God",cost:35,reward:4862,icon:"💎",roi:"150%"}];

// MIGRATION: We only load counters from localStorage now. Coins come from server
let coins=0; // CHANGED: will be loaded from backend in app.js
let usdt=0;  // CHANGED: will be loaded from backend in app.js
let gigaWatched=parseInt(localStorage.getItem('gigaWatched')||0);
let monetagWatched=parseInt(localStorage.getItem('monetagWatched')||0);
let totalAdsWatched=parseInt(localStorage.getItem('totalAdsWatched')||0);
let lastAdTime=parseInt(localStorage.getItem('lastAdTime')||0);

let tonConnectUI,userWalletAddress=localStorage.getItem('walletAddress')||null,walletConnected=localStorage.getItem('walletConnected')==='true';
let pendingAdType=null,pendingMinerId=null,currentTonPrice=3.5;
let minerData={};
MINERS.forEach(m=>{
  minerData[m.id]={
    owned:localStorage.getItem(`miner${m.id}_owned`)==='true',
    lastClaim:parseInt(localStorage.getItem(`miner${m.id}_lastClaim`)||0),
    adsWatched:parseInt(localStorage.getItem(`miner${m.id}_adsWatched`)||0)
  }
});