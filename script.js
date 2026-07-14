const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0a0f1a');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;
const TASK_KEY = `minerads_tasks_${user.id}`;
const YOUR_WALLET_ADDRESS = "UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv";

let balance = 10.0;
let lastTick = Date.now();
let minerInstances = [];
let nextInstanceId = 1;
let completedTasks = [];
let activeTaskTab = 'oneTime';

const minerTemplates = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000424, img: "micro.png" },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, img: "basic.png" },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, img: "pro.png" },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, img: "gpu.png" },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, img: "asic.png" },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, img: "quantum.png" }
];

const tasksData = {
  oneTime: [
    { id: 'join_channel', title: "Join Telegram Channel", reward: 0.1 },
    { id: 'follow_twitter', title: "Follow on Twitter", reward: 0.1 },
    { id: 'invite_3', title: "Invite 3 Friends", reward: 0.5 }
  ],
  ads: [
    { id: 'watch_ad_1', title: "Watch Ad #1", reward: 0.01 },
    { id: 'watch_ad_2', title: "Watch Ad #2", reward: 0.01 },
    { id: 'watch_ad_3', title: "Watch Ad #3", reward: 0.01 }
  ],
  partnership: [
    { id: 'partner_dex', title: "Trade on Partner DEX", reward: 0.3 },
    { id: 'partner_nft', title: "Mint Partner NFT", reward: 0.2 }
  ]
};

// CUSTOM POPUP FUNCTION
function showPopup(type, title, message) {
  const icons = { success: "✅", error: "❌", info: "💰", alert: "⚠️" };
  const popup = document.createElement('div');
  popup.className = 'popup-overlay';
  popup.innerHTML = `
    <div class="popup">
      <div class="popup-icon">${icons[type] || "ℹ️"}</div>
      <h3>${title}</h3>
      <p>${message}</p>
      <button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => { if(popup.parentNode) popup.remove() }, 3000);
}

let tonConnectUI;
try {
  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://adspayu.vercel.app/tonconnect-manifest.json'
  });
  tonConnectUI.onStatusChange(() => {
    const currentTab = document.querySelector('.tabbar button.active')?.dataset.tab;
    if(currentTab === 'wallet') renderWallet();
  });
} catch(e){ console.error("TonConnect init error", e) }

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
    minerInstances.forEach(m => {
      const template = minerTemplates.find(t => t.id === m.templateId);
      if (template) {
        m.img = template.img;
        m.rate = template.rate;
      }
    });
    const offlineSeconds = (Date.now() - lastTick) / 1000;
    minerInstances.forEach(m => { m.farmed += m.rate * offlineSeconds; });
  }
  const taskSave = localStorage.getItem(TASK_KEY);
  if(taskSave) completedTasks = JSON.parse(taskSave);
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ balance, lastTick: Date.now(), minerInstances, nextInstanceId }));
  localStorage.setItem(TASK_KEY, JSON.stringify(completedTasks));
}

function updateBalance() {
  const el = document.getElementById('balance');
  if(el) el.innerText = `${balance.toFixed(4)} TON`;
}

function completeTask(taskId, reward) {
  if(completedTasks.includes(taskId)) return showPopup('alert', 'Already Done', 'Task already completed');
  completedTasks.push(taskId);
  balance += reward;
  updateBalance();
  saveGame();
  showPopup('success', 'Task Completed!', `+${reward} TON added to balance`);
  renderTasks();
}

function renderTasks() {
  const tabsHtml = ['oneTime', 'ads', 'partnership'].map(tab => {
    const label = tab === 'oneTime'? 'One Time' : tab === 'ads'? 'Ads' : 'Partnership';
    const active = activeTaskTab === tab? 'active' : '';
    return `<button class="subtab-btn ${active}" onclick="switchTaskTab('${tab}')">${label}</button>`
  }).join('');
  const tasks = tasksData[activeTaskTab].map(t => {
    const done = completedTasks.includes(t.id);
    return `<div class="card miner"><div class="miner-info"><h3>${t.title}</h3><p>Reward: <b>${t.reward} TON</b></p></div><button class="btn" ${done? 'disabled' : ''} onclick="completeTask('${t.id}', ${t.reward})">${done? 'DONE' : 'Claim'}</button></div>`
  }).join('');
  document.getElementById('content').innerHTML = `<h2>Tasks</h2><div class="subtabs">${tabsHtml}</div>${tasks}`;
}

function switchTaskTab(tab) { activeTaskTab = tab; renderTasks(); }

function renderWallet() {
  const isConnected = tonConnectUI && tonConnectUI.connected;
  const walletAddr = isConnected? tonConnectUI.account.address.slice(0,6) + "..." + tonConnectUI.account.address.slice(-4) : "Not Connected";

  document.getElementById('content').innerHTML = `
    <h2>Wallet</h2>
    <div class="card">
      <h3>Wallet Status</h3>
      <p style="color:var(--muted); font-size:12px">Connected: <b>${walletAddr}</b></p>
      <div id="ton-connect-button" style="margin-bottom:8px"></div>
      ${!isConnected? `<button class="btn" onclick="connectWallet()">Connect Wallet</button>` : ''}
      ${isConnected? `<button class="btn" style="background:var(--danger)" onclick="disconnectWallet()">Disconnect</button>` : ''}
    </div>
    <div class="card">
      <h3>Deposit TON</h3>
      <p style="color:var(--muted); font-size:12px">Send to: <b>${YOUR_WALLET_ADDRESS.slice(0,6)}...${YOUR_WALLET_ADDRESS.slice(-4)}</b></p>
      <input id="depositAmount" type="number" placeholder="Amount in TON" step="0.1" min="0.1" style="width:100%;padding:12px;border-radius:8px;background:#1e2a40;border:1px solid #333;color:var(--text);margin:8px 0"/>
      <button class="btn" onclick="deposit()">Deposit Now</button>
    </div>
  `;
  setTimeout(() => { if(tonConnectUI) tonConnectUI.mount('#ton-connect-button'); }, 100);
}

async function connectWallet() { if(tonConnectUI) await tonConnectUI.connectWallet(); }
async function disconnectWallet() { await tonConnectUI.disconnect(); showPopup('info', 'Disconnected', 'Wallet disconnected'); renderWallet(); }

async function deposit() {
  const amount = parseFloat(document.getElementById('depositAmount').value);
  if(!amount || amount < 0.1) return showPopup('error', 'Invalid Amount', 'Min deposit 0.1 TON');
  if(!tonConnectUI ||!tonConnectUI.connected) return showPopup('error', 'No Wallet', 'Please connect wallet first');
  try {
    const transaction = { validUntil: Math.floor(Date.now() / 1000) + 600, messages: [{ address: YOUR_WALLET_ADDRESS, amount: (amount * 1e9).toString() }] };
    await tonConnectUI.sendTransaction(transaction);
    balance += amount; updateBalance(); saveGame();
    showPopup('success', 'Deposit Successful!', `${amount} TON added to your balance`);
    document.getElementById('depositAmount').value = '';
  } catch(e) { showPopup('error', 'Failed', 'Transaction cancelled or failed'); }
}

function farmTick() {
  const now = Date.now(); const delta = (now - lastTick) / 1000; lastTick = now;
  minerInstances.forEach(m => { m.farmed += m.rate * delta; });
  const totalEl = document.getElementById('farmedTotal');
  if (totalEl) totalEl.innerText = getTotalFarmed().toFixed(6);
  minerInstances.forEach(m => {
    const el = document.getElementById(`farmed-${m.instanceId}`);
    if (el) el.innerText = m.farmed.toFixed(6);
  });
}

function buyMiner(templateId) {
  const template = minerTemplates.find(x => x.id === templateId);
  const ownedCount = minerInstances.filter(m => m.templateId === templateId).length;
  if (ownedCount >= 3) return showPopup('alert', 'Limit Reached', `Max 3 ${template.name} reached`);
  if (balance >= template.cost) {
    balance -= template.cost;
    minerInstances.push({ instanceId: nextInstanceId++, templateId: template.id, name: template.name, rate: template.rate, bonus: template.bonus, img: template.img, farmed: 0 });
    updateBalance(); saveGame(); 
    showPopup('success', 'Purchased!', `You bought ${template.name} for ${template.cost} TON`);
    renderShop(); renderHome();
  } else { showPopup('error', 'Not Enough TON', 'Not enough TON') }
}

function renderHome() {
  const totalRate = getTotalRate(); const totalFarmed = getTotalFarmed();
  document.getElementById('content').innerHTML = `
    <div class="card"><h2>Welcome, ${user.first_name}</h2><p style="color:var(--muted)">All miners ROI in 30 days + bonus</p></div>
    <div class="card"><h3>⛏️ Farming</h3><p>Rate: <b>${(totalRate*86400).toFixed(4)} TON/day</b></p><p>Farmed: <b id="farmedTotal">${totalFarmed.toFixed(6)}</b> TON</p><div class="progress"><div class="progress-bar" style="width:100%"></div></div><button class="btn" style="margin-top:12px" onclick="claim()">Claim</button></div>
    <div class="card"><h3>Your Miners</h3>${minerInstances.length > 0? minerInstances.map(m => `<div class="miner-unit"><img src="${m.img}" class="miner-img" style="width:40px; height:40px"/><div><h4>${m.name} #${m.instanceId}</h4><p style="color:var(--muted); font-size:12px">${(m.rate*86400).toFixed(4)} TON/day • Farmed: <span id="farmed-${m.instanceId}">${m.farmed.toFixed(6)}</span> TON</p></div></div>`).join('') : '<p style="color:var(--muted)">No miners yet</p>'}</div>
  `;
}

function renderShop() {
  document.getElementById('content').innerHTML = `<h2>Shop</h2>${minerTemplates.map(t => {
    const ownedCount = minerInstances.filter(m => m.templateId === t.id).length;
    const payout = (t.cost * (1 + t.bonus)).toFixed(2);
    const disabled = ownedCount >= 3? 'disabled' : '';
    return `<div class="card miner"><img src="${t.img}" class="miner-img" /><div class="miner-info"><h3>${t.name}</h3><p>${(t.rate*86400).toFixed(4)} TON/day • Owned: ${ownedCount}/3</p><p>30d Payout: <b>${payout} TON</b> +${(t.bonus*100)}%</p><p><b>${t.cost} TON</b></p></div><button class="btn" style="width:80px" ${disabled} onclick="buyMiner(${t.id})">${disabled? 'MAX' : 'Buy'}</button></div>`
  }).join('')}`;
}

function renderReferral() {
  const refLink = `https://t.me/AdsPayU_bot?start=${user.id}`;
  document.getElementById('content').innerHTML = `<h2>Referral</h2><div class="card"><p>Earn 10% from friends mining</p><input value="${refLink}" readonly style="width:100%;padding:8px;border-radius:8px;background:#1e2a40;border:1px solid #333;color:var(--text)"/><button class="btn" onclick="navigator.clipboard.writeText('${refLink}')">Copy Link</button></div>`;
}

function renderProfile() {
  document.getElementById('content').innerHTML = `<h2>Profile</h2><div class="card"><p><b>Name:</b> ${user.first_name}</p><p><b>ID:</b> ${user.id}</p><p><b>Total Mined:</b> ${getTotalFarmed().toFixed(4)} TON</p><p><b>Total Miners:</b> ${minerInstances.length}</p></div>`;
}

function claim() {
  const total = getTotalFarmed();
  balance += total; minerInstances.forEach(m => m.farmed = 0);
  updateBalance(); saveGame();
  showPopup('info', 'Claimed!', `${total.toFixed(4)} TON added to balance`);
  renderHome();
}

loadGame(); updateBalance(); renderHome();
document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');
setInterval(farmTick, 1000); setInterval(saveGame, 3000);