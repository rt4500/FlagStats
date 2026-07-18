const fs=require('fs');
let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
global.localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v}};
global.document={getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null,body:{classList:{toggle:()=>{}},appendChild:()=>{}},addEventListener:()=>{}};
global.window={addEventListener:()=>{}};
let pushes=[];
global.fetch=async(url,opts)=>{ pushes.push({url,method:(opts&&opts.method)||'GET',body:opts&&opts.body});
  if(!opts||!opts.method) return {ok:true,json:async()=>[{type:'flagstats-live',updated:Date.now(),device:'devA',game:{id:'x',plays:[],settings:null,teams:{home:{name:'A'},away:{name:'B'}}}}]};
  return {ok:true,json:async()=>({})}; };
let timers=[];
global.setInterval=()=>0; global.clearInterval=()=>{}; global.setTimeout=(f)=>{timers.push(f);return timers.length}; global.clearTimeout=()=>{};
global.navigator={}; global.render=()=>{}; global.toast=()=>{};
js=js.split('/* ============================================================\n   SHELL')[0];
// bake a config as the deployer would
js=js.replace("url:'',    //","url:'https://flagstats-live.test.workers.dev', //")
     .replace("token:''   //","token:'SECRET' //");
js=js.replace('let games=store.load','globalThis.games=store.load')
     .replace('let activeId=store.load','globalThis.activeId=store.load')
     .replace('let prefs=store.load','globalThis.prefs=store.load')
     .replace('let deviceId=store.load','globalThis.deviceId=store.load');
eval(js);
(async()=>{
  const S=defaultSettings();
  const g={id:'g1',plays:[{type:'run',startSpot:5,endSpot:12,rusher:'x'}],settings:S,
    teams:{home:{name:'A',players:[]},away:{name:'B',players:[]}}};
  games.push(g); globalThis.activeId='g1';
  // auto mode with NO user prefs at all
  console.log('autoMode with zero user config:', autoMode()===true);
  persist();
  console.log('push scheduled:', timers.length>0);
  for(const f of timers) await f();
  const put=pushes.find(p=>p.method==='PUT');
  console.log('PUT url:', put.url);
  console.log('correct route + token + deviceId:',
    put.url.includes('/g/'+globalThis.deviceId) && put.url.includes('t=SECRET'));
  const payload=JSON.parse(put.body);
  console.log('payload device tagged:', payload.device===globalThis.deviceId, '| synced marker:', g._syncedPlays===1);
  // viewer with zero config
  console.log('viewerConfigured:', viewerConfigured()===true);
  await fetchLive();
  console.log('live list fetched:', Object.keys(liveGames).length===1, '| keyed by device:', !!liveGames['devA']);
  // opt-out toggle works
  prefs.syncOn=false;
  console.log('opt-out disables:', autoMode()===false && syncConfigured()===false);
  console.log('ALL PASS =', put.url.includes('/g/')&&payload.device===globalThis.deviceId&&Object.keys(liveGames).length===1&&autoMode()===false);
})();
