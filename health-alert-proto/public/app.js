// Simple frontend to call backend endpoints and show alerts + simulate push notifications

const API = '/api';

async function fetchPatients(){
  const res = await fetch(API + '/patients');
  return await res.json();
}

async function onLoad(){
  const patients = await fetchPatients();
  const sel = document.getElementById('patientSelect');
  patients.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (id:${p.id})`;
    sel.appendChild(opt);
  });

  document.getElementById('prescribeBtn').onclick = async () => {
    const patientId = sel.value;
    const medication = document.getElementById('medInput').value.trim();
    if(!patientId || !medication){ alert('Select a patient and enter a medication.'); return; }
    const resp = await fetch(API + '/prescribe', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({patientId, medication})
    });
    const data = await resp.json();
    showResult(data);
    // Simulate sending "patient notifications"
    simulatePatientNotifications(data.alerts);
  }
}

function showResult(data){
  const area = document.getElementById('resultArea');
  area.innerHTML = `<h3>Doctor Alerts</h3>`;
  data.alerts.filter(a => a.target==='doctor').forEach(a => {
    const el = document.createElement('div');
    el.className = 'alert ' + a.level;
    el.innerHTML = `<strong>${a.level.toUpperCase()}</strong> — ${a.message}`;
    area.appendChild(el);
  });
  area.innerHTML += `<p>Risk score: ${data.riskScore}</p>`;
}

function simulatePatientNotifications(alerts){
  const nArea = document.getElementById('notifications');
  nArea.innerHTML = '';
  alerts.filter(a => a.target==='patient').forEach(a => {
    const el = document.createElement('div');
    el.className = 'note';
    el.innerHTML = `<strong>${a.level.toUpperCase()}</strong> — ${a.message}`;
    nArea.appendChild(el);
    // browser push notification (user must grant permission)
    if("Notification" in window && Notification.permission === "granted"){
      new Notification("HealthAlert", {body: a.message});
    } else if("Notification" in window && Notification.permission !== "denied"){
      Notification.requestPermission().then(perm => {
        if(perm === "granted"){
          new Notification("HealthAlert", {body: a.message});
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', onLoad);