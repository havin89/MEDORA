document.addEventListener("DOMContentLoaded", () => {
  // --- Helper validation functions ---
  const isNonEmpty = v => typeof v === "string" && v.trim().length > 0;
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isStrongPassword = v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
  const isPhone = v => /^[+0-9]{7,15}$/.test(v.replace(/\s+/g, ""));
  const isBirthYear = v => {
    const y = Number(v);
    const c = new Date().getFullYear();
    return Number.isInteger(y) && y > 1900 && y <= c;
  };
  const isInstitutionId = v => /^[A-Za-z0-9\-_.]{4,20}$/.test(v);

  // ========== DOCTOR LOGIN ==========
  const doctorForm = document.getElementById("doctorForm");
  if (doctorForm) {
    const inst = document.getElementById("docInstitutionId");
    const email = document.getElementById("docEmail");
    const pwd = document.getElementById("docPassword");
    const consent = document.getElementById("docConsent");
    const msg = document.getElementById("formMessage");

    inst.addEventListener("input", () =>
      setError("err-docInstitutionId", isInstitutionId(inst.value) ? "" : t("enterValidInstitutionId"))
    );
    email.addEventListener("input", () =>
      setError("err-docEmail", isEmail(email.value) ? "" : t("validEmailRequired"))
    );
    pwd.addEventListener("input", () =>
      setError("err-docPassword", isNonEmpty(pwd.value) ? "" : t("passwordRequired"))
    );
    consent.addEventListener("change", () =>
      setError("err-docConsent", consent.checked ? "" : t("consentRequired"))
    );

    doctorForm.addEventListener("submit", async e => {
      e.preventDefault();
      clearFormMessage(msg);
      let valid = true;

      if (!isInstitutionId(inst.value)) {
        setError("err-docInstitutionId", t("institutionIdRequired"));
        valid = false;
      }
      if (!isEmail(email.value)) {
        setError("err-docEmail", t("validEmailRequired"));
        valid = false;
      }
      if (!isNonEmpty(pwd.value)) {
        setError("err-docPassword", t("passwordRequired"));
        valid = false;
      }
      if (!consent.checked) {
        setError("err-docConsent", t("consentRequired"));
        valid = false;
      }

      if (!valid) {
        showFormMessage(msg, t("errFixBefore"), true);
        return;
      }

      // ✅ Fetch data.json to verify doctor credentials
      try {
        const res = await fetch("data.json");
        const data = await res.json();

        const doctor = data.doctors.find(d =>
          d.institutionId === inst.value.trim() &&
          d.email.trim().toLowerCase() === email.value.trim().toLowerCase() &&
          d.password === pwd.value.trim()
        );

        if (!doctor) {
          showFormMessage(msg, t("errInvalidDoctor"), true);
          return;
        }

        // Persist doctor for dashboard authorization
        try {
          localStorage.setItem("loggedInDoctor", JSON.stringify(doctor));
        } catch (e) {
          console.warn("Unable to persist loggedInDoctor", e);
        }

        showFormMessage(msg, t("loginSuccessRedirecting"), false);
        setTimeout(() => (window.location.href = "doctor-dashboard.html"), 1000);
      } catch (err) {
        console.error(err);
        showFormMessage(msg, t("errLoadDoctor"), true);
      }
    });
  }

  // ===== Patient: Urgent Alerts (per patient) =====
  function renderPatientAlerts(patient, data){
    const listEl = document.getElementById('patientAlertsList');
    const detailsEl = document.getElementById('patientAlertsDetails');
    if (!listEl && !detailsEl) return;

    const alerts = [];
    const detailRows = [];
    const meds = (patient.activeMedications||[]).map(m => (m||'').toLowerCase());
    const chronic = (patient.chronic||[]).map(c => (c||'').toLowerCase());
    const rules = Array.isArray(data?.drugInteractions) ? data.drugInteractions : [];

    // Simple clinical alerts
    if (patient.age > 70) alerts.push(`<div class="alert high-alert"><strong>Age Risk:</strong> ${patient.age}</div>`);
    if (patient.heightCm && patient.weightKg){
      const bmi = patient.weightKg / Math.pow(patient.heightCm/100, 2);
      if (bmi >= 30) alerts.push(`<div class="alert med-alert"><strong>Obesity Risk:</strong> BMI ${bmi.toFixed(1)}</div>`);
    }
    if (chronic.includes('hypertension')) alerts.push(`<div class="alert medium-alert"><strong>Hypertension:</strong> Monitor your blood pressure trend.</div>`);

    // Drug-drug interactions
    for (const r of rules){
      const a = (r.a||'').toLowerCase(); const b=(r.b||'').toLowerCase();
      if (meds.includes(a) && meds.includes(b)){
        const lvl = (r.risk||'').toLowerCase();
        const cls = lvl==='high'?'high-alert':(lvl==='medium'?'med-alert':'low-alert');
        alerts.push(`<div class="alert ${cls}"><strong>Interaction:</strong> ${r.a} + ${r.b} — ${r.reason}</div>`);
        detailRows.push(`<tr><td>Medication</td><td>${r.a} + ${r.b}</td><td>${r.reason}</td></tr>`);
      }
    }

    listEl && (listEl.innerHTML = alerts.length ? alerts.join('') : `<div class="alert low-alert">No critical alerts.</div>`);
    detailsEl && (detailsEl.innerHTML = detailRows.length ? detailRows.join('') : `<tr><td colspan="3" style="padding:6px 8px; color:#666;">No details available.</td></tr>`);
  }

  // ===== Patient: Personalized Recommendations (per patient) =====
  function renderPatientRecommendations(patient, data){
    const listEl = document.getElementById('patientRecsList');
    if (!listEl) return;
    const recs = [];

    const meds = (patient.activeMedications || []).map(m => (m||'').toLowerCase());
    const chronic = (patient.chronic || []).map(c => (c||'').toLowerCase());
    const bmi = (patient.heightCm && patient.weightKg) ? (patient.weightKg / Math.pow(patient.heightCm/100, 2)) : null;

    // Hypertension
    if (chronic.includes('hypertension')){
      recs.push(`<li><strong>Reduce Salt:</strong> Keep sodium under 2g/day; check labels.</li>`);
      recs.push(`<li><strong>Regular Exercise:</strong> 30 minutes brisk walking daily.</li>`);
      recs.push(`<li><strong>BP Monitoring:</strong> Measure twice daily and log readings.</li>`);
    }
    // Diabetes
    if (chronic.includes('diabetes')){
      recs.push(`<li><strong>Carbohydrate Management:</strong> Limit simple sugars; increase fiber and protein.</li>`);
      recs.push(`<li><strong>Glucose & HbA1c:</strong> Record home readings; check HbA1c every 3 months.</li>`);
    }
    // Hyperlipidemia / High cholesterol
    if (chronic.includes('high cholesterol') || chronic.includes('hyperlipidemia')){
      recs.push(`<li><strong>LDL-Lowering Diet:</strong> Reduce saturated/trans fats; add olive oil and oats.</li>`);
    }
    // Obesity
    if (bmi && bmi >= 30){
      recs.push(`<li><strong>Weight Management:</strong> Aim for 0.5–1 kg/week loss; daily walking; 7–8h sleep.</li>`);
    }
    // Asthma
    if (chronic.includes('asthma')){
      recs.push(`<li><strong>Avoid Triggers:</strong> Dust, smoke, heavy perfumes; ventilate indoors.</li>`);
    }
    // Heart disease
    if (chronic.includes('heart disease')){
      if (meds.includes('ibuprofen')) recs.push(`<li><strong>Medication Review:</strong> Ibuprofen may raise CV risk; discuss alternatives.</li>`);
      recs.push(`<li><strong>Reduce CV Risk:</strong> Salt restriction, regular exercise, stress management.</li>`);
    }

    listEl.innerHTML = recs.length ? recs.map(x=>`<li>${x}</li>`).join('') : `<li>No personalized recommendations at this time.</li>`;
  }
    try { window.renderPatientNotifications = renderPatientNotifications; } catch(_) {}

  // ===== Patient Dashboard helpers =====
  function renderPatientNotifInto(containerId, p){
    if (!p) return;
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const pid = p.id;
    const items = [];
    try {
      const msgs = JSON.parse(localStorage.getItem(`messages:${pid}`)||'[]');
      msgs.forEach(m=> {
        const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : t('you');
        items.push({type:'msg', at:m.createdAt, text:m.text, author});
      });
    } catch(_){ }
    try { const labs = JSON.parse(localStorage.getItem(`labOrders:${pid}`)||'[]'); labs.forEach(l=> items.push({type:'lab', at:l.orderedAt, text:`${t('labOrder')}: ${Array.isArray(l.tests)? l.tests.join(', '): ''}`})); } catch(_){ }
    try { const appts = JSON.parse(localStorage.getItem(`patientAppointments:${pid}`)||'[]'); appts.forEach(a=> items.push({type:'appt', at:`${a.date} ${a.time||''}`.trim(), text:`${t('followUp')}: ${a.date} ${a.time||''}`})); } catch(_){ }
    items.sort((a,b)=> new Date(a.at||0) - new Date(b.at||0));
    const empty = !items.length;
    const getInitials = (name)=>{
      if (!name) return '•';
      const parts = String(name).split(/\s+/).filter(Boolean);
      const a = (parts[0]||'').charAt(0), b=(parts[1]||'').charAt(0);
      return (a + (b||'')).toUpperCase();
    };
    const makeRow = (it)=>{
      const label = it.type==='msg'?t('messageLabel'):it.type==='lab'?t('labLabel'):it.type==='appt'?t('appointmentLabel'):t('noteLabel');
      const cls = it.type==='msg'?'msg':it.type==='lab'?'lab':it.type==='appt'?'appt':'note';
      const author = it.author || (it.type==='lab' || it.type==='appt' ? t('system') : t('you'));
      const avatarKind = String(author).startsWith('Dr.') ? 'doctor' : (author===t('you') ? 'patient' : 'system');
      return `<div class="comment-item ${cls}">
                <div class="comment-meta"><span class="comment-badge ${cls}">${label}</span> <span>${new Date(it.at||Date.now()).toLocaleString()}</span></div>
                <div class="comment-line">
                  <span class="comment-avatar ${avatarKind}">${getInitials(author.replace(/^Dr\.?\s*/,'').trim())}</span>
                  <div class="comment-text"><strong>${author}:</strong> ${it.text}</div>
                </div>
              </div>`;
    };
    const list = empty ? '' : items.map(makeRow).join('');
    // unique IDs per-container to avoid collisions
    const filterId = containerId+"-filter";
    const listId = containerId+"-list";
    wrap.innerHTML = `
      <div class="comment-box">
        <div style="display:flex; gap:8px; margin:0 0 10px 0; align-items:center;">
          <label style="font-size:12px; color:#6b7280;">${t('filter')}</label>
          <select id="${filterId}" style="padding:6px 8px; border-radius:8px; border:1px solid #e5e7eb;">
            <option value="all">${t('all')}</option>
            <option value="msg">${t('messages')}</option>
            <option value="lab">${t('labs')}</option>
            <option value="appt">${t('appointments')}</option>
          </select>
        </div>
        <div id="${listId}">${empty ? `<div class=\"comment-empty\">${t('noNotificationsYet')}</div>` : list}</div>
      </div>`;
    const sel = document.getElementById(filterId);
    sel?.addEventListener('change', ()=>{
      const v = sel.value;
      const filtered = v==='all' ? items : items.filter(x=> x.type===v);
      const html = filtered.length? filtered.map(makeRow).join('') : `<div class=\"comment-empty\">${t('noItems')}</div>`;
      const target = document.getElementById(listId);
      if (target) target.innerHTML = html;
    });
  }

  function renderPatientNotifCenter(p){
    return renderPatientNotifInto('patientNotificationsCenter', p);
  }

  async function initPatientDashboard() {
    const nameHdr = document.getElementById('patientNameHeader');
    if (!nameHdr) return; // not on patient dashboard
    let current = null;
    try { current = JSON.parse(localStorage.getItem('loggedInPatient')||'null'); } catch(_) {}
    if (!current || !current.id) return;
    try {
      const res = await fetch('data.json');
      const data = await res.json();
      const p = data.patients.find(x => x.id === current.id) || current;
      // Force English on patient dashboard as requested
      try { setLanguage('en'); } catch(_){ }
      // Customize header to "<Patient Name> - AI Health Overview"
      if (nameHdr) nameHdr.textContent = `${p.name || ''} - ${t('dashboardTitle')}`;
      // Alerts
      const alertsWrap = document.querySelector('#alerts .alert-cards');
      if (alertsWrap) {
        const alerts = Array.isArray(p.alerts)? p.alerts: [];
        alertsWrap.innerHTML = alerts.length ? alerts.map(a=>{
          const sev = (a.severity||'').toLowerCase();
          const cls = sev==='high'?'high': sev==='medium'?'med': '';
          return `<div class="alert-card ${cls}"><strong>${(sev||'info').toUpperCase()}:</strong> ${a.text}<div class=\"alert-meta\">Personalized based on your profile</div></div>`;
        }).join('') : '<div class="alert-card"><strong>No alerts:</strong> You have no urgent alerts right now.</div>';
      }
      // Appointments
      const apptUl = document.querySelector('#appointments .appointment-list');
      if (apptUl) {
        const fromJson = Array.isArray(p.appointments)? p.appointments.slice(): [];
        let fromLocal = [];
        try { fromLocal = JSON.parse(localStorage.getItem(`patientAppointments:${p.id}`)||'[]'); } catch(_){ }
        const merged = [...fromJson, ...fromLocal].filter(x=>x && x.date).sort((a,b)=> new Date(a.date + ' ' + (a.time||'00:00')) - new Date(b.date + ' ' + (b.time||'00:00')));
        // Deduplicate by date|time|doctor|department|location
        const seen = new Set();
        const unique = merged.filter(ap => {
          const key = [ap.date||'', ap.time||'', ap.doctor||'', ap.department||'', ap.location||''].join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        apptUl.innerHTML = unique.length ? unique.map(ap=>{
          const dt = new Date(ap.date + 'T' + (ap.time||'00:00'));
          const dept = ap.department || t('appointmentLabel');
          const docn = ap.doctor || t('doctor');
          return `<li class="appt-item" data-appt='${JSON.stringify(ap).replace(/'/g,"&apos;")}'><div><strong>${dept}</strong> ${t('with')} ${docn}</div><div class="appt-meta">${dt.toLocaleDateString()} ${ap.time||''} • ${ap.location||''}</div></li>`;
        }).join('') : `<li class="appt-item"><div>${t('noUpcomingAppointments')}</div></li>`;

        // Attach click handler to show details modal
        apptUl.addEventListener('click', (e)=>{
          const li = e.target.closest('li.appt-item');
          if (!li) return;
          const raw = li.getAttribute('data-appt');
          if (!raw) return;
          let ap = {};
          try { ap = JSON.parse(raw.replace(/&apos;/g, "'")); } catch(_){ }
          const dt = ap.date ? new Date(ap.date + (ap.time? 'T'+ap.time: '')): null;
          let modal = document.getElementById('patientApptModal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'patientApptModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `<div class="modal"><div class="modal-header"><h3>${t('appointmentDetails')}</h3><button class="modal-close" aria-label="Close">×</button></div><div class="modal-body" id="patientApptBody"></div><div class="modal-footer"><button class="btn-tertiary modal-close">${t('back')}</button></div></div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', (ev)=>{ if (ev.target.classList.contains('modal-close') || ev.target===modal) modal.style.display='none'; });
          }
          const body = document.getElementById('patientApptBody');
          if (body) {
            body.innerHTML = `
              <ul class="kv-list">
                <li><strong>${t('date')}:</strong> ${ap.date||'-'}</li>
                <li><strong>${t('time')}:</strong> ${ap.time||'-'}</li>
                <li><strong>${t('doctor')}:</strong> ${ap.doctor||'-'}</li>
                <li><strong>${t('department')}:</strong> ${ap.department||'-'}</li>
                <li><strong>${t('location')}:</strong> ${ap.location||'-'}</li>
                <li><strong>${t('notes')||'Notes'}:</strong> ${ap.notes||'-'}</li>
              </ul>
            `;
          }
          modal.style.display='flex';
        });
      }
      // Populate Notifications panes
      try { renderPatientNotifCenter(p); } catch(_) {}
      try { renderPatientNotificationsCenter && renderPatientNotificationsCenter(); } catch(_) {}
      // Populate Patient Alerts and Recommendations
      try {
        fetch('data.json').then(r=>r.json()).then(data=>{
          try { renderPatientAlerts(p, data); } catch(_) {}
          try { renderPatientRecommendations(p, data); } catch(_) {}
        }).catch(()=>{
          try { renderPatientAlerts(p, null); } catch(_) {}
          try { renderPatientRecommendations(p, null); } catch(_) {}
        });
      } catch(_){}
      window.currentPatient = p;
    } catch (e) { console.warn('initPatientDashboard failed', e); }
  }

  // ===== Doctor Dashboard upcoming =====
  async function initDoctorUpcoming() {
    const list = document.getElementById('doctorUpcomingList');
    if (!list) return; // not on doctor upcoming pane
    let doc = null;
    try { doc = JSON.parse(localStorage.getItem('loggedInDoctor')||'null'); } catch(_) {}
    if (!doc) return;
    try {
      const res = await fetch('data.json');
      const data = await res.json();
      const assigned = new Set((doc.patientsUnderCare||[]).map(String));
      const pats = data.patients.filter(p => assigned.has(String(p.id)));
      const rows = [];
      for (const p of pats) {
        const base = Array.isArray(p.appointments)? p.appointments: [];
        let extra = [];
        try { extra = JSON.parse(localStorage.getItem(`patientAppointments:${p.id}`)||'[]'); } catch(_){ }
        for (const ap of [...base, ...extra]) {
          if (!ap || !ap.date) continue;
          const when = new Date(ap.date + 'T' + (ap.time||'00:00'));
          rows.push({ when, ap, p });
        }
      }
      rows.sort((a,b)=> a.when - b.when);
      list.innerHTML = rows.slice(0, 50).map(r => `<li class=\"appt-item\"><div><strong>${r.ap.department||'Appointment'}</strong> — ${r.p.name} (ID ${r.p.id})</div><div class=\"appt-meta\">${r.when.toLocaleDateString()} ${r.ap.time||''} • ${r.ap.location||''}</div></li>`).join('');
      const badge = document.getElementById('tabUpcomingCount');
      if (badge) badge.textContent = String(rows.length);
    } catch (e) { console.warn('initDoctorUpcoming failed', e); }
  }

  // Run initializers
  initPatientDashboard();
  initDoctorUpcoming();

  // ========== PATIENT LOGIN ==========
  const patientForm = document.getElementById("patientForm");
  if (patientForm) {
    const pid = document.getElementById("patientId");
    const pemail = document.getElementById("patientEmail");
    const ppass = document.getElementById("patientPassword");
    const phone = document.getElementById("patientPhone");
    const birth = document.getElementById("birthYear");
    const pconsent = document.getElementById("patientConsent");
    const pmsg = document.getElementById("patientFormMessage");

    pid.addEventListener("input", () =>
      setError("err-patientId", isNonEmpty(pid.value) ? "" : t("patientIdRequired"))
    );
    pemail.addEventListener("input", () =>
      setError("err-patientEmail", isEmail(pemail.value) ? "" : t("validEmailRequired"))
    );
    ppass.addEventListener("input", () =>
      setError("err-patientPassword", isNonEmpty(ppass.value) ? "" : t("passwordRequired"))
    );
    phone.addEventListener("input", () =>
      setError("err-patientPhone", isPhone(phone.value) ? "" : t("enterValidPhone"))
    );
    birth.addEventListener("input", () =>
      setError("err-birthYear", isBirthYear(birth.value) ? "" : t("enterValidBirthYear"))
    );
    pconsent.addEventListener("change", () =>
      setError("err-patientConsent", pconsent.checked ? "" : t("consentRequired"))
    );

    patientForm.addEventListener("submit", async e => {
      e.preventDefault();
      clearFormMessage(pmsg);
      let valid = true;

      if (!isNonEmpty(pid.value)) {
        setError("err-patientId", t("patientIdRequired"));
        valid = false;
      }
      if (!isEmail(pemail.value)) {
        setError("err-patientEmail", t("validEmailRequired"));
        valid = false;
      }
      if (!isNonEmpty(ppass.value)) {
        setError("err-patientPassword", t("passwordRequired"));
        valid = false;
      }
      if (!isPhone(phone.value)) {
        setError("err-patientPhone", t("enterValidPhone"));
        valid = false;
      }
      if (!isBirthYear(birth.value)) {
        setError("err-birthYear", t("enterValidBirthYear"));
        valid = false;
      }
      if (!pconsent.checked) {
        setError("err-patientConsent", t("consentRequired"));
        valid = false;
      }

      if (!valid) {
        showFormMessage(pmsg, t("errFixBefore"), true);
        return;
      }

      // ✅ Check patient data from JSON
      try {
        const res = await fetch("data.json");
        const data = await res.json();

        const normalizePhone = s => s.replace(/\s+/g, "");
        const patient = data.patients.find(p => {
          const enteredId = pid.value.trim();
          const normalizedId = enteredId.replace(/\D/g, "").replace(/^0+/, "");
          const idOk = p.id.toString() === (normalizedId || enteredId);
          const emailOk = (p.email || "").trim().toLowerCase() === pemail.value.trim().toLowerCase();
          const passOk = (p.password || "") === ppass.value.trim();
          const phoneOk = normalizePhone(p.phone || "") === normalizePhone(phone.value);
          const birthOk = p.birthYear && p.birthYear.toString() === birth.value.trim();
          return idOk && emailOk && passOk && phoneOk && birthOk;
        });

        if (!patient) {
          showFormMessage(pmsg, t("errInvalidPatient"), true);
          return;
        }

        // Persist patient for dashboard
        try {
          localStorage.setItem("loggedInPatient", JSON.stringify(patient));
        } catch (e) {
          console.warn("Unable to persist loggedInPatient", e);
        }

        showFormMessage(pmsg, t("loginSuccessRedirecting"), false);
        setTimeout(() => (window.location.href = "patient-dashboard.html"), 1000);
      } catch (err) {
        console.error(err);
        showFormMessage(pmsg, t("errLoadPatient"), true);
      }
    });
  }

  // ========== DOCTOR DASHBOARD: Patient search by ID ==========
  const searchInput = document.getElementById("patientSearchId");
  const infoEl = document.getElementById("patientInfo");
  const resultsEl = infoEl || document.getElementById("patientResults");
  const searchBtn = document.getElementById("searchBtn");
  if (searchInput && resultsEl) {
    searchInput.setAttribute("placeholder", "Search Patient by ID");

    // Determine assigned patients from logged-in doctor
    let assignedIds = [];
    let loggedInDoctor = null;
    try {
      const docRaw = localStorage.getItem("loggedInDoctor");
      if (docRaw) {
        const doc = JSON.parse(docRaw);
        loggedInDoctor = doc || null;
        if (Array.isArray(doc?.patientsUnderCare)) {
          assignedIds = doc.patientsUnderCare.map(x => x.toString());
        } else if (doc?.id === 1) {
          assignedIds = ["1","2","3","4","5"]; // fallback
        } else if (doc?.id === 2) {
          assignedIds = ["6","7","8","9","10"]; // fallback
        }
      }
    } catch (e) {
      console.warn("Unable to read loggedInDoctor", e);
    }

    // Update the AI Health Report summary table in the Reports pane for a given patient
    function updateDoctorReportForPatient(p, data){
      const host = document.getElementById('doctorReportsSummary');
      if (!host) return;
      if (!p) { host.innerHTML = ''; return; }
      const meds = (p.activeMedications || []);
      const abnormal = Array.isArray(p.abnormalParameters) ? p.abnormalParameters : [];
      const chronic = (p.chronic || []);
      const riskScore = (p.age > 60 ? 2 : 0) + chronic.length + (meds.length > 2 ? 1 : 0);
      const riskLabel = riskScore >= 3 ? 'HIGH' : riskScore === 2 ? 'MEDIUM' : 'LOW';
      const suggested = (meds && meds.length>0) ? null : 'ACE inhibitor';
      const medText = suggested ? `${t('suggestedMedication')}: ${suggested}` : t('noNewMedication');
      const compNote = t('compositeRiskNote') || '';
      host.innerHTML = `
        <div class="report-card" style="width:100%;">
          <table class="report-table" style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">${t('patientOverview')}</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">${t('riskLevel')}</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">${t('abnormalParams')}</th>
                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">${t('suggestedMedication')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px;">${t('name')}: ${p.name} • ${t('id')}: ${p.id} • ${t('age')}: ${p.age}</td>
                <td style="padding:8px;">${riskLabel}</td>
                <td style="padding:8px;">${abnormal.length}</td>
                <td style="padding:8px;">${medText}</td>
              </tr>
            </tbody>
          </table>
          ${compNote ? `<p class="muted" style="margin-top:8px;">${compNote}</p>` : ''}
        </div>
      `;
    }

    const renderPatient = (p, data, doc) => {
      const meds = (p.activeMedications || []).map(m => (m || "").toLowerCase());
      const chronic = (p.chronic || []).map(c => (c || "").toLowerCase());
      const allergies = (p.allergies || []).map(a => (a || "").toLowerCase());

        const panelLabel = doc?.id === 2 ? "5–10" : "0–5";

      let suggestedMedication = null;
      let suggestionReason = "General preventive guidance.";

      if (chronic.includes("hypertension") && !meds.some(m => ["lisinopril","enalapril","losartan"].includes(m))) {
        suggestedMedication = "lisinopril";
        if (allergies.includes("lisinopril")) suggestedMedication = null;
        suggestionReason = "Hypertension present; ACE inhibitor may improve BP control.";
      } else if (chronic.includes("diabetes") && !meds.includes("metformin")) {
        suggestedMedication = "metformin";
        if (allergies.includes("metformin")) suggestedMedication = null;
        suggestionReason = "Diabetes present; first-line therapy if no contraindications.";
      } else if (chronic.includes("heart disease") && meds.includes("ibuprofen")) {
        suggestedMedication = "discontinue ibuprofen";
        suggestionReason = "Heart disease with NSAID may increase cardiovascular/GI risk; consider alternatives.";
      } else if ((chronic.includes("high cholesterol") || chronic.includes("hyperlipidemia")) && !meds.some(m => ["atorvastatin","simvastatin","rosuvastatin"].includes(m))) {
        suggestedMedication = "atorvastatin";
        if (allergies.includes("atorvastatin")) suggestedMedication = null;
        suggestionReason = "Elevated cholesterol; statin therapy typically indicated.";
      }

      const riskScore = (p.age > 60 ? 2 : 0) + chronic.length + (meds.length > 2 ? 1 : 0);
      const riskLabel = riskScore >= 3 ? "HIGH" : riskScore === 2 ? "MEDIUM" : "LOW";

      const interactions = [];
      const rules = Array.isArray(data?.drugInteractions) ? data.drugInteractions : [];
      for (const r of rules) {
        const a = (r.a || "").toLowerCase();
        const b = (r.b || "").toLowerCase();
        if (meds.includes(a) && meds.includes(b)) {
          interactions.push({
            risk: (r.risk || "").toLowerCase(),
            text: `${r.a} with ${r.b}: ${r.reason}`
          });
        }
      }
      const interactionRows = interactions.map(ix => {
        const lvl = ix.risk === "high" ? "high" : ix.risk === "medium" ? "medium" : "low";
        return `<tr><td><span class="risk ${lvl}">${ix.risk.toUpperCase()}</span></td><td>${ix.text}</td></tr>`;
      }).join("");

      const recommendationBlock = suggestedMedication ? `
        <div class="recommendation">
          <h4>${t('suggestedMedication')}</h4>
          <p><strong>${suggestedMedication}</strong> — ${suggestionReason}</p>
        </div>
      ` : `
        <div class="recommendation">
          <h4>${t('suggestedMedication')}</h4>
          <p>${t('noNewMedication')}</p>
        </div>
      `;

      return `
        <section class="patient-card">
          <div class="patient-info">
            <h2>${p.name} <span class="patient-id">(${t('id')}: ${p.id})</span></h2>
            <p>${t('age')}: ${p.age} | ${t('phone')}: ${p.phone} | ${t('birthYear')}: ${p.birthYear}</p>
            <p>${t('allergies')}: ${(p.allergies||[]).join(", ") || "-"}</p>
            <p>${t('medications')}: ${(p.activeMedications||[]).join(", ") || "-"}</p>
            <p>${t('conditions')}: ${(p.chronic||[]).join(", ") || "-"}</p>
            <div class="patient-actions-inline" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-primary view-reports" data-pid="${p.id}">${t('viewReports')}</button>
              <button class="btn-secondary view-recs" data-pid="${p.id}">${t('recommendations')}</button>
              <button class="btn-tertiary view-actions" data-pid="${p.id}">${t('actions')}</button>
            </div>
          </div>
          <div class="ai-report">
            <h3>${t('aiHealthReport')}</h3>
            <table class="doc-ai-table">
              <thead>
                <tr>
                  <th>${t('type')}</th>
                  <th>${t('detail')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="risk ${riskLabel.toLowerCase()}">${riskLabel}</span></td>
                  <td>${t('compositeRiskNote')}</td>
                </tr>
                ${interactionRows}
              </tbody>
            </table>
            ${recommendationBlock}
            <div class="panel-note doc-ai-meta"><em>${t('panel')}: ${panelLabel}</em></div>
          </div>
        </section>
      `;
    };

    async function searchAndRender() {
      const q = searchInput.value.trim();
      if (!q) { resultsEl.innerHTML = ""; return; }
      try {
        const res = await fetch("data.json");
        const data = await res.json();
        const match = data.patients.find(p => p.id.toString() === q);

        if (!match) {
          resultsEl.innerHTML = `<div class="alert medium-alert">${t('patientNotFound')}: ${q}</div>`;
          return;
        }

        if (assignedIds.length && !assignedIds.includes(q)) {
          resultsEl.innerHTML = `<div class="alert high-alert">${t('unauthorizedPatient')}</div>`;
          return;
        }

        resultsEl.innerHTML = renderPatient(match, data, loggedInDoctor);
        // update AI Health Report table in Reports pane
        try { updateDoctorReportForPatient(match, data); } catch(_) {}
        attachPatientDetailActions(match, data);
      } catch (e) {
        console.error(e);
        resultsEl.innerHTML = `<div class="alert high-alert">${t('errorLoadingPatient')}</div>`;
      }
    }

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchAndRender();
      }
    });
    if (searchBtn) {
      searchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        searchAndRender();
      });
    }
    // Clear report when input is cleared
    searchInput.addEventListener('input', ()=>{ if (!searchInput.value.trim()) { try { updateDoctorReportForPatient(null, null);} catch(_){} } });
  }

  function attachPatientDetailActions(patient, data) {
    const repBtn = document.querySelector('.patient-actions-inline .view-reports');
    const recBtn = document.querySelector('.patient-actions-inline .view-recs');
    const actBtn = document.querySelector('.patient-actions-inline .view-actions');
    if (repBtn) repBtn.addEventListener('click', () => openReportsPaneForPatient(patient, data));
    if (recBtn) recBtn.addEventListener('click', () => openRecsPaneForPatient(patient, data));
    if (actBtn) actBtn.addEventListener('click', () => openActionsPaneForPatient(patient));
  }

  // Generic tab switching for swipe buttons
  (function initSwipeTabs(){
    const bar = document.querySelector('.swipe-button');
    const panes = document.querySelectorAll('.dashboard-panes .dashboard-pane');
    if (!bar || !panes.length) return;
    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[role="tab"]');
      if (!btn) return;
      const targetSel = btn.getAttribute('data-target');
      if (!targetSel) return;
      bar.querySelectorAll('button[role="tab"]').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      panes.forEach(p=> p.classList.remove('is-active'));
      const target = document.querySelector(targetSel);
      if (target) target.classList.add('is-active');
    });
  })();

  function switchToPane(selector) {
    const panes = document.querySelectorAll('.dashboard-panes .dashboard-pane');
    panes.forEach(p => p.classList.remove('is-active'));
    const target = document.querySelector(selector);
    if (target) {
      target.classList.add('is-active');
      try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(_) {}
    }
    // also clear active state on swipe tabs (since we moved actions inside patient card)
    document.querySelectorAll('.swipe-button button').forEach(b => b.classList.remove('active'));
  }

  function openReportsPaneForPatient(p, data) {
    const pane = document.querySelector('#doc-reports .patient-card');
    if (!pane) { switchToPane('#doc-reports'); return; }
    
    // Check if ML integration is available and patient has blood data
    if (typeof handleDoctorGenerateReport === 'function' && p.bloodAnalysis) {
      // Use ML-powered report generation
      switchToPane('#doc-reports');
      window.currentPatient = p;
      handleDoctorGenerateReport(p);
    } else {
      // Fallback to basic report
      const bmiVal = (p.heightCm && p.weightKg) ? (p.weightKg / Math.pow(p.heightCm/100,2)) : null;
      const interactions = [];
      const meds = (p.activeMedications||[]).map(m => (m||'').toLowerCase());
      const rules = Array.isArray(data?.drugInteractions) ? data.drugInteractions : [];
      for (const r of rules) {
        const a = (r.a||'').toLowerCase();
        const b = (r.b||'').toLowerCase();
        if (meds.includes(a) && meds.includes(b)) interactions.push(`${r.a} with ${r.b}: ${r.reason}`);
      }
      pane.innerHTML = `
        <div class="pane-nav" style="margin-bottom:10px;"><button class="btn-tertiary" type="button" id="backFromReports">← Back</button></div>
        <div class="ai-report">
          <h3>${p.name}'s Report</h3>
          <ul>
            <li><strong>Age:</strong> ${p.age} • <strong>BMI:</strong> ${bmiVal? bmiVal.toFixed(1): '-'}</li>
            <li><strong>Conditions:</strong> ${(p.chronic||[]).join(', ') || '-'}</li>
            <li><strong>Medications:</strong> ${(p.activeMedications||[]).join(', ') || '-'}</li>
            ${interactions.map(txt => `<li><span class="risk high">HIGH</span> ${txt}</li>`).join('')}
          </ul>
          ${p.bloodAnalysis ? '<button class="btn-primary" onclick="handleDoctorGenerateReport(window.currentPatient)" style="margin-top: 15px;">Generate ML Report</button>' : '<p style="color: #999; margin-top: 15px;">No blood analysis data available for ML prediction.</p>'}
        </div>
      `;
      switchToPane('#doc-reports');
      const backBtn = document.getElementById('backFromReports');
      if (backBtn) backBtn.addEventListener('click', ()=> switchToPane('#doc-search'));
    }
  }

  function openRecsPaneForPatient(p, data) {
    const pane = document.querySelector('#doc-recs .recommendation-section');
    if (!pane) { switchToPane('#doc-recs'); return; }
    // Enhanced recommendations with suggested medications and rationales, considering allergies and past surgeries
    const out = [];
    const chronic = (p.chronic||[]).map(x => (x||'').toLowerCase());
    const medsOn = (p.activeMedications||[]).map(x => (x||'').toLowerCase());
    const surgeries = (p.pastSurgeries||[]).map(x => (x||'').toLowerCase());
    // Combine drug allergies: prefer data.json drugAllergies, fallback to allergies, plus runtime overrides
    let drugAllergies = Array.isArray(p.drugAllergies) ? p.drugAllergies.slice() : (p.allergies||[]);
    try {
      const over = JSON.parse(localStorage.getItem(`patientAllergies:${p.id}`)||'[]');
      if (Array.isArray(over)) {
        drugAllergies = Array.from(new Set([
          ...drugAllergies.map(x=>String(x).toLowerCase()),
          ...over.map(x=>String(x).toLowerCase())
        ]));
      }
    } catch(_){}

    const medMap = {
      diabetes: [
        { drug: 'metformin', title: 'Metformin', why: 'First-line for T2DM; improves insulin sensitivity and reduces hepatic glucose output.' },
        { drug: 'glp-1 agonist', title: 'GLP-1 agonist', why: 'Aids glycemic control and weight loss when indicated.' }
      ],
      hypertension: [
        { drug: 'ace inhibitor', title: 'ACE inhibitor', why: 'Lowers BP; renal and cardiac protection in appropriate patients.' },
        { drug: 'thiazide', title: 'Thiazide diuretic', why: 'Effective first-line unless contraindicated (e.g., gout).' }
      ],
      hyperlipidemia: [
        { drug: 'statin', title: 'Statin', why: 'Reduces LDL and overall CV risk.' }
      ],
      cad: [
        { drug: 'beta blocker', title: 'Beta blocker', why: 'Reduces myocardial oxygen demand; improves post-MI outcomes.' }
      ]
    };

    chronic.forEach(cond => {
      const sgs = medMap[cond];
      if (!sgs) return;
      sgs.forEach(s => {
        const isAllergic = drugAllergies.includes(s.drug.toLowerCase());
        const already = medsOn.includes(s.drug.toLowerCase());
        const badge = isAllergic ? 'badge-high' : already ? 'badge-low' : 'badge-med';
        const note = isAllergic ? 'Avoid due to documented drug allergy' : already ? 'Already prescribed' : 'Recommended';
        out.push(`<li><span class="badge ${badge}">Medication</span> ${s.title} — ${note}. ${s.why}</li>`);
      });
    });

    // Surgery-aware cautions
    if (surgeries.some(s => s.includes('bypass') || s.includes('stent') || s.includes('valve'))) {
      out.push(`<li><span class="badge badge-med">Surgery</span> Consider antiplatelet/anticoagulation review and perioperative risk if planning procedures.</li>`);
    }

    if ((p.heightCm && p.weightKg)) {
      const bmi = p.weightKg / Math.pow(p.heightCm/100,2);
      if (bmi >= 30) out.push(`<li><span class="badge badge-med">Lifestyle</span> Weight management plan, nutrition counseling, and activity goals.</li>`);
    }
    if (!out.length) out.push(`<li><span class="badge badge-low">General</span> Maintain current plan, schedule periodic follow-up.</li>`);
    // Also include additional per-patient cards
    try {
      const extra = buildRecommendationsForPatient(p, data) || [];
      extra.forEach(e=>{
        out.push(`<div class="doc-rec-card"><div class="doc-rec-cat">${e.category}</div><div class="doc-rec-title">${e.title}</div><div class="doc-rec-body">${e.body}</div></div>`);
      });
    } catch(_){}

    const listCards = out.length ? out.map(item => item.startsWith('<div class="doc-rec-card"') ? item : `<div class="doc-rec-card">${item}</div>`).join('') : '<div class="doc-rec-empty">No personalized recommendations.</div>';

    pane.querySelector('ul.kv-list')?.remove();
    pane.innerHTML = `
      <div class="pane-nav" style="margin-bottom:10px;"><button class="btn-tertiary" type="button" id="backFromRecs">← Back</button></div>
      <h3 data-i18n="recommendations" style="font-size: 1.6rem;">AI Recommendations</h3>
      <div class="doc-rec-grid">${listCards}</div>
    `;
    switchToPane('#doc-recs');
    const backBtn = document.getElementById('backFromRecs');
    if (backBtn) backBtn.addEventListener('click', ()=> switchToPane('#doc-search'));
  }

  function openActionsPaneForPatient(p) {
    const pane = document.querySelector('#doc-actions .doctor-actions');
    if (!pane) { switchToPane('#doc-actions'); return; }
    pane.innerHTML = `
      <div class="pane-nav" style="margin-bottom:10px;"><button class="btn-tertiary" type="button" id="backFromActions">← ${t('backToSearch')}</button></div>
      <div class="report-card infoPatient">
        <h3 class="section-subtitle">${t('patientOverview')}</h3>
        <p><strong>${t('name')}:</strong> ${p.name}</p>
        <p><strong>${t('age')}:</strong> ${p.age}</p>
        <p><strong>${t('conditions')}:</strong> ${(p.chronic||[]).join(', ') || '-'}</p>
      </div>
      <div class="patient-actions-inline">
        <button class="btn-primary" id="btnSendMsg">${t('sendMessageTo')}</button>
        <button class="btn-secondary" id="btnOrderLab">${t('orderLab')}</button>
        <button class="btn-tertiary" id="btnSchedule">${t('scheduleFollowup')}</button>
        <button class="btn-secondary" id="btnAddAllergy">${t('addDrugAllergy')}</button>
      </div>
      
    `;
    switchToPane('#doc-actions');
    const backBtn = document.getElementById('backFromActions');
    if (backBtn) backBtn.addEventListener('click', ()=> switchToPane('#doc-search'));

    // Helper modal
    function ensureDocModal() {
      let el = document.getElementById('docActionModalBackdrop');
      if (!el) {
        el = document.createElement('div');
        el.id = 'docActionModalBackdrop';
        el.className = 'modal-backdrop';
        el.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true" aria-label="Action">
            <div class="modal-header">
              <div class="modal-title" id="docModalTitle">Action</div>
              <button class="btn-close" type="button">Close</button>
            </div>
            <div class="modal-body" id="docModalBody"></div>
            <div class="modal-actions" id="docModalActions">
              <button class="btn-close" type="button">Close</button>
            </div>
          </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', (e)=>{ if (e.target === el) el.style.display='none'; });
        el.querySelectorAll('.btn-close').forEach(b=> b.addEventListener('click', ()=> el.style.display='none'));
      }
      return el;
    }

    // removed inline doctor notifications (use doctorNotificationsCenter)

    // Send Message
    const btnMsg = document.getElementById('btnSendMsg');
    if (btnMsg) btnMsg.addEventListener('click', ()=>{
      const modal = ensureDocModal();
      modal.querySelector('#docModalTitle').textContent = `Send Message to ${p.name}`;
      const renderThread = ()=>{
        let thread = [];
        try {
          const msgs = JSON.parse(localStorage.getItem(`messages:${p.id}`)||'[]');
          const doc = JSON.parse(localStorage.getItem('loggedInDoctor')||'{}');
          thread = msgs.map(m=>{
            const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : p.name;
            const cls = m.fromDoctorName ? 'doctor' : 'patient';
            const at = new Date(m.createdAt||Date.now()).toLocaleString();
            return `
              <div class="comment-item msg">
                <div class="comment-meta"><span class="comment-badge msg">${t('messageLabel')}</span> <span>${at}</span></div>
                <div class="comment-line">
                  <span class="comment-avatar ${cls}">${(author.split(' ').map(x=>x[0]).join('')||'•').toUpperCase()}</span>
                  <div class="comment-text"><strong>${author}:</strong> ${m.text||''}</div>
                </div>
              </div>`;
          });
        } catch(_){ thread = []; }
        return thread.join('') || `<div class="comment-empty">${t('noNotificationsYet')}</div>`;
      };
      modal.querySelector('#docModalBody').innerHTML = `
        <div class="comment-box" style="max-height:300px; overflow:auto; margin-bottom:10px;" id="docMsgThread">${renderThread()}</div>
        <label>${t('messageLabel')}<textarea id="docMsgText" rows="4" style="width:100%;" placeholder="${t('composePlaceholder')}"></textarea></label>`;
      const actions = modal.querySelector('#docModalActions');
      actions.innerHTML = `<button class="btn-primary" id="docSendMsgConfirm" type="button">Send</button><button class="btn-close" type="button">Close</button>`;
      actions.querySelector('#docSendMsgConfirm').addEventListener('click', ()=>{
        const text = (document.getElementById('docMsgText')||{}).value || '';
        try {
          const k = `messages:${p.id}`;
          const raw = localStorage.getItem(k);
          const list = raw? JSON.parse(raw):[];
          const doc = JSON.parse(localStorage.getItem('loggedInDoctor')||'{}');
          list.push({ toPatientId:p.id, fromDoctorId: doc.id, fromDoctorName: doc.name, text, createdAt:new Date().toISOString() });
          localStorage.setItem(k, JSON.stringify(list));
        } catch(_){ }
        // refresh thread inline
        try { const box = modal.querySelector('#docMsgThread'); if (box) box.innerHTML = (function(){
          let out='';
          try { const msgs = JSON.parse(localStorage.getItem(`messages:${p.id}`)||'[]'); const doc = JSON.parse(localStorage.getItem('loggedInDoctor')||'{}'); out = msgs.map(m=>{
            const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : p.name;
            const cls = m.fromDoctorName ? 'doctor' : 'patient';
            const at = new Date(m.createdAt||Date.now()).toLocaleString();
            return `<div class=\"comment-item msg\"><div class=\"comment-meta\"><span class=\"comment-badge msg\">${t('messageLabel')}</span> <span>${at}</span></div><div class=\"comment-line\"><span class=\"comment-avatar ${cls}\">${(author.split(' ').map(x=>x[0]).join('')||'•').toUpperCase()}</span><div class=\"comment-text\"><strong>${author}:</strong> ${m.text||''}</div></div></div>`;
          }).join(''); } catch(_){ out=''; }
          return out || `<div class=\"comment-empty\">${t('noNotificationsYet')}</div>`;
        })(); } catch(_){ }
        modal.style.display='none';
        // Cross-refresh top-level centers
        try { renderPatientNotifCenter(p); } catch(_){ }
        try { renderDoctorNotificationsCenter(); } catch(_){ }
        try { renderPatientNotificationsCenter && renderPatientNotificationsCenter(); } catch(_){ }
      });
      modal.style.display='flex';
    });

    // Order Lab
    const btnLab = document.getElementById('btnOrderLab');
    if (btnLab) btnLab.addEventListener('click', ()=>{
      const modal = ensureDocModal();
      modal.querySelector('#docModalTitle').textContent = `Order Lab for ${p.name}`;
      modal.querySelector('#docModalBody').innerHTML = `
        <div style="display:grid; gap:8px;">
          <label><input type="checkbox" class="labChk" value="CBC"> CBC</label>
          <label><input type="checkbox" class="labChk" value="CMP"> CMP</label>
          <label><input type="checkbox" class="labChk" value="HbA1c"> HbA1c</label>
          <label><input type="checkbox" class="labChk" value="Lipid"> Lipid Panel</label>
          <label><input type="checkbox" class="labChk" value="CRP"> CRP</label>
        </div>`;
      const actions = modal.querySelector('#docModalActions');
      actions.innerHTML = `<button class="btn-primary" id="docOrderLabConfirm" type="button">Place Order</button><button class="btn-close" type="button">Close</button>`;
      actions.querySelector('#docOrderLabConfirm').addEventListener('click', ()=>{
        const selected = Array.from(modal.querySelectorAll('.labChk:checked')).map(el=> el.value);
        try { const k = `labOrders:${p.id}`; const raw = localStorage.getItem(k); const list = raw? JSON.parse(raw):[]; list.push({ tests:selected, orderedAt:new Date().toISOString() }); localStorage.setItem(k, JSON.stringify(list)); } catch(_){ }
        modal.style.display='none';
        renderDoctorNotificationsCenter();
        try { window.renderPatientNotifications && window.renderPatientNotifications(p); } catch(_){ }
        try { renderPatientNotifCenter(p); } catch(_){ }
        try { renderDoctorNotificationsCenter(); } catch(_){ }
      });
      modal.style.display='flex';
    });

    // Schedule Follow-up
    const btnSched = document.getElementById('btnSchedule');
    if (btnSched) btnSched.addEventListener('click', ()=>{
      const modal = ensureDocModal();
      modal.querySelector('#docModalTitle').textContent = `Schedule Follow-up for ${p.name}`;
      modal.querySelector('#docModalBody').innerHTML = `
        <div style="display:grid; gap:8px;">
          <label>Date <input type="date" id="docApptDate"></label>
          <label>Time <input type="time" id="docApptTime" step="1800"></label>
          <label>Department <input type="text" id="docApptDept" placeholder="e.g., Cardiology"></label>
          <label>Location <input type="text" id="docApptLoc" placeholder="e.g., Room 207"></label>
        </div>`;
      const actions = modal.querySelector('#docModalActions');
      actions.innerHTML = `<button class="btn-primary" id="docApptConfirm" type="button">Schedule</button><button class="btn-close" type="button">Close</button>`;
      actions.querySelector('#docApptConfirm').addEventListener('click', ()=>{
        const date = (document.getElementById('docApptDate')||{}).value;
        const time = (document.getElementById('docApptTime')||{}).value;
        const department = (document.getElementById('docApptDept')||{}).value || 'Follow-up';
        const location = (document.getElementById('docApptLoc')||{}).value || 'Clinic';
        if (!date || !time) { return; }
        const doctor = (JSON.parse(localStorage.getItem('loggedInDoctor')||'{}').name) || 'Doctor';
        const appt = { date, time, doctor, department, location };
        try { const k = `patientAppointments:${p.id}`; const raw = localStorage.getItem(k); const list = raw? JSON.parse(raw):[]; list.push(appt); localStorage.setItem(k, JSON.stringify(list)); } catch(_){ }
        modal.style.display='none';
        renderDoctorNotificationsCenter();
        try { window.renderPatientNotifications && window.renderPatientNotifications(p); } catch(_){ }
        try { renderPatientNotifCenter(p); } catch(_){ }
        try { renderDoctorNotificationsCenter(); } catch(_){ }
      });
      try { const d=new Date(); const pad=n=>String(n).padStart(2,'0'); const ymd=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; (document.getElementById('docApptDate')||{}).value=ymd; (document.getElementById('docApptTime')||{}).value=`${pad(Math.max(9,d.getHours()))}:00`; } catch(_){}
      modal.style.display='flex';
    });

    // Add Drug Allergy
    const btnAddAllergy = document.getElementById('btnAddAllergy');
    if (btnAddAllergy) btnAddAllergy.addEventListener('click', ()=>{
      const modal = ensureDocModal();
      modal.querySelector('#docModalTitle').textContent = `Add Drug Allergy for ${p.name}`;
      modal.querySelector('#docModalBody').innerHTML = `<label>Drug name<input id="newAllergyDrug" type="text" placeholder="e.g., penicillin"></label>`;
      const actions = modal.querySelector('#docModalActions');
      actions.innerHTML = `<button class="btn-primary" id="docAddAllergyConfirm" type="button">Add</button><button class="btn-close" type="button">Close</button>`;
      actions.querySelector('#docAddAllergyConfirm').addEventListener('click', ()=>{
        const drug = (document.getElementById('newAllergyDrug')||{}).value?.trim();
        if (!drug) return;
        try { const k = `patientAllergies:${p.id}`; const raw = localStorage.getItem(k); const list = raw? JSON.parse(raw):[]; if (!list.map(x=>x.toLowerCase()).includes(drug.toLowerCase())) { list.push(drug); } localStorage.setItem(k, JSON.stringify(list)); } catch(_){ }
        modal.style.display='none';
        renderDoctorNotifications();
        renderPatientNotifications(p);
        try { renderPatientNotifCenter(p); } catch(_){ }
        try { renderDoctorNotificationsCenter(); } catch(_){ }
      });
      modal.style.display='flex';
    });

    // Removed inline notifications; rely on swipe tab doctorNotificationsCenter
  }

  // ===== Doctor Dashboard: Alerts per patient and Upcoming appointments =====
  (function renderDoctorAlertsAndUpcoming() {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;
    let doctor = null;
    try { const raw = localStorage.getItem('loggedInDoctor'); if (raw) doctor = JSON.parse(raw); } catch(_){}

    const els = {
      alertsList: document.getElementById('doctorAlertsList'),
      upcomingList: document.getElementById('doctorUpcomingList'),
      tabUpcoming: document.getElementById('tabUpcomingCount'),
      todayBox: document.getElementById('todayAppointments'),
    };

    fetch('data.json').then(r=>r.json()).then(data=>{
      const patients = Array.isArray(data?.patients) ? data.patients : [];
      const rules = Array.isArray(data?.drugInteractions) ? data.drugInteractions : [];
      // pick doctor: prefer logged-in, else first from data
      const fromData = Array.isArray(data?.doctors) ? data.doctors : [];
      const currentDoctor = doctor && doctor.id ? (fromData.find(d=>d.id===doctor.id) || doctor) : (fromData[0] || null);
      const myIds = Array.isArray(currentDoctor?.patientsUnderCare) ? currentDoctor.patientsUnderCare : [];
      const myPatients = patients.filter(p => myIds.includes(p.id));

      // Build alerts per patient
      if (els.alertsList) {
        els.alertsList.innerHTML = myPatients.map(p => {
          const meds = (p.activeMedications||[]).map(m => (m||'').toLowerCase());
          const chronic = (p.chronic||[]).map(c => (c||'').toLowerCase());
          const alerts = [];
          // simple alerts
          if (p.age > 70) alerts.push(`<div class="alert high-alert"><strong>Age risk:</strong> ${p.age}</div>`);
          if ((p.heightCm && p.weightKg)) {
            const b = p.weightKg/Math.pow(p.heightCm/100,2);
            if (b >= 30) alerts.push(`<div class="alert med-alert"><strong>Obesity risk:</strong> BMI ${b.toFixed(1)}</div>`);
          }
          // drug interactions
          for (const r of rules) {
            const a = (r.a||'').toLowerCase(); const b = (r.b||'').toLowerCase();
            if (meds.includes(a) && meds.includes(b)) alerts.push(`<div class="alert high-alert"><strong>Interaction:</strong> ${r.a} + ${r.b} — ${r.reason}</div>`);
          }
          if (chronic.includes('hypertension')) alerts.push(`<div class="alert medium-alert"><strong>Hypertension:</strong> monitor BP trend.</div>`);

          const body = alerts.length ? alerts.join('') : `<div class="alert low-alert">No critical alerts.</div>`;
          return `
            <div class="collapsible-card" data-pid="${p.id}">
              <div class="collapsible-header">
                <div><strong>${p.name}</strong> (ID: ${p.id})</div>
                <div>Alerts: ${alerts.length}</div>
              </div>
              <div class="collapsible-body">${body}</div>
            </div>
          `;
        }).join('');

        els.alertsList.querySelectorAll('.collapsible-card .collapsible-header').forEach(h => {
          h.addEventListener('click', () => {
            const card = h.closest('.collapsible-card');
            if (card) card.classList.toggle('open');
          });
        });
      }

      // Upcoming appointments for doctor (from patients + doctor's own)
      const now = new Date();
      // Base upcoming from data.json
      const patientUpcoming = myPatients
        .flatMap(p => (Array.isArray(p.appointments) ? p.appointments.map(a => ({ ...a, pid: p.id, pname: p.name })) : []));
      // Merge overrides booked by patients from localStorage
      const overrideUpcoming = myPatients.flatMap(p => {
        try {
          const raw = localStorage.getItem(`patientAppointments:${p.id}`);
          const extra = raw ? JSON.parse(raw) : [];
          return Array.isArray(extra) ? extra.map(a => ({ ...a, pid: p.id, pname: p.name })) : [];
        } catch(_) { return []; }
      });
      const doctorUpcoming = Array.isArray(currentDoctor?.appointments)
        ? currentDoctor.appointments.map(a => ({ ...a, pid: a.pid || null, pname: a.pname || a.patient || a.doctor || 'Appointment' }))
        : [];
      const upcoming = [...patientUpcoming, ...overrideUpcoming, ...doctorUpcoming]
        .filter(a => a?.date && new Date(a.date + (a.time ? 'T' + a.time : '')) >= now)
        .sort((a, b) => new Date(a.date + (a.time ? 'T' + a.time : '')) - new Date(b.date + (b.time ? 'T' + b.time : '')));
      if (els.tabUpcoming) els.tabUpcoming.textContent = upcoming.length || '';
      if (els.upcomingList) {
        els.upcomingList.innerHTML = upcoming.map((a,i)=>{
          const dt = new Date(a.date + (a.time? 'T'+a.time:''));
          const dept = a.department ? ` • ${a.department}` : '';
          const loc = a.location ? ` • ${a.location}` : '';
          const who = a.pname || a.patient || a.doctor || 'Appointment';
          const idPart = a.pid ? ` (${a.pid})` : '';
          return `<li class="appt-item" data-idx="${i}"><span><strong>${who}</strong>${idPart}</span><span>${dt.toLocaleString()}${dept}${loc}</span></li>`;
        }).join('');
        attachDocApptClicks(els.upcomingList, upcoming);
      }

      // Mirror a compact list into the default visible search pane box if present
      if (els.todayBox) {
        if (upcoming.length === 0) {
          els.todayBox.innerHTML = `<div class="alert low-alert">${t('noUpcomingAppointments')}</div>`;
        } else {
          const top = upcoming.slice(0, 5);
          els.todayBox.innerHTML = `
            <h3 style="margin-top:0;">${t('upcomingAppointments')}</h3>
            <ul class="appointment-list">
              ${top.map((a,i)=>{
                const dt = new Date(a.date + (a.time? 'T'+a.time:''));
                const who = a.pname || a.patient || a.doctor || t('appointmentLabel');
                const idPart = a.pid ? ` (${t('id')}: ${a.pid})` : '';
                return `<li class="appt-item" data-idx="${i}"><span>${who}${idPart}</span><span>${dt.toLocaleString()}</span></li>`;
              }).join('')}
            </ul>`;
          // clicks open the same modal
          const list = els.todayBox.querySelector('ul');
          if (list) attachDocApptClicks(list, top);
        }
      }
    }).catch(()=>{});

    function ensureDocModal(){
      let el = document.getElementById('docApptModalBackdrop');
      if (!el){
        el = document.createElement('div');
        el.id = 'docApptModalBackdrop';
        el.className = 'modal-backdrop';
        el.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true" aria-label="Appointment Details">
            <div class="modal-header">
              <div class="modal-title">Appointment Details</div>
              <button class="btn-close" type="button">Close</button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-actions">
              <button class="btn-primary-link" type="button">Add to Calendar</button>
              <button class="btn-close" type="button">Close</button>
            </div>
          </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', (e)=>{ if (e.target === el) el.style.display='none'; });
        el.querySelectorAll('.btn-close').forEach(b=> b.addEventListener('click', ()=> el.style.display='none'));
      }
      return el;
    }
    function openDocAppt(appt){
      const b = ensureDocModal();
      const body = b.querySelector('.modal-body');
      const dt = new Date(appt.date + (appt.time? 'T'+appt.time:''));
      const who = appt.pname || appt.patient || appt.doctor || 'Appointment';
      const idPart = appt.pid ? ` (ID: ${appt.pid})` : '';
      body.innerHTML = `
        <div><strong>Patient:</strong> ${who}${idPart}</div>
        <div><strong>Date/Time:</strong> ${dt.toLocaleString()}</div>
        ${appt.department? `<div><strong>Department:</strong> ${appt.department}</div>`:''}
        ${appt.location? `<div><strong>Location:</strong> ${appt.location}</div>`:''}
      `;
      b.style.display='flex';
    }
    function attachDocApptClicks(listEl, items){
      listEl.querySelectorAll('.appt-item').forEach(li=>{
        const idx = Number(li.getAttribute('data-idx'));
        if (!Number.isInteger(idx)) return;
        li.addEventListener('click', ()=> openDocAppt(items[idx]));
      });
    }
  })();

  // ===== Doctor Notifications Center (across assigned patients) =====
  function renderDoctorNotificationsCenter(){
    const container = document.getElementById('doctorNotificationsCenter');
    if (!container) return;
    let doctor = null;
    try { const raw = localStorage.getItem('loggedInDoctor'); if (raw) doctor = JSON.parse(raw); } catch(_){ }
    fetch('data.json').then(r=>r.json()).then(data=>{
      const patients = Array.isArray(data?.patients)? data.patients:[];
      const myIds = Array.isArray(doctor?.patientsUnderCare)? doctor.patientsUnderCare: [];
      const mine = patients.filter(p=> myIds.includes(p.id));
      const items = [];
      mine.forEach(p=>{
        const pid = p.id;
        try {
          const msgs = JSON.parse(localStorage.getItem(`messages:${pid}`)||'[]');
          msgs.forEach(m=>{
            const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : p.name;
            items.push({type:'msg', at:m.createdAt, text:m.text, author});
          });
        } catch(_){ }
        try { const labs = JSON.parse(localStorage.getItem(`labOrders:${pid}`)||'[]'); labs.forEach(l=> items.push({type:'lab', at:l.orderedAt, text:`${p.name}: ${t('labOrder')} ${Array.isArray(l.tests)? l.tests.join(', '): ''}`})); } catch(_){ }
        try { const appts = JSON.parse(localStorage.getItem(`patientAppointments:${pid}`)||'[]'); appts.forEach(a=> items.push({type:'appt', at:`${a.date} ${a.time||''}`.trim(), text:`${p.name}: ${t('followUp')} ${a.date} ${a.time||''}`})); } catch(_){ }
      });
      items.sort((a,b)=> new Date(a.at||0) - new Date(b.at||0));
      // update tab badge
      try { const badge = document.getElementById('tabNotifCount'); if (badge) badge.textContent = String(items.length||''); } catch(_){ }
      const getInitials = (name)=>{ if(!name) return '•'; const parts=String(name).split(/\s+/).filter(Boolean); return (parts[0][0] + ((parts[1]||'')[0]||'')).toUpperCase(); };
      const makeRow = (it)=>{
        const label = it.type==='msg'?t('messageLabel'):it.type==='lab'?t('labLabel'):it.type==='appt'?t('appointmentLabel'):t('noteLabel');
        const cls = it.type==='msg'?'msg':it.type==='lab'?'lab':it.type==='appt'?'appt':'note';
        const author = it.author || t('system');
        const avatarKind = String(author).startsWith('Dr.') ? 'doctor' : (author=== t('system') ? 'system':'patient');
        return `<div class="comment-item ${cls}">
                  <div class="comment-meta"><span class="comment-badge ${cls}">${label}</span> <span>${new Date(it.at||Date.now()).toLocaleString()}</span></div>
                  <div class="comment-line">
                    <span class="comment-avatar ${avatarKind}">${getInitials(author.replace(/^Dr\.\s*/,'').trim())}</span>
                    <div class="comment-text"><strong>${author}:</strong> ${it.text}</div>
                  </div>
                </div>`;
      };
      const empty = !items.length;
      const list = empty ? '' : items.map(makeRow).join('');
      container.innerHTML = `
        <div class="comment-box">
          <div style="display:flex; gap:8px; margin:0 0 10px 0; align-items:center;">
            <label style="font-size:12px; color:#6b7280;">${t('filter')}</label>
            <select id="docNotifFilter" style="padding:6px 8px; border-radius:8px; border:1px solid #e5e7eb;">
              <option value="all">${t('all')}</option>
              <option value="msg">${t('messages')}</option>
              <option value="lab">${t('labs')}</option>
              <option value="appt">${t('appointments')}</option>
            </select>
          </div>
          <div id="docNotifList">${empty ? `<div class="comment-empty">${t('noNotificationsYet')}</div>` : list}</div>
        </div>`;
      const sel = document.getElementById('docNotifFilter');
      sel?.addEventListener('change', ()=>{
        const v = sel.value;
        const filtered = v==='all' ? items : items.filter(x=> x.type===v);
        const html = filtered.length? filtered.map(makeRow).join('') : `<div class="comment-empty">${t('noItems')}</div>`;
        const target = document.getElementById('docNotifList');
        if (target) target.innerHTML = html;
      });
    }).catch(()=>{});
  }
  try { window.renderDoctorNotificationsCenter = renderDoctorNotificationsCenter; } catch(_) {}
  renderDoctorNotificationsCenter();


  // ========== PATIENT DASHBOARD RENDER ==========
  (async function renderPatientDashboard() {
    const profilePane = document.querySelector('#profile .profile-card');
    const headerTitle = document.querySelector('.dashboard-header h1');
    const reportsPane = document.querySelector('#reports .ai-report-box');
    const riskLabelEl = document.querySelector('#reports .risk-label');
    const riskFillEl = document.querySelector('#reports .risk-fill');
    const apptList = document.querySelector('#appointments .appointment-list');
    const alertsPane = document.querySelector('#alerts .alert-cards');
    if (!profilePane) return;
    let patient = null;
    try {
      const raw = localStorage.getItem('loggedInPatient');
      if (raw) patient = JSON.parse(raw);
    } catch (e) { /* no-op */ }
    if (!patient) return;
    // Merge with canonical record from data.json so appointments and clinical data are complete
    try {
      await fetch('data.json').then(r=>r.json()).then(d=>{
        const full = (Array.isArray(d?.patients)? d.patients: []).find(x=> x.id === patient.id);
        if (full) {
          // merge local overrides (contact info, allergies, etc.) onto canonical
          const merged = { ...full, ...patient };
          // also merge locally stored extra appointments
          try {
            const k = `patientAppointments:${merged.id}`;
            const raw = localStorage.getItem(k);
            const extra = raw ? JSON.parse(raw) : [];
            const base = Array.isArray(merged.appointments) ? merged.appointments.slice() : [];
            merged.appointments = [...base, ...extra];
          } catch(_){ }
          patient = merged;
          try { localStorage.setItem('loggedInPatient', JSON.stringify(patient)); } catch(_){ }
        }
      });
    } catch(_){ }
    try { window.currentPatient = patient; } catch (_) {}

    if (headerTitle && patient.name) {
      headerTitle.textContent = `${patient.name} — ${t('dashboardTitle')}`;
    }
    // Render notifications thread immediately
    try { renderPatientNotifCenter(patient); } catch(_){ }

    // Remove last two Follow-up with Dr. Ayhan Karaca for Elif Arslan (id 4) from localStorage extras
    (function cleanupElif(){
      try {
        if (patient.id !== 4) return;
        const k = `patientAppointments:${patient.id}`;
        const list = JSON.parse(localStorage.getItem(k)||'[]');
        const matches = list
          .map((a,idx)=> ({a, idx}))
          .filter(x=> String(x.a?.doctor||'').includes('Ayhan Karaca') && String(x.a?.department||'')==='Follow-up');
        if (matches.length >= 2) {
          // remove the last two by order (assume end of list is latest added)
          const indicesToRemove = matches.slice(-2).map(x=> x.idx).sort((a,b)=> b-a);
          const dup = list.slice();
          indicesToRemove.forEach(i=>{ if (i>=0 && i<dup.length) dup.splice(i,1); });
          localStorage.setItem(k, JSON.stringify(dup));
        }
      } catch(_){ }
    })();

    function renderPatientAppointments(p){
      const listEl = document.querySelector('#appointments .appointment-list');
      if (!listEl) return;
      let items = [];
      try {
        const k = `patientAppointments:${p.id}`;
        items = JSON.parse(localStorage.getItem(k)||'[]');
      } catch(_){ items = []; }
      const merged = Array.isArray(p.appointments)? [...p.appointments, ...items]: items;
      merged.sort((a,b)=> new Date(`${a.date} ${a.time||''}`) - new Date(`${b.date} ${b.time||''}`));
      listEl.innerHTML = merged.map(a=> `<li class="appt-item"><div><strong>${a.department||'Follow-up'}</strong> with ${a.doctor||'Doctor'}</div><div class="appt-meta">${a.date} ${a.time||''} • ${a.location||'Clinic'}</div></li>`).join('');
    }

    function ensurePatientNotificationsBox() {
      if (!alertsPane) return null;
      let wrap = document.getElementById('patientNotificationsWrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'patientNotificationsWrap';
        wrap.className = 'report-card';
        wrap.style.marginTop = '12px';
        wrap.style.borderLeft = '4px solid #2ca35eff';
        wrap.innerHTML = `
          <h3 class="section-subtitle" style="color:#2ecc71;">Notifications Center</h3>
          <div id="patientNotifications"></div>
        `;
        alertsPane.appendChild(wrap);
      }
      return wrap;
    }

    function renderPatientNotifications(p) {
      ensurePatientNotificationsBox();
      const box = document.getElementById('patientNotifications');
      if (!box) return;
      const pid = p.id;
      const items = [];
      try {
        const msgs = JSON.parse(localStorage.getItem(`messages:${pid}`)||'[]');
        msgs.slice(-20).forEach(m=> {
          const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : 'You';
          items.push({ type:'msg', at:m.createdAt, text:m.text, author });
        });
      } catch(_){ }
      try {
        const labs = JSON.parse(localStorage.getItem(`labOrders:${pid}`)||'[]');
        labs.slice(-5).forEach(l=> items.push({ type:'lab', at:l.orderedAt, text:`Lab Order: ${Array.isArray(l.tests)? l.tests.join(', '): ''}` }));
      } catch(_){}
      try {
        const appts = JSON.parse(localStorage.getItem(`patientAppointments:${pid}`)||'[]');
        appts.slice(-5).forEach(a=> items.push({ type:'appt', at:`${a.date} ${a.time||''}`.trim(), text:`Follow-up: ${a.date} ${a.time||''}` }));
      } catch(_){}
      items.sort((a,b)=> new Date(a.at||0) - new Date(b.at||0));
      if (!items.length) { box.innerHTML = `<div class="muted">No notifications yet.</div>`; return; }
      // update notifications tab badge
      try { const badge = document.getElementById('patNotifCount'); if (badge) badge.textContent = String(items.length||''); } catch(_){ }
      const getInitials = (name)=>{ if(!name) return '•'; const parts=String(name).split(/\s+/).filter(Boolean); return (parts[0][0] + ((parts[1]||'')[0]||'')).toUpperCase(); };
      const makeRow = (it)=>{
        const label = it.type==='msg' ? 'Message' : it.type==='lab' ? 'Lab' : it.type==='appt' ? 'Appointment' : 'Note';
        const cls = it.type==='msg'?'msg':it.type==='lab'?'lab':it.type==='appt'?'appt':'note';
        const author = it.author || (it.type==='lab'||it.type==='appt'?'System':'You');
        const avatarKind = author.startsWith('Dr.') ? 'doctor' : (author==='You' ? 'patient' : 'system');
        return `<div class=\"comment-item ${cls}\">\n                  <div class=\"comment-meta\"><span class=\"comment-badge ${cls}\">${label}</span> <span>${new Date(it.at||Date.now()).toLocaleString()}</span></div>\n                  <div class=\"comment-line\">\n                    <span class=\"comment-avatar ${avatarKind}\">${getInitials(author.replace(/^Dr\.\s*/,'').trim())}</span>\n                    <div class=\"comment-text\"><strong>${author}:</strong> ${it.text}</div>\n                  </div>\n                </div>`;
      };
      const list = items.map(makeRow).join('');
      box.innerHTML = `<div class=\"comment-box\">${list}</div>`;
    }

    // Add a simple message composer into Notifications pane (patient -> doctor)
    (function ensurePatientMsgComposer(){
      const notifPane = document.querySelector('#notifications .notifications-section');
      if (!notifPane) return;
      if (document.getElementById('patientMsgComposer')) return;
      const composer = document.createElement('div');
      composer.id = 'patientMsgComposer';
      composer.className = 'report-card';
      composer.style.margin = '12px 0';
      composer.style.borderLeft = '4px solid #4A90E2';
      composer.innerHTML = `
        <h3 class="section-subtitle" style="color:#4A90E2; margin-top:0;">${t('sendMessageTo')}</h3>
        <div style="display:grid; gap:8px;">
          <textarea id="patientMsgText" rows="3" placeholder="${t('composePlaceholder')}" style="width:100%;"></textarea>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="patientMsgSend" class="btn-primary" type="button">${t('send')}</button>
          </div>
        </div>`;
      // Insert composer AFTER the thread so users see notifications first
      const beforeEl = document.getElementById('patientThreadWrap')?.nextSibling;
      if (beforeEl) notifPane.insertBefore(composer, beforeEl); else notifPane.appendChild(composer);
      const btn = composer.querySelector('#patientMsgSend');
      btn?.addEventListener('click', ()=>{
        const ta = composer.querySelector('#patientMsgText');
        const text = (ta && ta.value || '').trim();
        if (!text) return;
        try {
          const k = `messages:${patient.id}`;
          const raw = localStorage.getItem(k);
          const list = raw ? JSON.parse(raw) : [];
          list.push({ fromPatientId: patient.id, toDoctorId: patient.doctorId, text, createdAt: new Date().toISOString() });
          localStorage.setItem(k, JSON.stringify(list));
        } catch(_){ }
        if (ta) ta.value = '';
        // refresh both centers
        try { renderPatientNotifCenter(patient); } catch(_){ }
        try { renderDoctorNotificationsCenter(); } catch(_){ }
      });
    })();

    // Patient Book Appointment: open modal to pick details
    (function ensureBookAppt(){
      const btn = document.querySelector('#appointments .book-a');
      if (!btn) return;
      function ensurePatApptModal(){
        let el = document.getElementById('patApptModal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'patApptModal';
        el.className = 'modal-backdrop';
        el.innerHTML = `
          <div class="modal">
            <div class="modal-header"><h3>${t('bookAppointment')}</h3><button class="btn-close" type="button">×</button></div>
            <div class="modal-body">
              <label>${t('date')} <input id="patApptDate" type="date"></label>
              <label>${t('time')} <input id="patApptTime" type="time"></label>
              <label>${t('department')} <input id="patApptDept" type="text" placeholder="${t('apptDeptPlaceholder')}"></label>
              <label>${t('location')} <input id="patApptLoc" type="text" placeholder="${t('apptLocPlaceholder')}"></label>
              <label>${t('doctor')} <input id="patApptDoc" type="text" placeholder="${t('apptDocPlaceholder')}"></label>
              <div id="patApptPreview" class="muted" style="margin-top:8px; font-size:12px;"></div>
            </div>
            <div class="modal-actions">
              <button class="btn-primary" id="patApptConfirm" type="button">${t('add')}</button>
              <button class="btn-close" type="button">${t('close')}</button>
            </div>
          </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', (e)=>{ if (e.target===el) el.style.display='none'; });
        el.querySelectorAll('.btn-close').forEach(b=> b.addEventListener('click', ()=> el.style.display='none'));
        return el;
      }
      btn.addEventListener('click', ()=>{
        const el = ensurePatApptModal();
        const d = new Date();
        const pad = n=> String(n).padStart(2,'0');
        const ymd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        el.querySelector('#patApptDate').value = ymd;
        el.querySelector('#patApptTime').value = '10:00';
        el.querySelector('#patApptDept').value = t('followUp');
        el.querySelector('#patApptLoc').value = t('clinic') || '';
        el.querySelector('#patApptDoc').value = (JSON.parse(localStorage.getItem('loggedInDoctor')||'{}').name) || 'Dr. Ayhan Karaca';
        const preview = ()=>{
          const date = el.querySelector('#patApptDate').value;
          const time = el.querySelector('#patApptTime').value;
          const dept = el.querySelector('#patApptDept').value||t('followUp');
          const loc = el.querySelector('#patApptLoc').value||t('clinic')||'';
          const doc = el.querySelector('#patApptDoc').value||t('doctor');
          const pv = el.querySelector('#patApptPreview');
          if (pv) pv.textContent = `${t('preview')}: ${dept} ${t('with')} ${doc} ${t('on')||''} ${date} ${time} ${t('at')||''} ${loc}`;
        };
        ['patApptDate','patApptTime','patApptDept','patApptLoc','patApptDoc'].forEach(id=> el.querySelector('#'+id).addEventListener('input', preview));
        preview();
        const confirm = el.querySelector('#patApptConfirm');
        confirm.onclick = ()=>{
          const date = el.querySelector('#patApptDate').value;
          const time = el.querySelector('#patApptTime').value;
          const department = el.querySelector('#patApptDept').value||t('followUp');
          const location = el.querySelector('#patApptLoc').value||t('clinic')||'';
          const doctor = el.querySelector('#patApptDoc').value||t('doctor');
          if (!date || !time) return;
          const appt = { date, time, doctor, department, location };
          try {
            const k = `patientAppointments:${patient.id}`;
            const raw = localStorage.getItem(k);
            const list = raw ? JSON.parse(raw) : [];
            list.push(appt);
            localStorage.setItem(k, JSON.stringify(list));
          } catch(_){ }
          el.style.display='none';
          renderPatientAppointments(patient);
          try { renderDoctorNotificationsCenter(); } catch(_){ }
        };
        el.style.display='flex';
      });
      // initial render
      renderPatientAppointments(patient);
    })();

    function renderUrgentAlerts(p) {
      const cards = document.querySelector('#alerts .alert-cards');
      const banner = document.querySelector('#alerts .alert-banner');
      if (!cards) return;
      fetch('data.json').then(r=>r.json()).then(data=>{
        const rules = Array.isArray(data?.drugInteractions) ? data.drugInteractions : [];
        const doctors = Array.isArray(data?.doctors) ? data.doctors : [];
        const assigned = doctors.find(d=> d.id === p.doctorId);
        const doctorEmail = assigned?.email || '';
        const meds = (p.activeMedications||[]).map(m => (m||'').toLowerCase());
        const chronic = (p.chronic||[]).map(c => (c||'').toLowerCase());
        const height = Number(p.heightCm)||0, weight=Number(p.weightKg)||0;
        const bmi = height && weight ? (weight/Math.pow(height/100,2)) : null;
        // merge drug allergies with overrides
        let drugAllergies = Array.isArray(p.drugAllergies)? p.drugAllergies.slice() : (p.allergies||[]);
        try { const over = JSON.parse(localStorage.getItem(`patientAllergies:${p.id}`)||'[]'); if (Array.isArray(over)) drugAllergies = Array.from(new Set([...drugAllergies, ...over].map(x=>String(x).toLowerCase())));} catch(_){ }

        const alerts = [];
        if (p.age > 70) alerts.push({lvl:'high', text:`Age-related risk: ${p.age}`});
        if (bmi && bmi>=30) alerts.push({lvl:'med', text:`Obesity risk (BMI ${bmi.toFixed(1)})`});
        // drug interactions
        for (const r of rules) {
          const a=(r.a||'').toLowerCase(), b=(r.b||'').toLowerCase();
          if (meds.includes(a) && meds.includes(b)) alerts.push({lvl: r.risk==='high'?'high':(r.risk==='medium'?'med':'low'), text:`${r.a} with ${r.b}: ${r.reason}`});
        }
        // allergy conflicts
        meds.forEach(m=>{ if (drugAllergies.includes(m)) alerts.push({lvl:'high', text:`Medication-allergy conflict: ${m}`}); });

        if (!alerts.length) {
          // No alerts: show one neutral card and remove any detail table
          cards.innerHTML = `<div class="alert-card"><strong>${t('noUrgentAlerts')}</strong></div>`;
          if (banner) banner.style.display = 'none';
          try { const detail = document.getElementById('alertsDetailPanel'); if (detail) detail.remove(); } catch(_){ }
        } else {
          cards.innerHTML = alerts.map(a=>{
            const cls = a.lvl==='high'?'high':'med';
            const lvlText = a.lvl==='high'? t('highPriority') : t('mediumPriority');
            return `<div class="alert-card ${cls}"><strong>${lvlText}:</strong> ${a.text}</div>`;
          }).join('');
          if (banner) {
            banner.style.display = '';
            // Remove any existing action controls, do not add Acknowledge
            banner.querySelector('.alert-actions')?.remove();
          }
        }

        // Build detailed, structured alerts table for patient
        try {
          const sec = document.querySelector('#alerts .alerts-section');
          let detail = document.getElementById('alertsDetailPanel');
          if (!detail) {
            detail = document.createElement('div');
            detail.id = 'alertsDetailPanel';
            detail.className = 'report-card';
            detail.style.marginTop = '20px';
            detail.style.padding = '16px';
            detail.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
            detail.style.borderRadius = '14px';
            sec.appendChild(detail);
          }
          const medsList = (p.activeMedications||[]);
          const interactions = [];
          for (const r of rules) {
            if (!r || !r.a || !r.b) continue;
            if (meds.includes(String(r.a).toLowerCase()) && meds.includes(String(r.b).toLowerCase())) {
              interactions.push(r);
            }
          }
          // Compose rows: medication risks and interaction outcomes
          const rows = [];
          medsList.forEach(m=>{
            const ml = String(m).toLowerCase();
            let risk = '';
            if (ml.includes('ibuprofen')) risk = 'Can increase blood pressure and cardiovascular risk; may counteract aspirin antiplatelet effect; GI bleeding risk.';
            if (ml.includes('aspirin')) risk = (risk? risk+' ': '') + 'Bleeding risk increases with NSAIDs and anticoagulants; GI irritation.';
            if (ml.includes('beta-block')) risk = (risk? risk+' ': '') + 'May cause bradycardia, fatigue; caution in asthma/COPD.';
            if (ml.includes('statin') || ml.includes('atorvastatin')) risk = (risk? risk+' ': '') + 'Myopathy risk (rare rhabdomyolysis), liver enzyme elevation; watch for muscle pain.';
            if (ml.includes('levothyroxine')) risk = (risk? risk+' ': '') + 'Absorption reduced with calcium/iron; take on empty stomach; over-replacement risks arrhythmia and bone loss.';
            if (ml.includes('salbutamol') || ml.includes('albuterol')) risk = (risk? risk+' ': '') + 'Tremor, palpitations; overuse signals poor control; monitor for tachycardia.';
            if (!risk) risk = 'No major general warnings beyond standard use per label.';
            rows.push({ category:t('categoryMedication'), finding:m, details:risk, action:t('actionDiscussSideEffects') });
          });
          interactions.forEach(int=>{
            rows.push({ category:t('categoryInteraction'), finding:`${int.a} + ${int.b}`, details:int.reason, action:t('actionAvoidMonitor') });
          });
          if (rows.length === 0 && alerts.length === 0) { try { detail.remove(); } catch(_){ } return; }
          const spacing = 'style="border-spacing: 0 12px; border-collapse: separate; width:100%; font-size: 15px;"';
          detail.innerHTML = `
            <h3 style="margin:0 0 12px 0; font-size: 20px;">${t('alertsDetailTitle')}</h3>
            <table ${spacing}>
              <thead>
                <tr>
                  <th style="text-align:left; padding:14px; background:#eef2f7; font-weight:700;">${t('tblCategory')}</th>
                  <th style="text-align:left; padding:14px; background:#eef2f7; font-weight:700;">${t('tblFinding')}</th>
                  <th style="text-align:left; padding:14px; background:#eef2f7; font-weight:700;">${t('tblDetails')}</th>
                  <th style="text-align:left; padding:14px; background:#eef2f7; font-weight:700;">${t('tblRecommendedAction')}</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r=>`<tr>
                  <td style=\"padding:14px; background:#ffffff; border:1px solid #e5e7eb; border-radius:10px;\">${r.category}</td>
                  <td style=\"padding:14px; background:#ffffff; border:1px solid #e5e7eb;\">${r.finding}</td>
                  <td style=\"padding:14px; background:#ffffff; border:1px solid #e5e7eb;\">${r.details}</td>
                  <td style=\"padding:14px; background:#ffffff; border:1px solid #e5e7eb;\">${r.action}</td>
                </tr>`).join('')}
              </tbody>
            </table>`;
        } catch(_){ }
      }).catch(()=>{});
    }

    function buildRecommendationsForPatient(p, data) {
      const recs = [];
      const h = Number(p.heightCm)||0, w = Number(p.weightKg)||0;
      const bmi = h && w ? (w/Math.pow(h/100,2)) : null;
      const labs = p.bloodAnalysis || {};
      const chronic = (p.chronic||[]).map(x=>String(x).toLowerCase());

      const push = (category, title, body) => recs.push({ category, title, body });

      // Hypertension

if (chronic.includes('hypertension')) {
  push(t('badgeDiet'), t('rec_htn_diet_title'), t('rec_htn_diet_body'));
  push(t('badgeActivity'), t('rec_htn_activity_title'), t('rec_htn_activity_body'));
  push(t('medications'), t('rec_htn_med_title'), t('rec_htn_med_body'));
  push('Lifestyle', t('rec_htn_life_title'), t('rec_htn_life_body'));
}

// Diabetes
if (chronic.includes('diabetes') || (labs['HbA1c'] && labs['HbA1c'] >= 6.5)) {
  push(t('badgeDiet'), t('rec_dm_diet_title'), t('rec_dm_diet_body'));
  push(t('badgeMonitoring'), t('rec_dm_monitor_title'), t('rec_dm_monitor_body'));
  push(t('badgeActivity'), t('rec_dm_activity_title'), t('rec_dm_activity_body'));
  push('Foot Care', t('rec_dm_foot_title'), t('rec_dm_foot_body'));
}

// High Cholesterol
if (chronic.includes('high cholesterol') || (labs['Triglycerides'] && labs['Triglycerides'] > 200)) {
  push(t('badgeDiet'), t('rec_chol_diet_title'), t('rec_chol_diet_body'));
  push(t('medications'), t('rec_chol_med_title'), t('rec_chol_med_body'));
  push('Lifestyle', t('rec_chol_life_title'), t('rec_chol_life_body'));
}

// Asthma
if (chronic.includes('asthma')) {
  push('Environment', t('rec_asth_env_title'), t('rec_asth_env_body'));
  push('Action Plan', t('rec_asth_plan_title'), t('rec_asth_plan_body'));
  push('Lifestyle', t('rec_asth_breath_title'), t('rec_asth_breath_body'));
}

// Thyroid Disorder
if (chronic.includes('thyroid disorder')) {
  push(t('medications'), t('rec_thyr_med_title'), t('rec_thyr_med_body'));
  push(t('badgeMonitoring'), t('rec_thyr_monitor_title'), t('rec_thyr_monitor_body'));
  push('Lifestyle', t('rec_thyr_life_title'), t('rec_thyr_life_body'));
}

// Celiac Disease
if (chronic.includes('celiac disease')) {
  push(t('badgeDiet'), t('rec_celiac_diet_title'), t('rec_celiac_diet_body'));
  push('Nutrition', t('rec_celiac_nutri_title'), t('rec_celiac_nutri_body'));
  push('Support', t('rec_celiac_support_title'), t('rec_celiac_support_body'));
}

// Heart Disease
if (chronic.includes('heart disease')) {
  push(t('medications'), t('rec_hd_med_title'), t('rec_hd_med_body'));
  push('Lifestyle', t('rec_hd_life_title'), t('rec_hd_life_body'));
  push(t('badgeMonitoring'), t('rec_hd_monitor_title'), t('rec_hd_monitor_body'));
}

// Derived conditions
if (bmi && bmi >= 30) {
  push('Weight', t('rec_ob_weight_title'), t('rec_ob_weight_body'));
  push(t('badgeDiet'), t('rec_ob_diet_title'), t('rec_ob_diet_body'));
}

// Anemia
const hgb = labs['Hemoglobin'];
if (typeof hgb === 'number' && ((p.gender === 'Female' && hgb < 12) || (p.gender === 'Male' && hgb < 13))) {
  push('Anemia', t('rec_anem_title'), t('rec_anem_body'));
  push(t('badgeMonitoring'), t('rec_anem_monitor_title'), t('rec_anem_monitor_body'));
}

// Smoking
if (chronic.includes('smoking')) {
  push('Cessation', t('rec_smoke_plan_title'), t('rec_smoke_plan_body'));
  push('Benefits', t('rec_smoke_benefits_title'), t('rec_smoke_benefits_body'));
}

// PCOS (if female)
if (p.gender === 'Female' && chronic.includes('pcos')) {
  push('Lifestyle', t('rec_pcos_life_title'), t('rec_pcos_life_body'));
  push(t('badgeMonitoring'), t('rec_pcos_monitor_title'), t('rec_pcos_monitor_body'));
}

// General
if (!recs.length) {
  push('General', t('rec_general_title'), t('rec_general_body'));
}

      return recs;
    }

    function renderPatientRecommendations(p) {
      const sec = document.querySelector('#recs .education-section');
      if (!sec) return;
      fetch('data.json').then(r=>r.json()).then(data=>{
        const recs = buildRecommendationsForPatient(p, data);
        // build boxes
        const html = `
          <h2 data-i18n="recommendations">Personalized Recommendations</h2>
          <div class="recs-grid">
            ${recs.map(r=>`
              <div class="rec-box">
                <div class="rec-head"><span class="rec-badge">${r.category}</span> ${r.title}</div>
                <div class="rec-body">${r.body}</div>
              </div>
            `).join('')}
          </div>`;
        sec.innerHTML = html;
      }).catch(()=>{});
    }

    const renderView = () => {
      const h = Number(patient.heightCm) || 0;
      const w = Number(patient.weightKg) || 0;
      const bmi = h && w ? (w / Math.pow(h / 100, 2)) : null;
      const bmiStr = bmi ? bmi.toFixed(1) : '-';
      const allergies = (patient.allergies || []).join(', ') || '-';
      const chronic = (patient.chronic || []).join(', ') || '-';
      const surgeries = (patient.pastSurgeries || []).join(', ') || '-';
      const meds = (patient.activeMedications || []).join(', ') || '-';
      profilePane.innerHTML = `
      <div class="main-profile">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect fill='%234A90E2' width='150' height='150'/%3E%3Cpath fill='%23ffffff' d='M75 45c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 55c-16.5 0-30 6.7-30 15v10h60v-10c0-8.3-13.5-15-30-15z'/%3E%3C/svg%3E" alt="Profile Picture" />
        <div class="mp-meta">
          <div class="mp-name">${patient.name || '-'}</div>
          <div class="mp-stats">
            <span>ID: ${patient.id || '-'}</span>
            <span>Height: ${h ? h + ' cm' : '-'}</span>
            <span>Weight: ${w ? w + ' kg' : '-'}</span>
            <span>BMI: ${bmiStr}</span>
          </div>
        </div>
      </div>
      <ul>
        <li><strong>Age:</strong> ${patient.age || '-'}</li>
        <li><strong>Gender:</strong> ${patient.gender || '-'}</li>
        <li><strong>Phone:</strong> ${patient.phone || '-'}</li>
        <li><strong>Email:</strong> ${patient.email || '-'}</li>
        <li><strong>Assigned Doctor:</strong> <span id="assignedDoctorLine">-</span></li>
        <li><strong>Allergies:</strong> ${allergies}</li>
        <li><strong>Chronic Conditions:</strong> ${chronic}</li>
        <li><strong>Past Surgeries:</strong> ${surgeries}</li>
        <li><strong>Current Medications:</strong> ${meds}</li>
      </ul>
      <div class="profile-actions">
        <button class="btn-edit">Edit Profile</button>
      </div>
      `;

      const editBtn = profilePane.querySelector('.btn-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          renderEdit();
        });
      }
      // Notifications render after profile paint
      renderPatientNotifications(patient);
      // Personalized urgent alerts
      renderUrgentAlerts(patient);
      // Personalized AI recommendations (large boxes)
      renderPatientRecommendations(patient);
      // Notifications center (patient)
      renderPatientNotifCenter(patient);
    };

    const renderEdit = () => {
      const h = Number(patient.heightCm) || 0;
      const w = Number(patient.weightKg) || 0;
      profilePane.innerHTML = `
        <div class="main-profile">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect fill='%234A90E2' width='150' height='150'/%3E%3Cpath fill='%23ffffff' d='M75 45c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 55c-16.5 0-30 6.7-30 15v10h60v-10c0-8.3-13.5-15-30-15z'/%3E%3C/svg%3E" alt="Profile Picture" />
          <div class="mp-meta">
            <div class="mp-name">${patient.name || '-'}</div>
            <div class="mp-stats">
              <span>ID: ${patient.id || '-'}</span>
            </div>
          </div>
        </div>
        <form class="profile-edit-form">
          <div class="form-grid">
            <label>Phone<input type="text" id="editPhone" value="${patient.phone || ''}"></label>
            <label>Email<input type="email" id="editEmail" value="${patient.email || ''}"></label>
            <label>Height (cm)<input type="number" id="editHeight" value="${h || ''}" min="50" max="260"></label>
            <label>Weight (kg)<input type="number" id="editWeight" value="${w || ''}" min="10" max="400"></label>
            <label>Allergies (comma-separated)<input type="text" id="editAllergies" value="${(patient.allergies||[]).join(', ')}"></label>
            <label>Chronic Conditions (comma-separated)<input type="text" id="editChronic" value="${(patient.chronic||[]).join(', ')}"></label>
            <label>Past Surgeries (comma-separated)<input type="text" id="editSurgeries" value="${(patient.pastSurgeries||[]).join(', ')}"></label>
            <label>Current Medications (comma-separated)<input type="text" id="editMeds" value="${(patient.activeMedications||[]).join(', ')}"></label>
          </div>
          <div class="profile-actions">
            <button class="btn-primary btn-save" type="submit">Save</button>
            <button class="btn-secondary btn-cancel" type="button">Cancel</button>
          </div>
        </form>
      `;

      const form = profilePane.querySelector('.profile-edit-form');
      const cancelBtn = profilePane.querySelector('.btn-cancel');
      const parseList = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

      if (cancelBtn) cancelBtn.addEventListener('click', () => renderView());
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const newPhone = profilePane.querySelector('#editPhone').value.trim();
          const newEmail = profilePane.querySelector('#editEmail').value.trim();
          const newH = Number(profilePane.querySelector('#editHeight').value);
          const newW = Number(profilePane.querySelector('#editWeight').value);
          const newAllergies = parseList(profilePane.querySelector('#editAllergies').value);
          const newChronic = parseList(profilePane.querySelector('#editChronic').value);
          const newSurgeries = parseList(profilePane.querySelector('#editSurgeries').value);
          const newMeds = parseList(profilePane.querySelector('#editMeds').value);

          // basic validation
          if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            alert('Please enter a valid email.');
            return;
          }
          if (Number.isFinite(newH) && (newH < 50 || newH > 260)) {
            alert('Please enter a realistic height in cm.');
            return;
          }
          if (Number.isFinite(newW) && (newW < 10 || newW > 400)) {
            alert('Please enter a realistic weight in kg.');
            return;
          }

          const updated = {
            ...patient,
            phone: newPhone || patient.phone,
            email: newEmail || patient.email,
            heightCm: Number.isFinite(newH) && newH > 0 ? newH : patient.heightCm,
            weightKg: Number.isFinite(newW) && newW > 0 ? newW : patient.weightKg,
            allergies: newAllergies,
            chronic: newChronic,
            pastSurgeries: newSurgeries,
            activeMedications: newMeds
          };
          try { localStorage.setItem('loggedInPatient', JSON.stringify(updated)); } catch (e) {}
          try { window.currentPatient = updated; } catch(_){}
          patient = updated;
          // redraw with updated fields
          renderView();
          
          // Update appointments and reports based on new data
          if (apptList && Array.isArray(patient.appointments)) {
      // Merge locally-booked overrides into the patient's appointments
      try {
        const overRaw = localStorage.getItem(`patientAppointments:${patient.id}`);
        const extras = overRaw ? JSON.parse(overRaw) : [];
        if (Array.isArray(extras) && extras.length) {
          const existing = new Set((patient.appointments || []).map(a => `${a.date}T${a.time || ''}`));
          const merged = [...patient.appointments];
          extras.forEach(a => {
            const key = `${a.date}T${a.time || ''}`;
            if (!existing.has(key)) merged.push(a);
          });
          patient.appointments = merged;
          try { localStorage.setItem('loggedInPatient', JSON.stringify(patient)); } catch (_) {}
        }
      } catch (_) {}
            apptList.innerHTML = patient.appointments.map((a, i) => {
              const dateStr = new Date(a.date).toDateString();
              const time = a.time ? ` at ${a.time}` : '';
              const dept = a.department ? ` (${a.department})` : '';
              const loc = a.location ? ` • ${a.location}` : '';
              return `<li class="appt-item" data-appt-index="${i}">
                        <span>${dateStr}${time}${dept}${loc}</span>
                        <span class="appt-meta">View</span>
                      </li>`;
            }).join('');
            attachApptClickHandlers(patient, null);
          }
        });
      }
    };

    // initial paint
    renderView();

    if (apptList && Array.isArray(patient.appointments)) {
      // Ensure doctor name matches assigned doctorId
      try {
        fetch('data.json').then(r => r.json()).then(d => {
          const doctors = Array.isArray(d?.doctors) ? d.doctors : [];
          const assigned = doctors.find(doc => doc.id === patient.doctorId);
          const docName = assigned ? assigned.name : 'Doctor';
          const assignedLine = document.getElementById('assignedDoctorLine');
          if (assignedLine) {
            assignedLine.textContent = assigned ? `${assigned.name} (${assigned.email || '-'})` : '-';
          }
          apptList.innerHTML = patient.appointments.map((a, i) => {
            const dateStr = new Date(a.date).toDateString();
            const time = a.time ? ` at ${a.time}` : '';
            const dept = a.department ? ` (${a.department})` : '';
            const loc = a.location ? ` • ${a.location}` : '';
            return `<li class="appt-item" data-appt-index="${i}">
                      <span>${dateStr}${time} – ${docName}${dept}${loc}</span>
                      <span class="appt-meta">Details</span>
                    </li>`;
          }).join('');
          attachApptClickHandlers(patient, docName);
        })
        .catch(() => {
          apptList.innerHTML = patient.appointments.map((a, i) => `<li class="appt-item" data-appt-index="${i}">${new Date(a.date).toDateString()}</li>`).join('');
          attachApptClickHandlers(patient, null);
        });
      } catch (e) {
        apptList.innerHTML = patient.appointments.map((a, i) => `<li class="appt-item" data-appt-index="${i}">${new Date(a.date).toDateString()}</li>`).join('');
        attachApptClickHandlers(patient, null);
      }
    }

    if (reportsPane) {
      const hLocal = Number(patient.heightCm) || 0;
      const wLocal = Number(patient.weightKg) || 0;
      const bmi = hLocal && wLocal ? (wLocal / Math.pow(hLocal / 100, 2)) : null;
      const bmiStr = bmi ? bmi.toFixed(1) : '-';
      const baseRisk = (patient.age > 60 ? 30 : 10) + (Array.isArray(patient.chronic) ? patient.chronic.length * 10 : 0);
      const bmiRisk = bmi ? (bmi >= 30 ? 30 : bmi >= 25 ? 15 : 0) : 0;
      let score = Math.min(100, baseRisk + bmiRisk);
      let riskLevel = 'low';
      if (score >= 70) riskLevel = 'high'; else if (score >= 40) riskLevel = 'medium';
      if (riskLabelEl) {
        riskLabelEl.textContent = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) + ' Risk';
        riskLabelEl.className = `risk-label ${riskLevel}`;
      }
      if (riskFillEl) {
        riskFillEl.style.width = `${Math.max(10, score)}%`;
        riskFillEl.className = `risk-fill ${riskLevel}`;
      }
      const pEl = reportsPane.querySelector('p');
      if (pEl) {
        pEl.textContent = `${patient.name || 'Patient'}'s current risk profile factors age, BMI (${bmiStr}), and conditions (${(patient.chronic||[]).join(', ') || 'none'}). Consider follow-up as needed.`;
      }
    }
    function ensureModal() {
      let backdrop = document.getElementById('apptModalBackdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'apptModalBackdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true" aria-label="Appointment Details">
            <div class="modal-header">
              <div class="modal-title">Appointment Details</div>
              <button class="btn-close" type="button">Close</button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-actions">
              <button class="btn-primary-link" type="button">Add to Calendar</button>
              <button class="btn-close" type="button">Close</button>
            </div>
          </div>`;
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) backdrop.style.display = 'none';
        });
        backdrop.querySelectorAll('.btn-close').forEach(b => b.addEventListener('click', () => {
          backdrop.style.display = 'none';
        }));
      }
      return backdrop;
    }

    function openApptModal(appt, docName, patient) {
      const backdrop = ensureModal();
      const body = backdrop.querySelector('.modal-body');
      const doc = docName || '';
      const dateStr = new Date(appt.date).toLocaleString();
      const dept = appt.department ? ` (${appt.department})` : '';
      const loc = appt.location ? `<div><strong>Location:</strong> ${appt.location}</div>` : '';
      body.innerHTML = `
        <div><strong>Patient:</strong> ${patient.name || 'Patient'} (ID: ${patient.id})</div>
        <div><strong>Doctor:</strong> ${doc || (appt.doctor || 'Doctor')}${dept}</div>
        <div><strong>Date/Time:</strong> ${dateStr}${appt.time ? ` (${appt.time})` : ''}</div>
        ${loc}
      `;
      backdrop.style.display = 'flex';
    }

    function attachApptClickHandlers(patient, docName) {
      if (!apptList) return;
      apptList.querySelectorAll('.appt-item').forEach(el => {
        const idx = Number(el.getAttribute('data-appt-index'));
        if (!Number.isInteger(idx)) return;
        el.addEventListener('click', () => {
          const appt = patient.appointments[idx];
          if (appt) openApptModal(appt, docName, patient);
        });
      });
    }

    // ===== Booking UI: Calendar of doctor's free hours =====
    const bookBtn = document.querySelector('.book-a');
    if (bookBtn) {
      bookBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openBookingModal(patient);
      });
    }

    function ensureBookingModal() {
      let el = document.getElementById('bookingModalBackdrop');
      if (!el) {
        el = document.createElement('div');
        el.id = 'bookingModalBackdrop';
        el.className = 'modal-backdrop';
        el.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true" aria-label="Book Appointment">
            <div class="modal-header">
              <div class="modal-title">Book Appointment</div>
              <button class="btn-close" type="button">Close</button>
            </div>
            <div class="modal-body">
              <div style="display:grid; gap:10px;">
                <label>Date <input id="bookDate" type="date"></label>
                <div id="slotGrid" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
                <div id="bookInfo" class="muted"></div>
              </div>
            </div>
            <div class="modal-actions">
              <button id="confirmBooking" class="btn-primary" type="button" disabled>Confirm</button>
              <button class="btn-close" type="button">Close</button>
            </div>
          </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', (e)=>{ if (e.target === el) el.style.display='none'; });
        el.querySelectorAll('.btn-close').forEach(b=> b.addEventListener('click', ()=> el.style.display='none'));
      }
      return el;
    }

    function collectDoctorBooked(doctorId, doctorName, data) {
      const taken = new Set();
      const pats = Array.isArray(data?.patients) ? data.patients : [];
      pats.filter(p=> p.doctorId === doctorId).forEach(p=>{
        (p.appointments||[]).forEach(a=> taken.add(`${a.date}T${a.time||''}`));
        try {
          const overRaw = localStorage.getItem(`patientAppointments:${p.id}`);
          const extras = overRaw ? JSON.parse(overRaw) : [];
          (Array.isArray(extras)? extras: []).forEach(a=> taken.add(`${a.date}T${a.time||''}`));
        } catch(_){}
      });
      return taken;
    }

    function openBookingModal(patient) {
      const modal = ensureBookingModal();
      const dateInput = modal.querySelector('#bookDate');
      const slotGrid = modal.querySelector('#slotGrid');
      const confirmBtn = modal.querySelector('#confirmBooking');
      const info = modal.querySelector('#bookInfo');
      let selected = { date: null, time: null };

      const today = new Date();
      const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const max = new Date(min); max.setDate(max.getDate()+30);
      const toYMD = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      dateInput.min = toYMD(min);
      dateInput.max = toYMD(max);
      dateInput.value = toYMD(min);

      fetch('data.json').then(r=>r.json()).then(data=>{
        const doctors = Array.isArray(data?.doctors) ? data.doctors : [];
        const doc = doctors.find(d=> d.id === patient.doctorId) || null;
        const docName = doc ? doc.name : 'Assigned Doctor';

        function renderSlotsFor(dateStr){
          slotGrid.innerHTML = '';
          info.textContent = `Available hours for ${docName} on ${new Date(dateStr).toDateString()}`;
          const taken = collectDoctorBooked(patient.doctorId, docName, data);
          const hours = [9,10,11,12,13,14,15,16];
          hours.forEach(h=>{
            const t = `${String(h).padStart(2,'0')}:00`;
            const key = `${dateStr}T${t}`;
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.type = 'button';
            btn.textContent = t;
            if (taken.has(key) || new Date(key) < new Date()) {
              btn.disabled = true;
              btn.style.opacity = '0.5';
            }
            btn.addEventListener('click', ()=>{
              selected = { date: dateStr, time: t };
              confirmBtn.disabled = false;
              slotGrid.querySelectorAll('button').forEach(b=> b.classList.remove('is-active'));
              btn.classList.add('is-active');
            });
            slotGrid.appendChild(btn);
          });
        }

        renderSlotsFor(dateInput.value);
        dateInput.addEventListener('change', ()=>{
          selected = { date: null, time: null };
          confirmBtn.disabled = true;
          renderSlotsFor(dateInput.value);
        });

        confirmBtn.onclick = () => {
          if (!selected.date || !selected.time) return;
          const appointment = {
            date: selected.date,
            time: selected.time,
            doctor: docName,
            department: 'Follow-up',
            location: 'Room 207'
          };
          // persist to per-patient override list
          try {
            const key = `patientAppointments:${patient.id}`;
            const raw = localStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            list.push(appointment);
            localStorage.setItem(key, JSON.stringify(list));
          } catch(_) {}
          // update local loggedInPatient copy to reflect immediately
          try {
            const meRaw = localStorage.getItem('loggedInPatient');
            const me = meRaw ? JSON.parse(meRaw) : patient;
            me.appointments = Array.isArray(me.appointments) ? [...me.appointments, appointment] : [appointment];
            localStorage.setItem('loggedInPatient', JSON.stringify(me));
            patient = me;
          } catch(_) {}
          // refresh list UI
          if (apptList) {
            const liIdx = patient.appointments.length - 1;
            const dt = new Date(appointment.date + 'T' + appointment.time);
            const item = document.createElement('li');
            item.className = 'appt-item';
            item.setAttribute('data-appt-index', String(liIdx));
            item.innerHTML = `<span>${dt.toDateString()} at ${appointment.time} – ${appointment.doctor} (${appointment.department}) • ${appointment.location}</span><span class="appt-meta">Details</span>`;
            apptList.appendChild(item);
            attachApptClickHandlers(patient, appointment.doctor);
          }
          modal.style.display = 'none';
        };

        modal.style.display = 'flex';
      }).catch(()=>{
        // fallback if data cannot be loaded
        modal.style.display = 'flex';
      });
    }
  })();

  // ========== DOCTOR DASHBOARD ACCOUNT + PATIENTS LIST ==========
  (function renderDoctorAccount() {
    const accountPane = document.querySelector('#doc-account .profile-section');
    if (!accountPane) return;

    let doctor = null;
    try {
      const raw = localStorage.getItem('loggedInDoctor');
      if (raw) doctor = JSON.parse(raw);
    } catch (e) { /* no-op */ }
    if (!doctor) return;

    fetch('data.json')
      .then(res => res.json())
      .then(data => {
        const patients = Array.isArray(data?.patients) ? data.patients : [];
        const docs = Array.isArray(data?.doctors) ? data.doctors : [];
        let doc = docs.find(d => d.id === doctor.id) || doctor;
        const ids = Array.isArray(doctor.patientsUnderCare) ? doctor.patientsUnderCare : [];
        const items = ids.map(id => {
          const p = patients.find(pp => pp.id === id);
          const name = p?.name || '-';
          const email = p?.email || '-';
          const phone = p?.phone || '-';
          return `<li><strong>Name:</strong> ${name} — <strong>Email:</strong> ${email} — <strong>Phone:</strong> ${phone}</li>`;
        }).join('');

        const patientsSection = `
          <div class="profile-card" style="margin-top: 12px;">
            <h3 style="margin-top:0;">My Patients</h3>
            <ul>
              ${items || '<li>No patients assigned.</li>'}
            </ul>
          </div>
        `;

        const renderDocView = () => {
          accountPane.innerHTML = `
            <h2>My Account</h2>
            <div class="profile-card">
              <div class="main-profile">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect fill='%234A90E2' width='150' height='150'/%3E%3Cpath fill='%23ffffff' d='M75 45c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 55c-16.5 0-30 6.7-30 15v10h60v-10c0-8.3-13.5-15-30-15z'/%3E%3C/svg%3E" alt="Profile Picture" />
                <div class="mp-meta">
                  <div class="mp-name">${doc.name || '-'}</div>
                  <div class="mp-stats">
                    <span>Specialization: ${doc.specialization || '-'}</span>
                    <span>Institution: ${doc.institutionId || '-'}</span>
                    <span>Patients: ${Array.isArray(doc.patientsUnderCare) ? doc.patientsUnderCare.length : (Array.isArray(doctor.patientsUnderCare)?doctor.patientsUnderCare.length:0)}</span>
                  </div>
                </div>
              </div>
              <ul>
                <li><strong>Name:</strong> ${doc.name || '-'}</li>
                <li><strong>Specialization:</strong> ${doc.specialization || '-'}</li>
                <li><strong>Institution ID:</strong> ${doc.institutionId || '-'}</li>
                <li><strong>Email:</strong> ${doc.email || '-'}</li>
              </ul>
              <div class="profile-actions">
                <button class="btn-edit" id="editDoctorBtn">Edit Profile</button>
              </div>
            </div>
            ${patientsSection}
          `;
          const eb = document.getElementById('editDoctorBtn');
          if (eb) eb.addEventListener('click', (e)=>{ e.preventDefault(); renderDocEdit(); });
        };

        const renderDocEdit = () => {
          accountPane.innerHTML = `
            <h2>My Account</h2>
            <div class="profile-card">
              <div class="main-profile">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect fill='%234A90E2' width='150' height='150'/%3E%3Cpath fill='%23ffffff' d='M75 45c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 55c-16.5 0-30 6.7-30 15v10h60v-10c0-8.3-13.5-15-30-15z'/%3E%3C/svg%3E" alt="Profile Picture" />
                <div class="mp-meta">
                  <div class="mp-name">${doc.name || '-'}</div>
                </div>
              </div>
              <form class="profile-edit-form">
                <div class="form-grid">
                  <label>Name<input type="text" id="editDocName" value="${doc.name || ''}"></label>
                  <label>Email<input type="email" id="editDocEmail" value="${doc.email || ''}"></label>
                  <label>Specialization<input type="text" id="editDocSpec" value="${doc.specialization || ''}"></label>
                  <label>Institution ID<input type="text" id="editDocInst" value="${doc.institutionId || ''}"></label>
                </div>
                <div class="profile-actions">
                  <button class="btn-primary btn-save" type="submit">Save</button>
                  <button class="btn-secondary btn-cancel" type="button">Cancel</button>
                </div>
              </form>
            </div>
            ${patientsSection}
          `;
          const form = accountPane.querySelector('.profile-edit-form');
          const cancel = accountPane.querySelector('.btn-cancel');
          if (cancel) cancel.addEventListener('click', ()=> renderDocView());
          if (form) form.addEventListener('submit', (e)=>{
            e.preventDefault();
            const newName = accountPane.querySelector('#editDocName').value.trim();
            const newEmail = accountPane.querySelector('#editDocEmail').value.trim();
            const newSpec = accountPane.querySelector('#editDocSpec').value.trim();
            const newInst = accountPane.querySelector('#editDocInst').value.trim();
            if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return;
            doc = { ...doc, name: newName || doc.name, email: newEmail || doc.email, specialization: newSpec || doc.specialization, institutionId: newInst || doc.institutionId };
            try { localStorage.setItem('loggedInDoctor', JSON.stringify(doc)); } catch(e) {}
            renderDocView();
          });
        };

        renderDocView();
      })
      .catch(() => {
        accountPane.innerHTML = `
          <h2>My Account</h2>
          <div class="profile-card">
            <ul>
              <li><strong>Name:</strong> ${doctor.name || '-'}</li>
              <li><strong>Specialization:</strong> ${doctor.specialization || '-'}</li>
              <li><strong>Institution ID:</strong> ${doctor.institutionId || '-'}</li>
              <li><strong>Email:</strong> ${doctor.email || '-'}</li>
            </ul>
          </div>
        `;
      });
  })();

  // ========== NAVBAR PROFILE SHORTCUTS ==========
  const patientNavCircle = document.getElementById('patientNavCircle');
  if (patientNavCircle) {
    patientNavCircle.addEventListener('click', (e) => {
      e.preventDefault();
      const panes = document.querySelectorAll('.dashboard-panes .dashboard-pane');
      panes.forEach(p => p.classList.remove('is-active'));
      const profilePaneWrap = document.querySelector('#profile');
      if (profilePaneWrap) {
        profilePaneWrap.classList.add('is-active');
        try { profilePaneWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
      }
      document.querySelectorAll('.swipe-button button').forEach(btn => btn.classList.remove('active'));
    });
  }

  const doctorNavCircle = document.getElementById('doctorNavCircle');
  if (doctorNavCircle) {
    doctorNavCircle.addEventListener('click', (e) => {
      e.preventDefault();
      const panes = document.querySelectorAll('.dashboard-panes .dashboard-pane');
      panes.forEach(p => p.classList.remove('is-active'));
      const accPaneWrap = document.querySelector('#doc-account');
      if (accPaneWrap) {
        accPaneWrap.classList.add('is-active');
        try { accPaneWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
      }
      document.querySelectorAll('.swipe-button button').forEach(btn => btn.classList.remove('active'));
    });
  }


  // --- Utility helpers ---
  function setError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
  }

  function showFormMessage(el, text, isError = false) {
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "crimson" : "green";
  }

  function clearFormMessage(el) {
    if (!el) return;
    el.textContent = "";
  }

  // Doctor dashboard: 'View Reports' button should take user to Search tab and focus input
  try {
    const btnViewReports = document.querySelector('#doc-reports .btn-primary');
    if (btnViewReports) {
      btnViewReports.addEventListener('click', (e)=>{
        e.preventDefault();
        const tabBtn = document.querySelector('.swipe-button button[data-target="#doc-search"]');
        if (tabBtn) {
          try { tabBtn.click(); } catch(_) {}
        } else {
          try {
            document.querySelectorAll('.dashboard-panes .dashboard-pane').forEach(p=>p.classList.remove('is-active'));
            const pane = document.getElementById('doc-search');
            if (pane) pane.classList.add('is-active');
          } catch(_) {}
        }
        try { const input = document.getElementById('patientSearchId'); if (input) input.focus(); } catch(_) {}
      });
    }
  } catch(_) {}
});


//new codee//

// ===== Patient Notifications Center (messages, labs, and appointments from doctor) =====
function renderPatientNotificationsCenter() {
  // Be tolerant to duplicate IDs by taking the first match
  const container = document.querySelector('#patientNotificationsCenter');
  if (!container) return;

  // Get logged-in patient
  let patient = null;
  try {
    const raw = localStorage.getItem('loggedInPatient');
    if (raw) patient = JSON.parse(raw);
  } catch (_) {}
  if (!patient) return;

  const pid = patient.id;
  const items = [];

  // --- Messages (doctor -> patient, and patient -> doctor) ---
  try {
    const msgs = JSON.parse(localStorage.getItem(`messages:${pid}`) || '[]');
    msgs.forEach(m => {
      const author = m.fromDoctorName ? `Dr. ${m.fromDoctorName}` : t('you');
      items.push({ type: 'msg', at: m.createdAt || new Date().toISOString(), text: m.text, author });
    });
  } catch(_) {}

  // --- Lab orders ---
  try {
    const labs = JSON.parse(localStorage.getItem(`labOrders:${pid}`) || '[]');
    labs.forEach(l => items.push({ type: 'lab', at: l.orderedAt || new Date().toISOString(), text: `${t('labOrder')}: ${Array.isArray(l.tests) ? l.tests.join(', ') : ''}`, author: t('system') }));
  } catch(_) {}

  // --- Appointments ---
  try {
    const appts = JSON.parse(localStorage.getItem(`patientAppointments:${pid}`) || '[]');
    appts.forEach(a => items.push({ type: 'appt', at: `${a.date} ${a.time || ''}`.trim(), text: `${t('appointmentLabel')}: ${a.date} ${a.time || ''}`, author: t('system') }));
  } catch(_) {}

  // Newest first
  items.sort((a,b)=> new Date(b.at||0) - new Date(a.at||0));

  // Update notifications tab badge
  try { const badge = document.getElementById('patNotifCount'); if (badge) badge.textContent = String(items.length || ''); } catch(_){}

  // Helpers
  const getInitials = (name)=>{
    if (!name) return '•';
    const parts = String(name).split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || '') + ((parts[1]?.[0]) || '');
  };
  const makeRow = (it)=>{
    const label = it.type==='msg' ? t('messageLabel') : it.type==='lab' ? t('labLabel') : it.type==='appt' ? t('appointmentLabel') : t('noteLabel');
    const cls = it.type;
    const avatarKind = String(it.author).startsWith('Dr.') ? 'doctor' : (it.author===t('you') ? 'patient' : 'system');
    return `
      <div class="comment-item ${cls}">
        <div class="comment-meta"><span class="comment-badge ${cls}">${label}</span> <span>${new Date(it.at||Date.now()).toLocaleString()}</span></div>
        <div class="comment-line">
          <span class="comment-avatar ${avatarKind}">${getInitials(String(it.author).replace(/^Dr\.?\s*/, '').trim()).toUpperCase()}</span>
          <div class="comment-text"><strong>${it.author}:</strong> ${it.text}</div>
        </div>
      </div>`;
  };

  const empty = !items.length;
  const list = empty ? '' : items.map(makeRow).join('');
  container.innerHTML = `
    <div class="comment-box">
      <div style="display:flex; gap:8px; margin:0 0 10px 0; align-items:center;">
        <label style="font-size:12px; color:#6b7280;">${t('filter')}</label>
        <select id="patNotifFilter" style="padding:6px 8px; border-radius:8px; border:1px solid #e5e7eb;">
          <option value="all">${t('all')}</option>
          <option value="msg">${t('messages')}</option>
          <option value="lab">${t('labs')}</option>
          <option value="appt">${t('appointments')}</option>
        </select>
      </div>
      <div id="patNotifList">${empty ? `<div class=\"comment-empty\">${t('noNotificationsYet')}</div>` : list}</div>
    </div>`;

  const sel = document.getElementById('patNotifFilter');
  sel?.addEventListener('change', ()=>{
    const v = sel.value;
    const filtered = v==='all' ? items : items.filter(x=> x.type===v);
    const html = filtered.length ? filtered.map(makeRow).join('') : `<div class=\"comment-empty\">${t('noItems')}</div>`;
    const target = document.getElementById('patNotifList');
    if (target) target.innerHTML = html;
  });

  // Ensure live refresh when LS changes (once per page)
  try {
    const pidStr = String(pid);
    const onStorage = (e)=>{
      if (!e || !e.key) return;
      const keys = [`messages:${pidStr}`, `labOrders:${pidStr}`, `patientAppointments:${pidStr}`];
      if (keys.includes(e.key)) {
        try { renderPatientNotificationsCenter(); } catch(_){}
      }
    };
    window.removeEventListener('storage', window._patNotifCenterStorageHandler || (()=>{}));
    window._patNotifCenterStorageHandler = onStorage;
    window.addEventListener('storage', onStorage);
  } catch(_){}
}

// Expose globally and auto-run
try {
  window.renderPatientNotificationsCenter = renderPatientNotificationsCenter;
} catch (_) {}
renderPatientNotificationsCenter();
