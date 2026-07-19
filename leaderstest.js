const fs=require('fs');
let js=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
global.localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v}};
global.document={getElementById:()=>null,querySelectorAll:()=>null,querySelector:()=>null,body:{classList:{toggle:()=>{}},appendChild:()=>{}},addEventListener:()=>{}};
global.window={addEventListener:()=>{}};
global.setInterval=()=>0; global.setTimeout=()=>1; global.clearTimeout=()=>{}; global.clearInterval=()=>{};
global.navigator={}; global.render=()=>{}; global.toast=()=>{};
js=js.split('/* ============================================================\n   SHELL')[0];
eval(js);
const S=defaultSettings();
const game={settings:S,teams:{
  home:{name:'Switzerland',players:[{id:'q',num:'12',name:'QB'},{id:'r',num:'7',name:'WR'}]},
  away:{name:'Ireland',players:[{id:'d',num:'21',name:'CB'}]}},
  plays:[
    {type:'pass',startSpot:5,endSpot:20,complete:true,passer:'q',receiver:'r',flagPullBy:'d'},
    {type:'run',startSpot:20,endSpot:50,rusher:'r',touchdown:true},
    {type:'pat',pat:{type:'1',good:true,via:'pass'},passer:'q',receiver:'r'},
  ]};
// replicate the renderTourney aggregation exactly
const tourneyGames=[game];
const agg={};
tourneyGames.forEach(g=>{
  const stats=computeStats(g);
  ['home','away'].forEach(side=>{
    rosterOf(g,side).forEach(p=>{ const s=stats[side][p.id]; if(!s)return;
      const key=g.teams[side].name+'|'+p.num;
      if(!agg[key]) agg[key]={team:g.teams[side].name,num:p.num,name:p.name||'',line:blankLine()};
      for(const k in s) agg[key].line[k]+=s[k];
    });
  });
});
const all=Object.values(agg);
console.log('agg entries:', all.length, '(expect 3)');
all.forEach(a=>console.log(' ', a.team, '#'+a.num, 'passYds',a.line.passYds,'recYds',a.line.recYds,'rushYds',a.line.rushYds,'flags',a.line.flags,'NaN?',Object.values(a.line).some(v=>Number.isNaN(v))));
