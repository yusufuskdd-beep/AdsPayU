const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};const SAVE_KEY=`minerads_save_${user.id}`;const YOUR_WALLET_ADDRESS="UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv",CLAIM_COOLDOWN=3600000,MAX_ADS_PER_DAY=50,AD_REWARD=.002;const TONCENTER_API="https://toncenter.com/api/v2";let gigaReady=false,tonConnectUI=null,connectedWallet=null,depositInterval=null,processedTxs=JSON.parse(localStorage.getItem(`processed_txs_${user.id}`)||'[]');function getUTCTimestamp(){return Date.now()}let balance=10,madBalance=0,lastTick=getUTCTimestamp(),minerInstances=[],nextInstanceId=1,lastMinerClaim=0,lastMadClaim=0,adsWatchedToday=0;

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

// TONCONNECT UI INIT - Same as your React TonConnectUIProvider
function initTonConnect(){
  try{
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: "https://adspayu.vercel.app/tonconnect-manifest.json", // <-- CHANGE TO YOUR DOMAIN
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
    });
  }catch(e){console.log("TonConnect error",e)}
}

const tabs={home:renderHome,shop:renderShop,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile};
document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});loadGame();updateBalance();renderHome();initTonConnect();document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");setTimeout(()=>{gigaReady=typeof window.showGiga==="function";renderHome()},2000)});

function getTotalRate(){return minerInstances.reduce((t,e)=>t+e.rate,0)}function getTotalMadRate(){return minerInstances.reduce((t,e)=>t+e.madRate,0)}function getTotalFarmed(){return minerInstances.reduce((t,e)=>t+e.farmed,0)}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10;madBalance=e.madBalance||0;minerInstances=e.minerInstances||[];nextInstanceId=e.nextInstanceId||1;lastMinerClaim=e.lastMinerClaim||0;lastMadClaim=e.lastMadClaim||0;adsWatchedToday=e.adsWatchedToday||0;minerInstances.forEach(t=>{const tmp=minerTemplates.find(m=>m.id===t.templateId);if(tmp)t.img=tmp.img});const i=(getUTCTimestamp()-lastTick)/1e3;minerInstances.forEach(t=>{t.farmed+=t.rate*i})}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,madBalance,lastTick:getUTCTimestamp(),minerInstances,nextInstanceId,lastMinerClaim,lastMadClaim,adsWatchedToday}))}
function updateBalance(){const el=document.getElementById("balance");if(el)el.innerHTML=`${balance.toFixed(4)} TON<br><span style="font-size:12px;color:#F59E0B">${madBalance.toFixed(0)} MAD</span>`}
function formatTime(ms){if(ms<=0)return"CLAIM NOW";const s=Math.floor(ms/1000),m=Math.floor(s%3600/60),sec=s%60;return`WAIT ${m}m ${sec}s`}
function getClaimCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMinerClaim))}
function getMadCooldownText(){return formatTime(CLAIM_COOLDOWN-(getUTCTimestamp()-lastMadClaim))}

async function claimMiner(){const i=getTotalFarmed();if(i<.000001)return showPopup("alert","Empty","No TON");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();balance+=i;minerInstances.forEach(t=>t.farmed=0);lastMinerClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","Claimed",`+${i.toFixed(6)} TON`);renderHome()}
async function claimMad(){const i=getTotalMadRate();if(i<=0)return showPopup("alert","No Miners","Buy miners");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();madBalance+=i;lastMadClaim=getUTCTimestamp();updateBalance();saveGame();showPopup("success","MAD!",`+${i} MAD`);renderHome()}
async function watchAdTask(){if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Limit","50/50 today");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();adsWatchedToday++;balance+=AD_REWARD;updateBalance();saveGame();showPopup("success","Earned",`+${AD_REWARD} TON`);renderTasks()}

function renderHome(){const c=document.getElementById("content");const t=getTotalRate(),e=getTotalFarmed(),mad=getTotalMadRate();c.innerHTML=`<div class="card"><h2>Welcome ${user.first_name}</h2><p>ROI 5%-18% + MAD</p></div><div class="card"><h3>⛏️ TON Mining</h3><p>Rate: <b>${(t*86400).toFixed(4)}/day</b></p><p>Farmed: <b id="farmedTotal">${e.toFixed(6)}</b></p><button class="btn" ${!gigaReady?"disabled":""} onclick="claimMiner()">${gigaReady?getClaimCooldownText():'LOADING ADS...'}</button></div><div class="card"><h3>💎 MAD Mining</h3><p>Rate: <b>${mad}/hour</b></p><p>Balance: <b>${madBalance.toFixed(0)}</b></p><button class="btn" ${!gigaReady?"disabled":""} onclick="claimMad()">${gigaReady?getMadCooldownText():'LOADING ADS...'}</button></div><div class="card"><h3>Your Miners</h3>${minerInstances.length?minerInstances.map(t=>`<div class="miner-unit"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h4>${t.name} #${t.instanceId}</h4><p>${(t.rate*86400).toFixed(4)}/d • ${t.madRate} MAD/h</p><p>Farmed: <span id="farmed-${t.instanceId}">${t.farmed.toFixed(6)}</span></p></div></div>`).join(""):'<p style="color:var(--muted)">No miners yet</p>'}<button class="btn" onclick="buyMiner(4)">Buy GPU Rig 10 TON</button></div>`}

function renderShop(){const c=document.getElementById("content");c.innerHTML=`<h2>Shop</h2>${minerTemplates.map(t=>{const owned=minerInstances.filter(e=>e.templateId===t.id).length;return`<div class="card miner"><img src="${t.img}" class="miner-img" onerror="this.src='micro.png'"/><div class="miner-info"><h3>${t.name}</h3><p>${(t.rate*86400).toFixed(4)} TON/day • ${t.madRate} MAD/h</p><p><b>${t.cost} TON</b> • Owned: ${owned}/3</p></div><button class="btn" ${owned>=3?"disabled":""} onclick="buyMiner(${t.id})">${owned>=3?"MAX":"Buy"}</button></div>`}).join("")}`}

function buyMiner(t){const e=minerTemplates.find(e=>e.id===t),i=minerInstances.filter(i=>i.templateId===t).length;if(i>=3)return showPopup("alert","Max","3 limit per type");if(balance<e.cost)return showPopup("error","No TON","Not enough");balance-=e.cost;minerInstances.push({instanceId:nextInstanceId++,templateId:e.id,name:e.name,rate:e.rate,bonus:e.bonus,madRate:e.madRate,img:e.img,farmed:0});updateBalance();saveGame();showPopup("success","Bought",`${e.name} for ${e.cost} TON`);renderShop();renderHome()}
function renderTasks(){document.getElementById("content").innerHTML=`<h2>Tasks</h2><div class="card"><h3>📺 Watch Ads</h3><p>Earn <b>${AD_REWARD} TON</b> per ad</p><p>${adsWatchedToday}/${MAX_ADS_PER_DAY}</p><button class="btn" ${!gigaReady?"disabled":""} onclick="watchAdTask()">${gigaReady?`WATCH +${AD_REWARD} TON`:'LOADING ADS...'}</button></div>`}

async function connectWallet(){
  if(!tonConnectUI)return showPopup("error","Error","SDK loading...");
  await tonConnectUI.openModal(); // Opens wallet selector modal
}

async function disconnectWallet(){
  if(tonConnectUI){
    await tonConnectUI.disconnect();
    connectedWallet=null;
    if(depositInterval) clearInterval(depositInterval);
    renderWallet();
  }
}

async function checkDeposits(){
  if(!connectedWallet) return;
  try{
    const res = await fetch(`${TONCENTER_API}/getTransactions?address=${YOUR_WALLET_ADDRESS}&limit=10`);
    const data = await res.json();
    if(!data.result) return;
    for(const tx of data.result){
      const hash = tx.transaction_id.hash;
      if(processedTxs.includes(hash)) continue;
      const amount = tx.in_msg.value / 1000000;
      if(amount > 0.001){
        processedTxs.push(hash);
        localStorage.setItem(`processed_txs_${user.id}`, JSON.stringify(processedTxs));
        balance += amount;
        updateBalance();
        saveGame();
        showPopup("success","Deposit Received!",`+${amount.toFixed(4)} TON`);
        renderWallet();
      }
    }
  }catch(e){console.log(e)}
}

async function depositTON(){
  if(!connectedWallet)return showPopup("error","Connect First","Connect wallet first");
  const amount=prompt("How much TON to deposit?","1");
  if(!amount)return;
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now()/1000)+300,
    messages:[{address:YOUR_WALLET_ADDRESS,amount:(parseFloat(amount)*1000000).toString()}]
  });
  showPopup("info","Sent","Waiting for confirmation ~10s");
}

async function withdrawTON(){
  if(!connectedWallet)return showPopup("error","Connect First","Connect wallet first");
  const amount=prompt(`Withdraw. Balance: ${balance.toFixed(4)}`,"1");
  if(!amount)return;
  if(parseFloat(amount)>balance)return showPopup("error","No Balance","Not enough");
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now()/1000)+300,
    messages:[{address:connectedWallet.account.address,amount:(parseFloat(amount)*1000000).toString()}]
  });
  balance-=parseFloat(amount);updateBalance();saveGame();
  showPopup("success","Withdraw Sent",`${amount} TON sent`);
}

function renderWallet(){
  const c=document.getElementById("content");
  const isConnected=!!connectedWallet;
  const walletAddr=isConnected?`${connectedWallet.account.address.slice(0,4)}...${connectedWallet.account.address.slice(-4)}`:"Connect Wallet";
  c.innerHTML=`<h2>Wallet</h2>
  <div class="card"><h3>💰 Game Balance</h3><p style="font-size:20px">${balance.toFixed(4)} TON</p><p style="color:var(--gold)">${madBalance.toFixed(0)} MAD</p></div>
  <div class="card">
    <button class="btn" style="width:100%" onclick="${isConnected?'disconnectWallet()':'connectWallet()'}">${walletAddr}</button>
    <p style="font-size:11px;color:var(--muted);margin-top:8px">${isConnected?'Connected. Auto-deposit active':'Click to connect Tonkeeper/Wallet'}</p>
  </div>
  <div class="card">
    <h3>📥 Deposit TON</h3>
    <p style="word-break:break-all;font-size:11px;background:#0f131a;padding:8px;border-radius:8px">${YOUR_WALLET_ADDRESS}</p>
    <button class="btn" onclick="depositTON()" ${!isConnected?"disabled":""}>📥 Deposit TON</button>
  </div>
  <div class="card">
    <h3>📤 Withdraw TON</h3>
    <button class="btn" onclick="withdrawTON()" ${!isConnected?"disabled":""}>📤 Withdraw TON</button>
  </div>`;
}

function renderReferral(){document.getElementById("content").innerHTML=`<h2>Referral</h2><div class="card"><p>Your Link:</p><p style="word-break:break-all">https://t.me/AdsPayU_bot?start=${user.id}</p></div>`}
function renderProfile(){document.getElementById("content").innerHTML=`<h2>Profile</h2><div class="card"><p>Name: ${user.first_name}</p><p>TON: ${balance.toFixed(4)}</p><p>MAD: ${madBalance.toFixed(0)}</p></div>`}

setInterval(()=>{const t=getUTCTimestamp(),e=(t-lastTick)/1e3;lastTick=t;minerInstances.forEach(i=>{i.farmed+=i.rate*e});const i=document.getElementById("farmedTotal");i&&(i.innerText=getTotalFarmed().toFixed(6))},1000);
setInterval(saveGame,10000);