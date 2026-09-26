const SHEETS = {
  ENTRIES:'Entries',
  AGENTS:'Agents',
  SUPPLIERS:'Suppliers',
  NATURE:'NatureOfProfit',
  CONCLUSION:'FinalConclusion'
};

const APP_PASSWORD = 'rateaura123'; // CHANGE THIS before deploying

const ENTRY_HEADERS = [
  'EntryID','Rateaura','ReferenceNo','AgentName','SupplierName',
  'SupplierConfirmationNo','AgentReferenceNo','ServiceName','CheckIn','CheckOut',
  'BuyingAmount','SellingAmount','Status','NewBuyingAmount','NewSellingAmount',
  'CalcCondition','NatureOfProfit','Remarks','FinalConclusion',
  'ProfitLossAmount','ProfitLossType','CreatedAt','UpdatedAt'
];

function doPost(e){
  let req = {};
  try{ req = JSON.parse(e.postData.contents); }catch(err){ return jsonOut({ok:false,error:'Invalid JSON'}); }
  const action = req.action || '';
  const pw = req.password || '';

  if(action === 'login'){
    return jsonOut({ok: pw === APP_PASSWORD});
  }
  if(pw !== APP_PASSWORD){
    return jsonOut({ok:false,error:'Unauthorized'});
  }

  try{
    switch(action){
      case 'getData': return handleGetData();
      case 'createEntry': return handleCreateEntry(req);
      case 'updateEntry': return handleUpdateEntry(req);
      case 'deleteEntry': return handleDeleteEntry(req);
      case 'reviseEntry': return handleReviseEntry(req);
      case 'addMaster': return handleAddMaster(req);
      case 'deleteMaster': return handleDeleteMaster(req);
      default: return jsonOut({ok:false,error:'Unknown action'});
    }
  }catch(err){
    return jsonOut({ok:false,error:err.message});
  }
}

function doGet(e){
  return ContentService.createTextOutput(JSON.stringify({ok:true,message:'RateAura OPS API is running'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Helpers ---------- */
function getSheet(name){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    if(name === SHEETS.ENTRIES) sh.getRange(1,1,1,ENTRY_HEADERS.length).setValues([ENTRY_HEADERS]);
    else sh.getRange(1,1).setValue('Name');
  }
  return sh;
}

function ensureHeaders(sh, headers){
  const first = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if(first.length === 0 || first[0] === ''){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
}

function getRows(sheet){
  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return [];
  const headers = data[0];
  const rows = [];
  for(let i=1;i<data.length;i++){
    const obj = {};
    for(let j=0;j<headers.length;j++) obj[headers[j]] = data[i][j];
    rows.push(obj);
  }
  return rows;
}

function findRowIndex(sheet, colName, value){
  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return -1;
  const headers = data[0];
  const col = headers.indexOf(colName);
  if(col < 0) return -1;
  for(let i=1;i<data.length;i++){
    if(data[i][col] == value) return i+1; // 1-based row index
  }
  return -1;
}

function genId(){
  const d = new Date();
  const ts = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyMMdd-HHmmss');
  return 'RA-' + ts + '-' + Math.floor(Math.random()*900+100);
}

/* ---------- Handlers ---------- */
function handleGetData(){
  const entries = getRows(getSheet(SHEETS.ENTRIES));
  const agents = getRows(getSheet(SHEETS.AGENTS)).map(r=>r.Name).filter(Boolean);
  const suppliers = getRows(getSheet(SHEETS.SUPPLIERS)).map(r=>r.Name).filter(Boolean);
  const natures = getRows(getSheet(SHEETS.NATURE)).map(r=>r.Name).filter(Boolean);
  const conclusions = getRows(getSheet(SHEETS.CONCLUSION)).map(r=>r.Name).filter(Boolean);
  return jsonOut({ok:true, entries, agents, suppliers, natures, conclusions});
}

function handleCreateEntry(req){
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    const sh = getSheet(SHEETS.ENTRIES);
    ensureHeaders(sh, ENTRY_HEADERS);
    const id = genId();
    const now = new Date();
    const row = [
      id,
      req.Rateaura||'',
      req.ReferenceNo||'',
      req.AgentName||'',
      req.SupplierName||'',
      req.SupplierConfirmationNo||'',
      req.AgentReferenceNo||'',
      req.ServiceName||'',
      req.CheckIn||'',
      req.CheckOut||'',
      parseFloat(req.BuyingAmount)||0,
      parseFloat(req.SellingAmount)||0,
      'Open',
      '','','','','','','','',
      now, now
    ];
    sh.appendRow(row);
    return jsonOut({ok:true, EntryID:id});
  }finally{ lock.releaseLock(); }
}

function handleUpdateEntry(req){
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    const sh = getSheet(SHEETS.ENTRIES);
    ensureHeaders(sh, ENTRY_HEADERS);
    const rowIdx = findRowIndex(sh, 'EntryID', req.EntryID);
    if(rowIdx < 0) return jsonOut({ok:false,error:'Entry not found'});
    const data = sh.getDataRange().getValues();
    const headers = data[0];
    const map = {};
    headers.forEach((h,i)=> map[h]=i);
    const set = (col,val)=>{ if(map[col]>=0) sh.getRange(rowIdx, map[col]+1).setValue(val); };
    set('Rateaura', req.Rateaura||'');
    set('ReferenceNo', req.ReferenceNo||'');
    set('AgentName', req.AgentName||'');
    set('SupplierName', req.SupplierName||'');
    set('SupplierConfirmationNo', req.SupplierConfirmationNo||'');
    set('AgentReferenceNo', req.AgentReferenceNo||'');
    set('ServiceName', req.ServiceName||'');
    set('CheckIn', req.CheckIn||'');
    set('CheckOut', req.CheckOut||'');
    set('BuyingAmount', parseFloat(req.BuyingAmount)||0);
    set('SellingAmount', parseFloat(req.SellingAmount)||0);
    set('UpdatedAt', new Date());
    return jsonOut({ok:true});
  }finally{ lock.releaseLock(); }
}

function handleDeleteEntry(req){
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    const sh = getSheet(SHEETS.ENTRIES);
    const rowIdx = findRowIndex(sh, 'EntryID', req.EntryID);
    if(rowIdx < 0) return jsonOut({ok:false,error:'Entry not found'});
    sh.deleteRow(rowIdx);
    return jsonOut({ok:true});
  }finally{ lock.releaseLock(); }
}

function handleReviseEntry(req){
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    const sh = getSheet(SHEETS.ENTRIES);
    ensureHeaders(sh, ENTRY_HEADERS);
    const rowIdx = findRowIndex(sh, 'EntryID', req.EntryID);
    if(rowIdx < 0) return jsonOut({ok:false,error:'Entry not found'});
    const data = sh.getDataRange().getValues();
    const headers = data[0];
    const map = {};
    headers.forEach((h,i)=> map[h]=i);
    const get = (col)=>{ const i=map[col]; return i>=0 ? data[rowIdx-1][i] : 0; };
    const set = (col,val)=>{ if(map[col]>=0) sh.getRange(rowIdx, map[col]+1).setValue(val); };

    const origBuy = parseFloat(get('BuyingAmount'))||0;
    const origSell = parseFloat(get('SellingAmount'))||0;
    const newBuy = parseFloat(req.NewBuyingAmount)||0;
    const newSell = parseFloat(req.NewSellingAmount)||0;
    const cond = req.CalcCondition||'';
    let diff=0, type='';
    if(cond==='Agent Profit'){ diff = origSell - newSell; type='Profit'; }
    else if(cond==='Supplier Profit'){ diff = origBuy - newBuy; type='Profit'; }
    else if(cond==='Agent Loss'){ diff = origSell - newSell; type='Loss'; }
    else if(cond==='Supplier Loss'){ diff = origBuy - newBuy; type='Loss'; }
    diff = Math.round(diff*100)/100;

    set('NewBuyingAmount', newBuy);
    set('NewSellingAmount', newSell);
    set('CalcCondition', cond);
    set('NatureOfProfit', req.NatureOfProfit||'');
    set('Remarks', req.Remarks||'');
    set('FinalConclusion', req.FinalConclusion||'');
    set('ProfitLossAmount', Math.abs(diff));
    set('ProfitLossType', type);
    set('Status', 'Closed');
    set('UpdatedAt', new Date());
    return jsonOut({ok:true, ProfitLossAmount: Math.abs(diff), ProfitLossType: type});
  }finally{ lock.releaseLock(); }
}

function handleAddMaster(req){
  const map = {agent:SHEETS.AGENTS, supplier:SHEETS.SUPPLIERS, nature:SHEETS.NATURE, conclusion:SHEETS.CONCLUSION};
  const sheetName = map[req.type];
  if(!sheetName) return jsonOut({ok:false,error:'Invalid master type'});
  const sh = getSheet(sheetName);
  ensureHeaders(sh, ['Name']);
  const rows = getRows(sh);
  if(rows.some(r=>String(r.Name).toLowerCase()===String(req.name).toLowerCase()))
    return jsonOut({ok:false,error:'Already exists'});
  sh.appendRow([req.name]);
  return jsonOut({ok:true});
}

function handleDeleteMaster(req){
  const map = {agent:SHEETS.AGENTS, supplier:SHEETS.SUPPLIERS, nature:SHEETS.NATURE, conclusion:SHEETS.CONCLUSION};
  const sheetName = map[req.type];
  if(!sheetName) return jsonOut({ok:false,error:'Invalid master type'});
  const sh = getSheet(sheetName);
  const rowIdx = findRowIndex(sh, 'Name', req.name);
  if(rowIdx < 0) return jsonOut({ok:false,error:'Not found'});
  sh.deleteRow(rowIdx);
  return jsonOut({ok:true});
}
