
/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let rawRows=[], allCols=[], charts={}, beatData=[], breathData=[];
let currentMode='hrv', startMode='hrv', inputType='signal';
let ibiXY=[], roiActive=false, roiStart=null, roiEnd=null;
let fullIbis=[], fullIbiTimes=[];

/* ═══════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════ */
let isDark=true;
function toggleTheme(){
  isDark=!isDark;
  document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
  const icon=document.getElementById('themeIcon');
  icon.innerHTML=isDark
    ?'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    :'<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>';
  // re-render charts to pick up new colors
  Object.values(charts).forEach(c=>{try{c.update();}catch(e){}});
}

/* ═══════════════════════════════════════════════
   STEP FLOW
═══════════════════════════════════════════════ */
function selectStartMode(m){
  startMode=m;
  document.getElementById('cardHRV').className='mode-card'+(m==='hrv'?' selected-hrv':'');
  document.getElementById('cardBRV').className='mode-card'+(m==='brv'?' selected-brv':'');
  const btn=document.getElementById('step1Btn');
  btn.style.opacity='1';btn.style.pointerEvents='auto';
}
function goToStep2(){
  inputType='signal';
  document.body.classList.remove('on-step1','on-main');
  document.body.classList.add('on-step2');
  document.body.style.overflow='';
  document.body.style.height='';
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  document.getElementById('step2ModeLabel').textContent=startMode.toUpperCase()+' Analysis';
  document.getElementById('itypeSig').className='itype-btn active';
  document.getElementById('itypeIbi').className='itype-btn';
  setInputType('signal');
}
/* Back from the main app (raw-signal/interval setup, either mode) to the
   upload screen — one step back, not all the way to mode selection. Reflects
   whichever mode is CURRENTLY active (currentMode), which can differ from
   the mode originally picked at step 1 if the user has since used the
   HRV/BRV toggle inside the main app. Clears loaded data/charts, since
   returning here means a (possibly new) file needs to be loaded again to
   proceed — mirrors backToStep1()'s cleanup, just stops one screen earlier
   and leaves the mode-selection cards/startMode untouched. */
function backToStep2(){
  startMode=currentMode;
  document.body.classList.remove('on-step1','on-main');
  document.body.classList.add('on-step2');
  document.body.style.overflow='';
  document.body.style.height='';
  document.getElementById('mainSec').style.display='none';
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  document.getElementById('step2ModeLabel').textContent=startMode.toUpperCase()+' Analysis';
  const r=document.getElementById('hrvResultSec');if(r)r.style.display='none';
  const b=document.getElementById('brvResultSec');if(b)b.style.display='none';
  Object.keys(charts).forEach(k=>{try{charts[k].destroy();}catch(e){}delete charts[k];});
  rawRows=[];allCols=[];beatData=[];breathData=[];ibiXY=[];fullIbis=[];fullIbiTimes=[];
  ['hrvSigSetup','hrvIbiSetup','brvSigSetup','brvIbiSetup'].forEach(id=>{const c=document.getElementById(id);if(c)c.classList.remove('setup-card-collapsed');});
  document.getElementById('fi').value='';
  document.getElementById('itypeSig').className='itype-btn active';
  document.getElementById('itypeIbi').className='itype-btn';
  setInputType('signal');
}
function backToStep1(targetMode){
  // Switch body class first — CSS immediately hides mainSec and step2
  document.body.classList.remove('on-step2','on-main');
  document.body.classList.add('on-step1');
  document.body.style.overflow='hidden';
  document.body.style.height='100vh';
  // Also set display explicitly as belt-and-suspenders
  document.getElementById('mainSec').style.display='none';
  document.getElementById('step2').style.display='none';
  document.getElementById('step1').style.display='block';
  // Explicitly hide result sections
  const r=document.getElementById('hrvResultSec');if(r)r.style.display='none';
  const b=document.getElementById('brvResultSec');if(b)b.style.display='none';
  // Clear all data and charts
  Object.keys(charts).forEach(k=>{try{charts[k].destroy();}catch(e){}delete charts[k];});
  rawRows=[];allCols=[];beatData=[];breathData=[];ibiXY=[];fullIbis=[];fullIbiTimes=[];inputType='signal';
  ['hrvSigSetup','hrvIbiSetup','brvSigSetup','brvIbiSetup'].forEach(id=>{const c=document.getElementById(id);if(c)c.classList.remove('setup-card-collapsed');});
  document.getElementById('fi').value='';
  // Reset step1 to clean state
  document.getElementById('cardHRV').className='mode-card';
  document.getElementById('cardBRV').className='mode-card';
  const btn=document.getElementById('step1Btn');
  btn.style.opacity='0.4';btn.style.pointerEvents='none';
  startMode=null;
  window.scrollTo({top:0,behavior:'instant'});
}

/* ═══════════════════════════════════════════════
   FILE
═══════════════════════════════════════════════ */
// Set initial page state — app starts on step1
document.body.className=(document.body.className+' on-step1').trim();
document.body.style.overflow='hidden';
document.body.style.height='100vh';

// File drop zone — guard against null in case DOM not ready
const dz=document.getElementById('dropZone');
if(dz){
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over')});
  dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');const f=e.dataTransfer.files[0];if(f)loadFile(f)});
}
document.getElementById('fi').addEventListener('change',e=>{if(e.target.files[0])loadFile(e.target.files[0])});

function loadFile(file){
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){const r=new FileReader();r.onload=ev=>{const res=Papa.parse(ev.target.result,{header:true,skipEmptyLines:true,dynamicTyping:true});initData(res.data,res.meta.fields,file.name)};r.readAsText(file);}
  else{const r=new FileReader();r.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const data=XLSX.utils.sheet_to_json(ws,{defval:null});initData(data,data.length?Object.keys(data[0]):[],file.name)};r.readAsArrayBuffer(file);}
}

function initData(data,fields,name){
  rawRows=data;allCols=fields;
  document.getElementById('step2').style.display='none';
  document.getElementById('mainSec').style.display='block';
  document.body.classList.remove('on-step1','on-step2');
  document.body.classList.add('on-main');
  document.body.style.overflow='';
  document.body.style.height='';
  window.scrollTo({top:0,behavior:'instant'});
  document.getElementById('fName').textContent=name;
  document.getElementById('fMeta').textContent=`${data.length.toLocaleString()} rows · ${fields.length} columns`;
  currentMode=startMode;
  const numCols=fields.filter(h=>data.some(r=>{const v=r[h];return typeof v==='number'||(typeof v==='string'&&v.trim()!==''&&isFinite(parseFloat(v)));}));
  ['ecgCol','ecgTimeCol','breathCol','breathTimeCol','ibiCol','brvIbiCol'].forEach(id=>{
    const s=document.getElementById(id),isOpt=id.includes('Time');
    s.innerHTML=isOpt?'<option value="">— none, use Fs —</option>':'<option value="">— select column —</option>';
    numCols.forEach(h=>{const o=document.createElement('option');o.value=h;o.textContent=h;s.appendChild(o)});
  });
  if(numCols.length>=1){
    document.getElementById('ecgCol').value=numCols[0];
    document.getElementById('breathCol').value=numCols[0];
    document.getElementById('ibiCol').value=numCols[0];
    document.getElementById('brvIbiCol').value=numCols[0];
  }
  if(numCols.length>=2){
    document.getElementById('breathCol').value=numCols[1];
    document.getElementById('brvIbiCol').value=numCols[1];
  }
  // activate correct mode
  switchMode(startMode);
  updateInputTypeUI();
  // reset results
  document.getElementById('hrvResultSec').style.display='none';
  document.getElementById('brvResultSec').style.display='none';
}

/* ═══════════════════════════════════════════════
   SLIDERS
═══════════════════════════════════════════════ */
[['sgWin','sgWinOut',v=>v],['sgPoly','sgPolyOut',v=>v],
 ['brSgWin','brSgWinOut',v=>v],['brSgPoly','brSgPolyOut',v=>v]
].forEach(([id,oid,fmt])=>{const el=document.getElementById(id);if(el)el.addEventListener('input',function(){document.getElementById(oid).textContent=fmt(this.value)})});

/* Peak-detection thresholds (height/distance/prominence, HRV + BRV) — slider
   and number box are two views of the same value, kept in sync both ways.
   Typing a value updates the slider (and therefore what runHRV()/runBRV()
   read) immediately; the algorithm always reads the slider's .value, so no
   other code needs to change. */
[['pkH','pkHOut',0,100,1],['pkD','pkDOut',1,2000,1],['pkP','pkPOut',0,100,1],
 ['brPkH','brPkHOut',0,100,1],['brPkD','brPkDOut',5,5000,5],['brPkP','brPkPOut',0,100,1],
 ['sigArtThresh','sigArtThreshOut',5,30,1],['brSigArtThresh','brSigArtThreshOut',5,30,1]
].forEach(([id,oid,lo,hi,step])=>{
  const rng=document.getElementById(id), num=document.getElementById(oid);
  if(!rng||!num) return;
  rng.addEventListener('input',()=>{num.value=rng.value;});
  num.addEventListener('input',()=>{
    const v=parseFloat(num.value);
    if(isFinite(v)) rng.value=Math.min(hi,Math.max(lo,v));
  });
  num.addEventListener('change',()=>{
    // On blur/enter, snap the box itself back into range (mid-typing values
    // like "-" or out-of-range numbers are allowed while editing, but not left behind)
    let v=parseFloat(num.value);
    if(!isFinite(v)) v=parseFloat(rng.value);
    v=Math.min(hi,Math.max(lo,v));
    const snapped=Math.round(v/step)*step;
    num.value=snapped; rng.value=snapped;
  });
});

function resetBands(){
  ['','_sig'].forEach(p=>{
    const s=id=>document.getElementById(id+p);
    if(s('vlfLo')){s('vlfLo').value=0.003;s('vlfHi').value=0.04;s('lfLo').value=0.04;s('lfHi').value=0.15;s('hfLo').value=0.15;s('hfHi').value=0.4;}
  });
}
function resetBrvBands(){
  ['','_sig'].forEach(p=>{
    const s=id=>document.getElementById(id+p);
    if(s('brVlfLo')){s('brVlfLo').value=0.003;s('brVlfHi').value=0.04;s('brLfLo').value=0.04;s('brLfHi').value=0.15;s('brHfLo').value=0.15;s('brHfHi').value=0.4;}
  });
}

/* ═══════════════════════════════════════════════
   MODE
═══════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════
   INPUT TYPE (signal vs intervals)
═══════════════════════════════════════════════ */
function updateArtCorrUI(){
  const enabled=document.getElementById('ibiArtCorr').checked;
  const opts=document.getElementById('artCorrOpts');
  if(opts) opts.style.opacity=enabled?'1':'0.4';
  opts.querySelectorAll('input').forEach(el=>el.disabled=!enabled);
}

function updateSgUI(){
  const enabled=document.getElementById('sgEnable').checked;
  const row=document.getElementById('sgRow');
  if(row) row.style.opacity=enabled?'1':'0.4';
  row.querySelectorAll('input').forEach(el=>el.disabled=!enabled);
}
function updateBrSgUI(){
  const enabled=document.getElementById('brSgEnable').checked;
  const row=document.getElementById('brSgRow');
  if(row) row.style.opacity=enabled?'1':'0.4';
  row.querySelectorAll('input').forEach(el=>el.disabled=!enabled);
}

function updateIbiUnits(){
  const u=document.getElementById('ibiUnits').value;
  const isMs=u==='ms';
  document.getElementById('ibiColLabel').textContent='IBI column ('+(isMs?'ms':'s')+')';
  document.getElementById('ibiFilterLabel').textContent='Filter min ('+(isMs?'ms':'s')+')';
  document.getElementById('ibiFilterLabel2').textContent='Filter max ('+(isMs?'ms':'s')+')';
  // Update filter defaults when switching units
  const minEl=document.getElementById('ibiMin');
  const maxEl=document.getElementById('ibiMax');
  if(isMs){minEl.value=300;maxEl.value=2000;}
  else{minEl.value=0.3;maxEl.value=2.0;minEl.step=0.01;maxEl.step=0.01;}
}

function setInputType(t){
  inputType=t;
  const isSig=t==='signal';
  // Step 2 toggle buttons
  document.getElementById('itypeSig').className='itype-btn'+(isSig?' active':'');
  document.getElementById('itypeIbi').className='itype-btn'+(!isSig?' active':'');
  const m=startMode;
  if(isSig){
    document.getElementById('dropTitle').textContent=m==='hrv'?'Drop your PPG signal file here':'Drop your respiratory signal file here';
    document.getElementById('step2Hint').innerHTML=m==='hrv'
      ?'<strong>HRV — PPG signal:</strong> Accepts any optical cardiac signal (PPG). Select the signal column, optional timestamp column, and sampling rate after loading.'
      :'<strong>BRV:</strong> Accepts chest belt, nasal airflow, accelerometer z-axis, or any respiratory signal. Select signal column, optional timestamp, and sampling rate after loading.';
  } else {
    document.getElementById('dropTitle').textContent=m==='hrv'?'Drop your RR/IBI interval file here':'Drop your breath interval file here';
    document.getElementById('step2Hint').innerHTML=m==='hrv'
      ?'<strong>HRV Intervals:</strong> Accepts RR intervals from ECG or IBI from PPG, in <strong>milliseconds</strong>. Optional time column in seconds.'
      :'<strong>BRV Intervals:</strong> File must have a column of breath cycle durations in seconds or milliseconds. Optional time column in seconds.';
  }
  updateInputTypeUI();
}

function updateInputTypeUI(){
  const isSig=inputType==='signal';
  // Show/hide setup cards in both panels
  document.querySelectorAll('.sig-setup').forEach(el=>{el.classList.toggle('hidden',!isSig);});
  document.querySelectorAll('.ibi-setup').forEach(el=>{el.style.display=isSig?'none':'block';});
}

function switchMode(m){
  currentMode=m;
  document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.mtb').forEach(b=>{b.classList.remove('active','ha','ba')});
  document.getElementById('panel'+m.toUpperCase()).classList.add('active');
  const btn=document.getElementById('m'+m.toUpperCase());
  btn.classList.add('active',m==='hrv'?'ha':'ba');
  document.getElementById('switchModeBtn').textContent='Switch to '+(m==='hrv'?'BRV':'HRV');
}

/* ═══════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════ */
function swHT(i,btn){
  const panel=document.getElementById('ht'+i);
  const isAlreadyActive=btn.classList.contains('active');
  // Always deactivate all tabs and panels first
  document.querySelectorAll('#panelHRV .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#panelHRV .tab-panel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  if(isAlreadyActive){
    // Toggle OFF — clicking the same tab again collapses it, nothing shown
    return;
  }
  // Toggle ON — activate the clicked tab and its panel
  btn.classList.add('active');
  panel.classList.add('active');
  panel.style.display='block';
  panel.querySelectorAll('canvas').forEach(cv=>{if(charts[cv.id])try{charts[cv.id].resize();}catch(e){}});
}
function swBT(i,btn){
  const panel=document.getElementById('bt'+i);
  const isAlreadyActive=btn.classList.contains('active');
  document.querySelectorAll('#panelBRV .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#panelBRV .tab-panel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  if(isAlreadyActive){
    return;
  }
  btn.classList.add('active');
  panel.classList.add('active');
  panel.style.display='block';
  panel.querySelectorAll('canvas').forEach(cv=>{if(charts[cv.id])try{charts[cv.id].resize();}catch(e){}});
}

/* Back/Next steppers for the result tabs — unlike clicking a tab directly,
   these always land on a definite tab (never toggle it off) and wrap around
   at either end, so repeatedly clicking Next cycles through all four. */
function stepHT(dir){
  const tabs=[...document.querySelectorAll('#hrvTabs .tab')];
  let idx=tabs.findIndex(t=>t.classList.contains('active'));
  idx=(idx<0?0:idx+dir+tabs.length)%tabs.length;
  swHT(idx,tabs[idx]);
}
function stepBT(dir){
  const tabs=[...document.querySelectorAll('#brvTabs .tab')];
  let idx=tabs.findIndex(t=>t.classList.contains('active'));
  idx=(idx<0?0:idx+dir+tabs.length)%tabs.length;
  swBT(idx,tabs[idx]);
}

/* ═══════════════════════════════════════════════
   MATH
═══════════════════════════════════════════════ */
const mean=a=>{if(!a.length)return 0;return a.reduce((s,v)=>s+v,0)/a.length};
const std=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};
const rmssd=ibis=>{const d=[];for(let i=1;i<ibis.length;i++)d.push((ibis[i]-ibis[i-1])**2);return d.length?Math.sqrt(mean(d)):0};
/* pNN: count |ΔNN|>th divided by N (total intervals), matching NeuroKit2 nn50/len(rri)*100 */
const pNN=(ibis,th)=>{if(ibis.length<2)return 0;let c=0;for(let i=1;i<ibis.length;i++)if(Math.abs(ibis[i]-ibis[i-1])>th)c++;return c/ibis.length*100;};
function histogram(data,bins,mn,mx){
  const w=(mx-mn)/bins||1e-9,counts=new Array(bins).fill(0),centers=[];
  for(let i=0;i<bins;i++)centers.push(+(mn+w*(i+0.5)).toFixed(3));
  data.forEach(v=>{let b=Math.floor((v-mn)/w);b=Math.max(0,Math.min(b,bins-1));counts[b]++;});
  return{centers,counts};
}
function linReg(x,y){if(x.length<2)return{slope:0,intercept:mean(y)||0};const n=x.length,mx=mean(x),my=mean(y);let num=0,den=0;for(let i=0;i<n;i++){num+=(x[i]-mx)*(y[i]-my);den+=(x[i]-mx)**2;}const slope=den?num/den:0;return{slope,intercept:my-slope*mx};}

/* ═══════════════════════════════════════════════
   SG FILTER
═══════════════════════════════════════════════ */
function sgFilter(y,wl,po){
  const half=Math.floor(wl/2),n=y.length,coeffs=sgCoeffs(wl,po);
  return y.map((_,i)=>{let s=0;for(let j=-half;j<=half;j++){let idx=Math.max(0,Math.min(n-1,i+j));s+=coeffs[j+half]*y[idx];}return s;});
}
function sgCoeffs(wl,po){
  const half=Math.floor(wl/2),A=[];
  for(let i=-half;i<=half;i++){const row=[];for(let j=0;j<=po;j++)row.push(Math.pow(i,j));A.push(row);}
  const AT=tr(A),ATA=mm(AT,A),inv=inv_(ATA);
  return inv?mm(inv,AT)[0]:new Array(wl).fill(1/wl);
}
function tr(m){return m[0].map((_,c)=>m.map(r=>r[c]))}
function mm(A,B){const r=A.length,c=B[0].length,k=B.length,C=Array.from({length:r},()=>new Array(c).fill(0));for(let i=0;i<r;i++)for(let j=0;j<c;j++)for(let p=0;p<k;p++)C[i][j]+=A[i][p]*B[p][j];return C;}
function inv_(m){
  const n=m.length,aug=m.map((r,i)=>{const a=[...r];for(let j=0;j<n;j++)a.push(i===j?1:0);return a});
  for(let col=0;col<n;col++){let pivot=-1,maxV=0;for(let row=col;row<n;row++){if(Math.abs(aug[row][col])>maxV){maxV=Math.abs(aug[row][col]);pivot=row}}if(pivot<0||maxV<1e-12)return null;[aug[col],aug[pivot]]=[aug[pivot],aug[col]];const div=aug[col][col];aug[col]=aug[col].map(v=>v/div);for(let row=0;row<n;row++){if(row!==col){const f=aug[row][col];aug[row]=aug[row].map((v,j)=>v-f*aug[col][j]);}}}
  return aug.map(r=>r.slice(n));
}

/* ═══════════════════════════════════════════════
   PEAK DETECTION
═══════════════════════════════════════════════ */
/* Sliding-window min/max, O(n) amortized via monotonic deques (each index
   enters and leaves each deque at most once). Returns, for every index i,
   the min/max of y over the centered window [i-halfWin, i+halfWin] (window
   shrinks naturally near the array edges). Used by detectPeaks() below to
   build a locally-adaptive amplitude threshold instead of one global value. */
function slidingMinMax(y,halfWin){
  const n=y.length;
  const outMin=new Float64Array(n), outMax=new Float64Array(n);
  const dqMin=[], dqMax=[]; // store indices, values monotonic within each deque
  for(let right=0; right<n+halfWin; right++){
    if(right<n){
      while(dqMin.length && y[dqMin[dqMin.length-1]]>=y[right]) dqMin.pop();
      dqMin.push(right);
      while(dqMax.length && y[dqMax[dqMax.length-1]]<=y[right]) dqMax.pop();
      dqMax.push(right);
    }
    const center=right-halfWin;
    if(center>=0 && center<n){
      const lo=center-halfWin;
      while(dqMin.length && dqMin[0]<lo) dqMin.shift();
      while(dqMax.length && dqMax[0]<lo) dqMax.shift();
      outMin[center]=y[dqMin[0]];
      outMax[center]=y[dqMax[0]];
    }
  }
  return{min:outMin,max:outMax};
}

/* Peak detection with a LOCALLY-ADAPTIVE height/prominence threshold.
   Height and prominence are measured against the signal's min/max in a
   sliding window around each candidate — not one global min/max for the
   whole recording — because a single global threshold silently breaks down
   under baseline wander or amplitude drift: real beats in a low-amplitude
   stretch fall below a threshold calibrated for a high-amplitude stretch
   elsewhere (missed beats), while secondary features like a PPG dicrotic
   notch can cross that same fixed line wherever the baseline happens to sit
   higher (spurious extra peaks). Both failure modes show up downstream as
   corrupted IBIs, since one bad peak invalidates both of its neighboring
   gaps. fs (sample rate) is optional — used only to size the window in
   real time (~2s) rather than a fixed sample count; falls back gracefully
   if omitted.
   distSamples/minDist is still enforced exactly as before, as a hard
   non-max-suppression pass over whatever survives the adaptive filters. */
function detectPeaks(y,hPct,distSamples,promPct,fs){
  const n=y.length;
  if(n<3) return[];
  const minDist=Math.max(1,Math.round(distSamples));
  // Window spans several expected cycles so the local min/max reflect the
  // signal's envelope (not a single beat) — wide enough to be stable, but
  // not so wide it degenerates back into a global threshold.
  const halfWin=Math.max(minDist*3, fs?Math.round(fs*2):50, 20);
  const{min:localMin,max:localMax}=slidingMinMax(y,halfWin);
  const cands=[];
  for(let i=1;i<n-1;i++){
    const range=localMax[i]-localMin[i];
    const minH=localMin[i]+range*(hPct/100);
    if(y[i]>=minH&&y[i]>y[i-1]&&y[i]>=y[i+1])cands.push(i);
  }
  const prom=cands.filter(p=>{
    let lm=y[p],rm=y[p];
    for(let i=p-1;i>=0;i--){if(y[i]>y[p])break;if(y[i]<lm)lm=y[i];}
    for(let i=p+1;i<n;i++){if(y[i]>y[p])break;if(y[i]<rm)rm=y[i];}
    const range=localMax[p]-localMin[p];
    return y[p]-Math.max(lm,rm)>=range*(promPct/100);
  });
  if(!prom.length)return[];
  const kept=[];let i=0;
  while(i<prom.length){
    let j=i;while(j+1<prom.length&&prom[j+1]-prom[i]<minDist)j++;
    let best=prom[i];for(let k=i+1;k<=j;k++)if(y[prom[k]]>y[best])best=prom[k];
    if(!kept.length||best-kept[kept.length-1]>=minDist)kept.push(best);
    i=j+1;
  }
  return kept;
}

/* Peak detection runs on a filtered/smoothed version of the signal (for
   noise-robust detection), but that reshapes narrow peaks slightly, so the
   index found on the filtered signal can land a few samples off the TRUE
   apex of the raw waveform — visible as the marker sitting on the shoulder
   of a spike instead of its tip. This snaps each detected index to the
   actual local maximum of the RAW signal within a small window around it,
   so detection stays robust (still runs on the clean/filtered signal) while
   the reported location — used for both the chart marker AND the IBI/cycle
   timing math — is always exactly where the raw signal actually peaks.
   radius is capped at half of minDist so neighboring beats' search windows
   can never overlap into each other. Duplicate/out-of-order results (rare,
   only possible if two windows still manage to snap to the same sample)
   are cleaned up before returning. */
function snapToRawPeaks(peaks, rawSig, radius, minDist){
  if(!peaks.length||radius<=0) return peaks.slice();
  const cap=minDist?Math.max(0,Math.floor(minDist/2)-1):radius;
  const r=Math.min(radius,cap);
  if(r<=0) return peaks.slice();
  const snapped=peaks.map(idx=>{
    const lo=Math.max(0,idx-r), hi=Math.min(rawSig.length-1,idx+r);
    let best=idx;
    for(let i=lo;i<=hi;i++) if(rawSig[i]>rawSig[best]) best=i;
    return best;
  });
  return[...new Set(snapped)].sort((a,b)=>a-b);
}

/* ═══════════════════════════════════════════════
   PSD COMPUTATION — fs=4 Hz, mean removal,
   Hanning 50% overlap, trapz integration
═══════════════════════════════════════════════ */

function getTimeVector(sig,timeId,fsId){
  const tc=document.getElementById(timeId)?document.getElementById(timeId).value:'';
  const fs=parseFloat(document.getElementById(fsId)?.value)||250;
  if(tc&&rawRows.length){
    const tv=rawRows.map(r=>{const v=r[tc];if(typeof v==='number')return v;const n=parseFloat(v);return isFinite(n)?n:null;}).filter(v=>v!==null);
    if(tv.length>=sig.length){
      const effFs=tv.length>1?1/((tv[tv.length-1]-tv[0])/(tv.length-1)):fs;
      return{t:tv.slice(0,sig.length),fs:effFs};
    }
  }
  return{t:sig.map((_,i)=>i/fs),fs};
}

/* Validated band limits — falls back to defaults if UI values are invalid */
function getBands(){
  // Read from signal mode inputs if signal setup is visible, else interval mode inputs
  function sv(id,def){const v=parseFloat(document.getElementById(id)?.value);return(isFinite(v)&&v>0)?v:def;}
  const sigVisible=document.getElementById('hrvSigSetup')&&document.getElementById('hrvSigSetup').offsetParent!==null;
  const p=sigVisible?'_sig':'';
  return{vlfLo:sv('vlfLo'+p,0.003),vlfHi:sv('vlfHi'+p,0.04),lfLo:sv('lfLo'+p,0.04),lfHi:sv('lfHi'+p,0.15),hfLo:sv('hfLo'+p,0.15),hfHi:sv('hfHi'+p,0.4)};
}
function getBrvBands(){
  function sv(id,def){const v=parseFloat(document.getElementById(id)?.value);return(isFinite(v)&&v>0)?v:def;}
  const sigVisible=document.getElementById('brvSigSetup')&&document.getElementById('brvSigSetup').offsetParent!==null;
  const p=sigVisible?'_sig':'';
  return{vlfLo:sv('brVlfLo'+p,0.003),vlfHi:sv('brVlfHi'+p,0.04),lfLo:sv('brLfLo'+p,0.04),lfHi:sv('brLfHi'+p,0.15),hfLo:sv('brHfLo'+p,0.15),hfHi:sv('brHfHi'+p,0.4)};
}

/* Cubic spline — xKnots and yKnots MUST have the same length */
function cubicSpline(xKnots,yKnots,xOut){
  const n=xKnots.length;
  if(n<2) return xOut.map(()=>yKnots[0]||0);
  if(n===2){
    return xOut.map(x=>{
      const f=(x-xKnots[0])/(xKnots[1]-xKnots[0]);
      return yKnots[0]+(yKnots[1]-yKnots[0])*Math.min(1,Math.max(0,f));
    });
  }
  // Natural cubic spline (second derivatives at endpoints = 0)
  const h=[], a=yKnots.slice();
  for(let i=0;i<n-1;i++) h.push(xKnots[i+1]-xKnots[i]);
  // Set up tridiagonal system
  const rhs=new Array(n).fill(0);
  for(let i=1;i<n-1;i++)
    rhs[i]=3*((a[i+1]-a[i])/h[i]-(a[i]-a[i-1])/h[i-1]);
  // Thomas algorithm (forward sweep)
  const cArr=new Array(n).fill(0); // c[i] = M[i] (second derivatives)
  const cp=new Array(n).fill(0),dp=new Array(n).fill(0);
  cp[0]=0; dp[0]=0;
  for(let i=1;i<n-1;i++){
    const denom=2*(xKnots[i+1]-xKnots[i-1])-h[i-1]*cp[i-1];
    cp[i]=h[i]/denom;
    dp[i]=(rhs[i]-h[i-1]*dp[i-1])/denom;
  }
  cArr[n-1]=0;
  for(let i=n-2;i>=1;i--) cArr[i]=dp[i]-cp[i]*cArr[i+1];
  cArr[0]=0;
  // Evaluate
  return xOut.map(x=>{
    if(x<=xKnots[0]) return a[0];
    if(x>=xKnots[n-1]) return a[n-1];
    // Binary search for interval
    let lo=0,hi=n-2;
    while(lo<hi-1){const m=(lo+hi)>>1;xKnots[m]<=x?lo=m:hi=m;}
    const i=lo;
    const dx=x-xKnots[i],hh=h[i];
    const bi=(a[i+1]-a[i])/hh-hh*(cArr[i+1]+2*cArr[i])/3;
    const di=(cArr[i+1]-cArr[i])/(3*hh);
    return a[i]+dx*(bi+dx*(cArr[i]+dx*di));
  });
}

/* Monotone cubic spline interpolation — Fritsch-Carlson method.
   Guarantees no overshoot between knots (unlike natural cubic spline).
   NeuroKit2 uses this method ("monotone_cubic") for instantaneous rate signals.
   xKnots, yKnots : sorted knot arrays (length >= 2)
   xOut            : output query points
   Returns interpolated values, clamped to edge values outside knot range. */
function monotoneCubicSpline(xKnots, yKnots, xOut) {
  const n = xKnots.length;
  if (n < 2) return xOut.map(() => yKnots[0] || 0);
  if (n === 2) {
    return xOut.map(x => {
      const f = (x - xKnots[0]) / (xKnots[1] - xKnots[0]);
      return yKnots[0] + (yKnots[1] - yKnots[0]) * Math.min(1, Math.max(0, f));
    });
  }
  // Step 1: compute slopes of secant lines
  const d = [], h = [];
  for (let k = 0; k < n - 1; k++) {
    h.push(xKnots[k+1] - xKnots[k]);
    d.push((yKnots[k+1] - yKnots[k]) / h[k]);
  }
  // Step 2: initialize tangents m as average of adjacent secants
  const m = new Array(n);
  m[0] = d[0];
  m[n-1] = d[n-2];
  for (let k = 1; k < n - 1; k++) m[k] = (d[k-1] + d[k]) / 2;
  // Step 3: Fritsch-Carlson monotonicity conditions
  for (let k = 0; k < n - 1; k++) {
    if (Math.abs(d[k]) < 1e-12) { m[k] = 0; m[k+1] = 0; continue; }
    const α = m[k] / d[k], β = m[k+1] / d[k];
    const r = α * α + β * β;
    if (r > 9) { const s = 3 / Math.sqrt(r); m[k] = s * α * d[k]; m[k+1] = s * β * d[k]; }
  }
  // Step 4: evaluate Hermite polynomial
  return xOut.map(x => {
    if (x <= xKnots[0])   return yKnots[0];
    if (x >= xKnots[n-1]) return yKnots[n-1];
    let lo = 0, hi = n - 2;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; xKnots[mid] <= x ? lo = mid : hi = mid; }
    const k = lo;
    const t = (x - xKnots[k]) / h[k];
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + t, h01 = -2*t3 + 3*t2, h11 = t3 - t2;
    return h00*yKnots[k] + h10*h[k]*m[k] + h01*yKnots[k+1] + h11*h[k]*m[k+1];
  });
}

/* 2nd-order Butterworth low-pass filter, zero-phase (forward + reverse pass).
   Uses bilinear transform with frequency pre-warping (Tustin method).
   Wn = cutoff/(fs/2) normalised frequency; Q=1/√2 for maximally flat Butterworth response.
   cutoff: -3 dB frequency in Hz. fs: sample rate in Hz. */
function butterLP(y, cutoff, fs){
  if(!y||y.length<4||cutoff<=0||cutoff>=fs/2) return y.slice();
  const Wn=cutoff/(fs/2);
  const cosW=Math.cos(Math.PI*Wn);
  const sinW=Math.sin(Math.PI*Wn);
  const alpha=sinW/Math.SQRT2; // Q=1/sqrt(2) for Butterworth
  const b0_=( 1-cosW)/2, b1_=1-cosW, b2_=(1-cosW)/2;
  const a0_=1+alpha, a1_=-2*cosW, a2_=1-alpha;
  const b=[b0_/a0_,b1_/a0_,b2_/a0_], a=[a1_/a0_,a2_/a0_];
  // Forward pass
  function pass(sig){
    const out=sig.slice();
    let x1=0,x2=0,y1=0,y2=0;
    for(let i=0;i<sig.length;i++){
      const xn=sig[i];
      const yn=b[0]*xn+b[1]*x1+b[2]*x2-a[0]*y1-a[1]*y2;
      out[i]=yn; x2=x1;x1=xn; y2=y1;y1=yn;
    }
    return out;
  }
  // Zero-phase: forward then reverse
  const fwd=pass(y);
  const rev=pass(fwd.slice().reverse()).reverse();
  return rev;
}

/* 2nd-order Butterworth high-pass filter, zero-phase (forward + reverse pass).
   Same biquad topology as butterLP() above, high-pass coefficients (RBJ Audio
   EQ Cookbook form). Used as the first stage of butterBP() below.
   cutoff: -3 dB frequency in Hz. fs: sample rate in Hz. */
function butterHP(y, cutoff, fs){
  if(!y||y.length<4||cutoff<=0||cutoff>=fs/2) return y.slice();
  const Wn=cutoff/(fs/2);
  const cosW=Math.cos(Math.PI*Wn);
  const sinW=Math.sin(Math.PI*Wn);
  const alpha=sinW/Math.SQRT2; // Q=1/sqrt(2) for Butterworth
  const b0_=(1+cosW)/2, b1_=-(1+cosW), b2_=(1+cosW)/2;
  const a0_=1+alpha, a1_=-2*cosW, a2_=1-alpha;
  const b=[b0_/a0_,b1_/a0_,b2_/a0_], a=[a1_/a0_,a2_/a0_];
  function pass(sig){
    const out=sig.slice();
    let x1=0,x2=0,y1=0,y2=0;
    for(let i=0;i<sig.length;i++){
      const xn=sig[i];
      const yn=b[0]*xn+b[1]*x1+b[2]*x2-a[0]*y1-a[1]*y2;
      out[i]=yn; x2=x1;x1=xn; y2=y1;y1=yn;
    }
    return out;
  }
  const fwd=pass(y);
  const rev=pass(fwd.slice().reverse()).reverse();
  return rev;
}

/* Butterworth band-pass = high-pass (removes baseline wander/drift below `lo`)
   cascaded with low-pass (removes high-frequency noise above `hi`), each
   applied zero-phase. This is the standard way to build a bandpass filter out
   of two independent Butterworth stages, and keeps each stage individually
   verifiable against butterLP()/butterHP() above.
   lo/hi: -3 dB corner frequencies in Hz (lo should be < hi; either can be
   disabled by passing 0, giving a pure low-pass or pure high-pass).
   fs: sample rate in Hz. */
function butterBP(y, lo, hi, fs){
  if(!y||y.length<4) return y.slice();
  let out=y;
  if(lo>0) out=butterHP(out, lo, fs);
  if(hi>0 && hi<fs/2) out=butterLP(out, hi, fs);
  return out;
}

function interpolateRRI(peakTimes,ibis,fsOut){
  if(!peakTimes||peakTimes.length<3||!ibis||ibis.length<3) return [];
  // peakTimes has length N+1 (one more than ibis)
  // Standard approach: place IBI value at the right-side peak time (x-knot)
  const xKnots=peakTimes.slice(1); // length N — right-side time of each interval
  const yKnots=ibis.slice();        // length N — IBI values in ms
  const t0=peakTimes[0], tEnd=peakTimes[peakTimes.length-1];
  if(!isFinite(t0)||!isFinite(tEnd)||tEnd<=t0) return [];
  // Build output time vector starting at first knot
  const tOut=[];
  for(let ti=xKnots[0];ti<=tEnd+1e-9;ti+=1/fsOut) tOut.push(ti);
  if(tOut.length<4) return [];
  // Cubic spline interpolation — return raw resampled values (no mean removal here).
  // Mean is removed exactly once: either by smoothnessPriors (detrend=true) or
  // by the explicit mean-subtraction in computePSD (detrend=false). Removing it here
  // as well would double-subtract when detrend is ON.
  return cubicSpline(xKnots,yKnots,tOut);
}

function hannWindow(n){return Array.from({length:n},(_,i)=>0.5*(1-Math.cos(2*Math.PI*i/(n-1))));}

function fft(x){
  const N=x.length;
  if(N<=1)return{re:[...x],im:new Array(N).fill(0)};
  const ev=fft(x.filter((_,i)=>i%2===0)),od=fft(x.filter((_,i)=>i%2===1));
  const re=new Array(N),im=new Array(N);
  for(let k=0;k<N/2;k++){
    const a=-2*Math.PI*k/N,c=Math.cos(a),s=Math.sin(a);
    const tr=c*od.re[k]-s*od.im[k],ti=s*od.re[k]+c*od.im[k];
    re[k]=ev.re[k]+tr;im[k]=ev.im[k]+ti;
    re[k+N/2]=ev.re[k]-tr;im[k+N/2]=ev.im[k]-ti;
  }
  return{re,im};
}

/* Welch PSD — Hanning window, 50% overlap, NO zero-padding beyond data.
   segLen is clamped to the actual signal length so Parseval always holds. */
function welchPSD(signal,fs,segLen){
  const sig=signal.slice();
  const N=sig.length;
  // clamp segLen to a power-of-2 that fits within the data
  segLen=Math.pow(2,Math.floor(Math.log2(Math.max(Math.min(segLen,N),32))));
  const step=Math.floor(segLen/2); // 50% overlap
  const nSeg=Math.max(1,Math.floor((N-segLen)/step)+1);
  const halfLen=Math.floor(segLen/2)+1;
  const psd=new Array(halfLen).fill(0);
  const win=hannWindow(segLen);
  const winPow=win.reduce((s,v)=>s+v*v,0); // window power normalisation
  for(let s=0;s<nSeg;s++){
    const seg=[];
    for(let i=0;i<segLen;i++) seg.push((sig[s*step+i]||0)*win[i]);
    const{re,im}=fft(seg);
    for(let k=0;k<halfLen;k++){
      const p=(re[k]**2+im[k]**2)/(winPow*fs);
      psd[k]+=k===0||k===halfLen-1?p:2*p; // one-sided: double all except DC & Nyquist
    }
  }
  const freqs=[],outPsd=[];
  for(let k=0;k<halfLen;k++){
    freqs.push(k*fs/segLen);
    outPsd.push(psd[k]/nSeg);
  }
  return{freqs,psd:outPsd};
}

/* NeuroKit2-style BRV spectral analysis — Instantaneous Period method.
   Computes instantaneous breath period at every sample using monotone cubic
   spline interpolation (Fritsch-Carlson) — identical to NeuroKit2's
   interpolation_method="monotone_cubic" used in signal_rate() / rsp_rate().
   Knots placed at each peak time with value = duration of the cycle starting
   at that peak (ms). Smooth interpolation eliminates the spectral leakage
   caused by a staircase representation.
   Runs Welch PSD on the resulting uniform-rate period signal at original fs —
   no resampling. Returns same structure as computePSD() for compatibility.
   peaks     : sample-index array of breath peaks
   tvS       : time vector in seconds (length = full signal length)
   fs        : original sampling rate (Hz)
   bands     : {vlfLo,vlfHi,lfLo,lfHi,hfLo,hfHi}
   doDetrend : boolean
*/
function computeInstantPeriodPSD(peaks, tvS, fs, bands, doDetrend) {
  // ── Knot arrays: one knot per peak ──
  // y-value at knot k = duration of the cycle that STARTS at peaks[k] (ms).
  // Last peak repeats the previous cycle duration (edge fill — matches NeuroKit2).
  const xKnots = peaks.map(i => tvS[i]);
  const yKnots = peaks.map((pk, k) =>
    k < peaks.length - 1
      ? (tvS[peaks[k+1]] - tvS[peaks[k]]) * 1000
      : (tvS[peaks[k]]   - tvS[peaks[k-1]]) * 1000
  );

  // ── Monotone cubic interpolation at every sample time ──
  const periodSig = monotoneCubicSpline(xKnots, yKnots, Array.from(tvS));

  // ── Mean removal ──
  const mn = mean(periodSig);
  let sig = periodSig.map(v => v - mn);

  // ── Optional detrend (Tarvainen smoothness priors) ──
  if (doDetrend) sig = smoothnessPriors(sig, 300);

  // ── Welch PSD at original fs ──
  // Segment length = next power-of-2 >= max(256, N/8).
  const rawSeg = Math.max(256, Math.pow(2, Math.floor(Math.log2(sig.length / 8))));
  const segLen = Math.pow(2, Math.ceil(Math.log2(rawSeg)));
  const {freqs: wFreqs, psd: wPsd} = welchPSD(sig, fs, segLen);

  // ── Band power via trapz ──
  function trapz(f, p, lo, hi) {
    let pow = 0;
    for (let i = 0; i < f.length - 1; i++) {
      if (f[i+1] < lo || f[i] > hi) continue;
      const fa = Math.max(f[i], lo), fb = Math.min(f[i+1], hi);
      if (fb <= fa) continue;
      const t0 = (fa - f[i]) / (f[i+1] - f[i]), t1 = (fb - f[i]) / (f[i+1] - f[i]);
      const pa = p[i] + t0 * (p[i+1] - p[i]), pb = p[i] + t1 * (p[i+1] - p[i]);
      pow += 0.5 * (pa + pb) * (fb - fa);
    }
    return pow;
  }

  const vlf  = trapz(wFreqs, wPsd, bands.vlfLo, bands.vlfHi);
  const lf   = trapz(wFreqs, wPsd, bands.lfLo,  bands.lfHi);
  const hf   = trapz(wFreqs, wPsd, bands.hfLo,  bands.hfHi);
  const tp   = trapz(wFreqs, wPsd, bands.vlfLo,  bands.hfHi);
  const lfhf = hf > 1e-9 ? lf / hf : null;
  const lfNu = (lf + hf) > 1e-9 ? lf / (lf + hf) * 100 : null;
  const hfNu = (lf + hf) > 1e-9 ? hf / (lf + hf) * 100 : null;
  const peakF = {
    vlf: peakFreqInBand(wFreqs, wPsd, bands.vlfLo, bands.vlfHi),
    lf:  peakFreqInBand(wFreqs, wPsd, bands.lfLo,  bands.lfHi),
    hf:  peakFreqInBand(wFreqs, wPsd, bands.hfLo,  bands.hfHi),
  };

  return {
    wFreqs, wPsd,
    lsFreqs: wFreqs, lsPsd: wPsd, // LS not applicable — share Welch arrays for rendering
    w: {vlf, lf, hf, tp, lfhf, lfNu, hfNu, peakF},
    ls: {vlf, lf, hf, tp, lfhf, lfNu, hfNu, peakF},
    vlfResolvable: true, lfResolvable: true, trueDf: wFreqs[1] || 0,
    _method: 'instant', _sigNyquist: fs / 2, _fsOrig: fs,
  };
}

/* Lomb-Scargle PSD from 0 to Nyquist (fs/2), units ms²/Hz */
function lombScargle(t,y,freqs){
  const n=t.length;
  if(n<4||!freqs.length) return freqs.map(()=>0);
  // mean is already removed by interpolateRRI, but guard anyway
  const my=mean(y);
  const yn=y.map(v=>v-my);
  const vary=yn.reduce((s,v)=>s+v*v,0)/Math.max(n-1,1); // used for near-zero guard
  if(vary<1e-20) return freqs.map(()=>0);
  const df=freqs.length>1?(freqs[freqs.length-1]-freqs[0])/(freqs.length-1):1;
  return freqs.map(f=>{
    if(f<=0) return 0;
    const w=2*Math.PI*f;
    let cc=0,ss=0,cs=0;
    for(let i=0;i<n;i++){const c=Math.cos(w*t[i]),s=Math.sin(w*t[i]);cc+=c*c;ss+=s*s;cs+=c*s;}
    const tau=Math.abs(cc-ss)<1e-15?0:Math.atan2(2*cs,cc-ss)/(2*w);
    let A=0,B=0,C=0,D=0;
    for(let i=0;i<n;i++){
      const c=Math.cos(w*(t[i]-tau)),s=Math.sin(w*(t[i]-tau));
      A+=yn[i]*c;B+=yn[i]*s;C+=c*c;D+=s*s;
    }
    const P=(C>1e-12?A*A/C:0)+(D>1e-12?B*B/D:0);
    // Scale to ms²/Hz one-sided (VanderPlas 2018: S = P / (n·df))
    return P/(n*df);
  });
}

/* Band power via trapezoidal rule */
function bandPower(freqs,psd,lo,hi){
  if(!freqs||!freqs.length) return 0;
  let p=0;
  for(let i=0;i<freqs.length-1;i++){
    const f0=freqs[i],f1=freqs[i+1],df=f1-f0;
    if(df<=0) continue;
    if(f0>=lo&&f1<=hi){
      // Fully interior segment
      p+=0.5*(psd[i]+psd[i+1])*df;
    } else if(f0<lo&&f1>hi){
      // Both boundaries inside this bin — interpolate both endpoints
      const pLo=psd[i]+(psd[i+1]-psd[i])*(lo-f0)/df;
      const pHi=psd[i]+(psd[i+1]-psd[i])*(hi-f0)/df;
      p+=0.5*(pLo+pHi)*(hi-lo);
    } else if(f0<lo&&f1>lo&&f1<=hi){
      // Left boundary only: lo falls inside this bin
      const pLo=psd[i]+(psd[i+1]-psd[i])*(lo-f0)/df;
      p+=0.5*(pLo+psd[i+1])*(f1-lo);
    } else if(f0>=lo&&f0<hi&&f1>hi){
      // Right boundary only: hi falls inside this bin
      const pHi=psd[i]+(psd[i+1]-psd[i])*(hi-f0)/df;
      p+=0.5*(psd[i]+pHi)*(hi-f0);
    }
  }
  return Math.max(0,p);
}

/* Peak frequency in a band */
function peakFreqInBand(freqs,psd,lo,hi){
  let maxP=-Infinity,peakF=null;
  for(let i=0;i<freqs.length;i++){
    if(freqs[i]>=lo&&freqs[i]<=hi&&psd[i]>maxP){maxP=psd[i];peakF=freqs[i];}
  }
  return peakF!==null?+peakF.toFixed(4):null;
}

/* Artifact correction for IBI series (Kubios moving-median method).
   threshold: fraction of local median (e.g. 0.20 = 20%)
   mode: 'interpolate' (replace with linear interp, preserves N)
         'remove' (delete artifact beats, reduces N)
   Returns: {ibis: corrected array (ms), flags: array of 'normal'|'artifact'} */
function artifactCorrectIBI(ibis, threshold, mode){
  const N=ibis.length;
  if(N<5) return{ibis:ibis.slice(),flags:ibis.map(()=>'normal')};
  const flags=ibis.map(()=>'normal');
  const half=2; // window ±2 → 5-beat window
  for(let i=0;i<N;i++){
    const lo=Math.max(0,i-half), hi=Math.min(N,i+half+1);
    // neighbours excluding self
    const nb=[];
    for(let j=lo;j<hi;j++) if(j!==i) nb.push(ibis[j]);
    if(!nb.length) continue;
    nb.sort((a,b)=>a-b);
    const med=nb.length%2===0?(nb[nb.length/2-1]+nb[nb.length/2])/2:nb[Math.floor(nb.length/2)];
    if(med>0 && Math.abs(ibis[i]-med)/med > threshold) flags[i]='artifact';
  }
  if(mode==='remove'){
    const out=ibis.filter((_,i)=>flags[i]==='normal');
    return{ibis:out, flags:flags.filter(f=>f==='normal')};
  }
  // interpolate mode
  const corrected=ibis.slice();
  for(let i=0;i<N;i++){
    if(flags[i]!=='artifact') continue;
    let prev=null,nxt=null;
    for(let j=i-1;j>=0;j--){if(flags[j]==='normal'){prev=j;break;}}
    for(let j=i+1;j<N;j++){if(flags[j]==='normal'){nxt=j;break;}}
    if(prev!==null&&nxt!==null){
      corrected[i]=ibis[prev]+(ibis[nxt]-ibis[prev])*(i-prev)/(nxt-prev);
    } else if(prev!==null){
      corrected[i]=ibis[prev];
    } else if(nxt!==null){
      corrected[i]=ibis[nxt];
    }
  }
  return{ibis:corrected, flags};
}

/* Smoothness priors detrending (Tarvainen et al. 2002).
   Removes slow baseline trend from uniformly sampled signal y.
   lambda=300 → cutoff ≈ 0.002 Hz at fs=4 Hz (well below LF at 0.04 Hz).
   Solved with correct pentadiagonal Gaussian elimination (separate upper/lower arrays).
   Validated vs scipy solve_banded to 1e-8. */
function smoothnessPriors(y, lam=300){
  const N=y.length;
  if(N<4){const mn=y.reduce((s,v)=>s+v,0)/N; return y.map(v=>v-mn);}
  const lam2=lam*lam;
  const a=new Float64Array(N).fill(1);
  const bu=new Float64Array(N-1), cu=new Float64Array(N-2); // upper diagonals
  const bl=new Float64Array(N-1), cl=new Float64Array(N-2); // lower diagonals
  for(let i=0;i<N-2;i++){
    a[i]+=lam2; a[i+1]+=4*lam2; a[i+2]+=lam2;
    bu[i]-=2*lam2; bu[i+1]-=2*lam2;
    bl[i]-=2*lam2; bl[i+1]-=2*lam2;
    cu[i]+=lam2; cl[i]+=lam2;
  }
  const rhs=Float64Array.from(y);
  for(let k=0;k<N-1;k++){
    const ak=a[k];
    if(bl[k]!==0){
      const m1=bl[k]/ak;
      a[k+1]-=m1*bu[k];
      if(k+1<N-1) bu[k+1]-=m1*cu[k];
      rhs[k+1]-=m1*rhs[k];
    }
    if(k+2<N && cl[k]!==0){
      const m2=cl[k]/ak;
      if(k+1<N-1) bl[k+1]-=m2*bu[k];
      a[k+2]-=m2*cu[k];
      rhs[k+2]-=m2*rhs[k];
    }
  }
  const x=rhs.slice();
  for(let i=N-1;i>=0;i--){
    if(i<N-1) x[i]-=bu[i]*x[i+1];
    if(i<N-2) x[i]-=cu[i]*x[i+2];
    x[i]/=a[i];
  }
  // Return detrended signal: y minus the smooth trend x (Tarvainen 2002, Eq. 7).
  // No additional mean subtraction — mean removal is handled explicitly in computePSD.
  return Array.from(y).map((v,i)=>v-x[i]);
}

/* Shared PSD computation for HRV or BRV IBI series.
   peakTimes: array of raw peak event times in seconds (length = ibis.length+1)
              OR cumulative time array already built — either works.
   ibis: inter-beat/breath intervals in ms (length = peakTimes.length-1 OR same as peakTimes)
   fs: 4 Hz target sampling rate
   bands: {vlfLo,vlfHi,lfLo,lfHi,hfLo,hfHi}
*/
function computePSD(peakTimes,ibis,bands,fsRRI=4,lpCutoff=0,doDetrend=false){
  // Ensure we have event times in seconds and intervals in ms
  // peakTimes may be cumulative (length = ibis.length+1) OR the raw peak array
  let cpt;
  if(peakTimes.length===ibis.length+1){
    // already cumulative
    cpt=peakTimes;
  } else {
    // build cumulative from first event time
    cpt=[peakTimes[0]||0];
    for(const v of ibis) cpt.push(cpt[cpt.length-1]+v/1000);
  }

  // 1. Uniform time vector and spline interpolation (no mean removal inside interpolateRRI).
  let rriY=interpolateRRI(cpt,ibis,fsRRI);
  // Optional smoothness priors detrending (Tarvainen 2002, lambda=300, fc≈0.002 Hz).
  // Returns y-trend only; does NOT subtract mean so we do it once below.
  if(doDetrend && rriY.length>=4) rriY=smoothnessPriors(rriY,300);
  // Single mean removal (whether or not detrend was applied).
  // This is the standard preprocessing step before Welch PSD estimation.
  if(rriY.length>0){const mn=rriY.reduce((s,v)=>s+v,0)/rriY.length;rriY=rriY.map(v=>v-mn);}
  // For BRV: apply LP filter at IBI-series Nyquist to remove resampling artefact.
  // lpCutoff = 1/(2*mean_cycle_s) = breathing_rate/2
  // This eliminates spectral energy above the Nyquist of the original sparse series.
  if(lpCutoff>0&&lpCutoff<fsRRI/2) rriY=butterLP(rriY,lpCutoff,fsRRI);
  const nyquist=fsRRI/2; // 2.0 Hz

  // 2. Welch PSD — segLen = largest power-of-2 ≤ rriY.length (clamped in welchPSD).
  //    Passing rriY.length ensures no zero-padding; welchPSD clamps internally.
  const{freqs:wFreqs,psd:wPsd}=welchPSD(rriY,fsRRI,rriY.length);

  // 3. Lomb-Scargle PSD — 0 to Nyquist on original non-uniform times
  //    Use event times (cpt.slice(1)) vs ibis values for non-uniform sampling
  const nLs=1000; // dense grid for accurate band integration
  const lsFreqs=[];
  // start at a small positive freq, go to nyquist
  const lsDf=nyquist/nLs;
  for(let i=1;i<=nLs;i++) lsFreqs.push(+(i*lsDf).toFixed(6));
  let lsPsd=lsFreqs.map(()=>0);
  try{
    if(cpt.length>5) lsPsd=lombScargle(cpt.slice(1),ibis,lsFreqs);
  }catch(e){console.warn('LS error:',e);}

  // 4. Band powers via trapezoidal rule — Welch
  const wVlf=bandPower(wFreqs,wPsd,bands.vlfLo,bands.vlfHi);
  const wLf =bandPower(wFreqs,wPsd,bands.lfLo, bands.lfHi);
  const wHf =bandPower(wFreqs,wPsd,bands.hfLo, bands.hfHi);
  const wTp =wVlf+wLf+wHf;
  const wLfhf=wHf>1e-9?+(wLf/wHf).toFixed(4):0;
  const wLfhfD=wLf+wHf;
  const wLFnu=wLfhfD>1e-9?+(wLf/wLfhfD*100).toFixed(2):0;
  const wHFnu=wLfhfD>1e-9?+(wHf/wLfhfD*100).toFixed(2):0;
  const wPeakF={
    vlf:peakFreqInBand(wFreqs,wPsd,bands.vlfLo,bands.vlfHi),
    lf: peakFreqInBand(wFreqs,wPsd,bands.lfLo, bands.lfHi),
    hf: peakFreqInBand(wFreqs,wPsd,bands.hfLo, bands.hfHi)
  };

  // 5. Band powers via trapezoidal rule — Lomb-Scargle
  const lsVlf=bandPower(lsFreqs,lsPsd,bands.vlfLo,bands.vlfHi);
  const lsLf =bandPower(lsFreqs,lsPsd,bands.lfLo, bands.lfHi);
  const lsHf =bandPower(lsFreqs,lsPsd,bands.hfLo, bands.hfHi);
  const lsTp =lsVlf+lsLf+lsHf;
  const lsLfhf=lsHf>1e-9?+(lsLf/lsHf).toFixed(4):0;
  const lsLfhfD=lsLf+lsHf;
  const lsLFnu=lsLfhfD>1e-9?+(lsLf/lsLfhfD*100).toFixed(2):0;
  const lsHFnu=lsLfhfD>1e-9?+(lsHf/lsLfhfD*100).toFixed(2):0;
  const lsPeakF={
    vlf:peakFreqInBand(lsFreqs,lsPsd,bands.vlfLo,bands.vlfHi),
    lf: peakFreqInBand(lsFreqs,lsPsd,bands.lfLo, bands.lfHi),
    hf: peakFreqInBand(lsFreqs,lsPsd,bands.hfLo, bands.hfHi)
  };

  // True frequency resolution and VLF/LF resolvability flags
  const trueDf=fsRRI/Math.max(rriY.length,1);
  const vlfResolvable=trueDf<=bands.vlfLo;  // need df < vlfLo to resolve VLF
  const lfResolvable =trueDf<=bands.lfLo;

  return{
    wFreqs,wPsd,lsFreqs,lsPsd,rriY,cpt,fsRRI,nyquist,
    trueDf,vlfResolvable,lfResolvable,
    w:{vlf:wVlf,lf:wLf,hf:wHf,tp:wTp,lfhf:wLfhf,lfNu:wLFnu,hfNu:wHFnu,peakF:wPeakF},
    ls:{vlf:lsVlf,lf:lsLf,hf:lsHf,tp:lsTp,lfhf:lsLfhf,lfNu:lsLFnu,hfNu:lsHFnu,peakF:lsPeakF},
  };
}

/* ── Frequency domain metrics comparison table ──
   Displays all required parameters for both Welch and Lomb-Scargle:
   Band powers (ms²), % of total, peak frequency, LF/HF ratio, LFnu, HFnu, total power.
   w and ls objects must have: {vlf, lf, hf, tp, lfhf, lfNu, hfNu, peakF:{vlf,lf,hf}}
   names: ['VLF','LF','HF'] for HRV or ['Low','Mid','High'] for BRV
*/
function buildFdTable(containerId, w, ls, bands, names, freqWarn, psdMethodLabel){
  const el=document.getElementById(containerId);
  if(!el) return;

  const nm=names||['VLF','LF','HF'];
  const dots=['#9b7ef8','#4f8ef7','#34c98a'];
  const bKeys=['vlf','lf','hf'];
  const bLo=[bands.vlfLo,bands.lfLo,bands.hfLo];
  const bHi=[bands.vlfHi,bands.lfHi,bands.hfHi];
  const _isInstant=psdMethodLabel&&psdMethodLabel.toLowerCase().includes('instant');
  const _subtitle=_isInstant?`Welch only &nbsp;·&nbsp; original fs &nbsp;·&nbsp; trapz integration`:`fs&nbsp;=&nbsp;4&nbsp;Hz &nbsp;·&nbsp; cubic spline &nbsp;·&nbsp; trapz integration`;
  const _lsColLabel=_isInstant?'▪ (same as Welch — LS N/A)':'▪ Lomb–Scargle PSD';

  // Formatting helpers
  const N=v=>v!=null&&isFinite(v)?v:null;
  function fms2(v){
    const n=N(v);
    return n!=null?`<b>${n.toFixed(2)}</b>&thinsp;ms²`:'—';
  }
  function fpct(v,tp){
    if(tp==null||tp<1e-9) return '—';
    return `${(v/tp*100).toFixed(2)}&thinsp;%`;
  }
  function fHz(v){
    const n=N(v);
    return n!=null?`${n.toFixed(4)}&thinsp;Hz`:'—';
  }
  function fRatio(v){
    const n=N(v);
    return n!=null?`<b>${Number(n).toFixed(4)}</b>`:'—';
  }
  function fNu(v){
    const n=N(v);
    return n!=null?`${Number(n).toFixed(2)}&thinsp;%`:'—';
  }

  // LFnu / HFnu from raw values (recompute to ensure accuracy)
  const wLfhfD=w.lf+w.hf;
  const lsLfhfD=ls.lf+ls.hf;
  const wLFnu=wLfhfD>1e-9?(w.lf/wLfhfD*100).toFixed(2):'—';
  const wHFnu=wLfhfD>1e-9?(w.hf/wLfhfD*100).toFixed(2):'—';
  const lsLFnu=lsLfhfD>1e-9?(ls.lf/lsLfhfD*100).toFixed(2):'—';
  const lsHFnu=lsLfhfD>1e-9?(ls.hf/lsLfhfD*100).toFixed(2):'—';

  // Row style helpers
  const thBase=`style="padding:7px 10px;text-align:center;font-size:11px;font-weight:700;letter-spacing:.04em;border-bottom:1px solid var(--bdr2)"`;
  const thSub=`style="padding:5px 10px;text-align:right;font-size:10px;font-weight:500;color:var(--tx2);border-bottom:1px solid var(--bdr2)"`;
  const tdL=`style="padding:7px 12px;font-size:12px;color:var(--tx2);border-bottom:0.5px solid var(--bdr);white-space:nowrap"`;
  const tdR=`style="padding:7px 10px;text-align:right;font-size:12px;color:var(--tx);border-bottom:0.5px solid var(--bdr);border-left:1px solid var(--bdr)"`;
  const tdRo=`style="padding:7px 10px;text-align:right;font-size:12px;color:var(--tx);border-bottom:0.5px solid var(--bdr)"`;
  const trFoot=`style="background:var(--surf2)"`;
  const tdFootL=`style="padding:8px 12px;font-size:12px;font-weight:600;color:var(--tx);border-top:1px solid var(--bdr2)"`;
  const tdFootR=`style="padding:8px 10px;text-align:right;font-size:12px;font-weight:700;color:var(--tx);border-top:1px solid var(--bdr2);border-left:1px solid var(--bdr)"`;
  const tdFootRo=`style="padding:8px 10px;text-align:right;font-size:12px;font-weight:700;color:var(--tx);border-top:1px solid var(--bdr2)"`;
  const secLbl=`style="padding:7px 12px 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);background:var(--surf2);border-bottom:0.5px solid var(--bdr)"`;

  const bandRows=bKeys.map((k,i)=>`
    <tr>
      <td ${tdL}>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${dots[i]};flex-shrink:0"></span>
          <strong>${nm[i]}</strong>
          <span style="font-size:10px;color:var(--tx3)">${bLo[i]}–${bHi[i]} Hz</span>
        </span>
      </td>
      <td ${tdR}>${fms2(w[k])}</td>
      <td ${tdRo}>${fpct(w[k],w.tp)}</td>
      <td ${tdRo}>${fHz(w.peakF[k])}</td>
      <td ${tdR}>${fms2(ls[k])}</td>
      <td ${tdRo}>${fpct(ls[k],ls.tp)}</td>
      <td ${tdRo}>${fHz(ls.peakF[k])}</td>
    </tr>`).join('');

  el.innerHTML=`
    <div class="fd-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px 6px;border-bottom:0.5px solid var(--bdr2)">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2)">Frequency-domain parameters</span>
        <span style="font-size:10px;color:var(--tx3)">${_subtitle}</span>
      </div>
      ${freqWarn?`<div style="padding:8px 12px;font-size:11px;background:rgba(244,133,90,0.09);border-bottom:0.5px solid rgba(244,133,90,0.3);color:var(--orn)">${freqWarn}</div>`:''}
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:580px">
        <thead>
          <tr style="background:var(--surf2);border-bottom:0.5px solid var(--bdr2)">
            <th ${thBase} style="padding:7px 12px;text-align:left;color:var(--tx2);border-bottom:1px solid var(--bdr2)" rowspan="2">Parameter</th>
            <th ${thBase} style="padding:7px 10px;color:var(--acc);border-left:1px solid var(--bdr2);border-bottom:1px solid var(--bdr2)" colspan="3">▪ Welch PSD</th>
            <th ${thBase} style="padding:7px 10px;color:${_isInstant?'var(--tx3)':'var(--orn)'};border-left:1px solid var(--bdr2);border-bottom:1px solid var(--bdr2)" colspan="3">${_lsColLabel}</th>
          </tr>
          <tr style="background:var(--surf2)">
            <th ${thSub} style="border-left:1px solid var(--bdr2)">Power (ms²)</th>
            <th ${thSub}>% of total</th>
            <th ${thSub}>Peak freq (Hz)</th>
            <th ${thSub} style="border-left:1px solid var(--bdr2)">Power (ms²)</th>
            <th ${thSub}>% of total</th>
            <th ${thSub}>Peak freq (Hz)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="7" ${secLbl}>Band powers &amp; peak frequencies</td></tr>
          ${bandRows}
          <tr ${trFoot}>
            <td ${tdFootL}>Total power (VLF+LF+HF)</td>
            <td ${tdFootR} colspan="3">${fms2(w.tp)}</td>
            <td ${tdFootR} colspan="3">${fms2(ls.tp)}</td>
          </tr>
          <tr><td colspan="7" ${secLbl}>Ratios &amp; normalised units</td></tr>
          <tr>
            <td ${tdL}>LF/HF ratio</td>
            <td ${tdR} colspan="3">${fRatio(w.lfhf)}</td>
            <td ${tdR} colspan="3">${fRatio(ls.lfhf)}</td>
          </tr>
          <tr>
            <td ${tdL}>${nm[1]} normalised (${nm[1]==='LF'?'LFnu':'MFnu'}) = ${nm[1]}/(${nm[1]}+${nm[2]})×100</td>
            <td ${tdR} colspan="3">${fNu(wLFnu)}</td>
            <td ${tdR} colspan="3">${fNu(lsLFnu)}</td>
          </tr>
          <tr>
            <td ${tdL}>${nm[2]} normalised (HFnu) = ${nm[2]}/(${nm[1]}+${nm[2]})×100</td>
            <td ${tdR} colspan="3">${fNu(wHFnu)}</td>
            <td ${tdR} colspan="3">${fNu(lsHFnu)}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════
   NONLINEAR
═══════════════════════════════════════════════ */
function poincareSd(ibis){if(ibis.length<3)return{sd1:0,sd2:0};const d=[],s=[];for(let i=0;i<ibis.length-1;i++){d.push(ibis[i+1]-ibis[i]);s.push(ibis[i+1]+ibis[i]);}return{sd1:std(d)/Math.SQRT2,sd2:std(s)/Math.SQRT2};}
/* sampleEntropy — Richman & Moorman (2000), m=2, r=0.2*std(data, ddof=1) matching NeuroKit2.
   cap: max beats used (default 300 for performance). Returns {value, n} so UI can show N used. */
function sampleEntropy(data,m=2,r=0.2,cap=300){
  const input=data.length>cap?data.slice(0,cap):data.slice();
  const n=input.length;
  if(n<20)return{value:0,n};
  const tol=r*std(input); // std() uses ddof=1 — matches NeuroKit2 exactly
  function cnt(mm){let B=0;for(let i=0;i<n-mm;i++)for(let j=i+1;j<n-mm;j++){let ok=true;for(let k=0;k<mm;k++)if(Math.abs(input[i+k]-input[j+k])>tol){ok=false;break;}if(ok)B++;}return B;}
  const A=cnt(m+1),B=cnt(m);
  return{value:B>0?-Math.log(A/B):0,n};
}

/* approxEntropy — Pincus (1991), m=2, r=0.2*std(data, ddof=1).
   ApEn counts self-matches (i=j allowed) unlike SampEn (i≠j).
   Formula: ApEn(m,r,N) = Φ(m) − Φ(m+1)
   where Φ(m) = (1/(N−m+1)) * Σ log(Cm_i / (N−m+1))
   cap: max samples used (default 300). Returns {value, n}. */
function approxEntropy(data,m=2,r=0.2,cap=300){
  const input=data.length>cap?data.slice(0,cap):data.slice();
  const n=input.length;
  if(n<20)return{value:0,n};
  const tol=r*std(input);
  function phi(mm){
    const N=n-mm+1;
    let sum=0;
    for(let i=0;i<N;i++){
      let cnt=0;
      for(let j=0;j<N;j++){
        let match=true;
        for(let k=0;k<mm;k++){if(Math.abs(input[i+k]-input[j+k])>tol){match=false;break;}}
        if(match)cnt++;
      }
      sum+=Math.log(cnt/N);
    }
    return sum/N;
  }
  const val=phi(m)-phi(m+1);
  return{value:isFinite(val)?val:0,n};
}


/* ═══════════════════════════════════════════════
   CHART FACTORY
═══════════════════════════════════════════════ */
function dc(id){if(charts[id]){try{charts[id].destroy();}catch(e){}delete charts[id];}}
function mkC(id,cfg){dc(id);const el=document.getElementById(id);if(!el)return null;charts[id]=new Chart(el,cfg);return charts[id];}

function themeColors(){
  return isDark
    ?{grid:'rgba(255,255,255,0.05)',tick:'#8b90a0',text:'#e8eaf0'}
    :{grid:'rgba(0,0,0,0.05)',tick:'#5a5f7a',text:'#1a1d2e'};
}
const C={acc:'#4f8ef7',grn:'#34c98a',orn:'#f4855a',pur:'#9b7ef8',tel:'#38c5c5',pnk:'#f06bbe',vlf:'#9b7ef8',lf:'#4f8ef7',hf:'#34c98a'};

function scOpts(xl='',yl='',extra={}){
  const{grid,tick}=themeColors();
  // All interaction (wheel zoom, pinch, drag-box zoom, pan) is handled manually
  // by our own toolbar/listener code (see TOOLBAR ZOOM MODES below). The
  // chartjs-plugin-zoom plugin's own interactive handlers are kept fully
  // disabled here — running both at once desyncs the plugin's internal zoom
  // state and causes it to throw on the next interaction.
  const basePlugins={legend:{display:false},zoom:{zoom:{wheel:{enabled:false},pinch:{enabled:false},drag:{enabled:false},mode:'xy'},pan:{enabled:false,mode:'xy'}}};
  const mergedPlugins=Object.assign({},basePlugins,extra.plugins||{});
  return{responsive:true,maintainAspectRatio:false,animation:false,
    plugins:mergedPlugins,
    scales:{x:{type:'linear',title:{display:!!xl,text:xl,color:tick,font:{size:10}},ticks:{color:tick,font:{size:9},maxTicksLimit:12},grid:{color:grid}},y:{title:{display:!!yl,text:yl,color:tick,font:{size:10}},ticks:{color:tick,font:{size:9}},grid:{color:grid}}}};
}
function barOpts(xl,yl){
  const{grid,tick}=themeColors();
  return{responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{display:false},zoom:{zoom:{wheel:{enabled:false},drag:{enabled:false},mode:'x'},pan:{enabled:false,mode:'x'}}},
    scales:{x:{title:{display:true,text:xl,color:tick,font:{size:10}},ticks:{color:tick,font:{size:9},maxTicksLimit:12},grid:{color:grid}},y:{title:{display:true,text:yl,color:tick,font:{size:10}},ticks:{color:tick,font:{size:9}},grid:{color:grid}}}};
}

/* ═══════════════════════════════════════════════
   TOOLBAR ZOOM MODES — all manual, no plugin dependency
   Mode state per chart: 'xy' = box zoom, 'y' = height zoom, false = off
   Pan state: true/false
   Default: wheel zoom (plugin) ON, everything else OFF
═══════════════════════════════════════════════ */
const _dragZoomActive={};
const _panModeActive={};
const _panState={};
const _chartInitialRange={};  // chartId → {xMin,xMax,yMin,yMax} — stored on first render

/* Store the initial axis range when a chart is first rendered */
function _storeInitialRange(chartId){
  const ch=charts[chartId]; if(!ch||!ch.scales) return;
  const x=ch.scales.x, y=ch.scales.y;
  if(!x||!y) return;
  _chartInitialRange[chartId]={xMin:x.min,xMax:x.max,yMin:y.min,yMax:y.max};
}

/* Apply axis limits directly to the chart */
function _setAxes(chartId, xMin, xMax, yMin, yMax){
  const ch=charts[chartId]; if(!ch||!ch.scales) return;
  const x=ch.scales.x, y=ch.scales.y;
  if(x){x.options.min=xMin; x.options.max=xMax;}
  if(y){y.options.min=yMin; y.options.max=yMax;}
  ch.update('none');
}

/* Reset to the stored initial range (the 10s window set at render time) */
function resetZoom(chartId){
  const ch=charts[chartId]; if(!ch||!ch.scales) return;
  const r=_chartInitialRange[chartId];
  if(r){
    _setAxes(chartId,r.xMin,r.xMax,r.yMin,r.yMax);
  } else {
    // No stored initial range yet (reset clicked before layout settled) —
    // just clear any manual limits so Chart.js recomputes the natural data
    // range. Deliberately does NOT call the plugin's own ch.resetZoom():
    // that reads the plugin's internal zoom state, which our manual
    // zoom/pan/wheel handlers never update, so it operates on stale data.
    ['x','y'].forEach(axis=>{
      const sc=ch.scales[axis]; if(!sc) return;
      sc.options.min=undefined; sc.options.max=undefined;
    });
    ch.update('none');
  }
}

function zoomIn(chartId){
  const ch=charts[chartId]; if(!ch||!ch.scales) return;
  const x=ch.scales.x, y=ch.scales.y;
  const factor=0.7;  // zoom in = shrink range by 30%
  if(x){const cx=(x.min+x.max)/2, hr=(x.max-x.min)/2*factor; x.options.min=cx-hr; x.options.max=cx+hr;}
  if(y){const cy=(y.min+y.max)/2, hr=(y.max-y.min)/2*factor; y.options.min=cy-hr; y.options.max=cy+hr;}
  ch.update('none');
}
function zoomOut(chartId){
  const ch=charts[chartId]; if(!ch||!ch.scales) return;
  const x=ch.scales.x, y=ch.scales.y;
  const factor=1/0.7;
  if(x){const cx=(x.min+x.max)/2, hr=(x.max-x.min)/2*factor; x.options.min=cx-hr; x.options.max=cx+hr;}
  if(y){const cy=(y.min+y.max)/2, hr=(y.max-y.min)/2*factor; y.options.min=cy-hr; y.options.max=cy+hr;}
  ch.update('none');
}

/* Convert canvas pixel position to chart data coordinates */
function _pxToData(ch, px, py){
  if(!ch||!ch.scales||!ch.chartArea) return{x:0,y:0};
  const x=ch.scales.x, y=ch.scales.y;
  const ca=ch.chartArea;
  const dx=x.min+(px-ca.left)/(ca.right-ca.left)*(x.max-x.min);
  const dy=y.min+(ca.bottom-py)/(ca.bottom-ca.top)*(y.max-y.min);
  return{x:dx,y:dy};
}

/* Manual box zoom and Y-zoom overlay canvas */
const _zoomOverlays={};  // chartId → overlay canvas element

function _getOrCreateOverlay(chartId){
  const ch=charts[chartId]; if(!ch||!ch.canvas) return null;
  const canvas=ch.canvas; if(!canvas) return null;
  if(_zoomOverlays[chartId] && _zoomOverlays[chartId].parentNode) return _zoomOverlays[chartId];
  const ov=document.createElement('canvas');
  ov.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  ov.width=canvas.width; ov.height=canvas.height;
  canvas.parentNode.style.position='relative';
  canvas.parentNode.appendChild(ov);
  _zoomOverlays[chartId]=ov;
  return ov;
}

function _attachZoomListeners(chartId){
  // Only used to get the canvas element and confirm a chart currently exists;
  // every handler below re-fetches charts[chartId] fresh (never captures this
  // instance), since the chart is destroyed and recreated on every re-run of
  // HRV/BRV, and canvas._zoomListenersAttached (below) makes this a one-time
  // setup per canvas element — using a stale chart instance in a handler is
  // what threw "Cannot read properties of undefined" on later interactions.
  const ch0=charts[chartId]; if(!ch0) return;
  const canvas=ch0.canvas; if(!canvas) return;
  if(canvas._zoomListenersAttached) return;
  canvas._zoomListenersAttached=true;

  let dragStart=null; // {x,y} in canvas pixel coords
  let dragCurrent=null;

  canvas.addEventListener('mousedown',e=>{
    const mode=_dragZoomActive[chartId];
    if(!mode) return;
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
    dragStart={x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY};
    dragCurrent=null;
    e.preventDefault(); e.stopPropagation();
  });

  window.addEventListener('mousemove',e=>{
    const mode=_dragZoomActive[chartId];
    if(!mode||!dragStart) return;
    const ch=charts[chartId]; if(!ch||!ch.chartArea) return;
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
    dragCurrent={x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY};
    // Draw rubber-band rectangle on overlay
    const ov=_getOrCreateOverlay(chartId); if(!ov) return;
    const ctx=ov.getContext('2d');
    ctx.clearRect(0,0,ov.width,ov.height);
    const ca=ch.chartArea;
    const isY=mode==='y';
    const x1=isY?ca.left:Math.min(dragStart.x,dragCurrent.x);
    const x2=isY?ca.right:Math.max(dragStart.x,dragCurrent.x);
    const y1=Math.min(dragStart.y,dragCurrent.y);
    const y2=Math.max(dragStart.y,dragCurrent.y);
    const fillColor=isY?'rgba(52,201,138,0.12)':'rgba(79,142,247,0.12)';
    const strokeColor=isY?'rgba(52,201,138,0.7)':'rgba(79,142,247,0.7)';
    ctx.fillStyle=fillColor;
    ctx.fillRect(x1,y1,x2-x1,y2-y1);
    ctx.strokeStyle=strokeColor;
    ctx.lineWidth=1;
    ctx.strokeRect(x1,y1,x2-x1,y2-y1);
  });

  window.addEventListener('mouseup',e=>{
    const mode=_dragZoomActive[chartId];
    // Clear overlay
    const ov=_zoomOverlays[chartId];
    if(ov){const ctx=ov.getContext('2d');ctx.clearRect(0,0,ov.width,ov.height);}
    if(!mode||!dragStart||!dragCurrent){dragStart=null;dragCurrent=null;return;}
    const ch=charts[chartId];
    if(!ch||!ch.scales||!ch.chartArea){dragStart=null;dragCurrent=null;return;}
    // Apply zoom
    const x=ch.scales.x, y=ch.scales.y;
    const ca=ch.chartArea;
    const minDragPx=5;
    if(mode==='xy'){
      const px1=Math.min(dragStart.x,dragCurrent.x), px2=Math.max(dragStart.x,dragCurrent.x);
      const py1=Math.min(dragStart.y,dragCurrent.y), py2=Math.max(dragStart.y,dragCurrent.y);
      if(px2-px1>minDragPx && x){
        const d1=_pxToData(ch,px1,py1), d2=_pxToData(ch,px2,py2);
        x.options.min=d1.x; x.options.max=d2.x;
      }
      if(py2-py1>minDragPx && y){
        const d1=_pxToData(ch,px1,py1), d2=_pxToData(ch,px2,py2);
        y.options.min=Math.min(d1.y,d2.y); y.options.max=Math.max(d1.y,d2.y);
      }
    } else if(mode==='y'){
      const py1=Math.min(dragStart.y,dragCurrent.y), py2=Math.max(dragStart.y,dragCurrent.y);
      if(py2-py1>minDragPx && y){
        const d1=_pxToData(ch,ca.left,py1), d2=_pxToData(ch,ca.left,py2);
        y.options.min=Math.min(d1.y,d2.y); y.options.max=Math.max(d1.y,d2.y);
      }
    }
    ch.update('none');
    dragStart=null; dragCurrent=null;
  });

  // Manual wheel-zoom (replaces the plugin's own wheel handler, which is
  // kept disabled everywhere — see scOpts/barOpts). Scroll up = zoom in,
  // centered on the chart's midpoint, reusing the same zoomIn()/zoomOut()
  // used by the toolbar buttons so there is exactly one zoom code path.
  canvas.addEventListener('wheel',e=>{
    const ch=charts[chartId]; if(!ch||!ch.scales) return;
    e.preventDefault();
    if(e.deltaY<0) zoomIn(chartId); else zoomOut(chartId);
  },{passive:false});
}

function _setDragZoom(chartId,mode){
  _dragZoomActive[chartId]=mode;
  const ch=charts[chartId]; if(!ch||!ch.options?.plugins?.zoom) return;
  // The plugin's own wheel/pinch/drag/pan handlers are kept disabled at all
  // times (see scOpts/barOpts) — everything here is purely cosmetic (cursor,
  // button highlight) plus our own manual mode flag.
  const zOpts=ch.options.plugins.zoom;
  zOpts.zoom.drag={enabled:false};
  zOpts.zoom.wheel={enabled:false};
  zOpts.zoom.pinch={enabled:false};
  zOpts.pan={enabled:false};
  if(mode){
    ch.canvas.style.cursor=mode==='y'?'ns-resize':'crosshair';
    _panModeActive[chartId]=false;
    const pb=document.getElementById('panBtn_'+chartId);
    if(pb){pb.style.background='';pb.style.color='';}
  } else {
    ch.canvas.style.cursor='';
  }
  ch.update('none');
  const bXY=document.getElementById('dragZoomBtn_'+chartId);
  const bY=document.getElementById('yZoomBtn_'+chartId);
  if(bXY){bXY.style.background=mode==='xy'?'var(--acc)':'';bXY.style.color=mode==='xy'?'#fff':'';}
  if(bY) {bY.style.background=mode==='y'?'var(--grn)':'';bY.style.color=mode==='y'?'#fff':'';}
}
function toggleDragZoom(chartId){_setDragZoom(chartId,_dragZoomActive[chartId]==='xy'?false:'xy');}
function toggleYZoom(chartId){_setDragZoom(chartId,_dragZoomActive[chartId]==='y'?false:'y');}

function _applyManualPan(chartId, dx, dy){
  const ch=charts[chartId]; if(!ch||!ch.scales||!ch.chartArea) return;
  const {scales}=ch;
  // Pan each axis by pixel delta converted to data units
  ['x','y'].forEach(axis=>{
    const sc=scales[axis]; if(!sc) return;
    const range=sc.max-sc.min;
    const pxSize=axis==='x'?ch.chartArea.width:ch.chartArea.height;
    if(pxSize<=0) return;
    const delta=axis==='x'?-(dx/pxSize)*range:(dy/pxSize)*range;
    sc.options.min=sc.min+delta;
    sc.options.max=sc.max+delta;
  });
  ch.update('none');
}

function _attachPanListeners(chartId){
  const ch=charts[chartId]; if(!ch) return;
  const canvas=ch.canvas; if(!canvas) return;
  // Use a data attribute to avoid duplicate listeners
  if(canvas._panListenersAttached) return;
  canvas._panListenersAttached=true;
  _panState[chartId]={dragging:false,lastX:0,lastY:0};

  canvas.addEventListener('mousedown',e=>{
    if(!_panModeActive[chartId]) return;
    _panState[chartId]={dragging:true,lastX:e.clientX,lastY:e.clientY};
    canvas.style.cursor='grabbing';
    e.preventDefault();
    e.stopPropagation();
  });
  window.addEventListener('mousemove',e=>{
    const st=_panState[chartId];
    if(!st||!st.dragging||!_panModeActive[chartId]) return;
    const dx=e.clientX-st.lastX, dy=e.clientY-st.lastY;
    st.lastX=e.clientX; st.lastY=e.clientY;
    _applyManualPan(chartId,dx,dy);
  });
  window.addEventListener('mouseup',()=>{
    const st=_panState[chartId];
    if(st) st.dragging=false;
    if(_panModeActive[chartId]&&charts[chartId]) charts[chartId].canvas.style.cursor='grab';
  });
}

function _setPanMode(chartId,active){
  _panModeActive[chartId]=active;
  const ch=charts[chartId];if(!ch||!ch.options?.plugins?.zoom)return;
  // Plugin interactions stay disabled at all times (see scOpts/barOpts) —
  // pan is always handled by our own manual listeners (_attachPanListeners).
  const zOpts=ch.options.plugins.zoom;
  zOpts.zoom.drag={enabled:false};
  zOpts.zoom.wheel={enabled:false};
  zOpts.zoom.pinch={enabled:false};
  zOpts.pan={enabled:false,mode:'xy'};
  ch.update('none');
  if(active){
    ch.canvas.style.cursor='grab';
    // Deactivate drag zoom
    _dragZoomActive[chartId]=false;
    ['dragZoomBtn_','yZoomBtn_'].forEach(p=>{
      const b=document.getElementById(p+chartId);
      if(b){b.style.background='';b.style.color='';}
    });
    _attachPanListeners(chartId);
  } else {
    ch.canvas.style.cursor='';
  }
  const btn=document.getElementById('panBtn_'+chartId);
  if(btn){btn.style.background=active?'rgba(155,126,248,0.8)':'';btn.style.color=active?'#fff':'';}
}
function togglePan(chartId){_setPanMode(chartId,!(_panModeActive[chartId]||false));}

function mkToolbar(containerId, chartId){
  const c=document.getElementById(containerId);if(!c)return;
  c.innerHTML=`
    <button id="panBtn_${chartId}" class="btn btn-sm btn-icon" title="Pan — drag to move around" onclick="togglePan('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 00-2-2 2 2 0 00-2 2"/><path d="M14 10V4a2 2 0 00-2-2 2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2 2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg></button>
    <button id="dragZoomBtn_${chartId}" class="btn btn-sm btn-icon" title="Box zoom — drag rectangle" onclick="toggleDragZoom('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M10 10L21 21"/><line x1="15" y1="21" x2="21" y2="21"/><line x1="21" y1="15" x2="21" y2="21"/></svg></button>
    <button id="yZoomBtn_${chartId}" class="btn btn-sm btn-icon" title="Height zoom — drag vertically" onclick="toggleYZoom('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="6 9 12 3 18 9"/><polyline points="6 15 12 21 18 15"/></svg></button>
    <button class="btn btn-sm btn-icon" title="Reset zoom" onclick="resetZoom('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>
    <button class="btn btn-sm btn-icon" title="Zoom in" onclick="zoomIn('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
    <button class="btn btn-sm btn-icon" title="Zoom out" onclick="zoomOut('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
    <button class="btn btn-sm btn-icon" title="Save image" onclick="saveChart('${chartId}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>`;
  // Attach all interaction listeners and store initial axis range for reset
  _panState[chartId]={dragging:false,lastX:0,lastY:0};
  if(charts[chartId]){
    _attachPanListeners(chartId);
    _attachZoomListeners(chartId);
    // Defer range store until after chart has laid out
    setTimeout(()=>_storeInitialRange(chartId), 50);
  }
}
function saveChart(id){
  if(!charts[id])return;
  const a=document.createElement('a');a.download='vaasi_'+id+'.png';a.href=charts[id].toBase64Image();a.click();
}

function renderSigChart(cid,raw,smooth,peakIdxs,tv,rc,sc2,pc,btnsId,legendId,isFiltered){
  const n=raw.length;
  // Use up to 4000 points for better waveform fidelity at high sampling rates
  const skip=Math.max(1,Math.floor(n/4000));
  const peakSet=new Set(peakIdxs);
  const rawXY=[],smXY=[];
  for(let i=0;i<n;i++){
    // Include: every skip-th sample, all peak samples, and the last sample
    if(i%skip===0||peakSet.has(i)||i===n-1){
      rawXY.push({x:+tv[i].toFixed(4),y:+raw[i].toFixed(4)});
      if(isFiltered) smXY.push({x:+tv[i].toFixed(4),y:+smooth[i].toFixed(4)});
    }
  }
  const pkXY=peakIdxs.map(i=>({x:+tv[i].toFixed(4),y:+raw[i].toFixed(4)}));
  let yMin=raw[0],yMax=raw[0];
  for(let i=1;i<n;i++){if(raw[i]<yMin)yMin=raw[i];if(raw[i]>yMax)yMax=raw[i];}
  const yRange=yMax-yMin, pad=yRange*0.12;
  const datasets=[{data:rawXY,showLine:true,borderColor:rc,borderWidth:1,pointRadius:0,tension:0,order:3}];
  if(isFiltered) datasets.push({data:smXY,showLine:true,borderColor:sc2,borderWidth:1.5,pointRadius:0,tension:0,order:2});
  datasets.push({data:pkXY,showLine:false,pointBackgroundColor:pc,pointBorderColor:pc,pointRadius:5,pointHoverRadius:7,order:1});
  mkC(cid,{type:'scatter',data:{datasets},options:{...scOpts('time (s)','amplitude'),animation:false,
    scales:{...scOpts().scales,
      y:{...scOpts().scales?.y,min:+(yMin-pad).toFixed(4),max:+(yMax+pad).toFixed(4)}}}});
  if(btnsId) mkToolbar(btnsId,cid);
  if(legendId){const el=document.getElementById(legendId);if(el)el.style.display=isFiltered?'':'none';}
}

/* ═══════════════════════════════════════════════
   ROI ON IBI CHART
═══════════════════════════════════════════════ */
function setupROI(){
  const canvas=document.getElementById('roiCanvas');
  const ctx=canvas.getContext('2d');
  let dragging=false,startPx=null,endPx=null;

  function redrawROI(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(startPx!==null&&endPx!==null){
      const x=Math.min(startPx,endPx),w=Math.abs(endPx-startPx);
      ctx.fillStyle=isDark?'rgba(79,142,247,0.15)':'rgba(79,142,247,0.12)';
      ctx.fillRect(x,0,w,canvas.height);
      ctx.strokeStyle='rgba(79,142,247,0.8)';
      ctx.lineWidth=1.5;
      ctx.strokeRect(x,0,w,canvas.height);
    }
  }

  function pxToTime(px){
    const ch=charts['ibiChart'];if(!ch)return null;
    const area=ch.chartArea;
    const scale=ch.scales.x;
    const ratio=(px-area.left)/(area.right-area.left);
    return scale.min+(scale.max-scale.min)*ratio;
  }

  canvas.addEventListener('mousedown',e=>{
    const rect=canvas.getBoundingClientRect();
    startPx=e.clientX-rect.left;endPx=startPx;dragging=true;
  });
  canvas.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const rect=canvas.getBoundingClientRect();
    endPx=e.clientX-rect.left;
    redrawROI();
  });
  canvas.addEventListener('mouseup',e=>{
    dragging=false;
    if(Math.abs(endPx-startPx)<5){ctx.clearRect(0,0,canvas.width,canvas.height);document.getElementById('roiInfo').style.display='none';document.getElementById('roiStats').style.display='none';return;}
    const t1=pxToTime(Math.min(startPx,endPx));
    const t2=pxToTime(Math.max(startPx,endPx));
    computeROI(t1,t2);
    redrawROI();
  });

  // resize canvas to match chart
  function syncSize(){
    const wrap=document.querySelector('#roiCanvas').parentElement;
    canvas.width=wrap.offsetWidth;canvas.height=wrap.offsetHeight;
  }
  window.addEventListener('resize',syncSize);
  setTimeout(syncSize,200);
}

function computeROI(t1,t2){
  if(!fullIbis.length||!fullIbiTimes.length)return;
  const subset=[],subTimes=[];
  for(let i=0;i<fullIbiTimes.length;i++){
    if(fullIbiTimes[i]>=t1&&fullIbiTimes[i]<=t2){subset.push(fullIbis[i]);subTimes.push(fullIbiTimes[i]);}
  }
  const ri=document.getElementById('roiInfo');
  ri.style.display='block';
  if(subset.length<4){
    ri.textContent=`ROI: ${t1.toFixed(2)}s \u2013 ${t2.toFixed(2)}s \u00b7 only ${subset.length} beats \u2014 need \u22654`;
    document.getElementById('roiStats').style.display='none';
    return;
  }
  ri.textContent=`ROI: ${t1.toFixed(2)}s \u2013 ${t2.toFixed(2)}s \u00b7 ${subset.length} beats`;

  // ── Metrics ──
  const mn=mean(subset),sd=std(subset),rm=rmssd(subset),p50=pNN(subset,50),p20=pNN(subset,20);
  const sdsd=std(subset.slice(1).map((v,i)=>v-subset[i]));
  const mHR=60000/mn,loHR=60000/Math.max(...subset),hiHR=60000/Math.min(...subset);
  const nn50=subset.filter((v,i,a)=>i>0&&Math.abs(v-a[i-1])>50).length;
  const nn20=subset.filter((v,i,a)=>i>0&&Math.abs(v-a[i-1])>20).length;
  const{sd1,sd2}=poincareSd(subset);
  const _sEn=sampleEntropy(subset); // cap=300 internally; returns {value,n}
  const sEn=_sEn.value;
  const sEnN=_sEn.n;
  const _aEn=approxEntropy(subset);
  const aEn=_aEn.value, aEnN=_aEn.n;
  const bands=getBands();
  const cpt=[subTimes[0]];for(const v of subset)cpt.push(cpt[cpt.length-1]+v/1000);
  const psdResult=computePSD(cpt,subset,bands,4,0,document.getElementById('ibiDetrend')?.checked||false);

  // ── ROI stat cards — time domain only ──
  const el=document.getElementById('roiStats');
  el.className='sg sg4';el.style.display='grid';
  el.innerHTML=
    '<div class="sc cb"><div class="sl">ROI Mean HR</div><div class="sv">'+mHR.toFixed(1)+'<span class="su">bpm</span></div></div>'+
    '<div class="sc cg"><div class="sl">ROI Max HR</div><div class="sv">'+hiHR.toFixed(1)+'<span class="su">bpm</span></div></div>'+
    '<div class="sc ck"><div class="sl">ROI Min HR</div><div class="sv">'+loHR.toFixed(1)+'<span class="su">bpm</span></div></div>'+
    '<div class="sc co"><div class="sl">ROI RMSSD</div><div class="sv">'+rm.toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc cp"><div class="sl">ROI SDNN</div><div class="sv">'+sd.toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc ct"><div class="sl">ROI SDSD</div><div class="sv">'+sdsd.toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc cb"><div class="sl">ROI pNN50</div><div class="sv">'+p50.toFixed(1)+'<span class="su">%</span></div><div class="sh">NN50='+nn50+'</div></div>'+
    '<div class="sc cg"><div class="sl">ROI pNN20</div><div class="sv">'+p20.toFixed(1)+'<span class="su">%</span></div><div class="sh">NN20='+nn20+'</div></div>'+
    '<div class="sc ck"><div class="sl">ROI CV</div><div class="sv">'+(sd/mn*100).toFixed(1)+'<span class="su">%</span></div></div>'+
    '<div class="sc ct"><div class="sl">ROI Beats</div><div class="sv">'+subset.length+'</div></div>';

  const tPts=subTimes.map((t,i)=>({x:+t.toFixed(3),y:+subset[i].toFixed(1)}));
  const{slope:ts,intercept:ti2}=linReg(tPts.map(p=>p.x),tPts.map(p=>p.y));
  mkC('tacho',{type:'scatter',data:{datasets:[
    {data:tPts,backgroundColor:'rgba(79,142,247,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(79,142,247,0.3)',borderWidth:1},
    {data:[{x:tPts[0].x,y:+(ts*tPts[0].x+ti2).toFixed(1)},{x:tPts[tPts.length-1].x,y:+(ts*tPts[tPts.length-1].x+ti2).toFixed(1)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','IBI (ms)')});
  mkToolbar('tachoB','tacho');
  const{centers:hc,counts:hct}=histogram(subset,30,Math.min(...subset),Math.max(...subset));
  mkC('ibiHist',{type:'bar',data:{labels:hc,datasets:[{data:hct,backgroundColor:'rgba(79,142,247,0.7)',borderColor:C.acc,borderWidth:1}]},options:barOpts('IBI (ms)','count')});
  mkToolbar('histB','ibiHist');
  const diffs=subset.slice(1).map((v,i)=>+(v-subset[i]).toFixed(1));
  mkC('dnnChart',{type:'bar',data:{labels:subTimes.slice(1).map(t=>t.toFixed(2)),datasets:[{data:diffs,backgroundColor:diffs.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','\u0394NN (ms)')});
  mkToolbar('dnnB','dnnChart');

  // ── Frequency tab ──
  const _fw=!psdResult.vlfResolvable?`\u26a0 ROI too short to resolve VLF (df=${(psdResult.trueDf*1000).toFixed(2)} mHz)`:(!psdResult.lfResolvable?`\u26a0 ROI too short to resolve LF`:'');
  buildFdTable('fdMetricsTable',
    {vlf:psdResult.w.vlf,lf:psdResult.w.lf,hf:psdResult.w.hf,tp:psdResult.w.tp,lfhf:psdResult.w.lfhf,peakF:psdResult.w.peakF},
    {vlf:psdResult.ls.vlf,lf:psdResult.ls.lf,hf:psdResult.ls.hf,tp:psdResult.ls.tp,lfhf:psdResult.ls.lfhf,peakF:psdResult.ls.peakF},
    bands,['VLF','LF','HF'],_fw);
  renderPSD(psdResult.wFreqs,psdResult.wPsd,psdResult.lsFreqs,psdResult.lsPsd,bands,'psdChart','psdB','psdLegend');
  const wBv=[psdResult.w.vlf,psdResult.w.lf,psdResult.w.hf].map(v=>+v.toFixed(2));
  const bcl=[C.vlf,C.lf,C.hf];
  mkC('bandPie',{type:'doughnut',data:{labels:['VLF','LF','HF'],datasets:[{data:wBv,backgroundColor:bcl,borderColor:bcl,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom',labels:{color:themeColors().tick,font:{size:11},padding:10}}}}});
  mkToolbar('pieB','bandPie');
  mkC('bandBar',{type:'bar',data:{labels:['VLF','LF','HF'],datasets:[{data:wBv,backgroundColor:bcl,borderWidth:0}]},options:barOpts('band','ms\u00b2')});
  mkToolbar('barB','bandBar');

  // ── Poincaré tab ──
  document.getElementById('nlStats').innerHTML=sc4([
    {c:'cb',l:'SD1',v:sd1.toFixed(1),u:'ms'},{c:'cp',l:'SD2',v:sd2.toFixed(1),u:'ms'},
    {c:'co',l:'SD1/SD2',v:sd2>0?(sd1/sd2).toFixed(3):'\u2013'},
    {c:'ct',l:'SampEn',v:sEn.toFixed(3),h:'N='+sEnN},
    {c:'cg',l:'ApEn',v:aEn.toFixed(3),h:'N='+aEnN},
    {c:'ck',l:'ROI beats',v:subset.length},
  ]);
  const iMin=Math.min(...subset),iMax=Math.max(...subset);
  mkC('poincareChart',{type:'scatter',data:{datasets:[
    {data:subset.slice(0,-1).map((v,i)=>({x:+v.toFixed(1),y:+subset[i+1].toFixed(1)})),backgroundColor:'rgba(79,142,247,0.5)',pointRadius:3},
    {data:[{x:iMin,y:iMin},{x:iMax,y:iMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('RRn (ms)','RRn+1 (ms)')});
  mkToolbar('pcB','poincareChart');
}

/* ═══════════════════════════════════════════════
   HRV METRICS HELPER
═══════════════════════════════════════════════ */
function computeHRVMetrics(ibis,peakTimes){
  const bands=getBands();
  const mn=mean(ibis),sd=std(ibis),rm=rmssd(ibis),p50=pNN(ibis,50),p20=pNN(ibis,20);
  const sdsd=std(ibis.slice(1).map((v,i)=>v-ibis[i]));
  const mHR=60000/mn,loHR=60000/Math.max(...ibis),hiHR=60000/Math.min(...ibis);
  const nn50=ibis.filter((v,i,a)=>i>0&&Math.abs(v-a[i-1])>50).length;
  const nn20=ibis.filter((v,i,a)=>i>0&&Math.abs(v-a[i-1])>20).length;
  const{sd1,sd2}=poincareSd(ibis);
  const _sEn=sampleEntropy(ibis); // cap=300 internally; no manual truncation here
  const sEn=_sEn.value, sEnN=_sEn.n;
  const _aEn=approxEntropy(ibis);
  const aEn=_aEn.value, aEnN=_aEn.n;

  // Build cumulative peak times
  const cpt=[(peakTimes&&peakTimes[0])||0];
  for(const v of ibis) cpt.push(cpt[cpt.length-1]+v/1000);

  const psdResult=computePSD(cpt,ibis,bands,4,0,window._ibiDoDetrend||false);

  return{mn,sd,rm,p50,p20,sdsd,mHR,loHR,hiHR,nn50,nn20,sd1,sd2,sEn,sEnN,aEn,aEnN,
    trueDf:psdResult.trueDf,vlfResolvable:psdResult.vlfResolvable,lfResolvable:psdResult.lfResolvable,
    wFreqs:psdResult.wFreqs,wPsd:psdResult.wPsd,
    lsFreqs:psdResult.lsFreqs,lsPsd:psdResult.lsPsd,
    // Welch results (for backward compat with band chart rendering)
    vlf:psdResult.w.vlf,lf:psdResult.w.lf,hf:psdResult.w.hf,tp:psdResult.w.tp,
    lfhf:psdResult.w.lfhf,lfNu:psdResult.w.lfNu,hfNu:psdResult.w.hfNu,
    wPeakF:psdResult.w.peakF,
    // LS results
    lsVlf:psdResult.ls.vlf,lsLf:psdResult.ls.lf,lsHf:psdResult.ls.hf,lsTp:psdResult.ls.tp,
    lsLfhf:psdResult.ls.lfhf,lsPeakF:psdResult.ls.peakF,
    cpt};
}

/* ═══════════════════════════════════════════════
   SETUP CARD COLLAPSE
═══════════════════════════════════════════════ */
function collapseSetup(mode){
  // Which setup card to collapse
  const isIbi = (mode==='hrv-ibi')||(mode==='brv-ibi');
  let cardId;
  if(mode==='hrv') cardId='hrvSigSetup';
  else if(mode==='hrv-ibi') cardId='hrvIbiSetup';
  else if(mode==='brv') cardId='brvSigSetup';
  else if(mode==='brv-ibi') cardId='brvIbiSetup';
  else return;
  const card=document.getElementById(cardId);
  if(!card) return;
  // Wrap body if not already wrapped
  if(!card.querySelector('.setup-card-body')){
    const title=card.querySelector('.card-title');
    const body=document.createElement('div');
    body.className='setup-card-body';
    // move all children except title into body
    const children=Array.from(card.children);
    children.forEach(c=>{if(c!==title) body.appendChild(c);});
    card.appendChild(body);
    // Add status strip
    const status=document.createElement('div');
    status.className='setup-status';
    const label=document.createElement('span');
    label.style.cssText='font-size:11px;color:var(--tx2)';
    label.id=cardId+'Status';
    label.textContent=mode.includes('hrv')?'HRV computed':'BRV computed';
    const btn=document.createElement('button');
    btn.className='setup-toggle';
    btn.textContent='Edit settings ↓';
    btn.onclick=()=>expandSetup(cardId);
    status.appendChild(label);
    status.appendChild(btn);
    card.insertBefore(status,body);
  }
  card.classList.add('setup-card-collapsed');
  // scroll to results — only if still on main analysis view
  const resId=mode.includes('hrv')?'hrvResultSec':'brvResultSec';
  const res=document.getElementById(resId);
  if(res) setTimeout(()=>{
    if(document.body.classList.contains('on-main'))
      res.scrollIntoView({behavior:'smooth',block:'start'});
  },100);
}

function expandSetup(cardId){
  const card=document.getElementById(cardId);
  if(card) card.classList.remove('setup-card-collapsed');
}

/* ═══════════════════════════════════════════════
   RUN HRV
═══════════════════════════════════════════════ */
function runHRV(){
  const wEl=document.getElementById('hrv-warn');wEl.style.display='none';
  const col=document.getElementById('ecgCol').value;
  if(!col){wEl.textContent='Select a cardiac signal column.';wEl.style.display='block';return;}
  let sig=rawRows.map(r=>{const v=r[col];if(typeof v==='number')return v;const n=parseFloat(v);return isFinite(n)?n:null;}).filter(v=>v!==null);
  if(!sig.length){wEl.textContent='No numeric data in column.';wEl.style.display='block';return;}
  // Peak detection looks for local MAXIMA — if a sensor outputs inverted
  // polarity (systolic rise shows as a dip, common with some reflectance-
  // mode PPG front-ends), flip it here so every downstream stage (filter,
  // smoothing, peak detection) sees a normal rises-are-peaks waveform.
  // Negating preserves the local min/max range exactly, so this doesn't
  // interact with any of the %-based adaptive thresholds below.
  if(document.getElementById('sigInvert')?.checked) sig=sig.map(v=>-v);
  const{t:tv,fs}=getTimeVector(sig,'ecgTimeCol','fsInput');
  const win=parseFloat(document.getElementById('winInput').value)||0;
  if(win>0){const ci=Math.round(win*fs);sig=sig.slice(0,ci);}
  const tvS=tv.slice(0,sig.length);
  if(sig.length<50){wEl.textContent='Signal too short.';wEl.style.display='block';return;}

  // Optional Butterworth bandpass — runs before SG smoothing, on the raw signal
  let bpSig=sig;
  if(document.getElementById('bpFiltEnable')?.checked){
    const bpLo=parseFloat(document.getElementById('bpLo').value)||0;
    const bpHi=parseFloat(document.getElementById('bpHi').value)||0;
    if(bpHi>0 && bpLo>=bpHi){wEl.textContent='Bandpass: low cutoff must be less than high cutoff.';wEl.style.display='block';return;}
    if(bpHi>0 && bpHi>=fs/2){wEl.textContent=`Bandpass high cutoff must be below Nyquist (${(fs/2).toFixed(2)} Hz).`;wEl.style.display='block';return;}
    bpSig=butterBP(sig,bpLo,bpHi,fs);
  }

  let wl=parseInt(document.getElementById('sgWin').value),po=parseInt(document.getElementById('sgPoly').value);
  if(wl%2===0)wl++;if(po>=wl){wl=po+2;if(wl%2===0)wl++;}
  document.getElementById('sgWin').value=wl;document.getElementById('sgWinOut').textContent=wl;
  const sgOn=document.getElementById('sgEnable')?.checked!==false;
  const smooth=sgOn?sgFilter(bpSig,wl,po):bpSig;

  // Peak detection — raw → optional bandpass → optional SG smoothing → find
  // maxima. By default each index is then snapped to the true local max of
  // the RAW signal (see snapToRawPeaks doc comment) so the reported location
  // is exact regardless of which filtering stages were used for detection —
  // but if the raw signal is noisy enough that its true local max is itself
  // a noise spike rather than the real apex, snapping can do more harm than
  // good, so the user can opt to keep the smoothed-signal location instead.
  let peaks=detectPeaks(smooth,+document.getElementById('pkH').value,+document.getElementById('pkD').value,+document.getElementById('pkP').value,fs);
  const pkDist=+document.getElementById('pkD').value;
  const pkLocSrc=document.querySelector('input[name="pkLocSrc"]:checked')?.value||'raw';
  if(pkLocSrc==='raw'){
    const snapRadius=Math.max(sgOn?Math.ceil(wl/2):0, document.getElementById('bpFiltEnable')?.checked?Math.round(fs*0.02):0);
    peaks=snapToRawPeaks(peaks,sig,snapRadius,pkDist);
  }

  document.getElementById('hrvResultSec').style.display='block';
  const isFilteredHRV=sgOn||document.getElementById('bpFiltEnable')?.checked;
  renderSigChart('signalChart',sig,smooth,peaks,tvS,'rgba(79,142,247,0.3)',C.acc,C.orn,'sigChartBtns','sigLegendSmooth',isFilteredHRV);

  if(peaks.length<4){wEl.textContent=`Only ${peaks.length} peak(s). Lower Min height, distance or prominence.`;wEl.style.display='block';return;}

  const pt=peaks.map(i=>tvS[i]);
  // Build IBI + left-peak-time pairs together so filter keeps them aligned.
  // Each IBI[i] = pt[i+1]-pt[i]; left peak = pt[i], right peak = pt[i+1].
  let ibiPairs=[];
  for(let i=1;i<peaks.length;i++){
    const v=(pt[i]-pt[i-1])*1000;
    if(v>300&&v<2000) ibiPairs.push({ibi:v,tLeft:pt[i-1],tRight:pt[i]});
  }
  let ibis=ibiPairs.map(p=>p.ibi);
  if(ibis.length<4){wEl.textContent=`Only ${ibis.length} valid IBIs. Check Fs and column.`;wEl.style.display='block';return;}

  // Automatic outlier-IBI correction — compares each IBI to the median of its
  // own 5-beat neighborhood (a relative, local check) rather than relying
  // solely on peak-detection parameters being tuned until nothing wrong is
  // ever produced. Catches spurious short/long IBIs from residual noise,
  // missed beats, or motion, however they got there. Same algorithm already
  // used for uploaded IBI/RR-interval files (artifactCorrectIBI), just wired
  // in here too. tLeft/tRight are re-derived alongside so cumulative times
  // stay aligned whichever correction mode is chosen.
  if(document.getElementById('sigArtCorr')?.checked){
    const thresh=parseFloat(document.getElementById('sigArtThresh').value)/100||0.20;
    const mode=document.querySelector('input[name="sigArtMode"]:checked')?.value||'interpolate';
    const{ibis:acIbis,flags}=artifactCorrectIBI(ibis,thresh,'interpolate'); // always get full-length flags first
    const nArt=flags.filter(f=>f==='artifact').length;
    if(mode==='remove'){
      ibiPairs=ibiPairs.filter((_,i)=>flags[i]==='normal');
      ibis=ibiPairs.map(p=>p.ibi);
    } else {
      ibiPairs=ibiPairs.map((p,i)=>({...p,ibi:acIbis[i]}));
      ibis=acIbis;
    }
    if(nArt>0){wEl.textContent=`ℹ Artifact correction: ${nArt} beat(s) ${mode==='remove'?'removed':'interpolated'}.`;wEl.style.display='block';}
    if(ibis.length<4){wEl.textContent='Too few valid IBIs after correction.';wEl.style.display='block';return;}
  }

  beatData=ibis;fullIbis=ibis;
  // Build cumulative times by accumulating the FINAL ibis (post artifact-
  // correction, if enabled) from the first pair's left-edge time — this
  // matches how computeHRVMetrics() derives its own internal time axis, and
  // keeps the tachogram/beat-table times consistent with whatever ibis
  // values are actually being reported (interpolated IBIs have new values,
  // so their times must be rebuilt too, not left pointing at the original
  // peak's timestamp).
  const cptFull=[ibiPairs[0].tLeft];
  for(const v of ibis) cptFull.push(cptFull[cptFull.length-1]+v/1000);
  fullIbiTimes=cptFull.slice(1);
  window._hrvCpt=cptFull;

  window._ibiDoDetrend=document.getElementById('sigDetrend')?.checked||false;
  const m=computeHRVMetrics(ibis,pt);
  window._ibiDoDetrend=undefined;

  const bands=getBands();
  const _trueDfHRV=4/Math.max(m.wFreqs?m.wFreqs.length*2-2:ibis.length,1);
  const _fwHRV=!m.vlfResolvable?`⚠ Recording too short to resolve VLF: true df=${(_trueDfHRV*1000).toFixed(2)} mHz (need <${(bands.vlfLo*1000).toFixed(0)} mHz). VLF ms² unreliable — use LF/HF ratio.`:(!m.lfResolvable?`⚠ Recording too short to resolve LF: true df=${(_trueDfHRV*1000).toFixed(2)} mHz.`:'');
  buildFdTable('fdMetricsTable',
    {vlf:m.vlf,lf:m.lf,hf:m.hf,tp:m.tp,lfhf:m.lfhf,peakF:m.wPeakF},
    {vlf:m.lsVlf,lf:m.lsLf,hf:m.lsHf,tp:m.lsTp,lfhf:m.lsLfhf,peakF:m.lsPeakF},
    bands,['VLF','LF','HF'],_fwHRV);
  document.getElementById('nlStats').innerHTML=sc4([
    {c:'cb',l:'SD1',v:m.sd1.toFixed(1),u:'ms'},{c:'cp',l:'SD2',v:m.sd2.toFixed(1),u:'ms'},
    {c:'co',l:'SD1/SD2',v:m.sd2>0?(m.sd1/m.sd2).toFixed(3):'–'},
    {c:'ct',l:'SampEn',v:m.sEn.toFixed(3),h:'N='+m.sEnN},
    {c:'cg',l:'ApEn',v:m.aEn.toFixed(3),h:'N='+m.aEnN},
    {c:'ck',l:'Valid beats',v:ibis.length},
  ]);

  // IBI chart + ROI
  ibiXY=fullIbiTimes.map((t,i)=>({x:+t.toFixed(3),y:+ibis[i].toFixed(1)}));
  mkC('ibiChart',{type:'scatter',data:{datasets:[{data:ibiXY,showLine:true,borderColor:C.acc,borderWidth:1.5,pointRadius:2,pointBackgroundColor:C.acc,fill:false,tension:0.3}]},options:{...scOpts('time (s)','IBI (ms)'),animation:false,plugins:{...scOpts().plugins,zoom:{zoom:{wheel:{enabled:false},drag:{enabled:false},mode:'x'},pan:{enabled:false,mode:'x'}}}}});
  mkToolbar('ibiChartBtns','ibiChart');
  setupROI();

  // Tachogram
  const tPts=fullIbiTimes.map((t,i)=>({x:+t.toFixed(3),y:+ibis[i].toFixed(1)}));
  const{slope:ts,intercept:ti2}=linReg(tPts.map(p=>p.x),tPts.map(p=>p.y));
  mkC('tacho',{type:'scatter',data:{datasets:[
    {data:tPts,backgroundColor:'rgba(79,142,247,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(79,142,247,0.3)',borderWidth:1},
    {data:[{x:tPts[0].x,y:+(ts*tPts[0].x+ti2).toFixed(1)},{x:tPts[tPts.length-1].x,y:+(ts*tPts[tPts.length-1].x+ti2).toFixed(1)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','IBI (ms)')});
  mkToolbar('tachoB','tacho');
  renderInstHRChart(ibis, fullIbiTimes);

  const{centers:hc,counts:hct}=histogram(ibis,30,Math.min(...ibis),Math.max(...ibis));
  mkC('ibiHist',{type:'bar',data:{labels:hc,datasets:[{data:hct,backgroundColor:'rgba(79,142,247,0.7)',borderColor:C.acc,borderWidth:1}]},options:barOpts('IBI (ms)','count')});
  mkToolbar('histB','ibiHist');

  const diffs=ibis.slice(1).map((v,i)=>+(v-ibis[i]).toFixed(1));
  mkC('dnnChart',{type:'bar',data:{labels:fullIbiTimes.slice(1).map(t=>t.toFixed(2)),datasets:[{data:diffs,backgroundColor:diffs.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','ΔNN (ms)')});
  mkToolbar('dnnB','dnnChart');

  // PSD — Welch + Lomb-Scargle with band coloring
  renderPSD(m.wFreqs,m.wPsd,m.lsFreqs,m.lsPsd,bands,'psdChart','psdB','psdLegend');

  // Band charts
  const bl=['VLF','LF','HF'],bv=[m.vlf,m.lf,m.hf].map(v=>+v.toFixed(2)),bcl=[C.vlf,C.lf,C.hf];
  mkC('bandPie',{type:'doughnut',data:{labels:bl,datasets:[{data:bv,backgroundColor:bcl,borderColor:bcl,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom',labels:{color:themeColors().tick,font:{size:11},padding:10}}}}});
  mkToolbar('pieB','bandPie');
  mkC('bandBar',{type:'bar',data:{labels:bl,datasets:[{data:bv,backgroundColor:bcl,borderWidth:0}]},options:barOpts('band','ms²')});
  mkToolbar('barB','bandBar');

  // Poincaré
  const iMin=Math.min(...ibis),iMax=Math.max(...ibis);
  mkC('poincareChart',{type:'scatter',data:{datasets:[
    {data:ibis.slice(0,-1).map((v,i)=>({x:+v.toFixed(1),y:+ibis[i+1].toFixed(1)})),backgroundColor:'rgba(79,142,247,0.5)',pointRadius:3},
    {data:[{x:iMin,y:iMin},{x:iMax,y:iMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('RRn (ms)','RRn+1 (ms)')});
  mkToolbar('pcB','poincareChart');

  // Beat table — build HTML string to avoid hidden-tab DOM issues
  const tbRows=ibis.map((v,i)=>{
    const t=+(m.cpt[i+1]||0).toFixed(3),hr=Math.round(60000/v),dnn=i>0?+(v-ibis[i-1]).toFixed(1):0;
    const flag=v<300||v>2000?'⚠ artefact':Math.abs(dnn)>50?'↕ ectopic':'✓ normal';
    const fc=flag.startsWith('⚠')?'var(--orn)':flag.startsWith('↕')?'var(--pur)':'var(--grn)';
    return `<tr><td>${i+1}</td><td>${t}</td><td>${v.toFixed(1)}</td><td style="color:${dnn>0?'var(--grn)':'var(--orn)'}">${i>0?(dnn>0?'+':'')+dnn:'–'}</td><td>${hr}</td><td style="color:${fc};font-size:11px">${flag}</td></tr>`;
  });
  document.getElementById('beatTbody').innerHTML=tbRows.join('');
  // Reset to Overview tab after all charts are rendered
  {const _b=document.querySelector('#panelHRV .tab');if(_b){_b.classList.remove('active');swHT(0,_b);}}
  collapseSetup('hrv');
}

/* ═══════════════════════════════════════════════
   PSD CHART
   Strategy: one Chart.js dataset per frequency band,
   each filled to origin with its band colour.
   LS overlay as a separate dashed line dataset.
   Band boundary vertical lines + labels via a
   lightweight beforeDatasetsDraw plugin.
═══════════════════════════════════════════════ */

/* Slice the full PSD curve into one array per band.
   Points that fall outside the band get y=0 (so the
   fill drops to the baseline) but we only include the
   range [lo-epsilon … hi+epsilon] so bands don't bleed. */
function sliceBand(freqs,psd,lo,hi){
  const out=[];
  // find the two boundary indices (interpolate)
  for(let i=0;i<freqs.length;i++){
    const f=freqs[i];
    if(f<lo-1e-9||f>hi+1e-9) continue;
    out.push({x:+f.toFixed(6),y:+psd[i].toFixed(8)});
  }
  if(!out.length) return [];
  // prepend & append zero anchor at exact band edge
  if(out[0].x>lo) out.unshift({x:+lo.toFixed(6),y:0});
  if(out[out.length-1].x<hi) out.push({x:+hi.toFixed(6),y:0});
  return out;
}

/* Instantaneous Heart Rate chart — HR(bpm) = 60000/IBI(ms) vs time */
function renderInstHRChart(ibis, times){
  // ibis: array of IBI values in ms; times: array of beat times in seconds (same length)
  const hrXY=ibis.map((v,i)=>({x:+times[i].toFixed(3),y:+(60000/v).toFixed(1)}));
  // Y-axis: sensible HR range — clamp display to ±20% beyond data range, min 20 bpm window
  let hrMin=hrXY[0].y, hrMax=hrXY[0].y;
  for(const p of hrXY){if(p.y<hrMin)hrMin=p.y;if(p.y>hrMax)hrMax=p.y;}
  const hrRange=Math.max(hrMax-hrMin,20), pad=hrRange*0.15;
  mkC('instHRChart',{type:'scatter',data:{datasets:[
    {data:hrXY,showLine:true,borderColor:C.orn,borderWidth:1.5,pointRadius:0,tension:0.3,fill:false},
  ]},options:{...scOpts('time (s)','HR (bpm)'),animation:false,
    scales:{...scOpts().scales,
      y:{...scOpts().scales?.y,min:+(hrMin-pad).toFixed(1),max:+(hrMax+pad).toFixed(1)}}}});
  mkToolbar('instHRBtns','instHRChart');
}

function renderPSD(wFreqs,wPsd,lsFreqs,lsPsd,bands,cid,btnsId,legendId,bandLabelOverride){
  if(!wFreqs||!wFreqs.length||!wPsd||!wPsd.length) return;
  const{tick,grid}=themeColors();

  // determine display range: go a bit past the HF upper boundary
  const displayMax=Math.min(Math.max(bands.hfHi*1.4, 0.5), 1.2);
  const bandLabels=bandLabelOverride||['VLF','LF','HF'];

  // ── Welch band datasets ──
  const bandDefs=[
    {lo:bands.vlfLo,hi:bands.vlfHi,fill:'rgba(155,126,248,0.55)',line:'rgba(155,126,248,0.85)',lbl:bandLabels[0]},
    {lo:bands.lfLo, hi:bands.lfHi, fill:'rgba(79,142,247,0.55)', line:'rgba(79,142,247,0.85)', lbl:bandLabels[1]},
    {lo:bands.hfLo, hi:bands.hfHi, fill:'rgba(52,201,138,0.55)', line:'rgba(52,201,138,0.85)', lbl:bandLabels[2]},
  ];

  // Grey "outside bands" region — full curve, very faint
  const fullPts=[];
  for(let i=0;i<wFreqs.length;i++){
    if(wFreqs[i]<=displayMax) fullPts.push({x:+wFreqs[i].toFixed(6),y:+wPsd[i].toFixed(8)});
  }
  if(fullPts.length&&fullPts[0].x>0) fullPts.unshift({x:0,y:0});

  // ── Lomb-Scargle normalised ──
  const wMax=Math.max(...wPsd,1e-12);
  const lsMax=Math.max(...lsPsd,1e-12);
  const lsPsdN=lsPsd.map(v=>v/lsMax*wMax);
  const lsPts=[];
  for(let i=0;i<lsFreqs.length;i++){
    if(lsFreqs[i]<=displayMax) lsPts.push({x:+lsFreqs[i].toFixed(6),y:+lsPsdN[i].toFixed(8)});
  }
  if(lsPts.length&&lsPts[0].x>0) lsPts.unshift({x:0,y:0});

  // ── Band boundary plugin ──
  const lsColor=isDark?'rgba(230,230,230,0.8)':'rgba(30,30,30,0.8)';
  const bandPlugin={
    id:'bandPlugin_'+cid,
    beforeDatasetsDraw(chart){
      const{ctx,chartArea,scales:{x}}=chart;
      if(!x||!chartArea) return;
      const{left,right,top,bottom}=chartArea;
      const range=x.max-x.min;
      ctx.save();
      ctx.rect(left,top,right-left,bottom-top);ctx.clip();
      bandDefs.forEach(({lo,hi,line,lbl})=>{
        // right boundary dashed line
        const xpx=left+Math.max(0,Math.min(1,(hi-x.min)/range))*(right-left);
        ctx.strokeStyle=line;ctx.lineWidth=1;ctx.setLineDash([5,3]);
        ctx.beginPath();ctx.moveTo(xpx,top);ctx.lineTo(xpx,bottom);ctx.stroke();
        ctx.setLineDash([]);
        // band label
        const x1=left+Math.max(0,Math.min(1,(lo-x.min)/range))*(right-left);
        ctx.fillStyle=isDark?'rgba(255,255,255,0.65)':'rgba(0,0,0,0.55)';
        ctx.font='600 10px -apple-system,sans-serif';
        ctx.textAlign='center';
        ctx.fillText(lbl,(x1+xpx)/2,top+14);
      });
      ctx.restore();
    }
  };

  // Build datasets: grey baseline + 3 band fills + LS line
  const datasets=[
    // full grey underlay (very faint, shows curve shape outside bands)
    {
      label:'_base',data:fullPts,
      borderColor:'rgba(150,150,150,0.25)',backgroundColor:'rgba(150,150,150,0.10)',
      borderWidth:0.5,pointRadius:0,fill:'origin',tension:0.35,order:10
    },
    // per-band filled datasets
    ...bandDefs.map((bd,idx)=>{
      const bPts=sliceBand(wFreqs,wPsd,bd.lo,bd.hi);
      return{
        label:bd.lbl,data:bPts,
        borderColor:bd.line,backgroundColor:bd.fill,
        borderWidth:1.5,pointRadius:0,fill:'origin',tension:0.35,order:3-idx
      };
    }),
    // Lomb-Scargle dashed overlay
    {
      label:'Lomb-Scargle',data:lsPts,
      borderColor:lsColor,backgroundColor:'transparent',
      borderWidth:1.5,pointRadius:0,fill:false,tension:0.35,
      borderDash:[4,3],order:0
    },
  ];

  mkC(cid,{
    type:'line',
    data:{datasets},
    plugins:[bandPlugin],
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{
        legend:{display:false},
        zoom:{zoom:{wheel:{enabled:false},drag:{enabled:false},mode:'x'},pan:{enabled:false,mode:'x'}}
      },
      scales:{
        x:{type:'linear',min:0,max:displayMax,
          title:{display:true,text:'Freq (Hz)',color:tick,font:{size:10}},
          ticks:{color:tick,font:{size:9},maxTicksLimit:12},grid:{color:grid}},
        y:{title:{display:true,text:'PSD (ms²/Hz)',color:tick,font:{size:10}},
          ticks:{color:tick,font:{size:9}},grid:{color:grid},beginAtZero:true,min:0}
      }
    }
  });

  if(btnsId) mkToolbar(btnsId,cid);
  if(legendId){
    const el=document.getElementById(legendId);
    if(el) el.innerHTML=`
      <span class="li"><span class="lsq" style="background:rgba(155,126,248,0.7)"></span>VLF</span>
      <span class="li"><span class="lsq" style="background:rgba(79,142,247,0.7)"></span>LF</span>
      <span class="li"><span class="lsq" style="background:rgba(52,201,138,0.7)"></span>HF</span>
      <span class="li"><span style="width:16px;height:0;display:inline-block;vertical-align:middle;border-top:2px dashed ${lsColor}"></span>&nbsp;Lomb-Scargle</span>`;
  }
}



/* ═══════════════════════════════════════════════
   STAT CARD HELPERS
═══════════════════════════════════════════════ */
function sc4(items){return items.map(({c,l,v,u='',h=''})=>`<div class="sc ${c}"><div class="sl">${l}</div><div class="sv">${v}<span class="su">${u}</span></div>${h?`<div class="sh">${h}</div>`:''}</div>`).join('');}

/* ═══════════════════════════════════════════════
   RUN BRV
═══════════════════════════════════════════════ */
function runBRV(){
  const wEl=document.getElementById('brv-warn');wEl.style.display='none';
  const col=document.getElementById('breathCol').value;
  if(!col){wEl.textContent='Select a breathing signal column.';wEl.style.display='block';return;}
  let sig=rawRows.map(r=>{const v=r[col];if(typeof v==='number')return v;const n=parseFloat(v);return isFinite(n)?n:null;}).filter(v=>v!==null);
  if(!sig.length){wEl.textContent='No numeric data.';wEl.style.display='block';return;}
  if(document.getElementById('brSigInvert')?.checked) sig=sig.map(v=>-v);
  const{t:tv,fs}=getTimeVector(sig,'breathTimeCol','brFsInput');
  const win=parseFloat(document.getElementById('brWinInput').value)||0;
  if(win>0)sig=sig.slice(0,Math.round(win*fs));
  const tvS=tv.slice(0,sig.length);
  if(sig.length<30){wEl.textContent='Signal too short.';wEl.style.display='block';return;}

  // Optional Butterworth bandpass — runs before SG smoothing, on the raw signal
  let bpSig=sig;
  if(document.getElementById('brBpFiltEnable')?.checked){
    const bpLo=parseFloat(document.getElementById('brBpLo').value)||0;
    const bpHi=parseFloat(document.getElementById('brBpHi').value)||0;
    if(bpHi>0 && bpLo>=bpHi){wEl.textContent='Bandpass: low cutoff must be less than high cutoff.';wEl.style.display='block';return;}
    if(bpHi>0 && bpHi>=fs/2){wEl.textContent=`Bandpass high cutoff must be below Nyquist (${(fs/2).toFixed(2)} Hz).`;wEl.style.display='block';return;}
    bpSig=butterBP(sig,bpLo,bpHi,fs);
  }

  let wl=parseInt(document.getElementById('brSgWin').value),po=parseInt(document.getElementById('brSgPoly').value);
  if(wl%2===0)wl++;if(po>=wl){wl=po+2;if(wl%2===0)wl++;}
  document.getElementById('brSgWin').value=wl;document.getElementById('brSgWinOut').textContent=wl;
  const sgOn=document.getElementById('brSgEnable')?.checked!==false;
  const smooth=sgOn?sgFilter(bpSig,wl,po):bpSig;

  let peaks=detectPeaks(smooth,+document.getElementById('brPkH').value,+document.getElementById('brPkD').value,+document.getElementById('brPkP').value,fs);
  const pkDist=+document.getElementById('brPkD').value;
  const pkLocSrc=document.querySelector('input[name="brPkLocSrc"]:checked')?.value||'raw';
  if(pkLocSrc==='raw'){
    const snapRadius=Math.max(sgOn?Math.ceil(wl/2):0, document.getElementById('brBpFiltEnable')?.checked?Math.round(fs*0.02):0);
    peaks=snapToRawPeaks(peaks,sig,snapRadius,pkDist);
  }
  document.getElementById('brvResultSec').style.display='block';
  const isFilteredBRV=sgOn||document.getElementById('brBpFiltEnable')?.checked;
  renderSigChart('breathSignalChart',sig,smooth,peaks,tvS,'rgba(52,201,138,0.3)',C.grn,C.pur,'brSigB','brSigLegendSmooth',isFilteredBRV);

  if(peaks.length<3){wEl.textContent=`Only ${peaks.length} breath peak(s). Adjust parameters.`;wEl.style.display='block';return;}

  const pt=peaks.map(i=>tvS[i]);
  let cyclePairs=[];
  for(let i=1;i<peaks.length;i++) cyclePairs.push({cyc:pt[i]-pt[i-1],tLeft:pt[i-1],tRight:pt[i]});
  let cycles=cyclePairs.map(p=>p.cyc);

  // Automatic outlier-cycle correction — same rationale/algorithm as HRV
  // above: compares each cycle to the median of its own 5-cycle neighborhood
  // rather than requiring peak detection to be perfect. Units here are
  // seconds (not ms like HRV), but the check is purely relative so that
  // doesn't matter to artifactCorrectIBI.
  if(document.getElementById('brSigArtCorr')?.checked && cycles.length>=5){
    const thresh=parseFloat(document.getElementById('brSigArtThresh').value)/100||0.20;
    const mode=document.querySelector('input[name="brSigArtMode"]:checked')?.value||'interpolate';
    const{ibis:acCycles,flags}=artifactCorrectIBI(cycles,thresh,'interpolate');
    const nArt=flags.filter(f=>f==='artifact').length;
    if(mode==='remove'){
      cyclePairs=cyclePairs.filter((_,i)=>flags[i]==='normal');
      cycles=cyclePairs.map(p=>p.cyc);
    } else {
      cyclePairs=cyclePairs.map((p,i)=>({...p,cyc:acCycles[i]}));
      cycles=acCycles;
    }
    if(nArt>0){wEl.textContent=`ℹ Artifact correction: ${nArt} cycle(s) ${mode==='remove'?'removed':'interpolated'}.`;wEl.style.display='block';}
  }
  if(cycles.length<3){wEl.textContent='Too few valid breath cycles after correction.';wEl.style.display='block';return;}

  breathData=cycles;
  window._brvCycles=cycles;
  window._brvCycleT=cyclePairs.map(p=>+p.tRight.toFixed(3));
  const cycleT=window._brvCycleT;

  const mn=mean(cycles),sdv=std(cycles),brRate=60/mn,cv=sdv/mn*100;
  const brRm=rmssd(cycles.map(v=>v*1000));
  const brDiffs=cycles.slice(1).map((v,i)=>v-cycles[i]);
  const brSdsd=std(brDiffs);
  const brPbb5pct=pNN(cycles.map(v=>v*1000), mn*1000*0.05);

  // ── PSD — branch on selected spectral method ──
  const cpt2=[cyclePairs[0].tLeft];for(const c of cycles)cpt2.push(cpt2[cpt2.length-1]+c);
  const brvBands=getBrvBands();
  const brvSigDet=document.getElementById('brSigDetrend')?.checked||false;
  const _brvMethod=document.querySelector('input[name="brvPsdMethod"]:checked')?.value||'bbi';

  let brvPsd, _methodLabel, _methodNote;
  if(_brvMethod==='instant'){
    brvPsd=computeInstantPeriodPSD(peaks,tvS,fs,brvBands,brvSigDet);
    _methodLabel='Instantaneous Period (NeuroKit2 style)';
    _methodNote=`ℹ Instantaneous period signal sampled at ${fs} Hz → Welch. Signal Nyquist = ${(fs/2).toFixed(1)} Hz. HF band has real physiological power. Lomb-Scargle not applicable — Welch only shown.`;
  } else {
    brvPsd=computePSD(cpt2,cycles.map(v=>v*1000),brvBands,4,0,brvSigDet);
    _methodLabel='BBI Interpolation (Soni & Muniyandi 2019)';
    const _bbiNyquist=1/(2*mn);
    const _hfAboveNyquist=_bbiNyquist<brvBands.hfLo;
    const _lfAboveNyquist=_bbiNyquist<brvBands.lfLo;
    _methodNote=_hfAboveNyquist
      ?`ℹ BBI Nyquist = ${_bbiNyquist.toFixed(3)} Hz (mean rate ${brRate.toFixed(1)} brpm). HF band above Nyquist — reflects spline interpolation, not physiology. Expected per Soni & Muniyandi (2019). LF/HF should be interpreted cautiously.`
      :(_lfAboveNyquist?`ℹ BBI Nyquist = ${_bbiNyquist.toFixed(3)} Hz. Both LF and HF bands above Nyquist.`:'');
  }

  const wRes={freqs:brvPsd.wFreqs,psd:brvPsd.wPsd};
  const lsFreqsBrv=brvPsd.lsFreqs,lsPsdBrv=brvPsd.lsPsd;
  const vlfPow=brvPsd.w.vlf,loPow=brvPsd.w.lf,hiPow=brvPsd.w.hf,totPow=brvPsd.w.tp;
  const midHighRatio=brvPsd.w.lfhf;
  const lsBrvVlf=brvPsd.ls.vlf,lsBrvLf=brvPsd.ls.lf,lsBrvHf=brvPsd.ls.hf,lsBrvTp=brvPsd.ls.tp;
  const lsBrvLfhf=brvPsd.ls.lfhf;
  const wBrvPeakF=brvPsd.w.peakF;
  const lsBrvPeakF=brvPsd.ls.peakF;

  const _resWarnBRV=(_brvMethod==='bbi'&&!brvPsd.vlfResolvable)?`⚠ Recording too short to resolve VLF: true df=${(brvPsd.trueDf*1000).toFixed(2)} mHz. VLF ms² unreliable.`:(_brvMethod==='bbi'&&!brvPsd.lfResolvable?`⚠ Recording too short to resolve LF: true df=${(brvPsd.trueDf*1000).toFixed(2)} mHz.`:'');
  const _fwBRV=[`<strong>Method:</strong> ${_methodLabel}`,_resWarnBRV,_methodNote].filter(Boolean).join('<br>');
  buildFdTable('brvFdMetricsTable',
    {vlf:vlfPow,lf:loPow,hf:hiPow,tp:totPow,lfhf:midHighRatio,peakF:wBrvPeakF},
    {vlf:lsBrvVlf,lf:lsBrvLf,hf:lsBrvHf,tp:lsBrvTp,lfhf:lsBrvLfhf,peakF:lsBrvPeakF},
    brvBands,['VLF','LF','HF'],_fwBRV,_methodLabel);

  // ── Charts ──
  mkC('brCycleOverview',{type:'scatter',data:{datasets:[{data:cycleT.map((t,i)=>({x:t,y:+cycles[i].toFixed(3)})),showLine:true,borderColor:C.grn,borderWidth:2,pointRadius:3,pointBackgroundColor:C.grn,fill:false,tension:0.3}]},options:scOpts('time (s)','cycle (s)')});
  mkToolbar('brCycB','brCycleOverview');
  setupBRVROI();

  const bTPts=cycleT.map((t,i)=>({x:t,y:+cycles[i].toFixed(3)}));
  const{slope:bs,intercept:bi3}=linReg(bTPts.map(p=>p.x),bTPts.map(p=>p.y));
  mkC('brTacho',{type:'scatter',data:{datasets:[
    {data:bTPts,backgroundColor:'rgba(52,201,138,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(52,201,138,0.3)',borderWidth:1},
    {data:[{x:bTPts[0].x,y:+(bs*bTPts[0].x+bi3).toFixed(3)},{x:bTPts[bTPts.length-1].x,y:+(bs*bTPts[bTPts.length-1].x+bi3).toFixed(3)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','cycle (s)')});
  mkToolbar('brTachoB','brTacho');

  const{centers:bc2,counts:bct}=histogram(cycles,20,Math.min(...cycles),Math.max(...cycles));
  mkC('brHistChart',{type:'bar',data:{labels:bc2,datasets:[{data:bct,backgroundColor:'rgba(52,201,138,0.7)',borderColor:C.grn,borderWidth:1}]},options:barOpts('cycle (s)','count')});
  mkToolbar('brHistB','brHistChart');

  const bdv=brDiffs.map(v=>+(v*1000).toFixed(1));
  mkC('brDiffChart',{type:'bar',data:{labels:cycleT.slice(1).map(t=>t.toFixed(2)),datasets:[{data:bdv,backgroundColor:bdv.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','Δcycle (ms)')});
  mkToolbar('brDiffB','brDiffChart');

  renderPSD(wRes.freqs,wRes.psd,lsFreqsBrv,lsPsdBrv,brvBands,'brPsdChart','brPsdB','brvPsdLegend',['VLF','LF','HF']);

  mkC('brRateChart',{type:'scatter',data:{datasets:[{data:cycleT.map((t,i)=>({x:t,y:+(60/cycles[i]).toFixed(2)})),showLine:true,borderColor:C.pur,borderWidth:2,pointRadius:2,pointBackgroundColor:C.pur,fill:false,tension:0.3}]},options:scOpts('time (s)','rate (brpm)')});
  mkToolbar('brRateB','brRateChart');

  // ── BRV Nonlinear ──
  const{sd1:bSd1,sd2:bSd2}=poincareSd(cycles.map(v=>v*1000));
  const _bSampEn=sampleEntropy(cycles.map(v=>v*1000));
  const bSampEn=_bSampEn.value, bSampEnN=_bSampEn.n;
  const _bApEn=approxEntropy(cycles.map(v=>v*1000));
  const bApEn=_bApEn.value, bApEnN=_bApEn.n;
  document.getElementById('brvNlStats').innerHTML=sc4([
    {c:'cg',l:'SD1',v:bSd1.toFixed(1),u:'ms',h:'Short-term BRV'},
    {c:'ct',l:'SD2',v:bSd2.toFixed(1),u:'ms',h:'Long-term BRV'},
    {c:'co',l:'SD1/SD2',v:bSd2>0?(bSd1/bSd2).toFixed(3):'–',h:'Balance index'},
    {c:'cb',l:'SampEn',v:bSampEn.toFixed(3),h:'N='+bSampEnN},
    {c:'cp',l:'ApEn',v:bApEn.toFixed(3),h:'N='+bApEnN},
    {c:'ck',l:'Valid cycles',v:cycles.length},
  ]);
  // Poincaré plot for BRV
  const cyMs=cycles.map(v=>v*1000);
  const bMin=Math.min(...cyMs),bMax=Math.max(...cyMs);
  mkC('brPoincareChart',{type:'scatter',data:{datasets:[
    {data:cyMs.slice(0,-1).map((v,i)=>({x:+v.toFixed(2),y:+cyMs[i+1].toFixed(2)})),backgroundColor:'rgba(52,201,138,0.5)',pointRadius:4,pointHoverRadius:6},
    {data:[{x:bMin,y:bMin},{x:bMax,y:bMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('cycle n (ms)','cycle n+1 (ms)')});
  mkToolbar('brPcB','brPoincareChart');

  // ── Breath table (innerHTML to avoid hidden-tab issues) ──
  const brRows=cycles.map((c,i)=>{
    const dnn=i>0?+((c-cycles[i-1])*1000).toFixed(1):0;
    return `<tr><td>${i+1}</td><td>${cycleT[i].toFixed(3)}</td><td>${c.toFixed(3)}</td><td>${(60/c).toFixed(1)}</td><td style="color:${dnn>0?'var(--grn)':'var(--orn)'}">${i>0?(dnn>0?'+':'')+dnn:'–'}</td></tr>`;
  });
  document.getElementById('brTbody').innerHTML=brRows.join('');
  {const _b=document.querySelector('#panelBRV .tab');if(_b){_b.classList.remove('active');swBT(0,_b);}}
  collapseSetup('brv');
}

/* ═══════════════════════════════════════════════
   BRV ROI
═══════════════════════════════════════════════ */
function setupBRVROI(){
  const canvas=document.getElementById('brvRoiCanvas');
  if(!canvas)return;
  // remove old listeners by replacing canvas clone
  const fresh=canvas.cloneNode(false);
  canvas.parentNode.replaceChild(fresh,canvas);
  const ctx=fresh.getContext('2d');
  let dragging=false,startPx=null,endPx=null;

  function redraw(){
    ctx.clearRect(0,0,fresh.width,fresh.height);
    if(startPx!==null&&endPx!==null){
      const x=Math.min(startPx,endPx),w=Math.abs(endPx-startPx);
      ctx.fillStyle=isDark?'rgba(52,201,138,0.12)':'rgba(52,201,138,0.10)';
      ctx.fillRect(x,0,w,fresh.height);
      ctx.strokeStyle='rgba(52,201,138,0.7)';ctx.lineWidth=1.5;
      ctx.strokeRect(x,0,w,fresh.height);
    }
  }
  function pxToTime(px){
    const ch=charts['brCycleOverview'];if(!ch)return 0;
    const{left,right}=ch.chartArea,sc=ch.scales.x;
    return sc.min+(sc.max-sc.min)*((px-left)/(right-left));
  }
  fresh.style.position='absolute';fresh.style.top='0';fresh.style.left='0';
  fresh.style.width='100%';fresh.style.height='100%';
  fresh.style.cursor='crosshair';fresh.style.zIndex='10';
  fresh.addEventListener('mousedown',e=>{const r=fresh.getBoundingClientRect();startPx=e.clientX-r.left;endPx=startPx;dragging=true;});
  fresh.addEventListener('mousemove',e=>{if(!dragging)return;const r=fresh.getBoundingClientRect();endPx=e.clientX-r.left;redraw();});
  fresh.addEventListener('mouseup',()=>{
    dragging=false;
    if(!startPx||!endPx||Math.abs(endPx-startPx)<5){
      ctx.clearRect(0,0,fresh.width,fresh.height);
      document.getElementById('brvRoiInfo').style.display='none';
      document.getElementById('brvRoiStats').style.display='none';return;
    }
    computeBRVROI(pxToTime(Math.min(startPx,endPx)),pxToTime(Math.max(startPx,endPx)));
    redraw();
  });
  function sync(){fresh.width=fresh.parentElement.offsetWidth;fresh.height=fresh.parentElement.offsetHeight;}
  window.addEventListener('resize',sync);setTimeout(sync,200);
}

function computeBRVROI(t1,t2){
  const cycles=window._brvCycles||[],cycleT=window._brvCycleT||[];
  const sub=[],subT=[];
  for(let i=0;i<cycleT.length;i++){if(cycleT[i]>=t1&&cycleT[i]<=t2){sub.push(cycles[i]);subT.push(cycleT[i]);}}
  const ri=document.getElementById('brvRoiInfo');ri.style.display='block';
  if(sub.length<3){
    ri.textContent=`ROI ${t1.toFixed(2)}\u2013${t2.toFixed(2)}s \u00b7 only ${sub.length} cycles \u2014 need \u22653`;
    document.getElementById('brvRoiStats').style.display='none';
    return;
  }
  ri.textContent=`ROI ${t1.toFixed(2)}\u2013${t2.toFixed(2)}s \u00b7 ${sub.length} cycles`;

  // ── Metrics ──
  const mn=mean(sub),sdv=std(sub),rm=rmssd(sub.map(v=>v*1000)),cv=sdv/mn*100,brRate=60/mn;
  const brMaxRate=60/Math.min(...sub); // fastest breathing = shortest cycle
  const brMinRate=60/Math.max(...sub); // slowest breathing = longest cycle
  const brDiffs=sub.slice(1).map((v,i)=>v-sub[i]);
  const brSdsd=std(brDiffs);
  const brPbb5pct=pNN(sub.map(v=>v*1000),mn*1000*0.05);
  const{sd1:bSd1,sd2:bSd2}=poincareSd(sub.map(v=>v*1000));
  const _bSampEn=sampleEntropy(sub.map(v=>v*1000));
  const bSampEn=_bSampEn.value, bSampEnN=_bSampEn.n;
  const _bApEn=approxEntropy(sub.map(v=>v*1000));
  const bApEn=_bApEn.value, bApEnN=_bApEn.n;
  const brvBands=getBrvBands();
  const cpt=[subT[0]];for(const c of sub)cpt.push(cpt[cpt.length-1]+c);
  const brvPsd=computePSD(cpt,sub.map(v=>v*1000),brvBands,4,0,document.getElementById('brvIbiDetrend')?.checked||false);

  // ── ROI stat cards — time domain only ──
  const el2=document.getElementById('brvRoiStats');
  el2.className='sg sg4';el2.style.display='grid';
  el2.innerHTML=
    '<div class="sc cg"><div class="sl">ROI Mean rate</div><div class="sv">'+brRate.toFixed(1)+'<span class="su">brpm</span></div></div>'+
    '<div class="sc co"><div class="sl">ROI Max rate</div><div class="sv">'+brMaxRate.toFixed(1)+'<span class="su">brpm</span></div></div>'+
    '<div class="sc ck"><div class="sl">ROI Min rate</div><div class="sv">'+brMinRate.toFixed(1)+'<span class="su">brpm</span></div></div>'+
    '<div class="sc ct"><div class="sl">ROI Mean cycle</div><div class="sv">'+mn.toFixed(3)+'<span class="su">s</span></div></div>'+
    '<div class="sc co"><div class="sl">ROI RMSSD</div><div class="sv">'+rm.toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc cb"><div class="sl">ROI SDBB</div><div class="sv">'+(sdv*1000).toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc cp"><div class="sl">ROI SDSD</div><div class="sv">'+(brSdsd*1000).toFixed(1)+'<span class="su">ms</span></div></div>'+
    '<div class="sc ck"><div class="sl">ROI pBB5%</div><div class="sv">'+brPbb5pct.toFixed(1)+'<span class="su">%</span></div></div>'+
    '<div class="sc ct"><div class="sl">ROI CV</div><div class="sv">'+cv.toFixed(1)+'<span class="su">%</span></div></div>'+
    '<div class="sc cg"><div class="sl">ROI Cycles</div><div class="sv">'+sub.length+'</div></div>';

  const bTPts=subT.map((t,i)=>({x:t,y:+sub[i].toFixed(3)}));
  const{slope:bs,intercept:bi3}=linReg(bTPts.map(p=>p.x),bTPts.map(p=>p.y));
  mkC('brTacho',{type:'scatter',data:{datasets:[
    {data:bTPts,backgroundColor:'rgba(52,201,138,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(52,201,138,0.3)',borderWidth:1},
    {data:[{x:bTPts[0].x,y:+(bs*bTPts[0].x+bi3).toFixed(3)},{x:bTPts[bTPts.length-1].x,y:+(bs*bTPts[bTPts.length-1].x+bi3).toFixed(3)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','cycle (s)')});
  mkToolbar('brTachoB','brTacho');
  const{centers:bc2,counts:bct}=histogram(sub,20,Math.min(...sub),Math.max(...sub));
  mkC('brHistChart',{type:'bar',data:{labels:bc2,datasets:[{data:bct,backgroundColor:'rgba(52,201,138,0.7)',borderColor:C.grn,borderWidth:1}]},options:barOpts('cycle (s)','count')});
  mkToolbar('brHistB','brHistChart');
  const bdv=brDiffs.map(v=>+(v*1000).toFixed(1));
  mkC('brDiffChart',{type:'bar',data:{labels:subT.slice(1).map(t=>t.toFixed(2)),datasets:[{data:bdv,backgroundColor:bdv.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','\u0394cycle (ms)')});
  mkToolbar('brDiffB','brDiffChart');

  // ── Frequency tab ──
  const _mnCycR=mean(sub);
  const _bbiNyqR=1/(2*_mnCycR);
  const _nyqWarnR=_bbiNyqR<brvBands.hfLo
    ?`ℹ BBI Nyquist = ${_bbiNyqR.toFixed(3)} Hz (ROI mean rate ${(60/_mnCycR).toFixed(1)} brpm). HF power above Nyquist — reflects interpolation, not physiology (Soni & Muniyandi, 2019).`
    :(_bbiNyqR<brvBands.lfLo?`ℹ BBI Nyquist = ${_bbiNyqR.toFixed(3)} Hz. LF and HF bands above Nyquist.`:'');
  const _resWarnR=!brvPsd.vlfResolvable?`\u26a0 ROI too short to resolve VLF (df=${(brvPsd.trueDf*1000).toFixed(2)} mHz)`:(!brvPsd.lfResolvable?`\u26a0 ROI too short to resolve LF`:'');
  const _fwB=[_resWarnR,_nyqWarnR].filter(Boolean).join('<br>');
  buildFdTable('brvFdMetricsTable',
    {vlf:brvPsd.w.vlf,lf:brvPsd.w.lf,hf:brvPsd.w.hf,tp:brvPsd.w.tp,lfhf:brvPsd.w.lfhf,peakF:brvPsd.w.peakF},
    {vlf:brvPsd.ls.vlf,lf:brvPsd.ls.lf,hf:brvPsd.ls.hf,tp:brvPsd.ls.tp,lfhf:brvPsd.ls.lfhf,peakF:brvPsd.ls.peakF},
    brvBands,['VLF','LF','HF'],_fwB,'BBI Interpolation (Soni & Muniyandi 2019)');
  renderPSD(brvPsd.wFreqs,brvPsd.wPsd,brvPsd.lsFreqs,brvPsd.lsPsd,brvBands,'brPsdChart','brPsdB','brvPsdLegend',['VLF','LF','HF']);
  mkC('brRateChart',{type:'scatter',data:{datasets:[{data:subT.map((t,i)=>({x:t,y:+(60/sub[i]).toFixed(2)})),showLine:true,borderColor:C.pur,borderWidth:2,pointRadius:2,pointBackgroundColor:C.pur,fill:false,tension:0.3}]},options:scOpts('time (s)','rate (brpm)')});
  mkToolbar('brRateB','brRateChart');

  // ── Nonlinear tab ──
  document.getElementById('brvNlStats').innerHTML=sc4([
    {c:'cg',l:'SD1',v:bSd1.toFixed(1),u:'ms'},{c:'ct',l:'SD2',v:bSd2.toFixed(1),u:'ms'},
    {c:'co',l:'SD1/SD2',v:bSd2>0?(bSd1/bSd2).toFixed(3):'\u2013'},
    {c:'cb',l:'SampEn',v:bSampEn.toFixed(3),h:'N='+bSampEnN},
    {c:'cp',l:'ApEn',v:bApEn.toFixed(3),h:'N='+bApEnN},
    {c:'ck',l:'ROI cycles',v:sub.length},
  ]);
  const cyMs=sub.map(v=>v*1000);
  const bMin=Math.min(...cyMs),bMax=Math.max(...cyMs);
  mkC('brPoincareChart',{type:'scatter',data:{datasets:[
    {data:cyMs.slice(0,-1).map((v,i)=>({x:+v.toFixed(2),y:+cyMs[i+1].toFixed(2)})),backgroundColor:'rgba(52,201,138,0.5)',pointRadius:4},
    {data:[{x:bMin,y:bMin},{x:bMax,y:bMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('cycle n (ms)','cycle n+1 (ms)')});
  mkToolbar('brPcB','brPoincareChart');
}


/* ═══════════════════════════════════════════════
   INTERVAL MODALITY VALIDATION
   Physiological ranges (seconds):
     HRV  : 0.2 – 2.0 s  (30–300 bpm)
     BRV  : 2.0 – 20.0 s (3–30 brpm)
   Mismatch detection threshold for HRV mode: 2.0–12.0 s
═══════════════════════════════════════════════ */
function validateIntervalModality(valuesMs, mode){
  // Convert ms → s for range checks
  const vals=valuesMs.map(v=>v/1000);
  const n=vals.length;
  const allInHRV =vals.every(v=>v>=0.2&&v<=2.0);
  const allInBRV =vals.every(v=>v>=2.0&&v<=20.0);
  const allInBRVstrict=vals.every(v=>v>=2.0&&v<=12.0);  // stricter BRV window for HRV mismatch

  if(mode==='hrv'){
    if(allInHRV){
      // Perfect — data is within HRV range
      return{ok:true, msg:''};
    }
    if(allInBRVstrict){
      // All values in 2–12 s → this is BRV data loaded in HRV mode
      return{ok:false, msg:
        '⚠ Modality mismatch: All intervals fall within 2.0–12.0 s, which corresponds to typical breathing cycle durations (BRV), not heartbeat intervals (HRV).\n\nPlease use BRV analysis mode for this data.'};
    }
    // Outside both ranges
    return{ok:false, msg:
      '⚠ Intervals outside typical HRV and BRV ranges detected.\n\nValues do not fall within the HRV range (0.2–2.0 s) or BRV range (2.0–12.0 s). This may indicate incorrect column selection, unit mismatch, or abnormal data.\n\nProcessing has been stopped. Please check your column selection and units.'};
  }

  if(mode==='brv'){
    if(allInBRV){
      // Perfect — data is within BRV range
      return{ok:true, msg:''};
    }
    if(allInHRV){
      // All values in 0.2–2.0 s → this is HRV data loaded in BRV mode
      return{ok:false, msg:
        '⚠ Modality mismatch: All intervals fall within 0.2–2.0 s, which corresponds to heartbeat intervals (HRV), not breathing cycle durations (BRV).\n\nPlease use HRV analysis mode for this data.'};
    }
    // Outside both ranges — could be abnormal breathing or extraction error, ask user
    const proceed=window.confirm(
      '⚠ Intervals outside typical BRV range (2.0–20.0 s) detected.\n\nThis may indicate abnormal breathing patterns or an IBI extraction error.\n\nOptions:\n• OK — Continue anyway\n• Cancel — Stop and check your data');
    return{ok:proceed, msg:proceed?'ℹ Proceeding with out-of-range intervals as requested.':'Processing cancelled by user.'};
  }

  return{ok:true, msg:''};
}

/* ═══════════════════════════════════════════════
   RUN HRV FROM IBI (intervals mode)
═══════════════════════════════════════════════ */
function runHRVfromIBI(){
  const wEl=document.getElementById('hrv-ibi-warn');wEl.style.display='none';
  const col=document.getElementById('ibiCol').value;
  if(!col){wEl.textContent='Select an IBI column.';wEl.style.display='block';return;}
  const units=document.getElementById('ibiUnits').value; // 'ms' or 's'
  const filterMin=parseFloat(document.getElementById('ibiMin').value);
  const filterMax=parseFloat(document.getElementById('ibiMax').value);
  const ibiMin=isFinite(filterMin)?(units==='s'?filterMin*1000:filterMin):300;
  const ibiMax=isFinite(filterMax)?(units==='s'?filterMax*1000:filterMax):2000;

  // Read IBI values and convert to ms
  const rawVals=rawRows.map(r=>{const v=r[col];if(typeof v==='number')return v;const n=parseFloat(v);return isFinite(n)?n:null;}).filter(v=>v!==null);
  if(!rawVals.length){wEl.textContent='No numeric data in selected column.';wEl.style.display='block';return;}
  const ibisAll=units==='s'?rawVals.map(v=>v*1000):rawVals.slice(); // always ms

  // Modality validation — check intervals match HRV physiological range
  const _hValResult=validateIntervalModality(ibisAll,'hrv');
  if(!_hValResult.ok){wEl.textContent=_hValResult.msg;wEl.style.display='block';return;}
  if(_hValResult.msg){wEl.textContent=_hValResult.msg;wEl.style.display='block';}

  // Step 1: amplitude filter
  const ibisFiltered=ibisAll.filter(v=>v>=ibiMin&&v<=ibiMax);
  if(ibisFiltered.length<4){wEl.textContent=`Only ${ibisFiltered.length} IBIs after filter (${ibiMin}–${ibiMax} ms).`;wEl.style.display='block';return;}

  // Step 2: artifact / beat correction
  const doArtCorr=document.getElementById('ibiArtCorr').checked;
  const artThreshold=parseFloat(document.getElementById('ibiArtThresh').value)/100||0.20;
  const artMode=document.querySelector('input[name="ibiArtMode"]:checked')?.value||'interpolate';
  let artFlags=ibisFiltered.map(()=>'normal');
  let ibis=ibisFiltered.slice();
  if(doArtCorr){
    const ac=artifactCorrectIBI(ibisFiltered,artThreshold,artMode);
    ibis=ac.ibis; artFlags=ac.flags;
    const nArt=artFlags.filter(f=>f==='artifact').length;
    if(nArt>0) wEl.textContent=`ℹ Artifact correction: ${nArt} beat(s) ${artMode==='remove'?'removed':'interpolated'}.`;
    wEl.style.display=nArt>0?'block':'none';
  }
  if(ibis.length<4){wEl.textContent='Too few valid IBIs after correction.';wEl.style.display='block';return;}

  // Step 3: build cumulative times (t0=0)
  const cptFull=[0];for(const v of ibis)cptFull.push(cptFull[cptFull.length-1]+v/1000);

  // Step 4: detrend flag for computePSD
  const doDetrend=document.getElementById('ibiDetrend').checked;

  beatData=ibis;fullIbis=ibis;
  window._ibiArtFlags=artFlags; // store for beat table
  fullIbiTimes=cptFull.slice(1);
  window._hrvCpt=cptFull;

  document.getElementById('hrvResultSec').style.display='block';

  // computeHRVMetrics calls computePSD internally — pass detrend via global flag
  window._ibiDoDetrend=doDetrend;
  const m=computeHRVMetrics(ibis,[cptFull[0]]);
  window._ibiDoDetrend=undefined;

  const bands=getBands();
  const _trueDfHRV=4/Math.max(m.wFreqs?m.wFreqs.length*2-2:ibis.length,1);
  const _fwHRV=!m.vlfResolvable?`⚠ Recording too short to resolve VLF: true df=${(_trueDfHRV*1000).toFixed(2)} mHz. VLF ms² unreliable.`:(!m.lfResolvable?`⚠ Recording too short to resolve LF: true df=${(_trueDfHRV*1000).toFixed(2)} mHz.`:'');
  buildFdTable('fdMetricsTable',
    {vlf:m.vlf,lf:m.lf,hf:m.hf,tp:m.tp,lfhf:m.lfhf,peakF:m.wPeakF},
    {vlf:m.lsVlf,lf:m.lsLf,hf:m.lsHf,tp:m.lsTp,lfhf:m.lsLfhf,peakF:m.lsPeakF},
    bands,['VLF','LF','HF'],_fwHRV);
  document.getElementById('nlStats').innerHTML=sc4([
    {c:'cb',l:'SD1',v:m.sd1.toFixed(1),u:'ms'},{c:'cp',l:'SD2',v:m.sd2.toFixed(1),u:'ms'},
    {c:'co',l:'SD1/SD2',v:m.sd2>0?(m.sd1/m.sd2).toFixed(3):'–'},
    {c:'ct',l:'SampEn',v:m.sEn.toFixed(3),h:'N='+m.sEnN},
    {c:'cg',l:'ApEn',v:m.aEn.toFixed(3),h:'N='+m.aEnN},
    {c:'ck',l:'Valid IBIs',v:ibis.length},
  ]);

  // IBI tachogram + ROI (same as signal mode)
  ibiXY=fullIbiTimes.map((t,i)=>({x:+t.toFixed(3),y:+ibis[i].toFixed(1)}));
  mkC('ibiChart',{type:'scatter',data:{datasets:[{data:ibiXY,showLine:true,borderColor:C.acc,borderWidth:1.5,pointRadius:2,pointBackgroundColor:C.acc,fill:false,tension:0.3}]},options:{...scOpts('time (s)','IBI (ms)'),animation:false,plugins:{...scOpts().plugins,zoom:{zoom:{wheel:{enabled:false},drag:{enabled:false},mode:'x'},pan:{enabled:false,mode:'x'}}}}});
  mkToolbar('ibiChartBtns','ibiChart');
  setupROI();

  // Tachogram
  const tPts=fullIbiTimes.map((t,i)=>({x:+t.toFixed(3),y:+ibis[i].toFixed(1)}));
  const{slope:ts,intercept:ti2}=linReg(tPts.map(p=>p.x),tPts.map(p=>p.y));
  mkC('tacho',{type:'scatter',data:{datasets:[
    {data:tPts,backgroundColor:'rgba(79,142,247,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(79,142,247,0.3)',borderWidth:1},
    {data:[{x:tPts[0].x,y:+(ts*tPts[0].x+ti2).toFixed(1)},{x:tPts[tPts.length-1].x,y:+(ts*tPts[tPts.length-1].x+ti2).toFixed(1)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','IBI (ms)')});
  mkToolbar('tachoB','tacho');
  renderInstHRChart(ibis, fullIbiTimes);
  const{centers:hc,counts:hct}=histogram(ibis,30,Math.min(...ibis),Math.max(...ibis));
  mkC('ibiHist',{type:'bar',data:{labels:hc,datasets:[{data:hct,backgroundColor:'rgba(79,142,247,0.7)',borderColor:C.acc,borderWidth:1}]},options:barOpts('IBI (ms)','count')});
  mkToolbar('histB','ibiHist');
  const diffs=ibis.slice(1).map((v,i)=>+(v-ibis[i]).toFixed(1));
  mkC('dnnChart',{type:'bar',data:{labels:fullIbiTimes.slice(1).map(t=>t.toFixed(2)),datasets:[{data:diffs,backgroundColor:diffs.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','ΔNN (ms)')});
  mkToolbar('dnnB','dnnChart');
  renderPSD(m.wFreqs,m.wPsd,m.lsFreqs,m.lsPsd,bands,'psdChart','psdB','psdLegend');
  const wBv=[m.vlf,m.lf,m.hf].map(v=>+v.toFixed(2)),bcl=[C.vlf,C.lf,C.hf];
  mkC('bandPie',{type:'doughnut',data:{labels:['VLF','LF','HF'],datasets:[{data:wBv,backgroundColor:bcl,borderColor:bcl,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom',labels:{color:themeColors().tick,font:{size:11},padding:10}}}}});
  mkToolbar('pieB','bandPie');
  mkC('bandBar',{type:'bar',data:{labels:['VLF','LF','HF'],datasets:[{data:wBv,backgroundColor:bcl,borderWidth:0}]},options:barOpts('band','ms²')});
  mkToolbar('barB','bandBar');
  const iMin=Math.min(...ibis),iMax=Math.max(...ibis);
  mkC('poincareChart',{type:'scatter',data:{datasets:[
    {data:ibis.slice(0,-1).map((v,i)=>({x:+v.toFixed(1),y:+ibis[i+1].toFixed(1)})),backgroundColor:'rgba(79,142,247,0.5)',pointRadius:3},
    {data:[{x:iMin,y:iMin},{x:iMax,y:iMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('RRn (ms)','RRn+1 (ms)')});
  mkToolbar('pcB','poincareChart');
  const _artFlags=window._ibiArtFlags||ibis.map(()=>'normal');
  const tbRows=ibis.map((v,i)=>{
    const t=+(cptFull[i+1]||0).toFixed(3),hr=Math.round(60000/v),dnn=i>0?+(v-ibis[i-1]).toFixed(1):0;
    const isArt=_artFlags[i]==='artifact';
    const flag=isArt?'⚠ corrected':Math.abs(dnn)>50?'↕ ectopic':'✓ normal';
    const fc=isArt?'var(--orn)':flag.startsWith('↕')?'var(--pur)':'var(--grn)';
    return `<tr${isArt?' style="opacity:0.7"':''}><td>${i+1}</td><td>${t}</td><td>${v.toFixed(1)}</td><td style="color:${dnn>0?'var(--grn)':'var(--orn)'}">${i>0?(dnn>0?'+':'')+dnn:'–'}</td><td>${hr}</td><td style="color:${fc};font-size:11px">${flag}</td></tr>`;
  });
  document.getElementById('beatTbody').innerHTML=tbRows.join('');
  {const _b=document.querySelector('#panelHRV .tab');if(_b){_b.classList.remove('active');swHT(0,_b);}}
  collapseSetup('hrv-ibi');
}

/* ═══════════════════════════════════════════════
   RUN BRV FROM INTERVALS (intervals mode)
═══════════════════════════════════════════════ */
function runBRVfromIBI(){
  const wEl=document.getElementById('brv-ibi-warn');wEl.style.display='none';
  const col=document.getElementById('brvIbiCol').value;
  if(!col){wEl.textContent='Select a cycle interval column.';wEl.style.display='block';return;}
  const units=document.getElementById('brvIbiUnits').value; // 's' or 'ms'

  let rawVals=rawRows.map(r=>{const v=r[col];if(typeof v==='number')return v;const n=parseFloat(v);return isFinite(n)?n:null;}).filter(v=>v!==null);
  if(!rawVals.length){wEl.textContent='No numeric data in selected column.';wEl.style.display='block';return;}

  // Convert to seconds
  const cycles=units==='ms'?rawVals.map(v=>v/1000):rawVals.slice();

  // Modality validation — check intervals match BRV physiological range
  const _bValResult=validateIntervalModality(cycles.map(v=>v*1000),'brv'); // pass as ms
  if(!_bValResult.ok){wEl.textContent=_bValResult.msg;wEl.style.display='block';return;}
  if(_bValResult.msg){wEl.textContent=_bValResult.msg;wEl.style.display='block';}

  // Basic range filter: retain only physiologically plausible breathing cycles
  const valid=cycles.filter(v=>v>=0.2&&v<=30);
  if(valid.length<3){wEl.textContent=`Only ${valid.length} valid cycles (0.5–30 s). Check column or units.`;wEl.style.display='block';return;}

  // Build cumulative peak times from intervals (t0=0)
  const pt=[0];for(const c of valid)pt.push(pt[pt.length-1]+c);

  breathData=valid;
  window._brvCycles=valid;
  window._brvCycleT=pt.slice(1).map(t=>+t.toFixed(3));
  const cycleT=window._brvCycleT;

  document.getElementById('brvResultSec').style.display='block';

  const mn=mean(valid),sdv=std(valid),brRate=60/mn,cv=sdv/mn*100;
  const brRm=rmssd(valid.map(v=>v*1000));
  const brDiffs=valid.slice(1).map((v,i)=>v-valid[i]);
  const brSdsd=std(brDiffs);
  const brPbb5pct=pNN(valid.map(v=>v*1000),mn*1000*0.05);

  const cpt2=[pt[0]];for(const c of valid)cpt2.push(cpt2[cpt2.length-1]+c);
  const brvBands=getBrvBands();
  const brvDoDetrend=document.getElementById('brvIbiDetrend')?.checked||false;
  const brvPsd=computePSD(cpt2,valid.map(v=>v*1000),brvBands,4,0,brvDoDetrend);
  const wRes={freqs:brvPsd.wFreqs,psd:brvPsd.wPsd};
  const lsFreqsBrv=brvPsd.lsFreqs,lsPsdBrv=brvPsd.lsPsd;
  const vlfPow=brvPsd.w.vlf,loPow=brvPsd.w.lf,hiPow=brvPsd.w.hf,totPow=brvPsd.w.tp;
  const midHighRatio=brvPsd.w.lfhf;
  const lsBrvVlf=brvPsd.ls.vlf,lsBrvLf=brvPsd.ls.lf,lsBrvHf=brvPsd.ls.hf,lsBrvTp=brvPsd.ls.tp;
  const lsBrvLfhf=brvPsd.ls.lfhf,wBrvPeakF=brvPsd.w.peakF,lsBrvPeakF=brvPsd.ls.peakF;
  // BBI Nyquist warning — HF above Nyquist is expected per Soni & Muniyandi (2019)
  const _mnCycI=mean(valid); // mean cycle in seconds
  const _bbiNyqI=1/(2*_mnCycI);
  const _nyqWarnI=_bbiNyqI<brvBands.hfLo
    ?`ℹ BBI Nyquist = ${_bbiNyqI.toFixed(3)} Hz (mean rate ${(60/_mnCycI).toFixed(1)} brpm). HF band power is above Nyquist — reflects spline interpolation, not physiology. Expected per Soni & Muniyandi (2019). LF/HF should be interpreted cautiously.`
    :(_bbiNyqI<brvBands.lfLo?`ℹ BBI Nyquist = ${_bbiNyqI.toFixed(3)} Hz. Both LF and HF bands are above Nyquist.`:'');
  const _resWarnI=!brvPsd.vlfResolvable?`⚠ Recording too short to resolve VLF: true df=${(brvPsd.trueDf*1000).toFixed(2)} mHz. VLF ms² unreliable.`:(!brvPsd.lfResolvable?`⚠ Recording too short to resolve LF: true df=${(brvPsd.trueDf*1000).toFixed(2)} mHz.`:'');
  const _fwBRV=[`<strong>Method:</strong> BBI Interpolation (Soni &amp; Muniyandi 2019) — Instantaneous Period method requires raw signal`,_resWarnI,_nyqWarnI].filter(Boolean).join('<br>');
  buildFdTable('brvFdMetricsTable',
    {vlf:vlfPow,lf:loPow,hf:hiPow,tp:totPow,lfhf:midHighRatio,peakF:wBrvPeakF},
    {vlf:lsBrvVlf,lf:lsBrvLf,hf:lsBrvHf,tp:lsBrvTp,lfhf:lsBrvLfhf,peakF:lsBrvPeakF},
    brvBands,['VLF','LF','HF'],_fwBRV,'BBI Interpolation (Soni & Muniyandi 2019)');

  // Charts
  mkC('brCycleOverview',{type:'scatter',data:{datasets:[{data:cycleT.map((t,i)=>({x:t,y:+valid[i].toFixed(3)})),showLine:true,borderColor:C.grn,borderWidth:2,pointRadius:3,pointBackgroundColor:C.grn,fill:false,tension:0.3}]},options:scOpts('time (s)','cycle (s)')});
  mkToolbar('brCycB','brCycleOverview');
  setupBRVROI();
  const bTPts=cycleT.map((t,i)=>({x:t,y:+valid[i].toFixed(3)}));
  const{slope:bs,intercept:bi3}=linReg(bTPts.map(p=>p.x),bTPts.map(p=>p.y));
  mkC('brTacho',{type:'scatter',data:{datasets:[
    {data:bTPts,backgroundColor:'rgba(52,201,138,0.6)',pointRadius:3,showLine:true,borderColor:'rgba(52,201,138,0.3)',borderWidth:1},
    {data:[{x:bTPts[0].x,y:+(bs*bTPts[0].x+bi3).toFixed(3)},{x:bTPts[bTPts.length-1].x,y:+(bs*bTPts[bTPts.length-1].x+bi3).toFixed(3)}],pointRadius:0,showLine:true,borderColor:C.orn,borderWidth:2,borderDash:[6,3]},
  ]},options:scOpts('time (s)','cycle (s)')});
  mkToolbar('brTachoB','brTacho');
  const{centers:bc2,counts:bct}=histogram(valid,20,Math.min(...valid),Math.max(...valid));
  mkC('brHistChart',{type:'bar',data:{labels:bc2,datasets:[{data:bct,backgroundColor:'rgba(52,201,138,0.7)',borderColor:C.grn,borderWidth:1}]},options:barOpts('cycle (s)','count')});
  mkToolbar('brHistB','brHistChart');
  const bdv=brDiffs.map(v=>+(v*1000).toFixed(1));
  mkC('brDiffChart',{type:'bar',data:{labels:cycleT.slice(1).map(t=>t.toFixed(2)),datasets:[{data:bdv,backgroundColor:bdv.map(v=>v>0?'rgba(52,201,138,0.7)':'rgba(244,133,90,0.7)'),borderWidth:0}]},options:barOpts('time (s)','Δcycle (ms)')});
  mkToolbar('brDiffB','brDiffChart');
  renderPSD(wRes.freqs,wRes.psd,lsFreqsBrv,lsPsdBrv,brvBands,'brPsdChart','brPsdB','brvPsdLegend',['VLF','LF','HF']);
  mkC('brRateChart',{type:'scatter',data:{datasets:[{data:cycleT.map((t,i)=>({x:t,y:+(60/valid[i]).toFixed(2)})),showLine:true,borderColor:C.pur,borderWidth:2,pointRadius:2,pointBackgroundColor:C.pur,fill:false,tension:0.3}]},options:scOpts('time (s)','rate (brpm)')});
  mkToolbar('brRateB','brRateChart');
  const{sd1:bSd1,sd2:bSd2}=poincareSd(valid.map(v=>v*1000));
  const _bSampEn=sampleEntropy(valid.map(v=>v*1000));
  const bSampEn=_bSampEn.value, bSampEnN=_bSampEn.n;
  const _bApEn=approxEntropy(valid.map(v=>v*1000));
  const bApEn=_bApEn.value, bApEnN=_bApEn.n;
  document.getElementById('brvNlStats').innerHTML=sc4([
    {c:'cg',l:'SD1',v:bSd1.toFixed(1),u:'ms',h:'Short-term BRV'},
    {c:'ct',l:'SD2',v:bSd2.toFixed(1),u:'ms',h:'Long-term BRV'},
    {c:'co',l:'SD1/SD2',v:bSd2>0?(bSd1/bSd2).toFixed(3):'–',h:'Balance index'},
    {c:'cb',l:'SampEn',v:bSampEn.toFixed(3),h:'N='+bSampEnN},
    {c:'cp',l:'ApEn',v:bApEn.toFixed(3),h:'N='+bApEnN},
    {c:'ck',l:'Valid cycles',v:valid.length},
  ]);
  const cyMs=valid.map(v=>v*1000);
  const bMin=Math.min(...cyMs),bMax=Math.max(...cyMs);
  mkC('brPoincareChart',{type:'scatter',data:{datasets:[
    {data:cyMs.slice(0,-1).map((v,i)=>({x:+v.toFixed(2),y:+cyMs[i+1].toFixed(2)})),backgroundColor:'rgba(52,201,138,0.5)',pointRadius:4,pointHoverRadius:6},
    {data:[{x:bMin,y:bMin},{x:bMax,y:bMax}],type:'line',borderColor:'rgba(128,128,128,0.3)',borderDash:[4,4],borderWidth:1,pointRadius:0,showLine:true},
  ]},options:scOpts('cycle n (ms)','cycle n+1 (ms)')});
  mkToolbar('brPcB','brPoincareChart');
  const brRows=valid.map((c,i)=>{
    const dnn=i>0?+((c-valid[i-1])*1000).toFixed(1):0;
    return `<tr><td>${i+1}</td><td>${cycleT[i].toFixed(3)}</td><td>${c.toFixed(3)}</td><td>${(60/c).toFixed(1)}</td><td style="color:${dnn>0?'var(--grn)':'var(--orn)'}">${i>0?(dnn>0?'+':'')+dnn:'–'}</td></tr>`;
  });
  document.getElementById('brTbody').innerHTML=brRows.join('');
  {const _b=document.querySelector('#panelBRV .tab');if(_b){_b.classList.remove('active');swBT(0,_b);}}
  collapseSetup('brv-ibi');
}

/* ═══════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════ */
function exportCSV(mode){
  let rows,fname;
  if(mode==='hrv'){
    rows=['#,Time_s,IBI_ms,Delta_NN_ms,HR_bpm'];
    const cptE=window._hrvCpt||[];
    beatData.forEach((v,i)=>{
      const t=cptE[i+1]!=null?cptE[i+1].toFixed(3):'';
      const d=i>0?+(v-beatData[i-1]).toFixed(1):'';
      rows.push(`${i+1},${t},${v.toFixed(1)},${d},${(60000/v).toFixed(1)}`);
    });
    fname='vaasi_hrv.csv';
  } else {
    rows=['#,Time_s,Cycle_s,Cycle_ms,Rate_brpm,Delta_cycle_ms'];
    const cycT=window._brvCycleT||[];
    breathData.forEach((c,i)=>{
      const t=cycT[i]!=null?cycT[i].toFixed(3):'';
      const d=i>0?+((c-breathData[i-1])*1000).toFixed(1):'';
      rows.push(`${i+1},${t},${c.toFixed(3)},${(c*1000).toFixed(1)},${(60/c).toFixed(1)},${d}`);
    });
    fname='vaasi_brv.csv';
  }
  const blob=new Blob([rows.join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;a.click();
}
