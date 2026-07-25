const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};const SAVE_KEY=`minerads_save_${user.id}`;const YOUR_WALLET_ADDRESS="UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv",CLAIM_COOLDOWN=3600000,MAX_ADS_PER_DAY=50,AD_REWARD=.002;const TONCENTER_API="https://toncenter.com/api/v2";let gigaReady=false,connectedWallet=null,lastTxHash=null,depositInterval=null;function getUTCTimestamp(){return Date.now()}function getUTCDateString(t){const e=new Date(t);return`${e.getUTCFullYear()}-${e.getUTCMonth()+1}-${e.getUTCDate()}`}let balance=10,madBalance=0,lastTick=getUTCTimestamp(),minerInstances=[],nextInstanceId=1,lastDailyClaim=0,dailyStreak=0,lastMinerClaim=0,lastMadClaim=0,adsWatchedToday=0,lastAdResetDate="";

const minerTemplates=[
  {id:1,name:"Micro Miner",cost:1,bonus:.05,rate:1*0.05/30/86400,madRate:5,img:"micro.png"},
  {id:2,name:"Basic Miner",cost:3,bonus:.07,rate:3*0.07/30/86400,madRate:20,img:"basic.png"},
  {id:3,name:"Pro Miner",cost:5,bonus:.1,rate:5*0.1/30/86400,madRate:50,img:"pro.png"},
  {id:4,name:"GPU Rig",cost:10,bonus:.15,rate:10*0.15/30/86400,madRate:100,img:"gpu.png"},
  {id:5,name:"ASIC Farm",cost:25,bonus:.18,rate:25*0.18/30/86400,madRate:300,img:"asic.png"},
  {id:6,name:"Quantum Miner",cost:50,bonus:.18,rate:50*0.18/30/86400,madRate:1000,img:"quantum.png"}
];

function showPopup(t,e,i){tg.showPopup({title:e,message:i,buttons:[{type:"ok"}]})}
function showRewardedAd(){return new Promise((res,rej)=>{if(typeof window.showGiga!=="function"){showPopup("error","Ad Error","GigaPub loading...");rej();return}window.showGiga().then(res).catch(rej)})}

// TONCONNECT UI V2
let tonConnectUI=null;
try{
  tonConnectUI=new TON_CONNECT_UI.TonConnectUI({
    manifestUrl:"https://adspayu.vercel.app/tonconnect-manifest.json"
  });
  tonConnectUI.onStatusChange(wallet=>{
    connectedWallet=wallet;
    renderWallet();
    if(wallet){
      checkDeposits();
      if(depositInterval) clearInterval(depositInterval);
      depositInterval=setInterval(checkDeposits,10000);
    }else{
      if(depositInterval) clearInterval(depositInterval);
    }
  })
}catch(e){console.log("TON Connect Error:",e)}

const tabs={home:renderHome,shop:renderShop,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile};
document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});loadGame();updateBalance();renderHome();document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");setTimeout(()=>{gigaReady=typeof window.showGiga==="function";renderHome()},2000)});

function getTotalRate(){return minerInstances.reduce((t,e)=>t+e.rate,0)}function getTotalMadRate(){return minerInstances.reduce((t,e)=>t+e.madRate,0)}function getTotalFarmed(){return minerInstances.reduce((t,e)=>t+e.farmed,0)}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10;madBalance=e.madBalance||0;minerInstances=e.minerInstances||[];nextInstanceId=e.nextInstanceId||1;lastMinerClaim=e.lastMinerClaim||0;lastMadClaim=e.lastMadClaim||0;adsWatchedToday=e.adsWatchedToday||0;minerInstances.forEach(t=>{const tmp=minerTemplates.find(m=>m.id===t.templateId);if(tmp)t.img=tmp.img});const i=(getUTCTimestamp()-lastTick)/1e3;minerInstances.forEach(t=>{t.farmed+=t.rate*i})}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,madBalance,lastTick:getUTCTimestamp(),minerInstances,nextInstanceId,lastMinerClaim,lastMadClaim,adsWatchedToday}))}
function updateBalance(){document.getElementById("balance").innerHTML=`${balance.toFixed(4)} TON<br><span style="font-size:12px;color:#F59E0B">${madBalance.toFixed(0)} MAD</span>`}
function getDailyReward(){return Math.min(.001+dailyStreak*.007,.05)}
function claimDaily(){const n=getDailyReward();balance+=n;dailyStreak++;updateBalance();saveGame();showPopup("success","Daily!",`+${n.toFixed(4)} TON`);renderHome()}
async function claimMiner(){const i=getTotalFarmed();if(i<.000001)return showPopup("alert","Empty","No TON");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();balance+=i;minerInstances.forEach(t=>t.farmed=0);lastMinerClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","Claimed",`+${i.toFixed(6)} TON`);renderHome()}
async function claimMad(){const i=getTotalMadRate();if(i<=0)return showPopup("alert","No Miners","Buy miners");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();madBalance+=i;lastMadClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","MAD!",`+${i} MAD`);renderHome()}
async function watchAdTask(){if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Limit","50/50 today");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();adsWatchedToday++;balance+=AD_REWARD;updateBalance();saveGame();showPopup("success","Earned",`+${AD_REWARD} TON`);renderTasks()}
function formatTime(ms){if(ms<=0)return"CLAIM NOW";const s=Math.floor(ms/1000),m=Math.floor(s%3600/60),sec=s%60;return`WAIT ${m}m ${sec}s`}
function getClaimCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMinerClaim))}
function getMadCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMadClaim))}

function renderHome(){const c=document.getElementById("content");const t=getTotalRate(),e=getTotalFarmed(),mad=getTotalMadRate();c.innerHTML=`<div class="card"><h2>Welcome ${user.first_name}</h2><p>ROI 5%-18% + MAD</p></div><div class="card"><h3>⛏️ TON Mining</h3><p>Rate: <b>${(t*86400).toFixed(4)}/day</b></p><p>Farmed: <b id="farmedTotal">${e.toFixed(6)}</b></p><div class="progress"><div class="progress-bar" style="width:100%"></div></div><button class="btn" id="claimBtn" ${!gigaReady?"disabled":""} onclick="claimMiner()">${gigaReady?getClaimCooldownText():'LOADING ADS...'}</button></div><div class="card"><h3>💎 MAD Mining</h3><p>Rate: <b>${mad}/hour</b></p><p>Balance: <b>${madBalance.toFixed(0)}</b></p><button class="btn" id="claimMadBtn" ${!gigaReady?"disabled":""} onclick="claimMad()">${gigaReady?getMadCooldownText():'LOADING ADS...'}</button></div><div class="card"><h3>Your Miners</h3>${minerInstances.length?minerInstances.map(t=>`<div class="miner-unit"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h4>${t.name} #${t.instanceId}</h4><p>${(t.rate*86400).toFixed(4)}/d • ${t.madRate} MAD/h • +${(t.bonus*100).toFixed(0)}%</p><p>Farmed: <span id="farmed-${t.instanceId}">${t.farmed.toFixed(6)}</span></p></div></div>`).join(""):'<p style="color:var(--muted)">No miners yet. Buy one from Shop!</p>'}<button class="btn" onclick="buyMiner(4)">Buy GPU Rig 10 TON</button></div>`}

function renderShop(){const c=document.getElementById("content");if(!c)return;c.innerHTML=`<h2>Shop</h2>${minerTemplates.map(t=>{const owned=minerInstances.filter(e=>e.templateId===t.id).length,roi=(t.cost*(1+t.bonus)).toFixed(4),disabled=owned>=3?"disabled":"";return`<div class="card miner"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h3>${t.name}</h3><p>${(t.rate*86400).toFixed(4)} TON/day • ${t.madRate} MAD/h</p><p>30d ROI: <b>${roi} TON</b> +${(t.bonus*100).toFixed(0)}%</p><p><b>${t.cost} TON</b> • Owned: ${owned}/3</p></div><button class="btn" style="width:90px" ${disabled} onclick="buyMiner(${t.id})">${disabled?"MAX":"Buy"}</button></div>`}).join("")}`}

function buyMiner(t){const e=minerTemplates.find(e=>e.id===t),i=minerInstances.filter(i=>i.templateId===t).length;if(i>=3)return showPopup("alert","Max","3 limit per type");if(balance<e.cost)return showPopup("error","No TON","Not enough");balance-=e.cost;minerInstances.push({instanceId:nextInstanceId++,templateId:e.id,name:e.name,rate:e.rate,bonus:e.bonus,madRate:e.madRate,img:e.img,farmed:0});updateBalance();saveGame();showPopup("success","Bought",`${e.name} for ${e.cost} TON`);renderShop();renderHome()}
function renderTasks(){document.getElementById("content").innerHTML=`<h2>Tasks</h2><div class="card"><h3>📺 Watch Ads</h3><p>Earn <b>${AD_REWARD} TON</b> per ad</p><p>${adsWatchedToday}/${MAX_ADS_PER_DAY}</p><button class="btn" ${!gigaReady?"disabled":""} onclick="watchAdTask()">${gigaReady?`WATCH +${AD_REWARD} TON`:'LOADING ADS...'}</button></div>`}

async function connectWallet(){
  if(tonConnectUI){
    await tonConnectUI.connectWallet();
  }
}

async function disconnectWallet(){
  if(tonConnectUI){
    await tonConnectUI.disconnect();
    connectedWallet=null;
    if(depositInterval) clearInterval(depositInterval);
    renderWallet();
  }
}

function copyAddress(){
  if(connectedWallet){
    navigator.clipboard.writeText(connectedWallet.account.address);
    showPopup("success","Copied","Address copied");
  }
}

function copyDepositAddress(){
  navigator.clipboard.writeText(YOUR_WALLET_ADDRESS);
  showPopup("success","Copied","Deposit address copied");
}

async function checkDeposits(){
  if(!connectedWallet) return;
  try{
    const res = await fetch(`${TONCENTER_API}/getTransactions?address=${YOUR_WALLET_ADDRESS}&limit=5`);
    const data = await res.json();
    if(!data.result || data.result.length===0) return;

    const latestTx = data.result[0];
    if(latestTx.transaction_id.hash === lastTxHash) return;
    lastTxHash = latestTx.transaction_id.hash;

    const amount = latestTx.in_msg.value / 1000000000; // 9 decimals to TON
    if(amount > 0.001){
      balance += amount;
      updateBalance();
      saveGame();
      showPopup("success","Deposit Received!",`+${amount.toFixed(4)} TON added`);
      renderWallet();
    }
  }catch(e){console.log("Deposit check error",e)}
}

async function depositTON(){
  if(!connectedWallet)return showPopup("error","Connect First","Connect wallet first");
  showPopup("info","Deposit","Send TON to the address below. It will auto-detect in ~10s");
}

async function withdrawTON(){
  if(!connectedWallet)return showPopup("error","Connect First","Connect wallet first");
  const amount=prompt(`Withdraw TON\nYour Balance: ${balance.toFixed(4)} TON\nMin: 1 TON\nEnter amount:`,`1`);
  if(!amount||isNaN(amount))return;
  const withdrawAmount=parseFloat(amount);
  if(withdrawAmount<1)return showPopup("error","Min Withdraw","Minimum 1 TON");
  if(withdrawAmount>balance)return showPopup("error","No Balance","Not enough TON");

  const transaction={
    validUntil:Math.floor(getUTCTimestamp()/1000)+300,
    messages:[{
      address:connectedWallet.account.address,
      amount:(withdrawAmount*1000000000).toString()
    }]
  };
  try{
    await tonConnectUI.sendTransaction(transaction);
    balance-=withdrawAmount;
    updateBalance();
    saveGame();
    showPopup("success","Withdraw Sent",`${withdrawAmount} TON sent to your wallet`);
    renderWallet();
  }catch(e){showPopup("error","Cancelled","Withdraw cancelled")}
}

function showWalletMenu(){
  const menu=document.getElementById("wallet-menu");
  menu.style.display = menu.style.display==='none'?'block':'none';
}

function renderWallet(){
  const c=document.getElementById("content");if(!c)return;
  const isConnected=!!connectedWallet;
  const walletAddr=isConnected?`${connectedWallet.account.address.slice(0,4)}...${connectedWallet.account.address.slice(-4)}`:"Connect Wallet";

  c.innerHTML=`<h2>Wallet</h2>
  <div class="card">
    <h3>💰 Game Balance</h3>
    <p style="font-size:20px;font-weight:800">${balance.toFixed(4)} TON</p>
    <p style="font-size:16px;color:var(--gold)">${madBalance.toFixed(0)} MAD</p>
  </div>
  <div class="card" style="background:#1a1f2e;border:1px solid #2a3142">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">💎</span>
        <div>
          <h3 style="margin:0">TON Wallet</h3>
          <p style="margin:0;font-size:11px;color:var(--muted)">${isConnected?'Wallet connected. Auto-deposit active':'Not connected'}</p>
        </div>
      </div>
      <button onclick="${isConnected?'showWalletMenu()':'connectWallet()'}" style="background:#fff;color:#000;border:none;border-radius:20px;padding:8px 16px;font-weight:600;cursor:pointer">
        ${walletAddr} ${isConnected?'▼':''}
      </button>
    </div>
    <div id="wallet-menu" style="display:none;margin-top:10px;background:#0f131a;border-radius:12px;padding:8px">
      <div onclick="copyAddress()" style="padding:10px;cursor:pointer;display:flex;gap:8px">📋 Copy address</div>
      <div onclick="disconnectWallet()" style="padding:10px;cursor:pointer;display:flex;gap:8px">↗ Disconnect</div>
    </div>
  </div>
  <div class="card">
    <h3>📥 Deposit TON</h3>
    <p style="font-size:11px;color:var(--muted)">Send to this address. Auto-detects in ~10s</p>
    <p style="word-break:break-all;background:#0f131a;padding:8px;border-radius:8px;font-size:11px">${YOUR_WALLET_ADDRESS}</p>
    <button class="btn" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)" onclick="copyDepositAddress()">Copy Address</button>
  </div>
  <div class="card">
    <h3>📤 Withdraw TON</h3>
    <button class="btn" style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%)" onclick="withdrawTON()" ${!isConnected?"disabled":""}>📤 Withdraw TON</button>
    <p style="font-size:11px;color:var(--muted);margin-top:8px">Min: 1 TON • Sends to connected wallet</p>
  </div>`;
}

function renderReferral(){document.getElementById("content").innerHTML=`<h2>Referral</h2><div class="card"><p>Your Link:</p><p style="word-break:break-all">https://t.me/AdsPayU_bot?start=${user.id}</p></div>`}
function renderProfile(){document.getElementById("content").innerHTML=`<h2>Profile</h2><div class="card"><p>Name: ${user.first_name}</p><p>TON: ${balance.toFixed(4)}</p><p>MAD: ${madBalance.toFixed(0)}</p></div>`}

setInterval(()=>{const t=getUTCTimestamp(),e=(t-lastTick)/1e3;lastTick=t;minerInstances.forEach(i=>{i.farmed+=i.rate*e});const i=document.getElementById("farmedTotal");i&&(i.innerText=getTotalFarmed().toFixed(6));minerInstances.forEach(t=>{const e=document.getElementById(`farmed-${t.instanceId}`);e&&(e.innerText=t.farmed.toFixed(6))})},1000);
setInterval(saveGame,10000);