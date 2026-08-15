const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');
let user=tg.initDataUnsafe.user||{first_name:"User",id:"guest"};
const SAVE_KEY=`minerads_save_${user.id}`,TASK_KEY=`minerads_tasks_${user.id}`;
const CLAIM_COOLDOWN=3e4,MAX_ADS_PER_DAY=50,AD_REWARD=.002;

function getUTCTimestamp(){return Date.now()}
function getUTCDateString(t){const e=new Date(t);return`${e.getUTCFullYear()}-${e.getUTCMonth()+1}-${e.getUTCDate()}`}

let balance=10,completedTasks=[],activeTaskTab="oneTime",taskProgress={},lastDailyClaim=0,dailyStreak=0,adsWatchedToday=0,lastAdResetDate="";

const tasksData={oneTime:[{id:"join_channel",title:"Join Telegram Channel",reward:.1,link:"https://t.me/MinerAAds",type:"join"},{id:"join_chat",title:"Join Telegram Chat",reward:.1,link:"https://t.me/+EiLZpWqcoA8zYjU0",type:"join"}],ads:[{id:"watch_ad",title:"Watch Rewarded Ad",reward:AD_REWARD,type:"ad"}],partnership:[]};

function showPopup(t,e,i){const n={success:"✅",error:"❌",info:"💰",alert:"⚠️"}[t]||"ℹ️",o=document.createElement("div");o.className="popup-overlay",o.innerHTML=`<div class="popup"><div class="popup-icon">${n}</div><h3>${e}</h3><p>${i}</p><button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">OK</button></div>`,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&o.remove()},3e3)}
function showRewardedAd(){return new Promise((t,e)=>{"function"!=typeof window.showGiga?(showPopup("error","Ad Error","Ad network not loaded. Refresh."),e(!1)):window.showGiga().then(()=>t(!0)).catch(()=>e(!1))})}

let tonConnectUI;
try{tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:"https://adspayu.vercel.app/tonconnect-manifest.json"}),tonConnectUI.onStatusChange(()=>{"wallet"===document.querySelector(".tabbar button.active")?.dataset.tab&&renderWallet()})}catch(t){console.error("TonConnect init error",t)}

const tabs={home:renderHome,tasks:renderTasks,referral:renderReferral,wallet:renderWallet,profile:renderProfile}; // REMOVED SHOP
document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active")),t.classList.add("active"),tabs[t.dataset.tab]()}}),loadGame(),updateBalance(),renderHome(),document.querySelector('.tabbar button[data-tab="home"]').classList.add("active")});

function checkDailyReset(){const t=getUTCDateString(getUTCTimestamp());t!==lastAdResetDate&&(adsWatchedToday=0,lastAdResetDate=t)}

function loadGame(){const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);balance=e.balance||10,taskProgress=e.taskProgress||{},lastDailyClaim=e.lastDailyClaim||0,dailyStreak=e.dailyStreak||0,adsWatchedToday=e.adsWatchedToday||0,lastAdResetDate=e.lastAdResetDate||"",checkDailyReset(),lastDailyClaim>0&&getUTCDateString(lastDailyClaim)!==getUTCDateString(getUTCTimestamp())&&getUTCDateString(lastDailyClaim)!==getUTCDateString(getUTCTimestamp()-864e5)&&(dailyStreak=0)}const e=localStorage.getItem(TASK_KEY);e&&(completedTasks=JSON.parse(e)),saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({balance,taskProgress,lastDailyClaim,dailyStreak,adsWatchedToday,lastAdResetDate})),localStorage.setItem(TASK_KEY,JSON.stringify(completedTasks))}

function updateBalance(){const t=document.getElementById("balance");t&&(t.innerText=`${balance.toFixed(4)} TON`)}
function getDailyReward(){return Math.min(.001+dailyStreak*.007,.05)}
function claimDaily(){const t=getUTCTimestamp(),e=getUTCDateString(lastDailyClaim),i=getUTCDateString(t);if(e===i)return showPopup("alert","Already Claimed","You can claim again tomorrow at 00:00 UTC");getUTCDateString(lastDailyClaim)!==getUTCDateString(t-864e5)&&(dailyStreak=0),dailyStreak=Math.min(dailyStreak+1,7);const n=getDailyReward();balance+=n,lastDailyClaim=t,updateBalance(),saveGame(),tg.HapticFeedback.impactOccurred("medium"),showPopup("success","Daily Reward!",`+${n.toFixed(4)} TON\nStreak: ${dailyStreak} days 🔥`),renderHome()}

async function watchAdMain(){ // NEW MAIN BUTTON
checkDailyReset();
if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Daily Limit Reached",`You watched ${MAX_ADS_PER_DAY}/50 ads today. Resets at 00:00 UTC.`);
showPopup("info","Loading Ad","Please watch the ad to earn");
try{await showRewardedAd(),adsWatchedToday++,balance+=AD_REWARD,updateBalance(),saveGame(),tg.HapticFeedback.impactOccurred("light"),showPopup("success","Earned!",`+${AD_REWARD} TON\nProgress: ${adsWatchedToday}/${MAX_ADS_PER_DAY}`),renderHome()}catch{showPopup("error","Ad Skipped","You must watch the full ad to earn")}
}

async function watchAdTask(){checkDailyReset();if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Daily Limit Reached",`You watched ${MAX_ADS_PER_DAY}/50 ads today. Resets at 00:00 UTC.`);showPopup("info","Loading Ad","Please watch the ad to earn");try{await showRewardedAd(),adsWatchedToday++,balance+=AD_REWARD,updateBalance(),saveGame(),tg.HapticFeedback.impactOccurred("light"),showPopup("success","Earned!",`+${AD_REWARD} TON\nProgress: ${adsWatchedToday}/${MAX_ADS_PER_DAY}`),renderTasks()}catch{showPopup("error","Ad Skipped","You must watch the full ad to earn")}}

function renderHome(){
const i=getDailyReward(),n=getUTCDateString(lastDailyClaim)!==getUTCDateString(getUTCTimestamp());
let s="<div class=\"streak-box\">";for(let t=1;t<=7;t++){const e=t<=dailyStreak?"active":"",i=t===dailyStreak+1&&n?"today":"";s+=`<div class="streak-day ${e} ${i}">Day ${t}<br>${(.001+(t-1)*.007).toFixed(3)}</div>`}s+="</div>",
document.getElementById("content").innerHTML=`<div class="card"><h2>Welcome, ${user.first_name}</h2><p>Earn TON by watching ads</p></div><div class="card"><h3>🎁 Daily Reward</h3><p>Claim once per 24h. Resets 00:00 UTC</p>${s}<p>Next Reward: <b>${i.toFixed(4)} TON</b></p><button class="btn" ${!n?"disabled":""} onclick="claimDaily()">${n?`CLAIM ${i.toFixed(4)} TON`:"CLAIMED TODAY"}</button></div><div class="card"><h3>📺 Watch & Earn</h3><p>Earn <b>${AD_REWARD} TON</b> per ad. Max ${MAX_ADS_PER_DAY}/day</p><button class="btn btn-ad" onclick="watchAdMain()">WATCH AD +${AD_REWARD} TON</button><p style="font-size:11px; color:var(--muted); text-align:center; margin-top:8px">Watched today: ${adsWatchedToday}/${MAX_ADS_PER_DAY}</p></div>`}

function resetTasks(){tg.showPopup({title:"Reset All Tasks?",message:"This cannot be undone",buttons:[{id:"ok",type:"destructive"},{type:"cancel"}]},t=>{"ok"===t&&(completedTasks=[],taskProgress={},adsWatchedToday=0,saveGame(),showPopup("success","Reset Done","All tasks reset"),renderProfile())}}
function isTaskComplete(t){return"join"===t.type?!!taskProgress[t.id]:"ad"===t.type?!1:!1}
function completeTask(t,e){if(completedTasks.includes(t))return showPopup("alert","Already Claimed","You already claimed this reward");const i=Object.values(tasksData).flat().find(e=>e.id===t);if(!isTaskComplete(i))return showPopup("error","Not Done Yet","Please complete the task first");completedTasks.push(t),balance+=e,updateBalance(),saveGame(),tg.HapticFeedback.impactOccurred("light"),showPopup("success","Reward Claimed!",`+${e} TON added to balance`),renderTasks()}
function markTaskProgress(t){taskProgress[t]=!0,saveGame(),showPopup("success","Verified!","You can now claim the reward"),renderTasks()}
function renderTasks(){checkDailyReset();const t=["oneTime","ads","partnership"].map(t=>{const e="oneTime"===t?"One Time":"ads"===t?"Ads":"Partnership",i=t===activeTaskTab?"active":"";return`<button class="subtab-btn ${i}" onclick="switchTaskTab('${t}')">${e}</button>`}).join(""),e=tasksData[activeTaskTab];let i="";if("ads"===activeTaskTab){const t=adsWatchedToday/MAX_ADS_PER_DAY*100,n=adsWatchedToday<MAX_ADS_PER_DAY;i=`<div class="card"><h3>📺 Watch Ads & Earn</h3><p>Earn <b>${AD_REWARD} TON</b> per ad. Max ${MAX_ADS_PER_DAY}/day. Resets 00:00 UTC</p><div class="progress"><div class="progress-bar" style="width:${t}%"></div></div><p style="text-align:center; color:var(--muted); font-size:12px">${adsWatchedToday}/${MAX_ADS_PER_DAY} Ads Watched Today</p><button class="btn btn-ad" ${!n?"disabled":""} onclick="watchAdTask()">${n?`WATCH AD +${AD_REWARD} TON`:"LIMIT REACHED"}</button></div>`}else i=0===e.length?`<div class="card"><p style="text-align:center; color:var(--muted)">No tasks here yet</p></div>`:e.map(t=>{const e=completedTasks.includes(t.id),i=isTaskComplete(t),n=!taskProgress[t.id]&&!e?`<button class="btn" style="width:80px; background:#fbbf24; color:#000; margin-right:8px" onclick="markTaskProgress('${t.id}')">Verify</button>`:"",o=`<button class="btn" style="width:70px; background:#1e2a40; margin-right:8px" onclick="tg.openTelegramLink('${t.link}'); setTimeout(() => markTaskProgress('${t.id}'), 1000)">Join</button>${n}`;let s="Claim",a=!i,r=a?"opacity:0.4":"";return e&&(s="DONE",a=!0,r="background:linear-gradient(90deg,#22c55e,#16a34a); opacity:1"),`<div class="card" style="display:flex; justify-content:space-between; align-items:center"><div><h3>${t.title}</h3><p>Reward: <b>${t.reward} TON</b></p><p style="font-size:11px; color:${e?"#22c55e":i?"#fbbf24":"var(--muted)"}">${e?"Completed":i?"Ready to claim":"Incomplete"}</p></div><div style="display:flex">${o}<button class="btn" style="width:80px; ${r}" ${a?"disabled":""} onclick="completeTask('${t.id}', ${t.reward})">${s}</button></div></div>`}).join("");document.getElementById("content").innerHTML=`<h2>Tasks</h2><div class="subtabs">${t}</div>${i}`}
function switchTaskTab(t){activeTaskTab=t,renderTasks()}

function renderWallet(){const t=tonConnectUI&&tonConnectUI.connected,e=t?tonConnectUI.account.address.slice(0,6)+"..."+tonConnectUI.account.address.slice(-4):"Not Connected";document.getElementById("content").innerHTML=`<h2>Wallet</h2><div class="card"><h3>Wallet Status</h3><p style="color:var(--muted); font-size:12px">Connected: <b>${e}</b></p><div id="ton-connect-button" style="margin-bottom:8px"></div>${!t?'<button class="btn" onclick="connectWallet()">Connect Wallet</button>':""}${t?'<button class="btn" style="background:var(--danger)" onclick="disconnectWallet()">Disconnect</button>':""}</div>`,setTimeout(()=>{tonConnectUI&&tonConnectUI.mount("#ton-connect-button")},100)}
async function connectWallet(){tonConnectUI&&await tonConnectUI.connectWallet()}
async function disconnectWallet(){await tonConnectUI.disconnect(),showPopup("info","Disconnected","Wallet disconnected"),renderWallet()}

function renderReferral(){const t=`https://t.me/AdsPayU_bot?start=${user.id}`;document.getElementById("content").innerHTML=`<h2>Referral</h2><div class="card"><p>Earn 10% from friends activity</p><input value="${t}" readonly style="width:100%;padding:8px;border-radius:8px;background:var(--card-2);border:1px solid var(--border);color:var(--text)"/><button class="btn" onclick="copyRef('${t}')">Copy Link</button></div>`}
function copyRef(t){navigator.clipboard?navigator.clipboard.writeText(t):tg.showPopup({message:t}),showPopup("success","Copied","Referral link copied")}

function renderProfile(){document.getElementById("content").innerHTML=`<h2>Profile</h2><div class="card"><p><b>Name:</b> ${user.first_name}</p><p><b>ID:</b> ${user.id}</p><p><b>Daily Streak:</b> ${dailyStreak} days</p><p><b>Ads Watched:</b> ${adsWatchedToday}/${MAX_ADS_PER_DAY}</p></div><div class="card"><h3>Developer Tools</h3><button class="btn" style="background:var(--danger)" onclick="resetTasks()">Reset All Tasks</button></div>`}

setInterval(saveGame,1e4);