let coins = 500;
let usdt = 5.00;
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

function showToast(msg){alert(msg)}

function init() {
    try {
        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();
        USER_ID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'guest';
        username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'Guest';
    } catch(e){}
    
    coins = parseFloat(localStorage.getItem('coins')) || 500;
    usdt = parseFloat(localStorage.getItem('usdt')) || 5.00;
    
    loadMinerData();
    updateUI();
    renderMiners();
    checkDaily();
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
    event?.target?.classList?.add('active');
}

function showTopTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.top-tab').forEach(n => n.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
}

function updateTotalIncome(){let total=0;MINERS.forEach(m=>{if(minerData[m.id].owned)total+=m.reward});document.getElementById('totalIncome').innerText=total.toLocaleString()+' APU/h'}
function renderMiners(){const c=document.getElementById('minerList');c.innerHTML='';MINERS.forEach(m=>{const d=minerData[m.id];c.innerHTML+=`<div class="miner-card"><div class="miner-header"><div class="miner-name">${m.icon} ${m.name}</div></div><div class="miner-info">Earn: ${m.reward} APU/hour</div><button class="miner-btn btn-buy" onclick="showToast('Buy Disabled')">TEST</button></div>`})}
function checkDaily(){const b=document.getElementById('dailyClaimBtn');if(localStorage.getItem('lastDailyClaim')===new Date().toDateString()){b.disabled=true;b.innerText="✅ CLAIMED TODAY"}}
function claimDaily(){if(localStorage.getItem('lastDailyClaim')===new Date().toDateString())return showToast("Already claimed");coins+=50;localStorage.setItem('coins',coins);localStorage.setItem('lastDailyClaim',new Date().toDateString());updateUI();checkDaily();showToast("+50 APU!")}
function watchHomeAd(){const n=Date.now();if((COOLDOWN_TIME-(n-lastAdTime))>0)return showToast("Wait 5s");lastAdTime=n;coins+=10;trackTotalAds();updateUI();showToast("+10 APU!")}
function trackTotalAds(){totalAdsWatched+=1;localStorage.setItem('totalAdsWatched',totalAdsWatched)}
function openAdmin(){showToast("Admin")}

window.onload = init;