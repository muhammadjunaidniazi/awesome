const form = document.getElementById('advisorForm');
const recommendationBox = document.getElementById('recommendationBox');
const recordTable = document.getElementById('recordTable');
const clearBtn = document.getElementById('clearBtn');
const canvas = document.getElementById('moistureChart');
const ctx = canvas.getContext('2d');

const cropWater = { Wheat: 42, Cotton: 55, Rice: 72, Sugarcane: 80, Maize: 50, Gram: 35 };
const soilFactor = { Clay: .85, Loam: 1, Silt: .95, Sand: 1.25 };

function getRecords(){ return JSON.parse(localStorage.getItem('agriAquaRecords') || '[]'); }
function saveRecords(records){ localStorage.setItem('agriAquaRecords', JSON.stringify(records)); }

function calculatePlan(data){
  const base = cropWater[data.crop] || 45;
  const need = Math.max(0, Math.round((base - data.moisture) * soilFactor[data.soil] + (data.temp > 36 ? 8 : 0)));
  let risk = 'Low';
  let className = 'badge';
  if(data.moisture < 25 || data.temp > 40){ risk = 'High'; className = 'badge danger-text'; }
  else if(data.moisture < 40 || data.temp > 35){ risk = 'Medium'; className = 'badge warning'; }
  const liters = Math.max(0, Math.round(need * data.area * 420));
  const action = need <= 5 ? 'No irrigation required today. Recheck moisture after 24 hours.' :
    need <= 18 ? 'Apply light irrigation and keep mulch around the crop root zone.' :
    'Apply scheduled irrigation today and inspect field drainage after watering.';
  return { need, liters, risk, className, action };
}

function tipsFor(crop, soil){
  const tips = {
    Wheat: ['Use evening irrigation to reduce evaporation.', 'Keep field leveled for equal water spread.'],
    Cotton: ['Avoid waterlogging at flowering stage.', 'Use mulch to control heat stress.'],
    Rice: ['Use alternate wetting and drying where suitable.', 'Do not keep unnecessary standing water.'],
    Sugarcane: ['Use trash mulching between rows.', 'Prefer furrow or drip irrigation.'],
    Maize: ['Protect crop during tasseling stage.', 'Use ridge planting in heavy soil.'],
    Gram: ['Give life-saving irrigation at flowering.', 'Avoid overwatering in clay soil.']
  };
  const soilTip = soil === 'Sand' ? 'Sandy soil loses water quickly, so use smaller and more frequent watering.' : soil === 'Clay' ? 'Clay soil holds water longer, so avoid over-irrigation.' : 'This soil can support balanced irrigation scheduling.';
  return [...(tips[crop] || []), soilTip];
}

function drawChart(current, target){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font = '15px system-ui';
  ctx.fillStyle = '#17231d';
  ctx.fillText('Current Moisture vs Target Moisture', 20, 28);
  const values = [{label:'Current',value:current},{label:'Target',value:target}];
  const max = 100;
  values.forEach((item, i)=>{
    const x = 70 + i*180;
    const h = (item.value/max)*150;
    const y = 210 - h;
    const gradient = ctx.createLinearGradient(0,y,0,210);
    gradient.addColorStop(0,'#68c36b');
    gradient.addColorStop(1,'#d7ff64');
    ctx.fillStyle = gradient;
    ctx.fillRect(x,y,80,h);
    ctx.fillStyle = '#17231d';
    ctx.fillText(`${item.value}%`, x+20, y-10);
    ctx.fillText(item.label, x+8, 236);
  });
}

function renderRecords(){
  const records = getRecords();
  if(!records.length){ recordTable.innerHTML = '<tr><td colspan="6">No saved records yet.</td></tr>'; return; }
  recordTable.innerHTML = records.map(r => `<tr><td>${r.date}</td><td>${r.field}</td><td>${r.crop}</td><td>${r.soil}</td><td>${r.moisture}%</td><td>${r.action}</td></tr>`).join('');
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = {
    crop: document.getElementById('crop').value,
    soil: document.getElementById('soil').value,
    moisture: Number(document.getElementById('moisture').value),
    temp: Number(document.getElementById('temp').value),
    area: Number(document.getElementById('area').value),
    field: document.getElementById('field').value.trim()
  };
  const plan = calculatePlan(data);
  const tipList = tipsFor(data.crop, data.soil).map(t => `<li>${t}</li>`).join('');
  recommendationBox.className = 'tip-card';
  recommendationBox.innerHTML = `<span class="${plan.className}">${plan.risk} Risk</span><span class="badge">${plan.liters} L estimated water</span><h3>${plan.action}</h3><p>Estimated water gap: <strong>${plan.need}%</strong>. This is a planning estimate for a ${data.area} acre field.</p><ul>${tipList}</ul>`;
  document.getElementById('todaySummary').textContent = plan.action;
  document.getElementById('statCrop').textContent = data.crop;
  document.getElementById('statWater').textContent = `${plan.liters}L`;
  document.getElementById('statRisk').textContent = plan.risk;
  drawChart(data.moisture, cropWater[data.crop]);
  const records = getRecords();
  records.unshift({ date: new Date().toLocaleDateString(), field: data.field, crop: data.crop, soil: data.soil, moisture: data.moisture, action: plan.risk });
  saveRecords(records.slice(0, 15));
  renderRecords();
});

clearBtn.addEventListener('click', ()=>{ saveRecords([]); renderRecords(); });
renderRecords();
drawChart(35, 55);
