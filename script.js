const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.setHeaderColor('#070A12');
tg.setBackgroundColor('#070A12');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;
const TASK_KEY = `minerads_tasks_${user.id}`;
const YOUR_WALLET_ADDRESS = "UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv";
const CLAIM_COOLDOWN = 8 * 3600 * 1000; // 8 hours
const MAX_ADS_PER_DAY = 50;
const AD_REWARD = 0.002;

// UTC HELPERS
function getUTCTimestamp() { return Date.now(); }
function getUTCDateString(timestamp) { 
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
}
function hoursBetween(ts1, ts2) { return (ts2 - ts1) / 1000 / 3600; }

let balance = 10.0; let lastTick = getUTCTimestamp(); let minerInstances = []; let nextInstanceId = 1;
let completedTasks = []; let activeTaskTab = 'oneTime'; let taskProgress = {};
let lastDailyClaim = 0; let dailyStreak = 0; let lastMinerClaim = 0;
let adsWatchedToday = 0; let lastAdResetDate = "";

const minerTemplates = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000000424, img: "micro.png" },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, img: "basic.png" },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, img: "pro.png" },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, img: "gpu.png" },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, img: "asic.png" },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, img: "quantum.png" }
];

const tasksData = {
  oneTime: [
    { id: 'join_channel', title: "Join Telegram Channel", reward: 0.1, link: "https://t.me/MinerAAds", type: "join" },
    { id: 'join_chat', title: "Join Telegram Chat", reward: 0.1, link: "https://t.me/+EiLZpWqcoA8zYjU0", type: "join" }
  ],
  ads: [
    { id: 'watch_ad', title: "Watch Rewarded Ad", reward: AD_REWARD, type: "ad" }
  ],
  partnership: []
};

function showPopup(type, title, message) {
  const icons = { success: "✅", error: "❌", info: "💰", alert: "⚠️" };
  const popup = document.createElement('div');
  popup.className = 'popup-overlay';
  popup.innerHTML = `<div class="popup"><div class="popup-icon">${icons[type] || "ℹ️"}</div><h3>${title}</h3><p>${message}</p><button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">OK</button></div>`;
  document.body.appendChild(popup); setTimeout(() => { if(popup.parentNode) popup.remove() }, 3000);
}

function showRewardedAd() {
  return new Promise((resolve, reject) => {
    if(typeof window.showGiga!== 'function') {
      showPopup('error', 'Ad Error', 'Ad network not loaded. Refresh.');
      return reject(false);
    }
    window.showGiga().then(() => resolve(true)).catch(() => reject(false));
  });
}

let tonConnectUI;
try {
  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: 'https://adspayu.vercel.app/tonconnect-manifest.json' });
  tonConnectUI.onStatusChange(() => {
    if(document.querySelector('.tabbar button.active')?.dataset.tab === 'wallet') renderWallet();
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
  loadGame();
  updateBalance();
  renderHome();
  document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');
});

function getTotalRate() { return minerInstances.reduce((sum, m) => sum + m.rate, 0); }
function getTotalFarmed() { return minerInstances.reduce((sum, m) => sum + m.farmed, 0); }

function checkDailyReset() { // UTC DAILY RESET
  const todayUTC = getUTCDateString(getUTCTimestamp());
  if(lastAdResetDate !== todayUTC) { 
    adsWatchedToday = 0; 
    lastAdResetDate = todayUTC; 
  }
}

function loadGame() {
  const save = localStorage.getItem(SAVE_KEY); if (save) {
    const data = JSON.parse(save);
    balance = data.balance || 10.0; lastTick = data.lastTick || getUTCTimestamp(); minerInstances = data.minerInstances || [];
    nextInstanceId = data.nextInstanceId || 1; taskProgress = data.taskProgress || {};
    lastDailyClaim = data.lastDailyClaim || 0; dailyStreak = data.dailyStreak || 0; lastMinerClaim = data.lastMinerClaim || 0;
    adsWatchedToday = data.adsWatchedToday || 0; lastAdResetDate = data.lastAdResetDate || "";
    minerInstances.forEach(m => { const template = minerTemplates.find(t => t.id === m.templateId); if (template) { m.img = template.img; m.rate = template.rate; } });
    const offlineSeconds = (getUTCTimestamp() - lastTick) / 1000; minerInstances.forEach(m => { m.farmed += m.rate * offlineSeconds; });

    checkDailyReset();

    // UTC STREAK: if last claim was not yesterday UTC, reset streak
    if(lastDailyClaim > 0) {
      const lastClaimDate = getUTCDateString(lastDailyClaim);
      const today = getUTCDateString(getUTCTimestamp());
      const yesterday = getUTCDateString(getUTCTimestamp() - 24*3600*1000);
      
      if(lastClaimDate !== today && lastClaimDate !== yesterday) {
        dailyStreak = 0;
      }
    }
  }
  const taskSave = localStorage.getItem(TASK_KEY); if(taskSave) completedTasks = JSON.parse(taskSave); saveGame();
}

function saveGame() { 
  localStorage.setItem(SAVE_KEY, JSON.stringify({ 
    balance, lastTick: getUTCTimestamp(), minerInstances, nextInstanceId, taskProgress, 
    lastDailyClaim, dailyStreak, lastMinerClaim, adsWatchedToday, lastAdResetDate
  })); 
  localStorage.setItem(TASK_KEY, JSON.stringify(completedTasks)); 
}

function updateBalance() { const el = document.getElementById('balance'); if(el) el.innerText = `${balance.toFixed(4)} TON`; }
function getDailyReward() { return Math.min(0.001 + (dailyStreak * 0.007), 0.05); }

function claimDaily() {
  const now = getUTCTimestamp();
  const hoursSinceLastClaim = hoursBetween(lastDailyClaim, now);
  if(hoursSinceLastClaim < 20) { 
    const hoursLeft = 20 - hoursSinceLastClaim; 
    return showPopup('alert', 'Come Back Later', `Next claim in ${hoursLeft.toFixed(1)}h`); 
  }

  const lastClaimDate = getUTCDateString(lastDailyClaim);
  const today = getUTCDateString(now);
  
  if(lastClaimDate !== today) {
    dailyStreak = Math.min(dailyStreak + 1, 7);
  }

  const reward = getDailyReward();
  balance += reward; lastDailyClaim = now; updateBalance(); saveGame(); tg.HapticFeedback.impactOccurred('medium');
  showPopup('success', '