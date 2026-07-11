const tg=window.Telegram.WebApp;tg.expand();
const ADMIN_PASS="admin123";const COIN_VALUE=0.000025;const DAILY_LIMIT=100;const REWARD_PER_AD=2;
const MIN_WITHDRAW=100;const MIN_SWAP=200;const MINER_INTERVAL=36e5;const COOLDOWN_TIME=5e3;
const YOUR_TON_WALLET="UQCnRX9PZUv8GAyv4kz4OZ3u8r0vA-CcUu-lzunVsTNIo7sw";
const MINERS=[{id:0,name:"Starter Miner",cost:0,reward:28,icon:"🎁",roi:"Free",type:"starter",unlockAds:200},{id:1,name:"Miner Basic",cost:1,reward:139,icon:"⚡",roi:"150%"},{id:2,name:"Miner Pro",cost:3,reward:417,icon:"⚡",roi:"150%"},{id:3,name:"Miner Elite",cost:8,reward:1112,icon:"⚡",roi:"150%"},{id:4,name:"Miner Master",cost:15,reward:2084,icon:"👑",roi:"150%"},{id:5,name:"Miner God",cost:35,reward:4862,icon:"💎",roi:"150%"}];

// MIGRATION: Try to load old single-file data first
let coins=parseInt(localStorage.getItem('coins')||localStorage.getItem('adspayu_coins')||0);
let usdt=parseFloat(localStorage.getItem('usdt')||localStorage.getItem('adspayu_usdt')||50);
let gigaWatched=parseInt(localStorage.getItem('gigaWatched')||localStorage.getItem('adspayu_giga')||0);
let monetagWatched=parseInt(localStorage.getItem('monetagWatched')||localStorage.getItem('adspayu_monetag')||0);
let totalAdsWatched=parseInt(localStorage.getItem('totalAdsWatched')||localStorage.getItem('adspayu_totalAds')||0);
let lastAdTime=parseInt(localStorage.getItem('lastAdTime')||0);

let tonConnectUI,userWalletAddress=localStorage.getItem('walletAddress')||null,walletConnected=localStorage.getItem('walletConnected')==='true';
let pendingAdType=null,pendingMinerId=null,currentTonPrice=3.5;let minerData={};
MINERS.forEach(m=>{minerData[m.id]={owned:localStorage.getItem(`miner${m.id}_owned`)==='true',lastClaim:parseInt(localStorage.getItem(`miner${m.id}_lastClaim`)||0),adsWatched:parseInt(localStorage.getItem(`miner${m.id}_adsWatched`)||0)}});