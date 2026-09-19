let speedConfig={
  speed:1,
  cbSetIntervalChecked:true,
  cbSetTimeoutChecked:false,
  cbPerformanceNowChecked:false,
  cbDateNowChecked:true,
  cbRequestAnimationFrameChecked:false
};

chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
  if(request.command==="setSpeedConfig"){
    speedConfig={
      speed:Number(request.config?.speed)||0,
      cbSetIntervalChecked:!!request.config?.cbSetIntervalChecked,
      cbSetTimeoutChecked:!!request.config?.cbSetTimeoutChecked,
      cbPerformanceNowChecked:!!request.config?.cbPerformanceNowChecked,
      cbDateNowChecked:request.config?.cbDateNowChecked!==false,
      cbRequestAnimationFrameChecked:!!request.config?.cbRequestAnimationFrameChecked
    };
    window.postMessage({command:"setSpeedConfig",config:speedConfig});
    sendResponse({ok:true});
  } else if(request.command==="getSpeedConfig") sendResponse(speedConfig);
  return true;
});
window.addEventListener("message",e=>{
  if(e.data?.command==="getSpeedConfig")
    window.postMessage({command:"setSpeedConfig",config:speedConfig});
});
let port=null;
function checkExtension(){
  try{
    if(!chrome.runtime?.id) throw new Error("Extension unavailable");
    if(!port){
      port=chrome.runtime.connect({name:"chicken-state"});
      port.onDisconnect.addListener(()=>{
        port=null;
        window.postMessage({command:"setExtensionDateNowState",enabled:false});
      });
    }
    window.postMessage({command:"setExtensionDateNowState",enabled:true});
  }catch(e){
    window.postMessage({command:"setExtensionDateNowState",enabled:false});
    return;
  }
  setTimeout(checkExtension,250);
}
checkExtension();