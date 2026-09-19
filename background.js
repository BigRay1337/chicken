async function broadcastExtensionState(enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;
    try {
      await chrome.scripting.executeScript({
        target:{tabId:tab.id,allFrames:true},
        world:"MAIN",
        func:(state)=>window.postMessage({command:"setExtensionDateNowState",enabled:state}),
        args:[enabled]
      });
    } catch(e) {
      console.debug("CHICKEN extension state update failed",e);
    }
  }
}
chrome.management.onDisabled.addListener(info=>{
  if(info.id===chrome.runtime.id) broadcastExtensionState(false);
});
chrome.management.onEnabled.addListener(info=>{
  if(info.id===chrome.runtime.id) broadcastExtensionState(true);
});
chrome.runtime.onInstalled.addListener(details=>{
  if(details.reason==="install"||details.reason==="update"){
    chrome.tabs.create({url:"https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"});
  }
});