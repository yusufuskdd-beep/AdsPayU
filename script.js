const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};const SAVE_KEY=`minerads_save_${user.id}`;const YOUR_WALLET_ADDRESS="UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv",CLAIM_COOLDOWN=3600000,MAX_ADS_PER_DAY=50,AD_REWARD=.0002;const TONCENTER_API="https://toncenter.com/api/v2";let tonConnectUI=null,connectedWallet=null,depositInterval=null,processedTxs=JSON.parse(localStorage.getItem(`processed_txs_${user.id}`)||'[]');function getUTCTimestamp(){return Date.now()}let balance=10,madBalance=0,lastTick=getUTCTimestamp(),minerInstances=[],nextInstanceId=1,lastMinerClaim=0,lastMadClaim=0,adsWatchedToday=0,lastLoginDay=0,loginStreak=0,txHistory=[];

const minerTemplates=[
  {id:1,name:"Micro Miner",cost:1,bonus:.05,rate:1*0.05/30/86400,madRate:5,img:"micro.png"},
  {id:2,name:"Basic Miner",cost:3,bonus:.07,rate:3*0.07/30/86400,madRate:20,img:"basic.png"},
  {id:3,name:"Pro Miner",cost:5,bonus:.1,rate:5*0.1/30/86400,madRate:50,img:"pro.png"},
  {id:4,name:"GPU Rig",cost:10,bonus:.15,rate:10*0.15/30/86400,madRate:100,img:"gpu.png"},
  {id:5,name:"ASIC Farm",cost:25,bonus:.18,rate:25*0.18/30/86400,madRate:300,img:"asic.png"},
  {id:6,name:"Quantum Miner",cost:50,bonus:.18,rate:50*0.18/30/86400,madRate:1000,img:"quantum.png"}
];

const DAILY_REWARDS=[
  {day:1,mad:5,ton:0},{day:2,mad:10,ton:0},{day:3,mad:20,ton:0},{day:4,mad:30,ton:0},
  {day:5,mad:40,ton:0},{day:6,mad:50,ton:0},{day:7,mad:80,ton:.01}
];

function showPopup(t,e,i){tg.showPopup({title:e,message:i,buttons:[{type:"ok"}]})}
function showRewardedAd(){return new Promise((res,rej)=>{
  if(typeof window.showGiga!=="function"){showPopup("error","Ad Error","GigaPub not loaded. Refresh app");rej();return}
  window.showGiga().then(()=>{res()}).catch(e=>{showPopup("error","Ad Failed","No ads available. Try in 30s");rej(e)})
})}
function initTonConnect(){try{tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:"https://adspayu.vercel.app/tonconnect-manifest.json"});tonConnectUI.onStatusChange(wallet=>{connectedWallet=wallet;if(wallet){checkDeposits();if(depositInterval) clearInterval(depositInterval);depositInterval=setInterval(checkDeposits,10000);}else{if(depositInterval) clearInterval(depositInterval);}});}catch(e){console.log("TonConnect error",e)}}

// ADD TX TO HISTORY
function addTx(type,amount,currency,note=""){
  txHistory.unshift({
    id:Date.now(),
    type:type, // deposit, claim_ton, claim_mad, buy, ad
    amount:amount,
    currency:currency, // TON or MAD
    note:note,
    time:getUTCTimestamp()
  });
  if(txHistory.length>50) txHistory=txHistory.slice(0,50); // keep last 50
}

async function claimDailyLogin(){
  const today=Math.floor(getUTCTimestamp()/86400000);
  if(lastLoginDay===today)return showPopup("alert","Already Claimed","Come back tomorrow");
  await showRewardedAd();
  if(lastLoginDay===today-1){loginStreak++;}else{loginStreak=1;}
  if(loginStreak>7)loginStreak=1;
  lastLoginDay=today;
  const reward=DAILY_REWARDS[loginStreak-1];
  madBalance+=reward.mad;
  balance+=reward.ton;
  if(reward.mad>0) addTx('daily',reward.mad,'MAD',`Day ${loginStreak}`);
  if(reward.ton>0) addTx('daily',reward.ton,'TON',`Day ${loginStreak}`);
  updateBalance();saveGame();showPopup("success",`Day ${loginStreak} Bonus!`, `+${reward.mad} MAD ${reward.ton>0?`+ ${reward.ton} TON`:''}`);renderHome();
}

function canClaimDaily(){const today=Math.floor(getUTCTimestamp()/86400000);return lastLoginDay!==today;}
const tabs={home:renderHome,shop:renderShop,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile};
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});
  loadGame();updateBalance();initTonConnect();
  document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");renderHome();
  setTimeout(()=>{if(typeof window.showGiga==="function")renderHome()},2000)
});

function getTotalRate(){return minerInstances.reduce((t,e)=>t+e.rate,0)}
function getTotalMadRate(){return minerInstances.reduce((t,e)=>t+e.madRate,0)}
function getTotalFarmed(){return minerInstances.reduce((t,e)=>t+e.farmed,0)}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10;madBalance=e.madBalance||0;minerInstances=e.minerInstances||[];nextInstanceId=e.nextInstanceId||1;lastMinerClaim=e.lastMinerClaim||0;lastMadClaim=e.lastMadClaim||0;adsWatchedToday=e.adsWatchedToday||0;lastLoginDay=e.lastLoginDay||0;loginStreak=e.loginStreak||0;txHistory=e.txHistory||[];minerInstances.forEach(t=>{const tmp=minerTemplates.find(m=>m.id===t.templateId);if(tmp)t.img=tmp.img});const i=(getUTCTimestamp()-lastTick)/1e3;minerInstances.forEach(t=>{t.farmed+=t.rate*i})}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,madBalance,lastTick:getUTCTimestamp(),minerInstances,nextInstanceId,lastMinerClaim,lastMadClaim,adsWatchedToday,lastLoginDay,loginStreak,txHistory}))}
function updateBalance(){const el=document.getElementById("balance");if(el)el.innerHTML=`${balance.toFixed(4)} TON<br><span style="font-size:12px;color:#F59E0B">${madBalance.toFixed(0)} MAD</span>`}
function formatTime(ms){if(ms<=0)return"CLAIM NOW";const s=Math.floor(ms/1000),m=Math.floor(s%3600/60),sec=s%60;return`WAIT ${m}m ${sec}s`}
function getClaimCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMinerClaim))}
function getMadCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMadClaim))}

async function claimMiner(){const i=getTotalFarmed();if(i<.000001)return showPopup("alert","Empty","No TON");await showRewardedAd();balance+=i;addTx('claim_ton',i,'TON','Mining Claim');minerInstances.forEach(t=>t.farmed=0);lastMinerClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","Claimed",`+${i.toFixed(6)} TON`);renderHome()}
async function claimMad(){const i=getTotalMadRate();if(i<=0)return showPopup("alert","No Miners","Buy miners");await showRewardedAd();madBalance+=i;addTx('claim_mad',i,'MAD','MAD Claim');lastMadClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","MAD!",`+${i} MAD`);renderHome()}
async function watchAdTask(){if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Limit","50/50 today");await showRewardedAd();adsWatchedToday++;balance+=AD_REWARD;addTx('ad',AD_REWARD,'TON','Watch Ad');updateBalance();saveGame();showPopup("success","Earned",`+${AD_REWARD} TON`);renderTasks()}

function renderHome(){
  const c=document.getElementById("content");const t=getTotalRate(),e=getTotalFarmed(),mad=getTotalMadRate();const adsReady=typeof window.showGiga==="function";const dailyReady=canClaimDaily();const nextReward=DAILY_REWARDS[loginStreak>=7?0:loginStreak];
  let gridHTML='';DAILY_REWARDS.forEach((r,idx)=>{const dayNum=idx+1;let cls='';if(dayNum<loginStreak+1)cls='done';else if(dayNum===loginStreak+1&&dailyReady)cls='active';const icon=r.ton>0?'💎':'🪙