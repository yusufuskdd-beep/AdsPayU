const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};const SAVE_KEY=`minerads_save_${user.id}`;const YOUR_WALLET_ADDRESS="UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv",CLAIM_COOLDOWN=3600000,MAX_ADS_PER_DAY=50,AD_REWARD=.002;const TONCENTER_API="https://toncenter.com/api/v2";let gigaReady=false,connector=null,connectedWallet=null,depositInterval=null,processedTxs=JSON.parse(localStorage.getItem(`processed_txs_${user.id}`)||'[]');function getUTCTimestamp(){return Date.now()}function getUTCDateString(t){const e=new Date(t);return`${e.getUTCFullYear()}-${e.getUTCMonth()+1}-${e.getUTCDate()}`}let balance=10,madBalance=0,lastTick=getUTCTimestamp(),minerInstances=[],nextInstanceId=1,lastDailyClaim=0,dailyStreak=0,lastMinerClaim=0,lastMadClaim=0,adsWatchedToday=0,lastAdResetDate="";

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

// TONCONNECT SDK WITH LOADER
function initTonConnect(){
  const checkSDK = setInterval(()=>{
    if(typeof TonConnect !== "undefined"){
      clearInterval(checkSDK);
      connector = new TonConnect.TonConnect({
        manifestUrl:"https://adspayu.vercel.app/tonconnect-manifest.json"
      });
      
      connector.onStatusChange(wallet=>{
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
      console.log("TonConnect SDK loaded");
    }
  }, 200);
}

const tabs={home:renderHome,shop:renderShop,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile};
document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});loadGame();updateBalance();renderHome();initTonConnect();document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");setTimeout(()=>{gigaReady=typeof window.showGiga==="function";renderHome()},2000)});

function getTotalRate(){return minerInstances.reduce((t,e)=>t+e.rate,0)}function getTotalMadRate(){return minerInstances.reduce((t,e)=>t+e.madRate,0)}function getTotalFarmed(){return minerInstances.reduce((t,e)=>t+e.farmed,0)}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10;madBalance=e.madBalance||0;minerInstances=e.minerInstances||[];nextInstanceId=e.nextInstanceId||1;lastMinerClaim=e.lastMinerClaim||0;lastMadClaim=e.lastMadClaim||0;adsWatchedToday=e.adsWatchedToday||0;minerInstances.forEach(t=>{const tmp=minerTemplates.find(m=>m.id===t.templateId);if(tmp)t.img=tmp.img});const i=(getUTCTimestamp()-lastTick)/1e3;minerInstances.forEach(t=>{t.farmed+=t.rate*i})}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,madBalance,lastTick:getUTCTimestamp(),minerInstances,nextInstanceId,lastMinerClaim,lastMadClaim,adsWatchedToday}))}
function updateBalance(){document.getElementById("balance").innerHTML=`${balance.toFixed(4)} TON<br><span style="font-size:12px;color:#F59E0B">${madBalance.toFixed(0)} MAD</span>`}
function getDailyReward(){return Math.min(.001+dailyStreak*.007,.05)}
function claimDaily(){const n=getDailyReward();balance+=n;dailyStreak++;updateBalance();saveGame();showPopup("success","Daily!",`+${n.toFixed(4)} TON`);renderHome()}
async function claimMiner(){const i=getTotalFarmed();if(i<.000001)return showPopup("alert","Empty","No TON");if(!gigaReady)return showPopup("alert","Loading","Wait 3s");await showRewardedAd();balance+=i;minerInstances.forEach(t=>