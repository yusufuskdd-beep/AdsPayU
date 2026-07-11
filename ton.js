let depositInputEl, withdrawInputEl, tonConnectUI = null;

function loadTonPrice(){fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd').then(res=>res.json()).then(data=>{currentTonPrice=data['the-open-network'].usd}).catch(()=>{}).finally(()=>{const el=document.getElementById('tonRateText');if(el)el.innerText=`Rate: 1 TON = $${currentTonPrice.toFixed(2)} USDT\nSend TON to your in-game balance`})}

function openDeposit(){if(!window.tonConnectUI){showToast("Wallet loading...",'warning');return}loadTonPrice();depositInputEl=document.getElementById('depositInput');depositInputEl.value="0.5";depositInputEl.oninput=updateDepositPreview;updateDepositPreview();document.getElementById('depositModal').classList.add('active')}
function closeDeposit(){document.getElementById('depositModal').classList.remove('active')}
function updateDepositPreview(){const ton=parseFloat(depositInputEl.value)||0;const usdtValue=(ton*currentTonPrice).toFixed(2);document.getElementById('depositPreview').innerText=`You will receive: ${usdtValue} USDT`}
async function confirmDeposit(){if(!walletConnected)return showToast("Connect TON wallet first",'error');const amountTON=parseFloat(depositInputEl.value);if(!amountTON||amountTON<0.1)return showToast("Min deposit 0.1 TON",'error');const usdtToReceive=(amountTON*currentTonPrice).toFixed(2);if(!confirm(`Send ${amountTON} TON = ${usdtToReceive} USDT?\n\nTo: ${YOUR_TON_WALLET}`))return;document.getElementById('depositConfirmBtn').disabled=true;const amountNano=(amountTON*1e6).toString();const transaction={validUntil:Math.floor(Date.now()/1e3)+600,messages:[{address:YOUR_TON_WALLET,amount:amountNano,payload:userWalletAddress}]};try{await tonConnectUI.sendTransaction(transaction);showToast(`Sent ${amountTON} TON! Crediting...`,'success');setTimeout(()=>{usdt+=parseFloat(usdtToReceive);localStorage.setItem('usdt',usdt);updateUI();closeDeposit();showToast(`+${usdtToReceive} USDT Credited!`,'success')},15e3)}catch(e){showToast("Transaction cancelled",'error')}document.getElementById('depositConfirmBtn').disabled=false}

function initTonConnect(){
    if(!window.TON_CONNECT_UI)return setTimeout(initTonConnect,500);
    tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:'https://adspayu.vercel.app/tonconnect-manifest.json',buttonRootId:'connectBtn'});
    tonConnectUI.onStatusChange(wallet=>{
        if(wallet){userWalletAddress=wallet.account.address;walletConnected=true;localStorage.setItem('walletConnected','true');localStorage.setItem('walletAddress',userWalletAddress)}
        else{userWalletAddress=null;walletConnected=false;localStorage.setItem('walletConnected','false');localStorage.setItem('walletAddress','');showToast("TON Wallet Disconnected",'warning')}
        setTimeout(updateConnectBtn,100);updateUI()
    })
}
function updateConnectBtn(){const btn=document.getElementById('connectBtn');const addrEl=document.getElementById('tonAddress');if(!btn||!addrEl)return;if(walletConnected&&userWalletAddress){const shortAddr=userWalletAddress.slice(0,4)+'...'+userWalletAddress.slice(-4);btn.innerText=`✅ ${shortAddr}`;btn.style.background="#00C853";btn.onclick=()=>tonConnectUI.disconnect();addrEl.innerText=shortAddr}else{btn.innerText="🔗 CONNECT TON";btn.style.background="#FF8A00";btn.onclick=()=>tonConnectUI.openModal();addrEl.innerText="Not Connected"}}

function openWithdraw(){if(!walletConnected)return showToast("Connect TON wallet first",'error');withdrawInputEl=document.getElementById('withdrawInput');withdrawInputEl.value="0.50";withdrawInputEl.oninput=updateWithdrawPreview;updateWithdrawPreview();document.getElementById('withdrawModal').classList.add('active')}
function closeWithdraw(){document.getElementById('withdrawModal').classList.remove('active')}
function updateWithdrawPreview(){const amount=parseFloat(withdrawInputEl.value)||0;const fee=amount*0.05;const receive=(amount-fee).toFixed(4);document.getElementById('withdrawPreview').innerText=`Fee: ${fee.toFixed(4)} USDT | You will receive: ${receive} USDT`}
function requestWithdraw(){
    const amount=parseFloat(withdrawInputEl.value)||0;
    if(amount<0.5)return showToast("Minimum withdraw is $0.50 USDT",'error');
    if(amount>usdt)return showToast("Not enough USDT balance",'error');
    if(!userWalletAddress)return showToast("Connect wallet first",'error');
    const fee=amount*0.05;const receive=amount-fee;
    const request={id:Date.now(),amount:amount,fee:fee,receive:receive,wallet:userWalletAddress,date:new Date().toLocaleString(),status:"pending"};
    let requests=JSON.parse(localStorage.getItem('withdrawRequests')||'[]');requests.push(request);
    localStorage.setItem('withdrawRequests',JSON.stringify(requests));
    usdt-=amount;localStorage.setItem('usdt',usdt);updateUI();closeWithdraw();
    showToast(`Request Sent! ${receive.toFixed(4)} USDT`,'success');
}