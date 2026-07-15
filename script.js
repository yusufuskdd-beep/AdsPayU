const tg = window.Telegram.WebApp;
tg.expand();

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;
const YOUR_WALLET_ADDRESS = "UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv";
const CLAIM_COOLDOWN = 8 * 3600 * 1000;

let balance = 10.0; 
let lastTick = Date.now(); 
let minerInstances = []; 
let nextInstanceId = 1;
let lastMinerClaim = 0;

const minerTemplates = [
  { id: 1, name: "Micro Miner", cost: 1, rate: 0.000000424, img: "micro.png" },
  { id: 2, name: "Basic Miner", cost: 3, rate: 0.000001331, img: "basic.png" },
  { id: 3, name: "Pro Miner", cost: 5, rate: 0.000002315, img: "pro.png" },
  { id: 4, name: "GPU Rig", cost: 10, rate: 0.000004823, img: "gpu.png" },
  { id: 5, name: "ASIC Farm", cost: 25, rate: 0.000012540, img: "asic.png" },
  { id: 6, name: "Quantum Miner", cost: 50, rate: 0.000026042, img: "quantum.png" }
];

function showPopup(title, message) {
  alert(title + "\n" + message);
}

let tonConnectUI; 
try { 
  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: 'https://adspayu.vercel.app/tonconnect-manifest.json' }); 
} catch(e){}

const tabs = { home: renderHome, shop: renderShop, tasks: renderTasks, referral: renderReferral, wallet: renderWallet, profile: renderProfile };
document.addEventListener('DOMContentLoaded', () => { 
  document.querySelectorAll('.tabbar button').forEach(btn => { 
    btn.onclick = () => { 
      document.querySelectorAll('.tabbar button').forEach(b => b.classList.remove('active')); 
      btn.classList.add('active'); 
      tabs[btn.dataset.tab](); 
    } 
  }); 
});

function getTotalRate() { return minerInstances.reduce((sum, m) => sum + m.rate, 0); }
function getTotalFarmed() { return minerInstances.reduce((sum, m) => sum + m.farmed, 0); }

function loadGame() {
  const save = localStorage.getItem(SAVE_KEY); 
  if (save) {
    const data = JSON.parse(save); 
    balance = data.balance || 10.0; 
    lastTick = data.lastTick || Date.now(); 
    minerInstances = data.minerInstances || [];
    nextInstanceId = data.nextInstanceId || 1; 
    lastMinerClaim = data.lastMinerClaim || 0;
    const offlineSeconds = (Date.now() - lastTick) / 1000; 
    minerInstances.forEach(m => { m.farmed += m.rate * offlineSeconds; });
  }
}

function saveGame() { 
  localStorage.setItem(SAVE_KEY, JSON.stringify({ 
    balance, 
    lastTick: Date.now(), 
    minerInstances, 
    nextInstanceId,
    lastMinerClaim
  })); 
}

function updateBalance() { 
  document.getElementById('balance').innerText = `${balance.toFixed(4)} TON`; 
}

function claimMiner() {
  const now = Date.now();
  const timeLeft = CLAIM_COOLDOWN - (now - lastMinerClaim);
  if(timeLeft > 0) {
    const hours = Math.floor(timeLeft / 3600000);
    const mins = Math.floor((timeLeft % 3600000) / 60000);
    return showPopup('Too Early', `Next claim in ${hours}h ${mins}m`);
  }
  const total = getTotalFarmed();
  if(total < 0.000001) return showPopup('Nothing to Claim', 'Your miners haven\'t mined anything yet');
  
  balance += total;
  minerInstances.forEach(m => m.farmed = 0);
  lastMinerClaim = now;
  updateBalance(); 
  saveGame(); 
  showPopup('Claimed!', `${total.toFixed(6)} TON added to balance`);
  renderHome();
}

function getClaimCooldownText() {
  const now = Date.now();
  const timeLeft = CLAIM_COOLDOWN - (now - lastMinerClaim);
  if(timeLeft <= 0) return "CLAIM NOW";
  const hours = Math.floor(timeLeft / 3600000);
  const mins = Math.floor((timeLeft % 3600000) / 60000);
  return `CLAIM IN ${hours}h ${mins}m`;
}

function renderHome() {
  const totalRate = getTotalRate(); 
  const totalFarmed = getTotalFarmed();
  const canClaimMiner = (Date.now() - lastMinerClaim) >= CLAIM_COOLDOWN;

  document.getElementById('content').innerHTML = `
    <div class="card"><h2>Welcome, ${user.first_name}</h2></div>
    <div class="card">
      <h3>⛏️ Mining</h3>
      <p>Rate: <b>${(totalRate*86400).toFixed(4)} TON/day</b></p>
      <p>Farmed: <b id="farmedTotal">${totalFarmed.toFixed(6)}</b> TON</p>
      <button class="btn" ${!canClaimMiner? 'disabled' : ''} onclick="claimMiner()">
        ${getClaimCooldownText()}
      </button>
    </div>
    <div class="card"><h3>Your Miners</h3>${
      minerInstances.length > 0? 
      minerInstances.map(m => `<div class="miner"><img src="${m.img}" class="miner-img" /><div><h4>${m.name} #${m.instanceId}</h4><p>${(m.rate*86400).toFixed(4)} TON/day • Farmed: <span id="farmed-${m.instanceId}">${m.farmed.toFixed(6)}</span> TON</p></div></div>`).join('') 
      : '<p>No miners yet</p>'}</div>
  `;
}

function buyMiner(templateId) { 
  const template = minerTemplates.find(x => x.id === templateId); 
  const ownedCount = minerInstances.filter(m => m.templateId === templateId).length; 
  if (ownedCount >= 3) return showPopup('Limit Reached', `Max 3 ${template.name} reached`); 
  if (balance >= template.cost) { 
    balance -= template.cost; 
    minerInstances.push({ 
      instanceId: nextInstanceId++, 
      templateId: template.id, 
      name: template.name, 
      rate: template.rate, 
      img: template.img, 
      farmed: 0 
    }); 
    updateBalance(); 
    saveGame(); 
    showPopup('Purchased!', `You bought ${template.name} for ${template.cost} TON`); 
    renderShop(); 
    renderHome(); 
  } else { 
    showPopup('Error', 'Not enough TON') 
  } 
}

function renderShop() { 
  document.getElementById('content').innerHTML = `<h2>Shop</h2>${
    minerTemplates.map(t => { 
      const ownedCount = minerInstances.filter(m => m.templateId === t.id).length; 
      const disabled = ownedCount >= 3? 'disabled' : ''; 
      return `<div class="card miner">
        <img src="${t.img}" class="miner-img" />
        <div style="flex:1">
          <h3>${t.name}</h3>
          <p>${(t.rate*86400).toFixed(4)} TON/day</p>
          <p><b>${t.cost} TON</b> - Owned: ${ownedCount}/3</p>
        </div>
        <button class="btn" style="width:80px" ${disabled} onclick="buyMiner(${t.id})">${disabled? 'MAX' : 'Buy'}</button>
      </div>` 
    }).join('')
  }`; 
}

function renderTasks() { document.getElementById('content').innerHTML = `<h2>Tasks</h2><div class="card"><p>Coming Soon</p></div>`; }
function renderReferral() { 
  const refLink = `https://t.me/AdsPayU_bot?start=${user.id}`; 
  document.getElementById('content').innerHTML = `<h2>Referral</h2><div class="card"><p>Earn 10% from friends</p><input value="${refLink}" readonly style="width:100%;padding:8px"/><button class="btn" onclick="navigator.clipboard.writeText('${refLink}')">Copy</button></div>`; 
}
function renderWallet() { document.getElementById('content').innerHTML = `<h2>Wallet</h2><div class="card"><div id="ton-connect-button"></div></div>`; setTimeout(() => { if(tonConnectUI) tonConnectUI.mount('#ton-connect-button'); }, 100); }
function renderProfile() { document.getElementById('content').innerHTML = `<h2>Profile</h2><div class="card"><p><b>Name:</b> ${user.first_name}</p><p><b>ID:</b> ${user.id}</p><p><b>Total Mined:</b> ${getTotalFarmed().toFixed(4)} TON</p></div>`; }

function farmTick() { 
  const now = Date.now(); 
  const delta = (now - lastTick) / 1000; 
  lastTick = now; 
  minerInstances.forEach(m => { m.farmed += m.rate * delta; }); 
  const totalEl = document.getElementById('farmedTotal'); 
  if (totalEl) totalEl.innerText = getTotalFarmed().toFixed(6); 
  minerInstances.forEach(m => { 
    const el = document.getElementById(`farmed-${m.instanceId}`); 
    if (el) el.innerText = m.farmed.toFixed(6); 
  }); 
}

// INIT
loadGame();
updateBalance();
renderHome();
document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');

setInterval(farmTick, 1000);
setInterval(saveGame, 3000);