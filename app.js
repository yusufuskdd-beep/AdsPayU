let coins = 0;
let usdt = 0;
let totalAdsWatched = 0;
let lastAdTime = 0;
let minerData = {};
let userWalletAddress = null;
let walletConnected = false;
let currentTonPrice = 2.5;
let tonConnectUI;

const MINER_INTERVAL = 3600000; // 1 hour
const COOLDOWN_TIME = 5000; // 5s between ads
const MIN_SWAP = 200;
const COIN_VALUE = 0.000025;
const ADMIN_PASS = "admin123";

// MINERS CONFIG
const MINERS = [
    {id: 0, name: "Starter Miner", icon: "🎁", cost: 0, reward: 10, roi: "Infinite", type: "starter", unlockAds: 50},
    {id: 1, name: "Bronze Miner", icon: "🥉", cost: 2.00, reward: 25, roi: "300%"},
    {id: 2, name: "Silver Miner", icon: "🥈", cost: 5.00, reward: 75, roi: "360%"},
    {id: 3, name: "Gold Miner", icon: "🥇", cost: 15.00, reward: 250, roi: "400%"},
    {id: 4, name: "Diamond Miner", icon: "💎", cost: 50.00, reward: 1000, roi: "480%"}
];

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// SAFE INIT FOR MOBILE
function init() {
    // WAIT FOR TELEGRAM TO LOAD
    setTimeout(() => {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
        tg?.expand();
        
        // IF TELEGRAM FAILS, USE GUEST ID SO APP DOESN'T CRASH
        USER_ID = tg?.initDataUnsafe?.user?.id?.toString() || 'guest_' + Date.now();
        username = tg?.initDataUnsafe?.user?.username || 'Guest';
        
        console.log("User ID:", USER_ID);
        
        loadMinerData();
        loadUserData();
        initTonConnect();
        updateUI();
        renderMiners();
        updateTotalIncome();
        checkDaily();
    }, 500); // wait 0.5s for telegram to load
}

// LOAD USER DATA FROM BACKEND
async function loadUserData(){
    try {
        const res = await fetch(`${BACKEND_URL}/api/user/${USER_ID}`);
        const data = await res.json();
        if(data.success){ 
            coins = data.user.coins || 0; 
            usdt = data.user.usdt || 0; 
            showToast("Data loaded from server", 'success');
        }
    } catch(e){ 
        console.log("Failed to load user data", e); 
        showToast("Offline mode", 'warning');
    }
    updateUI();
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

function showTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

function showTopTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.top-tab').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

// AD FUNCTIONS
let currentAdType = 'home';
let currentAdMinerId = null;

function openAdConfirm(type, minerId = null) {
    currentAdType = type;
    currentAdMinerId = minerId;
    document.getElementById('adConfirmModal').classList.add('active');
}

function closeAdConfirm() {
    document.getElementById('adConfirmModal').classList.remove('active');
}

function proceedAd() {
    closeAdConfirm();
    if (currentAdType === 'home') {
        watchHomeAd();
    } else if (currentAdType === 'miner') {
        watchAdForMiner(currentAdMinerId);
    }
}

async function watchHomeAd() {
    const now = Date.now();
    if ((COOLDOWN_TIME - (now - lastAdTime)) > 0) return showToast("Wait 5 seconds", 'warning');
    
    lastAdTime = now;
    showToast("Watching ad... 30s", 'warning');
    
    // SHOW ADS
    try {
        if (typeof show_11258922 === 'function') await show_11258922();
    } catch(e) { console.log("Monetag error", e); }
    
    // GIVE REWARD VIA BACKEND
    const adId = 'ad_' + Date.now();
    try {
        const res = await fetch(`${BACKEND_URL}/api/watch-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID, adId: adId, duration: 30 })
        });
        const data = await res.json();
        if(data.success){
            coins = data.newBalance;
            trackTotalAds();
            updateUI();
            showToast("+10 APU Earned!", 'success');
        } else {
            showToast(data.error, 'error');
        }
    } catch(e) { showToast("Server error", 'error'); }
}

// EVENT LISTENERS
document.getElementById('gigaBtn').onclick = () => openAdConfirm('home');
document.getElementById('monetagBtn').onclick = () => openAdConfirm('home');

// START APP
window.onload = init;