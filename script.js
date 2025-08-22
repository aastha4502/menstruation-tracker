const el = id => document.getElementById(id);
const startEl = el('start');
const cycleEl = el('cycle');
const flowEl = el('flow');
const lutealEl = el('luteal');
const nextPeriodEl = el('nextPeriod');
const ovulationEl = el('ovulation');
const fertileEl = el('fertile');
const cdEl = el('cd');
const savedMsg = el('savedMsg');

// Load saved
(function loadSaved(){
  const saved = JSON.parse(localStorage.getItem('periodTracker')||'{}');
  if(saved.start) startEl.value = saved.start;
  if(saved.cycle) cycleEl.value = saved.cycle;
  if(saved.flow) flowEl.value = saved.flow;
  if(saved.luteal) lutealEl.value = saved.luteal;
  if(saved.start && saved.cycle) calculate();
})();

function fmt(d){
  if(!d) return '—';
  const opt = {year:'numeric', month:'short', day:'numeric'};
  return new Date(d).toLocaleDateString(undefined,opt);
}
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}
function diffDays(a,b){
  return Math.round((a - b) / (1000*60*60*24));
}

function getInputs(){
  const start = startEl.value ? new Date(startEl.value) : null;
  const cycle = parseInt(cycleEl.value || '28',10);
  const flow = parseInt(flowEl.value || '5',10);
  const luteal = parseInt(lutealEl.value || '14',10);
  return {start, cycle, flow, luteal};
}

function calculate(){
  const {start, cycle, flow, luteal} = getInputs();
  if(!start || !cycle) return;
  // Ovulation approx: cycle length - luteal
  const ovu = addDays(start, cycle - luteal);
  const fertileStart = addDays(ovu, -5);
  const fertileEnd = addDays(ovu, 1);
  const nextP = addDays(start, cycle);

  nextPeriodEl.textContent = fmt(nextP);
  ovulationEl.textContent = fmt(ovu);
  fertileEl.textContent = `${fmt(fertileStart)} → ${fmt(fertileEnd)}`;

  // Current cycle day
  const today = new Date();
  const cd = diffDays(today, start) % cycle;
  const cycleDay = cd >= 0 ? cd+1 : cycle + cd + 1; // 1-indexed
  cdEl.textContent = cycleDay;

  renderCalendars(start, cycle, flow, luteal);
}

function phaseFromDay(day, cycle, luteal, flow){
  if(day <= flow) return {name:'Menstrual', badge:'b-danger'};
  const ovuDay = cycle - luteal;
  if(day >= ovuDay-1 && day <= ovuDay+1) return {name:'Ovulation', badge:'b-warn'};
  if(day >= ovuDay-5 && day <= ovuDay+1) return {name:'Fertile', badge:'b-warn'};
  return {name: day < (cycle-luteal) ? 'Follicular' : 'Luteal', badge:'b-ok'};
}

function renderCalendars(start, cycle, flow, luteal){
  const wrap = document.getElementById('calendars');
  wrap.innerHTML = '';
  const today = new Date();

  for(let m=0;m<3;m++){
    const ref = new Date(today.getFullYear(), today.getMonth()+m, 1);
    const title = ref.toLocaleDateString(undefined,{month:'long', year:'numeric'});
    const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const lastDay = new Date(ref.getFullYear(), ref.getMonth()+1, 0);
    const grid = document.createElement('div');
    grid.className = 'card';
    const head = document.createElement('div');
    head.className = 'section-title';
    head.innerHTML = `<strong>${title}</strong>`;
    const cal = document.createElement('div');
    cal.className = 'calendar';

    ['S','M','T','W','T','F','S'].forEach(d=>{
      const e = document.createElement('div'); e.textContent=d; e.className='dow'; cal.appendChild(e);
    });

    let startWeekday = firstDay.getDay();
    for(let i=0;i<startWeekday;i++){ cal.appendChild(document.createElement('div')); }

    const marks = {}
    for(let k=-3;k<6;k++){
      const s = addDays(start, k*cycle);
      const mStart = new Date(s);
      const mEnd = addDays(s, flow-1);
      const ovu = addDays(s, cycle - luteal);
      const fertA = addDays(ovu,-5);
      const fertB = addDays(ovu,1);

      for(let d=new Date(mStart); d<=mEnd; d=addDays(d,1)){
        if(d.getMonth()===ref.getMonth() && d.getFullYear()===ref.getFullYear()){
          marks[d.toDateString()] = 'menstruation';
        }
      }
      for(let d=new Date(fertA); d<=fertB; d=addDays(d,1)){
        if(d.getMonth()===ref.getMonth() && d.getFullYear()===ref.getFullYear()){
          marks[d.toDateString()] = (marks[d.toDateString()]||'') + ' fertile';
        }
      }
      if(ovu.getMonth()===ref.getMonth() && ovu.getFullYear()===ref.getFullYear()){
        marks[ovu.toDateString()] = (marks[ovu.toDateString()]||'') + ' ovulation';
      }
    }

    for(let d=1; d<=lastDay.getDate(); d++){
      const cur = new Date(ref.getFullYear(), ref.getMonth(), d);
      const key = cur.toDateString();
      const cell = document.createElement('div');
      cell.className = 'day' + (marks[key] ? ' '+marks[key] : '');
      cell.title = marks[key] ? marks[key] : '';
      cell.textContent = d;
      cal.appendChild(cell);
    }

    grid.appendChild(head); grid.appendChild(cal); wrap.appendChild(grid);
  }
}

document.getElementById('calc').addEventListener('click', calculate);

document.getElementById('save').addEventListener('click', ()=>{
  const data = {
    start: startEl.value || null,
    cycle: cycleEl.value || null,
    flow: flowEl.value || null,
    luteal: lutealEl.value || null,
  };
  localStorage.setItem('periodTracker', JSON.stringify(data));
  savedMsg.hidden = false; setTimeout(()=>savedMsg.hidden=true, 1200);
});

document.getElementById('detect').addEventListener('click', ()=>{
  const {start, cycle, flow, luteal} = getInputs();
  const badge = document.getElementById('phaseBadge');
  if(!start || !cycle){ badge.textContent = 'Please enter start date & cycle length';
  badge.className = 'badge b-warn';
  return;
}

const today = new Date();
const cd = diffDays(today, start) % cycle;
const cycleDay = cd >= 0 ? cd+1 : cycle + cd + 1; // 1-indexed

const phase = phaseFromDay(cycleDay, cycle, luteal, flow);
badge.textContent = `${phase.name} phase (Day ${cycleDay})`;
badge.className = `badge ${phase.badge}`;
});
