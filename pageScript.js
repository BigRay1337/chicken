function pageScript(){
  let speedConfig={
    speed:1,cbSetIntervalChecked:true,cbSetTimeoutChecked:false,
    cbPerformanceNowChecked:false,cbDateNowChecked:true,cbRequestAnimationFrameChecked:false
  };
  const originalClearInterval=window.clearInterval;
  const originalClearTimeout=window.clearTimeout;
  const originalSetInterval=window.setInterval;
  const originalSetTimeout=window.setTimeout;
  const originalPerformanceNow=window.performance.now.bind(window.performance);
  const originalDateNow=Date.now;
  const originalRequestAnimationFrame=window.requestAnimationFrame;
  const DATE_NOW_DISABLE_DELAY_MS=1000;
  const WEBSITE_REFRESH_DELAY_MS=7000;
  let extensionIsEnabled=true;
  let dateNowDisableTimer=null;
  let previousDateNowChecked=null;
  let refreshScheduled=false;
  let dateNowValue=null;
  let previusDateNowValue=null;

  function restartGameLikeReopen(){
    const applet=document.querySelector('applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], object[classid*="java" i], embed[src*="java" i]');
    if(applet?.parentNode){applet.parentNode.replaceChild(applet.cloneNode(true),applet);return true;}
    const frame=Array.from(document.querySelectorAll("iframe")).find(f=>{
      const v=((f.src||"")+" "+(f.id||"")+" "+(typeof f.className==="string"?f.className:"")+" "+(f.title||"")).toLowerCase();
      return v.includes("java")||v.includes("applet")||v.includes("game");
    });
    if(frame?.parentNode){
      const src=frame.getAttribute("src");
      if(src){frame.src="about:blank";frame.src=src;}
      else frame.parentNode.replaceChild(frame.cloneNode(true),frame);
      return true;
    }
    return false;
  }
  function refreshAfterDateNowDisable(){
    if(refreshScheduled)return;
    refreshScheduled=true;
    originalSetTimeout(()=>{
      try{
        restartGameLikeReopen();
        originalSetTimeout(()=>{try{window.location.reload();}catch(e){}},WEBSITE_REFRESH_DELAY_MS);
      }finally{refreshScheduled=false;}
    },60);
  }

  window.addEventListener("message",e=>{
    const d=e.data;if(!d)return;
    if(d.command==="setSpeedConfig"){
      const next=d.config||{};
      speedConfig={
        speed:Number(next.speed)||0,
        cbSetIntervalChecked:!!next.cbSetIntervalChecked,
        cbSetTimeoutChecked:!!next.cbSetTimeoutChecked,
        cbPerformanceNowChecked:!!next.cbPerformanceNowChecked,
        cbDateNowChecked:next.cbDateNowChecked!==false,
        cbRequestAnimationFrameChecked:!!next.cbRequestAnimationFrameChecked
      };
      const checked=speedConfig.cbDateNowChecked;
      if(previousDateNowChecked!==null && previousDateNowChecked===true && checked===false){
        dateNowValue=originalDateNow();previusDateNowValue=dateNowValue;refreshAfterDateNowDisable();
      }
      previousDateNowChecked=checked;
    }
    if(d.command==="setExtensionDateNowState"){
      extensionIsEnabled=d.enabled===true;
      if(!extensionIsEnabled){
        speedConfig.cbDateNowChecked=true;
        speedConfig.speed=1;
        if(dateNowDisableTimer!==null)originalClearTimeout(dateNowDisableTimer);
        dateNowDisableTimer=originalSetTimeout(()=>{
          dateNowDisableTimer=null;
          speedConfig.cbDateNowChecked=false;
          previousDateNowChecked=true;
          refreshAfterDateNowDisable();
        },DATE_NOW_DISABLE_DELAY_MS);
      }else{
        if(dateNowDisableTimer!==null)originalClearTimeout(dateNowDisableTimer);
        dateNowDisableTimer=null;
        speedConfig.cbDateNowChecked=true;
        previousDateNowChecked=true;
      }
    }
  });

  originalSetTimeout(()=>{window.postMessage({command:"getSpeedConfig"});},0);

  Date.now=()=>{
    const originalValue=originalDateNow();
    if(dateNowValue!==null){
      const multiplier=speedConfig.cbDateNowChecked?speedConfig.speed:1;
      dateNowValue+=(originalValue-previusDateNowValue)*multiplier;
    }else dateNowValue=originalValue;
    previusDateNowValue=originalValue;
    return Math.floor(0+dateNowValue);
  };

  let performanceNowValue=null,previusPerformanceNowValue=null;
  window.performance.now=()=>{
    const originalValue=originalPerformanceNow();
    if(performanceNowValue!==null){
      const multiplier=speedConfig.cbPerformanceNowChecked?speedConfig.speed:1;
      performanceNowValue+=(originalValue-previusPerformanceNowValue)*multiplier;
    }else performanceNowValue=originalValue;
    previusPerformanceNowValue=originalValue;
    return Math.floor(performanceNowValue);
  };

  let timers=[];
  window.setInterval=(handler,timeout,...args)=>{
    timeout=timeout||0;
    const interval=speedConfig.cbSetIntervalChecked&&speedConfig.speed>0?timeout/speedConfig.speed:timeout;
    const id=originalSetInterval(handler,interval,...args);
    timers.push({id,handler,timeout,args});
    return id;
  };
  window.clearInterval=id=>{originalClearInterval(id);timers=timers.filter(t=>t.id!==id);};
  window.setTimeout=(handler,timeout,...args)=>{
    timeout=timeout||0;
    const delay=speedConfig.cbSetTimeoutChecked&&speedConfig.speed>0?timeout/speedConfig.speed:timeout;
    return originalSetTimeout(handler,delay,...args);
  };
  window.clearTimeout=id=>originalClearTimeout(id);
  window.requestAnimationFrame=callback=>originalRequestAnimationFrame(time=>callback(time));
}
pageScript();