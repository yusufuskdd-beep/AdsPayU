function init(){
    updateUI();
    checkDaily();
    renderMiners();
    updateTotalIncome();
    loadTonPrice();
    initTonConnect();
    
    setInterval(updateAllMiners, 1000);
    
    const uid = document.getElementById('userId');
    if(uid) uid.innerText = tg.initDataUnsafe?.user?.id || 'Guest';
    
    const un = document.getElementById('username');
    if(un) un.innerText = tg.initDataUnsafe?.user?.username || '-';
    
    // BIND WALLET BUTTONS AFTER PAGE LOADS
    document.getElementById('depositBtn').onclick = openDeposit;
    document.getElementById('withdrawBtn').onclick = openWithdraw;
}

function showToast(msg,type='success'){
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    setTimeout(()=>{ toast.classList.remove('show') }, 2500)
}

function showTopTab(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.top-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('tab' + id.charAt(0).toUpperCase() + id.slice(1)).classList.add('active')
}

function showTab(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.target.closest('.nav-item').classList.add('active');
    if(id === 'admin'){ renderAdminRequests(); }
}

init();