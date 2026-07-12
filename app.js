let coins = 0;
let usdt = 0;
let totalAdsWatched = 0;
let lastAdTime = 0;
let minerData = {};
let USER_ID = 'guest';
let username = 'Guest';

const MINER_INTERVAL = 3600000;
const COOLDOWN_TIME = 5000;
const MIN_SWAP = 200;
const COIN_VALUE = 0.000025;
const ADMIN_PASS = "admin123";

const MINERS = [
    {id: 0, name: "Starter Miner", icon: "🎁", cost: 0, reward: 10, roi: "Infinite", type: "starter", unlockAds: 50},
    {id: 1, name: "Bronze Miner", icon: "🥉", cost: 2.00, reward: 25, roi: "300%"},
    {id: 2, name: "Silver Miner", icon: "🥈", cost: 5.00, reward: 75, roi: "360%"},
    {id: 3, name: "Gold Miner", icon: "🥇", cost: 15.00, reward: 250, roi: "400%"},
    {id: 4, name: "Diamond Miner", icon: "💎", cost: 50.00, reward: 1000, roi: "480%"}
];

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if(toast){
        toast.innerText = message;
        toast.className = 'toast ' + type;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function init() {
    setTimeout(() => {
        try {
            const tg = window.Telegram?.WebApp;
            tg?.ready();
            tg?.expand();
            USER_ID = tg?.initDataUnsafe?.user?.id?.toString() || 'guest_' + Date.now();
            username = tg?.initDataUnsafe?.user?.username || 'Guest';
        } catch(e){}
        loadMinerData();
        coins = parseFloat(localStorage.getItem('coins')) || 100;
        usdt = parseFloat(localStorage.getItem('usdt')) || 1.50;
        updateUI();
        renderMiners();
        updateTotalIncome();
        checkDaily();
        initTonConnect();
    }, 500);
}

function loadMinerData() {
    MINERS.forEach(m => {
        minerData[m.id] = {
            owned: localStorage.getItem(`miner${m.id}_owned`) === 'true',
            lastClaim: parseInt(localStorage.getItem(`miner${m.id}_lastClaim`)) || 0,
            adsWatched: parseInt(localStorage.getItem(`miner${m.id}_adsWatched`)) || 0
        };
    });
    totalAdsWatched = parseInt(localStorage.getItem('totalAdsWatched')) || 0;
}

function updateUI() {
    document.getElementById('coinsHome').innerText = coins.toLocaleString() + ' APU';
    document.getElementById('usdtHome').innerText = usdt.toFixed(4) + ' USDT';
    document.getElementById('coinsWallet').innerText = coins.toLocaleString() + ' APU';
    document.getElementById('usdtWallet').innerText = usdt.toFixed(4) + ' USDT';
    document.getElementById('userId').innerText = USER_ID;
    document.getElementById('username').innerText = username;
    document.getElementById('totalEarned').innerText = coins.toLocaleString();
    document.getElementById('totalAds').innerText = totalAdsWatched;
}

// FIXED: NO EVENT USED
function showTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.nav-item[onclick*="${tabName}"]`).classList.add('active');
}

function showTopTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.top-tab').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

function updateTotalIncome(){let total=0;MINERS.forEach(m=>{if(minerData[m.id].owned)total+=m.reward});document.getElementById('totalIncome').innerText=total.toLocaleString()+' APU/h'}
function renderMiners(){const container=document.getElementById('minerList');container.innerHTML='';MINERS.forEach(m=>{const data=minerData[m.id];const now=Date.now();const isReady=data.owned&&(now-data.lastClaim>=MINER_INTERVAL);const canClaim=isReady&&data.adsWatched>=2;const daysToROI=m.cost>0?(m.cost/(m.reward*24*COIN_VALUE)).toFixed(1):'N/A';const onCooldown=(COOLDOWN_TIME-(now-lastAdTime))>0;let buttons='';let extraHTML='';let cardClass='miner-card';if(m.type==='starter'){cardClass+=' starter';const progress=Math.min(totalAdsWatched,m.unlockAds);const percent=(progress/m.unlockAds)*100;extraHTML=`<div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div><div class="progress-text">${progress}/${m.unlockAds} Ads Watched</div>`;if(!data.owned){buttons=totalAdsWatched>=m.unlockAds?`<button class="miner-btn btn-buy" onclick="unlockStarter()">UNLOCK FREE</button>`:`<button class="miner-btn btn-buy" disabled>WATCH ${m.unlockAds-totalAdsWatched} MORE ADS</button>`}}else{if(!data.owned)buttons=`<button class="miner-btn btn-buy" onclick="buyMiner(${m.id})">BUY - $${m.cost.toFixed(2)}</button>`}if(data.owned&&!isReady){const timeLeft=MINER_INTERVAL-(now-data.lastClaim);const mins=Math.floor(timeLeft/6e4);const secs=Math.floor((timeLeft%6e4)/1e3);buttons=`<button class="miner-btn btn-buy" disabled>MINING... ${mins}m ${secs}s</button>`}if(data.owned&&isReady){buttons=`<div class="miner-btns"><button class="miner-btn btn-ad" onclick="watchAdForMiner(${m.id})" ${data.adsWatched>=2||onCooldown?'disabled':''}>${onCooldown?'WAIT 5s':`WATCH AD ${data.adsWatched}/2`}</button><button class="miner-btn btn-claim" onclick="claimMiner(${m.id})" ${!canClaim?'disabled':''}>CLAIM ${m.reward}</button></div>`}container.innerHTML+=`<div class="${cardClass} ${data.owned?'active':''}"><div class="miner-header"><div class="miner-name">${m.icon} ${m.name}</div><div class="miner-status ${data.owned?'active':''}">${data.owned?'ACTIVE':'LOCKED'}</div></div><div class="miner-info">Cost: ${m.cost>0?'$'+m.cost.toFixed(2):'200 Total Ads'} | Earn: ${m.reward} APU/hour</div><div class="miner-roi">ROI: ${m.roi} in 30 days ${daysToROI!=='N/A'?'| Break-even: ~'+daysToROI+' days':''}</div>${extraHTML}<div class="miner-progress">${isReady?m.reward+'/'+m.reward+' APU':'0/'+m.reward+' APU'}</div>${buttons}</div>`})}
function unlockStarter(){minerData[0].owned=true;minerData[0].lastClaim=Date.now();localStorage.setItem(`miner0_owned`,'true');localStorage.setItem(`miner0_lastClaim`,minerData[0].lastClaim);renderMiners();updateTotalIncome();showToast("🎁 Starter Miner Unlocked!",'success')}
function buyMiner(id){const m=MINERS.find(x=>x.id===id);if(usdt<m.cost)return showToast(`Not enough USDT. Need $${m.cost.toFixed(2)}`,'error');usdt-=m.cost;minerData[id].owned=true;minerData[id].lastClaim=Date.now();localStorage.setItem('usdt',usdt);localStorage.setItem(`miner${id}_owned`,'true');localStorage.setItem(`miner${id}_lastClaim`,minerData[id].lastClaim);updateUI();renderMiners();updateTotalIncome();showToast(`${m.name} Purchased!`,'success')}
function watchAdForMiner(id){const now=Date.now();if((COOLDOWN_TIME-(now-lastAdTime))>0)return showToast("Wait 5 seconds",'warning');const data=minerData[id];if(data.adsWatched>=2)return;openAdConfirm('miner',id)}
function claimMiner(id){const m=MINERS.find(x=>x.id===id);const data=minerData[id];const now=Date.now();if(now-data.lastClaim<MINER_INTERVAL)return showToast("Not ready yet",'warning');if(data.adsWatched<2)return showToast("Watch 2 ads first",'warning');coins+=m.reward;data.lastClaim=now;data.adsWatched=0;localStorage.setItem('coins',coins);localStorage.setItem(`miner${id}_lastClaim`,data.lastClaim);localStorage.setItem(`miner${id}_adsWatched`,0);updateUI();renderMiners();updateTotalIncome();showToast(`+${m.reward} APU Claimed!`,'success')}
function openSwap(){document.getElementById('swapModal').classList.add('active');document.getElementById('swapInput').value=MIN_SWAP;updateSwapPreview()}
function closeSwap(){document.getElementById('swapModal').classList.remove('active')}
function updateSwapPreview(){const amount=parseInt(document.getElementById('swapInput').value)||0;const usdtValue=(amount*COIN_VALUE).toFixed(4);document.getElementById('swapPreview').innerText=`You will receive: ${usdtValue} USDT`}
function confirmSwap(){const amount=parseInt(document.getElementById('swapInput').value)||0;if(amount<MIN_SWAP)return showToast(`Minimum swap is ${MIN_SWAP} APU`,'error');if(amount>coins)return showToast("Not enough APU",'error');const usdtReceived=amount*COIN_VALUE;coins-=amount;usdt+=usdtReceived;localStorage.setItem('coins',coins);localStorage.setItem('usdt',usdt);updateUI();closeSwap();showToast(`Swapped ${amount} APU for ${usdtReceived.toFixed(4)} USDT!`,'success')}
function checkDaily(){const btn=document.getElementById('dailyClaimBtn');const today=new Date().toDateString();const lastDailyClaim=localStorage.getItem('lastDailyClaim');if(lastDailyClaim===today){btn.disabled=true;btn.innerText="✅ CLAIMED TODAY";btn.style.background="#333"}}
function claimDaily(){const today=new Date().toDateString();const lastDailyClaim=localStorage.getItem('lastDailyClaim');if(lastDailyClaim===today)return showToast("Already claimed today",'warning');coins+=50;localStorage.setItem('coins',coins);localStorage.setItem('lastDailyClaim',today);updateUI();checkDaily();showToast("+50 APU Claimed!",'success')}
function trackTotalAds(){totalAdsWatched+=1;localStorage.setItem('totalAdsWatched',totalAdsWatched)}
function openAdmin(){document.getElementById('adminPassModal').classList.add('active')}
function closeAdminPass(){document.getElementById('adminPassModal').classList.remove('active')}
function checkAdminPass(){const pass=document.getElementById('adminPassInput').value;if(pass!==ADMIN_PASS)return showToast("Wrong Password",'error');closeAdminPass();showTab('admin');renderAdminRequests()}
function renderAdminRequests(){const list=document.getElementById('reqList');const requests=JSON.parse(localStorage.getItem('withdrawRequests')||'[]');document.getElementById('totalReq').innerText=requests.length;if(requests.length===0){list.innerHTML='<div class="card"><div class="card-sub">No withdraw requests yet.</div></div>';return}list.innerHTML='';requests.reverse().forEach(r=>{list.innerHTML+=`<div class="req-item"><b>ID:</b> ${r.id}<br><b>Amount:</b> ${r.amount.toFixed(2)} USDT<br><b>Fee 5%:</b> ${r.fee.toFixed(4)} USDT<br><b>You Send:</b> ${r.receive.toFixed(4)} USDT<br><b>Wallet:</b> ${r.wallet}<br><b>Date:</b> ${r.date}<br><b>Status:</b> ${r.status}</div>`})}
function clearAllReq(){if(!confirm("Delete all withdraw requests?"))return;localStorage.removeItem('withdrawRequests');renderAdminRequests();showToast("All requests cleared",'success')}

let currentAdType = 'home';
let currentAdMinerId = null;
function openAdConfirm(type, minerId = null) {currentAdType = type;currentAdMinerId = minerId;document.getElementById('adConfirmModal').classList.add('active');}
function closeAdConfirm() {document.getElementById('adConfirmModal').classList.remove('active');}
function proceedAd() {closeAdConfirm();if (currentAdType === 'home') {watchHomeAd();} else if (currentAdType === 'miner') {watchAdForMiner(currentAdMinerId);}}
function watchHomeAd() {const now = Date.now();if ((COOLDOWN_TIME - (now - lastAdTime)) > 0) return showToast("Wait 5 seconds", 'warning');lastAdTime = now;showToast("Watching ad... 30s", 'warning');try {if (typeof show_11258922 === 'function') show_11258922();} catch(e) {}setTimeout(()=>{coins+=10;trackTotalAds();updateUI();showToast("+10 APU Earned!", 'success');}, 30000);}
document.getElementById('gigaBtn').onclick = () => openAdConfirm('home');
document.getElementById('monetagBtn').onclick = () => openAdConfirm('home');

window.onload = init;