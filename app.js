/* RateAura OPS v1.0 — Frontend */
let state = { entries:[], agents:[], suppliers:[], natures:[], conclusions:[], password:'' };

async function api(action, payload={}){
  const url = SCRIPT_URL;
  if(!url || url.includes('YOUR_GOOGLE')){
    showToast('Please set SCRIPT_URL in assets/config.js'); throw new Error('SCRIPT_URL not set');
  }
  const body = JSON.stringify({action, password:state.password, ...payload});
  const res = await fetch(url, {method:'POST', body, headers:{'Content-Type':'text/plain;charset=utf-8'}});
  const text = await res.text();
  let data;
  try{ data = JSON.parse(text); }catch(e){ data = {ok:false, error:text}; }
  if(!data.ok) throw new Error(data.error || 'Server error');
  return data;
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'), 3000);
}

/* ---------- Login ---------- */
async function doLogin(){
  const pw = document.getElementById('loginPassword').value.trim();
  if(!pw){ showError('Enter password'); return; }
  try{
    const r = await api('login', {password:pw});
    if(r.ok){
      state.password = pw;
      localStorage.setItem('ra_password', pw);
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('appView').classList.remove('hidden');
      await refreshData();
    }
  }catch(e){ showError(e.message); }
}
function showError(msg){ const el=document.getElementById('loginError'); el.textContent=msg; el.classList.remove('hidden'); }
function doLogout(){ localStorage.removeItem('ra_password'); state.password=''; location.reload(); }

/* ---------- Tabs ---------- */
function switchTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===id));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active', p.id==='tab-'+id));
  if(id==='entries') renderEntries();
  if(id==='masters') renderMasters();
  if(id==='dashboard') renderDashboard();
}

/* ---------- Data ---------- */
async function refreshData(){
  setSync(true);
  try{
    const r = await api('getData');
    state.entries = r.entries || [];
    state.agents = r.agents || [];
    state.suppliers = r.suppliers || [];
    state.natures = r.natures || [];
    state.conclusions = r.conclusions || [];
    populateSelects();
    renderDashboard();
    renderEntries();
    renderMasters();
    setSync(false);
    showToast('Data refreshed');
  }catch(e){ setSync(false,'warn'); showToast('Refresh failed: '+e.message); }
}
function setSync(loading, warn){
  const el = document.getElementById('syncStatus');
  if(loading){ el.textContent='● Syncing…'; el.className='sync-warn'; }
  else if(warn){ el.textContent='● Sync issue'; el.className='sync-warn'; }
  else { el.textContent='● Synced'; el.className='sync-ok'; }
}
function populateSelects(){
  const fill = (selId, arr)=>{
    const s = document.getElementById(selId); if(!s) return;
    const cur = s.value;
    s.innerHTML = '<option value="">All</option>' + arr.map(x=>`<option>${esc(x)}</option>`).join('');
    s.value = cur;
  };
  fill('fAgent', state.agents); fill('fSupplier', state.suppliers);
  fill('mAgent', state.agents); fill('mSupplier', state.suppliers);
  fill('rNature', state.natures); fill('rConclusion', state.conclusions);
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const entries = state.entries;
  const profit = entries.filter(e=>e.ProfitLossType==='Profit').reduce((a,e)=>a+num(e.ProfitLossAmount),0);
  const loss   = entries.filter(e=>e.ProfitLossType==='Loss').reduce((a,e)=>a+num(e.ProfitLossAmount),0);
  const openC  = entries.filter(e=>e.Status==='Open').length;
  const closedC= entries.filter(e=>e.Status==='Closed').length;
  document.getElementById('stProfit').textContent = fmt(profit);
  document.getElementById('stLoss').textContent   = fmt(loss);
  document.getElementById('stNet').textContent    = fmt(profit - loss);
  document.getElementById('stOpen').textContent   = openC;
  document.getElementById('stClosed').textContent = closedC;
  document.getElementById('stTotal').textContent  = entries.length;

  // Monthly chart (simple bars)
  const months={};
  entries.forEach(e=>{
    const d = e.CreatedAt ? new Date(e.CreatedAt) : new Date();
    const key = d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
    if(!months[key]) months[key]={profit:0,loss:0};
    const amt = num(e.ProfitLossAmount);
    if(e.ProfitLossType==='Profit') months[key].profit += amt;
    if(e.ProfitLossType==='Loss') months[key].loss += amt;
  });
  const keys = Object.keys(months).sort().slice(-12);
  const max = Math.max(1, ...keys.map(k=>Math.max(months[k].profit, months[k].loss)));
  const bars = keys.map(k=>{
    const p = (months[k].profit/max*100).toFixed(1);
    const l = (months[k].loss/max*100).toFixed(1);
    return `<div class="bar-group"><div class="bar-row"><div class="bar profit-bar" style="width:${p}%"></div><span class="bar-lab">${k}</span></div><div class="bar-row"><div class="bar loss-bar" style="width:${l}%"></div><span class="bar-lab">${k}</span></div></div>`;
  }).join('');
  document.getElementById('monthlyChart').innerHTML = `<style>.bar-group{margin-bottom:6px}.bar-row{display:flex;align-items:center;gap:6px;margin:2px 0}.bar{height:14px;border-radius:4px}.profit-bar{background:var(--profit)}.loss-bar{background:var(--loss)}.bar-lab{width:60px;font-size:.75rem;color:var(--muted)}</style>` + (bars||'<p class="muted">No data yet</p>');

  // Condition table
  const conds = {};
  entries.forEach(e=>{ if(!e.CalcCondition) return; if(!conds[e.CalcCondition]) conds[e.CalcCondition]={profit:0,loss:0,count:0}; conds[e.CalcCondition].count++; const a=num(e.ProfitLossAmount); if(e.ProfitLossType==='Profit') conds[e.CalcCondition].profit+=a; else conds[e.CalcCondition].loss+=a; });
  const condRows = Object.keys(conds).map(c=>`<tr><td>${esc(c)}</td><td>${fmt(conds[c].profit)}</td><td>${fmt(conds[c].loss)}</td><td>${conds[c].count}</td></tr>`).join('');
  document.getElementById('condTable').innerHTML = '<thead><tr><th>Condition</th><th>Profit</th><th>Loss</th><th>Count</th></tr></thead><tbody>' + (condRows||'<tr><td colspan=4 class="muted">No data</td></tr>') + '</tbody>';

  // Recent entries
  const recent = [...entries].sort((a,b)=> new Date(b.CreatedAt||0)-new Date(a.CreatedAt||0)).slice(0,10);
  document.getElementById('recentTable').innerHTML = entryTableHTML(recent, true);
}

/* ---------- Entries Table ---------- */
function renderEntries(){
  const fRef = document.getElementById('fRef').value.toLowerCase();
  const fAgentRef = document.getElementById('fAgentRef').value.toLowerCase();
  const fSuppConf = document.getElementById('fSuppConf').value.toLowerCase();
  const fAgent = document.getElementById('fAgent').value;
  const fSupplier = document.getElementById('fSupplier').value;
  const fStatus = document.getElementById('fStatus').value;
  const filtered = state.entries.filter(e=>{
    return (!fRef || (e.ReferenceNo||'').toLowerCase().includes(fRef))
        && (!fAgentRef || (e.AgentReferenceNo||'').toLowerCase().includes(fAgentRef))
        && (!fSuppConf || (e.SupplierConfirmationNo||'').toLowerCase().includes(fSuppConf))
        && (!fAgent || e.AgentName===fAgent)
        && (!fSupplier || e.SupplierName===fSupplier)
        && (!fStatus || e.Status===fStatus);
  });
  document.getElementById('entriesTable').innerHTML = entryTableHTML(filtered);
  document.getElementById('entriesCount').textContent = `Showing ${filtered.length} of ${state.entries.length} entries`;
}
function clearFilters(){ ['fRef','fAgentRef','fSuppConf','fAgent','fSupplier','fStatus'].forEach(id=>document.getElementById(id).value=''); renderEntries(); }

function entryTableHTML(list, compact){
  const th = `<thead><tr><th>Ref No.</th><th>Agent</th><th>Supplier</th><th>Service</th><th>Check-in</th><th>Buying</th><th>Selling</th><th>Status</th><th>P/L</th>${compact?'':'<th>Actions</th>'}</tr></thead>`;
  if(!list.length) return th + '<tbody><tr><td colspan="'+(compact?9:10)+'" class="muted">No entries found</td></tr></tbody>';
  const rows = list.map(e=>{
    const pl = e.ProfitLossType ? `<span class="tag tag-${e.ProfitLossType.toLowerCase()}">${esc(e.ProfitLossType)} ${fmt(num(e.ProfitLossAmount))}</span>` : '-';
    const actions = compact ? '' : `<td class="actions">
      <button class="btn-ghost" onclick="openEntryModal('${e.EntryID}')">Edit</button>
      ${e.Status==='Open'?`<button class="btn-primary" onclick="openReviseModal('${e.EntryID}')">Revise</button>`:''}
      <button class="btn-danger" onclick="confirmDelete('${e.EntryID}')">Delete</button>
    </td>`;
    return `<tr>
      <td><b>${esc(e.ReferenceNo)}</b><div class="muted small">${esc(e.EntryID||'')}</div></td>
      <td>${esc(e.AgentName)}</td>
      <td>${esc(e.SupplierName)}</td>
      <td>${esc(e.ServiceName)}</td>
      <td>${fmtDate(e.CheckIn)}</td>
      <td>${fmt(num(e.BuyingAmount))}</td>
      <td>${fmt(num(e.SellingAmount))}</td>
      <td><span class="tag tag-${(e.Status||'Open').toLowerCase()}">${esc(e.Status||'Open')}</span></td>
      <td>${pl}</td>${actions}
    </tr>`;
  }).join('');
  return th + '<tbody>' + rows + '</tbody>';
}

/* ---------- Entry CRUD ---------- */
let editingEntryID = null;
function openEntryModal(id){
  editingEntryID = id || null;
  document.getElementById('entryModalTitle').textContent = id ? 'Edit Original Entry' : 'New Original Entry';
  const e = id ? state.entries.find(x=>x.EntryID===id) : {};
  document.getElementById('mRateaura').value = e.Rateaura || '';
  document.getElementById('mRefNo').value = e.ReferenceNo || '';
  document.getElementById('mAgent').value = e.AgentName || '';
  document.getElementById('mSupplier').value = e.SupplierName || '';
  document.getElementById('mSuppConf').value = e.SupplierConfirmationNo || '';
  document.getElementById('mAgentRef').value = e.AgentReferenceNo || '';
  document.getElementById('mService').value = e.ServiceName || '';
  document.getElementById('mCheckIn').value = e.CheckIn || '';
  document.getElementById('mCheckOut').value = e.CheckOut || '';
  document.getElementById('mBuying').value = e.BuyingAmount || '';
  document.getElementById('mSelling').value = e.SellingAmount || '';
  document.getElementById('entryModal').classList.remove('hidden');
}
async function saveEntry(){
  const payload = {
    Rateaura: document.getElementById('mRateaura').value.trim(),
    ReferenceNo: document.getElementById('mRefNo').value.trim(),
    AgentName: document.getElementById('mAgent').value,
    SupplierName: document.getElementById('mSupplier').value,
    SupplierConfirmationNo: document.getElementById('mSuppConf').value.trim(),
    AgentReferenceNo: document.getElementById('mAgentRef').value.trim(),
    ServiceName: document.getElementById('mService').value.trim(),
    CheckIn: document.getElementById('mCheckIn').value,
    CheckOut: document.getElementById('mCheckOut').value,
    BuyingAmount: parseFloat(document.getElementById('mBuying').value)||0,
    SellingAmount: parseFloat(document.getElementById('mSelling').value)||0,
  };
  if(!payload.ReferenceNo || !payload.AgentName || !payload.SupplierName){ showToast('Please fill required fields'); return; }
  try{
    if(editingEntryID){
      await api('updateEntry', {EntryID: editingEntryID, ...payload});
      showToast('Entry updated');
    }else{
      await api('createEntry', payload);
      showToast('Entry created');
    }
    closeModal('entryModal'); await refreshData();
  }catch(e){ showToast(e.message); }
}

function confirmDelete(id){
  const e = state.entries.find(x=>x.EntryID===id);
  document.getElementById('confirmMsg').textContent = `Delete entry ${e?e.ReferenceNo:id}? This cannot be undone.`;
  document.getElementById('confirmYes').onclick = async ()=>{
    try{ await api('deleteEntry',{EntryID:id}); closeModal('confirmModal'); showToast('Entry deleted'); await refreshData(); }
    catch(err){ showToast(err.message); }
  };
  document.getElementById('confirmModal').classList.remove('hidden');
}

/* ---------- Revised Entry ---------- */
let reviseEntryID = null;
function openReviseModal(id){
  reviseEntryID = id;
  const e = state.entries.find(x=>x.EntryID===id);
  if(!e) return;
  document.getElementById('revRefNo').textContent = e.ReferenceNo;
  document.getElementById('roAgent').textContent = e.AgentName;
  document.getElementById('roSupplier').textContent = e.SupplierName;
  document.getElementById('roBuying').textContent = fmt(num(e.BuyingAmount));
  document.getElementById('roSelling').textContent = fmt(num(e.SellingAmount));
  document.getElementById('rNewBuying').value = e.NewBuyingAmount || '';
  document.getElementById('rNewSelling').value = e.NewSellingAmount || '';
  document.getElementById('rCondition').value = e.CalcCondition || '';
  document.getElementById('rNature').value = e.NatureOfProfit || '';
  document.getElementById('rConclusion').value = e.FinalConclusion || '';
  document.getElementById('rRemarks').value = e.Remarks || '';
  updatePreview();
  document.getElementById('reviseModal').classList.remove('hidden');
}
function updatePreview(){
  const e = state.entries.find(x=>x.EntryID===reviseEntryID);
  if(!e) return;
  const origBuy = num(e.BuyingAmount);
  const origSell = num(e.SellingAmount);
  const newBuy = parseFloat(document.getElementById('rNewBuying').value);
  const newSell = parseFloat(document.getElementById('rNewSelling').value);
  const cond = document.getElementById('rCondition').value;
  const el = document.getElementById('plPreview');
  if(!cond || isNaN(newBuy) || isNaN(newSell)){ el.classList.add('hidden'); return; }
  let diff=0, type='';
  if(cond==='Agent Profit'){ diff = origSell - newSell; type='Profit'; }
  else if(cond==='Supplier Profit'){ diff = origBuy - newBuy; type='Profit'; }
  else if(cond==='Agent Loss'){ diff = origSell - newSell; type='Loss'; }
  else if(cond==='Supplier Loss'){ diff = origBuy - newBuy; type='Loss'; }
  diff = Math.round(diff*100)/100;
  el.textContent = `${type}: ${fmt(Math.abs(diff))}`;
  el.className = 'pl-preview ' + (type==='Loss'?'loss':'');
  el.classList.remove('hidden');
}
async function saveRevised(){
  const e = state.entries.find(x=>x.EntryID===reviseEntryID);
  const newBuy = parseFloat(document.getElementById('rNewBuying').value);
  const newSell = parseFloat(document.getElementById('rNewSelling').value);
  const cond = document.getElementById('rCondition').value;
  if(!cond || isNaN(newBuy) || isNaN(newSell)){ showToast('Please fill revised amounts and condition'); return; }
  let diff=0, type='';
  if(cond==='Agent Profit'){ diff = num(e.SellingAmount) - newSell; type='Profit'; }
  else if(cond==='Supplier Profit'){ diff = num(e.BuyingAmount) - newBuy; type='Profit'; }
  else if(cond==='Agent Loss'){ diff = num(e.SellingAmount) - newSell; type='Loss'; }
  else if(cond==='Supplier Loss'){ diff = num(e.BuyingAmount) - newBuy; type='Loss'; }
  diff = Math.round(diff*100)/100;
  const payload = {
    EntryID: reviseEntryID,
    NewBuyingAmount: newBuy,
    NewSellingAmount: newSell,
    CalcCondition: cond,
    NatureOfProfit: document.getElementById('rNature').value,
    FinalConclusion: document.getElementById('rConclusion').value,
    Remarks: document.getElementById('rRemarks').value.trim(),
    ProfitLossAmount: Math.abs(diff),
    ProfitLossType: type,
    Status: 'Closed'
  };
  try{
    await api('reviseEntry', payload);
    closeModal('reviseModal'); showToast('Entry revised & closed'); await refreshData();
  }catch(err){ showToast(err.message); }
}

/* ---------- Masters ---------- */
function renderMasters(){
  const mk = (arr, id)=>{
    const ul = document.getElementById(id);
    ul.innerHTML = arr.map(x=>`<li><span>${esc(x)}</span><button onclick="deleteMaster('${id.replace('List','')}','${esc(x)}')">Remove</button></li>`).join('');
  };
  mk(state.agents, 'agentList');
  mk(state.suppliers, 'supplierList');
  mk(state.natures, 'natureList');
  mk(state.conclusions, 'conclusionList');
}
async function addMaster(type){
  const map={agent:'newAgent',supplier:'newSupplier',nature:'newNature',conclusion:'newConclusion'};
  const input = document.getElementById(map[type]);
  const name = input.value.trim(); if(!name){ showToast('Enter a name'); return; }
  try{ await api('addMaster',{type,name}); input.value=''; showToast('Added'); await refreshData(); }
  catch(e){ showToast(e.message); }
}
async function deleteMaster(type,name){
  if(!confirm(`Remove "${name}" from ${type}?`)) return;
  try{ await api('deleteMaster',{type,name}); showToast('Removed'); await refreshData(); }
  catch(e){ showToast(e.message); }
}

/* ---------- Utils ---------- */
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }
function num(v){ const n=parseFloat(v); return isNaN(n)?0:n; }
function fmt(n){ return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d){ if(!d) return '-'; const x=new Date(d); return isNaN(x)?d:x.toLocaleDateString(); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', ()=>{
  const saved = localStorage.getItem('ra_password');
  if(saved){ state.password=saved; document.getElementById('loginView').classList.add('hidden'); document.getElementById('appView').classList.remove('hidden'); refreshData(); }
});
