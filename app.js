let coins = 0;
let usdt = 0;
let totalAdsWatched = 0;
let lastAdTime = 0;
let minerData = {};
let USER_ID = 'guest'; // FORCE GUEST ID
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
    console.log("App Starting...");
    
    // 1. TRY TO GET TELEGRAM ID
    try {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
        tg?.expand();
        USER_ID = tg?.initDataUnsafe?.user?.id?.toString() || 'guest_' + Date.now();
        username = tg?.initDataUnsafe?.user?.username || 'Guest';
    } catch(e){ console.log("Telegram failed") }

    // 2. LOAD LOCAL DATA ONLY - NO BACKEND CALL YET
    loadMinerData();
    coins = parseFloat(localStorage.getItem('coins')) || 100; // GIVE TEST COINS
    usdt = parseFloat(localStorage.getItem('usdt')) || 1.50; // GIVE TEST USDT
    
    // 3. RENDER UI
    updateUI();
    renderMiners();
    updateTotalIncome();
    checkDaily();
    initTonConnect();
    
    showToast("App Loaded in Safe Mode", 'success');
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
    if(document.getElementById('coinsHome'))
        document.getElementById('coinsHome').innerText = coins.toLocaleString() + ' APU';
    if(document.getElementById('usdtHome'))
        document.getElementById('usdtHome').innerText = usdt.toFixed(4) + ' USDT';
    if(document.getElementById('userId'))
        document.getElementById('userId').innerText = USER_ID;
    if(document.getElementById('username'))
        document.getElementById('username').innerText = username;
}

function showTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// COPY ALL OTHER FUNCTIONS FROM PREVIOUS app.js HERE
// updateTotalIncome, renderMiners, buyMiner, claimMiner, etc...
// For now just paste them below this line

window.onload = init;