const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};

const BOT_USERNAME = "AdsPayU_bot"; // <- YOUR BOT HERE
const SAVE_KEY=`minerads_save_${user.id}`;const YOUR_WALLET_ADDRESS="UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv",CLAIM_COOLDOWN=3600000,MAX_ADS_PER_DAY=50,AD_REWARD=.0002,REF_BONUS_TON=.001,REF_BONUS_MAD=100;const TONCENTER_API="https://toncenter.com/api/v2";let tonConnectUI=null,connectedWallet=null,depositInterval=null,processedTxs=JSON.parse(localStorage.getItem(`processed_txs_${user.id}`)||'[]');function getUTCTimestamp(){return Date.now()}let balance=10,madBalance=0,lastTick=getUTCTimestamp(),minerInstances=[],nextInstanceId=1,lastMinerClaim=0,lastMadClaim=0,adsWatchedToday=0,lastLoginDay=0,loginStreak=0,depositHistory=[],referredBy=null,myReferrals=[];

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

function addDeposit(amount,hash=""){
  depositHistory.unshift({amount:amount,time:getUTCTimestamp(),hash:hash});
  if(depositHistory.length>20) depositHistory=depositHistory.slice(0,20);
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
  updateBalance();saveGame();showPopup("success",`Day ${loginStreak} Bonus!`, `+${reward.mad} MAD ${reward.ton>0?`+ ${reward.ton} TON`:''}`);renderHome();
}

function canClaimDaily(){const today=Math.floor(getUTCTimestamp()/86400000);return lastLoginDay!==today;}
const tabs={home:renderHome,shop:renderShop,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile};
document.addEventListener("DOMContentLoaded",()=>{
  handleReferral();
  document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});
  loadGame();updateBalance();initTonConnect();
  document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");renderHome();
  setTimeout(()=>{if(typeof window.showGiga==="function")renderHome()},2000)
});

function getTotalRate(){return minerInstances.reduce((t,e)=>t+e.rate,0)}
function getTotalMadRate(){return minerInstances.reduce((t,e)=>t+e.madRate,0)}
function getTotalFarmed(){return minerInstances.reduce((t,e)=>t+e.farmed,0)}

function handleReferral(){
  const startParam = tg.initDataUnsafe.start_param;
  const claimed = localStorage.getItem(`claimed_ref_${user.id}`);
  if(startParam && startParam !== user.id.toString() && !claimed){
    balance += REF_BONUS_TON;
    madBalance += REF_BONUS_MAD;
    referredBy = startParam;
    localStorage.setItem(`claimed_ref_${user.id}`, startParam);
    addDeposit(REF_BONUS_TON);
    let inviterRefs = JSON.parse(localStorage.getItem(`refs_of_${startParam}`) || '[]');
    if(!inviterRefs.includes(user.id)){
      inviterRefs.push(user.id);
      localStorage.setItem(`refs_of_${startParam}`, JSON.stringify(inviterRefs));
    }
    saveGame();
    setTimeout(()=>showPopup("success","Welcome! 🎉",`+${REF_BONUS_TON} TON + ${REF_BONUS_MAD} MAD for joining!`),1000);
  }
}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10;madBalance=e.madBalance||0;minerInstances=e.minerInstances||[];nextInstanceId=e.nextInstanceId||1;lastMinerClaim=e.lastMinerClaim||0;lastMadClaim=e.lastMadClaim||0;adsWatchedToday=e.adsWatchedToday||0;lastLoginDay=e.lastLoginDay||0;loginStreak=e.loginStreak||0;depositHistory=e.depositHistory||[];referredBy=e.referredBy||null;minerInstances.forEach(t=>{const tmp=minerTemplates.find(m=>m.id===t.templateId);if(tmp)t.img=tmp.img});const i=(getUTCTimestamp()-lastTick)/1e3;minerInstances.forEach(t=>{t.farmed+=t.rate*i})}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,madBalance,lastTick:getUTCTimestamp(),minerInstances,nextInstanceId,lastMinerClaim,lastMadClaim,adsWatchedToday,lastLoginDay,loginStreak,depositHistory,referredBy}))}
function updateBalance(){const el=document.getElementById("balance");if(el)el.innerHTML=`${balance.toFixed(4)} TON<br><span style="font-size:12px;color:#F59E0B">${madBalance.toFixed(0)} MAD</span>`}
function formatTime(ms){if(ms<=0)return"CLAIM NOW";const s=Math.floor(ms/1000),m=Math.floor(s%3600/60),sec=s%60;return`WAIT ${m}m ${sec}s`}
function getClaimCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMinerClaim))}
function getMadCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMadClaim))}

async function claimMiner(){const i=getTotalFarmed();if(i<.000001)return showPopup("alert","Empty","No TON");await showRewardedAd();balance+=i;minerInstances.forEach(t=>t.farmed=0);lastMinerClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","Claimed",`+${i.toFixed(6)} TON`);renderHome()}
async function claimMad(){const i=getTotalMadRate();if(i<=0)return showPopup("alert","No Miners","Buy miners");await showRewardedAd();madBalance+=i;lastMadClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","MAD!",`+${i} MAD`);renderHome()}
async function watchAdTask(){if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Limit","50/50 today");await showRewardedAd();adsWatchedToday++;balance+=AD_REWARD;updateBalance();saveGame();showPopup("success","Earned",`+${AD_REWARD} TON`);renderTasks()}

function renderHome(){
  const c=document.getElementById("content");const t=getTotalRate(),e=getTotalFarmed(),mad=getTotalMadRate();const adsReady=typeof window.showGiga==="function";const dailyReady=canClaimDaily();const nextReward=DAILY_REWARDS[loginStreak>=7?0:loginStreak];
  let gridHTML='';DAILY_REWARDS.forEach((r,idx)=>{const dayNum=idx+1;let cls='';if(dayNum<loginStreak+1)cls='done';else if(dayNum===loginStreak+1&&dailyReady)cls='active';const icon=r.ton>0?'💎':'🪙';const amt=r.ton>0?r.ton:r.mad;const label=r.ton>0?'TON':'MAD';gridHTML+=`<div class="daily-item ${cls}"><div class="daily-icon">${icon}</div><div class="daily-amt">${amt}${label}</div></div>`;});
  c.innerHTML=`<div class="card"><h2>Welcome ${user.first_name}</h2><p>Keep mining to earn more</p></div>
  <div class="daily-card"><div class="daily-header"><h3>🎁 Daily Rewards</h3><div class="daily-streak">Day ${loginStreak}/7</div></div><div class="daily-grid">${gridHTML}</div><div class="daily-reward"><div class="daily-info"><p>Next Reward</p><b>${nextReward.mad} MAD ${nextReward.ton>0?`+ ${nextReward.ton} TON`:''}</b></div><button class="daily-btn" ${!adsReady||!dailyReady?"disabled":""} onclick="claimDailyLogin()">${!dailyReady?'Claimed':adsReady?'Watch Ad':'Loading...'}</button></div></div>
  <div class="card"><h3>⛏️ TON Mining</h3><p>Rate: <b>${(t*86400).toFixed(4)}/day</b></p><p>Farmed: <b id="farmedTotal">${e.toFixed(6)}</b></p><button class="btn" ${!adsReady?"disabled":""} onclick="claimMiner()">${adsReady?getClaimCooldownText():'LOADING ADS...'}</button></div>
  <div class="card"><h3>💎 MAD Mining</h3><p>Rate: <b>${mad}/hour</b></p><p>Balance: <b>${madBalance.toFixed(0)}</b></p><button class="btn" ${!adsReady?"disabled":""} onclick="claimMad()">${adsReady?getMadCooldownText():'LOADING ADS...'}</button></div>
  <div class="card"><h3>Your Miners</h3>${minerInstances.length?minerInstances.map(t=>`<div class="miner-unit"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h4>${t.name} #${t.instanceId}</h4><p>${(t.rate*86400).toFixed(4)}/d • ${t.madRate} MAD/h</p><p>Farmed: <span id="farmed-${t.instanceId}">${t.farmed.toFixed(6)}</span></p></div></div>`).join(""):'<p style="color:var(--muted)">No miners yet</p>'}<button class="btn" onclick="buyMiner(4)">Buy GPU Rig 10 TON</button></div>`
}

function renderShop(){const c=document.getElementById("content");c.innerHTML=`<h2>Shop</h2>${minerTemplates.map(t=>{const owned=minerInstances.filter(e=>e.templateId===t.id).length;const dayRate=(t.rate*86400).toFixed(4);const roi30=(t.cost*t.bonus*30 + t.cost).toFixed(4);const bonusPct=Math.round(t.bonus*100);return`<div class="miner-card"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h3>${t.name}</h3><p>${dayRate} TON/day • ${t.madRate} MAD/h</p><p>30d ROI: <b>${roi30} TON</b> +${bonusPct}%</p><p><b>${t.cost} TON</b> • Owned: ${owned}/3</p></div><button class="miner-buy" ${owned>=3?"disabled":""} onclick="buyMiner(${t.id})">${owned>=3?"MAX":"Buy"}</button></div>`}).join("")}`;}

function buyMiner(t){const e=minerTemplates.find(e=>e.id===t),i=minerInstances.filter(i=>i.templateId===t).length;if(i>=3)return showPopup("alert","Max","3 limit per type");if(balance<e.cost)return showPopup("error","No TON","Not enough");balance-=e.cost;minerInstances.push({instanceId:nextInstanceId++,templateId:e.id,name:e.name,rate:e.rate,bonus:e.bonus,madRate:e.madRate,img:e.img,farmed:0});updateBalance();saveGame();showPopup("success","Bought",`${e.name} for ${e.cost} TON`);renderShop();renderHome()}
function renderTasks(){const adsReady=typeof window.showGiga==="function";document.getElementById("content").innerHTML=`<h2>Tasks</h2><div class="card"><h3>📺 Watch Ads</h3><p>Earn <b>${AD_REWARD} TON</b> per ad</p><p>${adsWatchedToday}/${MAX_ADS_PER_DAY}</p><button class="btn" ${!adsReady?"disabled":""} onclick="watchAdTask()">${adsReady?`WATCH +${AD_REWARD} TON`:'LOADING ADS...'}</button></div>`}

async function connectWallet(){if(!tonConnectUI)return showPopup("error","Error","SDK loading...");await tonConnectUI.openModal();}
async function disconnectWallet(){if(tonConnectUI){await tonConnectUI.disconnect();connectedWallet=null;if(depositInterval) clearInterval(depositInterval);renderWallet();}}
async function checkDeposits(){if(!connectedWallet) return;try{const res=await fetch(`${TONCENTER_API}/getTransactions?address=${YOUR_WALLET_ADDRESS}&limit=10`);const data=await res.json();if(!data.result) return;for(const tx of data.result){const hash=tx.transaction_id.hash;if(processedTxs.includes(hash)) continue;const amount=tx.in_msg.value/1000000;if(amount>0.001){processedTxs.push(hash);localStorage.setItem(`processed_txs_${user.id}`,JSON.stringify(processedTxs));balance+=amount;addDeposit(amount,hash);updateBalance();saveGame();showPopup("success","Deposit Received!",`+${amount.toFixed(4)} TON`);if(document.querySelector('.tabbar button[data-tab="wallet"]').classList.contains("active")){renderWallet();}}}}catch(e){console.log(e)}}
async function depositTON(){if(!connectedWallet)return showPopup("error","Connect First","Connect wallet first");const amount=prompt("How much TON to deposit?","1");if(!amount)return;await tonConnectUI.sendTransaction({validUntil:Math.floor(Date.now()/1000)+300,messages:[{address:YOUR_WALLET_ADDRESS,amount:(parseFloat(amount)*1000000000).toString()}]});showPopup("info","Sent","Waiting for confirmation ~10s");}

function renderWallet(){
  const c=document.getElementById("content");
  const isConnected=!!connectedWallet;
  const walletAddr=isConnected?`${connectedWallet.account.address.slice(0,4)}...${connectedWallet.account.address.slice(-4)}`:"Connect Wallet";
  
  let depositHTML = '<p style="color:var(--muted)">No deposits yet</p>';
  if(depositHistory.length>0){
    depositHTML = depositHistory.slice(0,10).map(tx=>{
      const date=new Date(tx.time).toLocaleDateString();
      const time=new Date(tx.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      return`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#0A0D14;border-radius:10px;margin-bottom:8px">
        <div><div style="font-size:14px">📥 Wallet Deposit</div><div style="font-size:11px;color:var(--muted)">${date} ${time}</div></div>
        <div style="font-weight:700;color:#22C55E">+${tx.amount.toFixed(4)} TON</div>
      </div>`
    }).join("");
  }
  
  c.innerHTML=`<h2>Wallet</h2>
  <div class="card"><h3>💰 Game Balance</h3><p style="font-size:20px">${balance.toFixed(4)} TON</p><p style="color:var(--gold)">${madBalance.toFixed(0)} MAD</p></div>
  <div class="card"><button class="btn" style="width:100%" onclick="${isConnected?'disconnectWallet()':'connectWallet()'}">${walletAddr}</button></div>
  <div class="card"><h3>📥 Deposit TON</h3><p style="word-break:break-all;font-size:11px;background:#0f131a;padding:8px;border-radius:8px">${YOUR_WALLET_ADDRESS}</p><button class="btn" onclick="depositTON()" ${!isConnected?"disabled":""}>📥 Deposit TON</button></div>
  <div class="card"><h3>📜 Deposit History</h3>${depositHTML}</div>`;
}

// REFERRAL TAB WITH YOUR BOT
function renderReferral(){
  myReferrals = JSON.parse(localStorage.getItem(`refs_of_${user.id}`) || '[]');
  const earned = myReferrals.length * REF_BONUS_TON;
  const link = `https://t.me/${BOT_USERNAME}?start=${user.id}`;
  
  document.getElementById("content").innerHTML=`<h2>👥 Referral</h2>
  <div class="card"><h3>Invite Friends</h3><p>Earn <b>${REF_BONUS_TON} TON + ${REF_BONUS_MAD} MAD</b> per friend!</p>
  <div style="background:#0A0D14;padding:12px;border-radius:10px;margin:10px 0"><p style="font-size:12px;color:var(--muted)">Your Link:</p><p style="word-break:break-all;font-size:13px">${link}</p></div>
  <button class="btn" onclick="navigator.clipboard.writeText('${link}');showPopup('success','Copied!','Link copied')">📋 Copy Link</button></div>
  
  <div class="card"><h3>Your Stats</h3><p>👥 Invited: <b>${myReferrals.length}</b></p><p>💰 Earned: <b>${earned.toFixed(4)} TON</b></p></div>
  
  <div class="card"><h3>How it works</h3><p style="font-size:13px;color:var(--muted)">1. Share your link<br>2. Friend joins @${BOT_USERNAME}<br>3. Both get instant bonus</p></div>`;
}

function renderProfile(){document.getElementById("content").innerHTML=`<h2>Profile</h2><div class="card"><p>Name: ${user.first_name}</p><p>Streak: Day ${loginStreak}/7</p><p>TON: ${balance.toFixed(4)}</p><p>MAD: ${madBalance.toFixed(0)}</p>${referredBy?`<p>Invited by: ${referredBy}</p>`:''}</div>`}

setInterval(()=>{const t=getUTCTimestamp(),e=(t-lastTick)/1e3;lastTick=t;minerInstances.forEach(i=>{i.farmed+=i.rate*e});const i=document.getElementById("farmedTotal");i&&(i.innerText=getTotalFarmed().toFixed(6))},1000);
setInterval(saveGame,10000);