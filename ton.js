function initTonConnect(){
    if(!window.TON_CONNECT_UI)return setTimeout(initTonConnect,500);
    tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:'https://adspayu.vercel.app/tonconnect-manifest.json',buttonRootId:'connectBtn'});
    tonConnectUI.onStatusChange(wallet=>{
        if(wallet){userWalletAddress=wallet.account.address;walletConnected=true;localStorage.setItem('walletConnected','true');localStorage.setItem('walletAddress',userWalletAddress)}
        else{userWalletAddress=null;walletConnected=false;localStorage.setItem('walletConnected','false');localStorage.setItem('walletAddress','');showToast("TON Wallet Disconnected",'warning')}
        setTimeout(updateConnectBtn,100);updateUI()
    })
}