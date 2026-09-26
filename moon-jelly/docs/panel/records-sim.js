// 模擬：一天 3–5 筆、混合陪法，照 Eco.rebuild 與 ORIGIN_MAX 的規則算海裡剩什麼
const DAY = 86400000;
function rng(seed){let s=seed;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};}
// 陪法分佈（估計：先著陸與讓它待著較常用；正向家族用 savor/thank/keep）
const NEG=['allow','ground','reframe','need','kind','step','release',null];
const NEGW=[0.2,0.15,0.12,0.13,0.12,0.1,0.13,0.05];
const POS=['savor','thank','keep','allow'];
const POSW=[0.4,0.3,0.2,0.1];
const FAMS=['anger','anx','shame','sad','lonely','tired','calm','joy','warm','fog'];
function pick(r,a,w){let x=r(),acc=0;for(let i=0;i<a.length;i++){acc+=w[i];if(x<acc)return a[i];}return a[a.length-1];}
function simulate(days,perDayMin,perDayMax,seed){
  const r=rng(seed);const E=[];const now=Date.now();const start=now-days*DAY;
  for(let d=0;d<days;d++){const n=perDayMin+Math.floor(r()*(perDayMax-perDayMin+1));
    for(let k=0;k<n;k++){const fam=FAMS[Math.floor(r()*10)];const pos=['calm','joy','warm'].includes(fam);
      const turn=pos?pick(r,POS,POSW):pick(r,NEG,NEGW);
      const e={id:E.length,t:start+d*DAY+k*3600000*4,fam,turn,needs:turn==='need'?['rest']:[],step:turn==='step'?{status:r()<0.6?'done':'open'}:null};
      if(!e.turn&&now-e.t>7*DAY){e.turn='release';e.auto=true;}
      E.push(e);}}
  return E;
}
function inSea(E){const now=Date.now();const keep=new Set();const cnt={};
  const take=(list,n,name)=>{const s=list.slice(-n);s.forEach(e=>keep.add(e.id));cnt[name]=s.length;return s;};
  take(E.filter(e=>!e.turn),8,'幼生');
  take(E.filter(e=>e.turn==='reframe'),8,'寄居蟹');
  const fish=[];for(const e of E)if(e.turn==='need')for(const n of e.needs.slice(0,2))fish.push(e);
  take(fish,36,'燈籠魚');
  take(E.filter(e=>e.turn==='kind'),15,'小丑魚');
  take(E.filter(e=>e.turn==='step'&&e.step&&e.step.status!=='dropped'),4,'海龜');
  take(E.filter(e=>e.turn==='ground'),8,'海馬');
  const tears=E.filter(e=>e.turn==='release'&&now-e.t<3*DAY);tears.forEach(e=>keep.add(e.id));cnt['藍眼淚']=tears.length;
  take(E.filter(e=>e.turn==='savor'||e.turn==='thank'),40,'珊瑚');
  take(E.filter(e=>e.turn==='keep'),4,'瓶中信');
  take(E.filter(e=>e.turn==='allow'),12,'心情水母');
  const byFam={};for(const e of E)if(e.turn&&e.fam)(byFam[e.fam]=byFam[e.fam]||[]).push(e);
  cnt['珍珠貝']=Math.min(4,Object.keys(byFam).filter(f=>byFam[f].length>=3).length);
  const recent=new Set(E.filter(e=>e.turn&&now-e.t<30*DAY).map(e=>e.turn));cnt['章魚']=recent.size>=4?1:0;
  const total=Object.values(cnt).reduce((a,b)=>a+b,0);
  const gone=E.filter(e=>!keep.has(e.id)).length;
  return {cnt,total,entries:E.length,inSea:keep.size,gone,pct:Math.round(100*gone/E.length)};
}
const out=[];
for(const days of [7,30,90,180,365]){
  const res=[];for(let s=1;s<=20;s++){res.push(inSea(simulate(days,3,5,s)));}
  const avg=k=>Math.round(res.reduce((a,x)=>a+x[k],0)/res.length);
  const cnt={};for(const k of Object.keys(res[0].cnt))cnt[k]=Math.round(res.reduce((a,x)=>a+x.cnt[k],0)/res.length);
  out.push({days,entries:avg('entries'),inSea:avg('inSea'),gone:avg('gone'),pct:avg('pct'),creatures:avg('total'),cnt});
}
console.log(JSON.stringify(out,null,1));
// 每種幾天會滿（用平均比例：每天 4 筆）
const share={'幼生(5%)':0.05*0.7,'寄居蟹':0.12*0.7,'燈籠魚':0.13*0.7,'小丑魚':0.12*0.7,'海龜':0.10*0.7,'海馬':0.15*0.7,'珊瑚':0.7*0.3,'瓶中信':0.2*0.3,'心情水母':0.2*0.7+0.1*0.3};
const cap={'幼生(5%)':8,'寄居蟹':8,'燈籠魚':36,'小丑魚':15,'海龜':4,'海馬':8,'珊瑚':40,'瓶中信':4,'心情水母':12};
for(const k of Object.keys(cap))console.log(k,'每天約',(4*share[k]).toFixed(2),'筆，上限',cap[k],'→ 約',Math.ceil(cap[k]/(4*share[k])),'天滿');
