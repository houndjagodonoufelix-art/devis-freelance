// ===== CONFIGURATION =====
const API_URL = 'http://localhost:3000/api';

// ===== STATE =====
let state = {
  tasks: [],
  tva: 0,
  template: 0,
  color: '#4F46E5',
  logos: { myLogo: null, clientLogo: null },
  currentStep: 0,
  token: localStorage.getItem('token') || null,
  entreprise: JSON.parse(localStorage.getItem('entreprise') || 'null')
};

let histDevis = [];
let modalDevis = null;

// ===== TEMPLATES & COULEURS =====
const TEMPLATES = [
  { name: 'Classique' }, { name: 'Moderne' }, { name: 'Minimaliste' },
  { name: 'Corporate' }, { name: 'Créatif' }, { name: 'Élégant' },
  { name: 'Tech' }, { name: 'Simple' }, { name: 'Pro+' }, { name: 'Coloré' }
];

const PRESET_COLORS = [
  { hex: '#4F46E5', name: 'Indigo' }, { hex: '#0F6E56', name: 'Teal' },
  { hex: '#D85A30', name: 'Corail' }, { hex: '#185FA5', name: 'Bleu' },
  { hex: '#639922', name: 'Vert' }, { hex: '#D4537E', name: 'Rose' },
  { hex: '#BA7517', name: 'Ambre' }, { hex: '#E24B4A', name: 'Rouge' },
  { hex: '#444441', name: 'Ardoise' }, { hex: '#993556', name: 'Bordeaux' },
  { hex: '#7C3AED', name: 'Violet' }, { hex: '#0891B2', name: 'Cyan' }
];

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
  if (state.token && state.entreprise) {
    showApp();
  } else {
    showAuth();
  }

  // Dates par défaut
  const today = new Date().toISOString().split('T')[0];
  const exp = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
  document.getElementById('devisDate').value = today;
  document.getElementById('devisExpiry').value = exp;
  document.getElementById('devisNum').value = 'DEV-' + new Date().getFullYear() + '-001';

  addTask();
  updateTotals();
});

// ===== AUTH =====
function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('navEntrepriseName').textContent =
    state.entreprise?.nom || '';
  chargerProfil();
}

function switchTab(tab) {
  document.getElementById('formConnexion').style.display =
    tab === 'connexion' ? 'block' : 'none';
  document.getElementById('formInscription').style.display =
    tab === 'inscription' ? 'block' : 'none';
  document.getElementById('tabConnexion').className =
    'auth-tab' + (tab === 'connexion' ? ' active' : '');
  document.getElementById('tabInscription').className =
    'auth-tab' + (tab === 'inscription' ? ' active' : '');
}

async function connexion() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  if (!email || !password) {
    errEl.textContent = 'Veuillez remplir tous les champs.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mot_de_passe: password })
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.message || 'Erreur de connexion.';
      errEl.style.display = 'block';
      return;
    }

    state.token = data.token;
    state.entreprise = data.entreprise;
    localStorage.setItem('token', data.token);
    localStorage.setItem('entreprise', JSON.stringify(data.entreprise));
    errEl.style.display = 'none';
    showApp();
    showToast('Bienvenue ' + data.entreprise.nom + ' !', 'success');

  } catch (e) {
    errEl.textContent = 'Impossible de contacter le serveur.';
    errEl.style.display = 'block';
  }
}

async function inscription() {
  const nom = document.getElementById('regNom').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const tel = document.getElementById('regTel').value.trim();
  const adresse = document.getElementById('regAdresse').value.trim();
  const ifu = document.getElementById('regIfu').value.trim();
  const errEl = document.getElementById('regError');

  if (!nom || !email || !password) {
    errEl.textContent = 'Nom, email et mot de passe sont obligatoires.';
    errEl.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/inscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom, email, mot_de_passe: password,
        telephone: tel, adresse, ifu
      })
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.message || 'Erreur inscription.';
      errEl.style.display = 'block';
      return;
    }

    state.token = data.token;
    state.entreprise = data.entreprise;
    localStorage.setItem('token', data.token);
    localStorage.setItem('entreprise', JSON.stringify(data.entreprise));
    errEl.style.display = 'none';
    showApp();
    showToast('Compte créé avec succès !', 'success');

  } catch (e) {
    errEl.textContent = 'Impossible de contacter le serveur.';
    errEl.style.display = 'block';
  }
}

function deconnexion() {
  state.token = null;
  state.entreprise = null;
  localStorage.removeItem('token');
  localStorage.removeItem('entreprise');
  showAuth();
  showToast('Déconnexion réussie.', 'info');
}

// ===== PROFIL =====
async function chargerProfil() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) return;
    const p = await res.json();

    document.getElementById('myName').value = p.nom || '';
    document.getElementById('myEmail').value = p.email || '';
    document.getElementById('myPhone').value = p.telephone || '';
    document.getElementById('myAddress').value = p.adresse || '';
    document.getElementById('mySiret').value = p.ifu || '';

    if (p.logo) {
      state.logos.myLogo = p.logo;
      const prev = document.getElementById('myLogoPreview');
      if (prev) { prev.src = p.logo; prev.style.display = 'block'; }
      const txt = document.getElementById('myLogoText');
      if (txt) txt.style.display = 'none';
    }
  } catch (e) {
    console.error('Erreur chargement profil', e);
  }
}

async function saveProfile() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({
        nom: g('myName'),
        telephone: g('myPhone'),
        adresse: g('myAddress'),
        ifu: g('mySiret'),
        logo: state.logos.myLogo
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Profil sauvegardé !', 'success');
      // Mettre à jour le nom dans la navbar
      state.entreprise.nom = g('myName');
      localStorage.setItem('entreprise', JSON.stringify(state.entreprise));
      document.getElementById('navEntrepriseName').textContent = g('myName');
    } else {
      showToast(data.message || 'Erreur sauvegarde.', 'danger');
    }
  } catch (e) {
    showToast('Impossible de contacter le serveur.', 'danger');
  }
}

// ===== NAVIGATION ÉTAPES =====
function goStep(n) {
  [0, 1, 2, 3, 4].forEach(i => {
    document.getElementById('step' + i).style.display = i === n ? 'block' : 'none';
    const btn = document.getElementById('s' + i);
    if (btn) btn.className = 'step-btn' +
      (i === n ? ' active' : i < n ? ' done' : '');
  });
  state.currentStep = n;
  if (n === 2) initTemplateGrid();
  if (n === 3) renderPreview();
  if (n === 4) loadHistory();
}

function nouveauDevis() {
  // Réinitialiser le formulaire
  state.tasks = [];
  state.tva = 0;
  state.template = 0;
  state.color = '#4F46E5';
  state.logos.clientLogo = null;

  document.getElementById('clientName').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('clientAddress').value = '';
  document.getElementById('clientContact').value = '';
  document.getElementById('devisNotes').value = '';
  document.getElementById('paymentTerms').value = '';
  document.getElementById('clientLogoPreview').style.display = 'none';
  document.getElementById('clientLogoText').style.display = 'block';

  const today = new Date().toISOString().split('T')[0];
  const exp = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
  document.getElementById('devisDate').value = today;
  document.getElementById('devisExpiry').value = exp;
  document.getElementById('devisNum').value = 'DEV-' + new Date().getFullYear() + '-' +
    String(histDevis.length + 1).padStart(3, '0');

  addTask();
  goStep(0);
}

// ===== TÂCHES =====
function addTask() {
  state.tasks.push({ desc: '', qty: 1, prix: 0 });
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  if (state.tasks.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:1.5rem;
      color:#9ca3af;font-size:13px">
      Aucune tâche. Cliquez sur "+ Ajouter" ci-dessous.</div>`;
    updateTotals();
    return;
  }
  list.innerHTML = '';
  state.tasks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'task-row';
    row.innerHTML = `
      <input value="${escH(t.desc)}" placeholder="Description..."
        oninput="state.tasks[${i}].desc=this.value;updateTotals()">
      <input type="number" value="${t.qty}" min="1" style="text-align:center"
        oninput="state.tasks[${i}].qty=parseFloat(this.value)||0;updateTotals()">
      <input type="number" value="${t.prix}" min="0" placeholder="0"
        oninput="state.tasks[${i}].prix=parseFloat(this.value)||0;updateTotals()">
      <span style="font-size:13px;font-weight:600;text-align:right;padding-right:4px">
        ${fmt(t.qty * t.prix)}</span>
      <button onclick="removeTask(${i})" class="btn btn-danger"
        style="padding:6px;width:34px;height:34px;justify-content:center">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button>`;
    list.appendChild(row);
  });
  updateTotals();
}

function removeTask(i) {
  state.tasks.splice(i, 1);
  renderTasks();
}

// ===== TVA & TOTAUX =====
function setTVA(v) {
  state.tva = v;
  document.querySelectorAll('.tva-option').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById('tva' + v);
  if (el) el.classList.add('selected');
  updateTotals();
}

function updateTotals() {
  const ht = state.tasks.reduce((s, t) => s + t.qty * t.prix, 0);
  const tvaAmt = ht * state.tva / 100;
  const ttc = ht + tvaAmt;
  document.getElementById('sousTotal').textContent = fmt(ht);
  document.getElementById('tvaLabel').textContent = `TVA (${state.tva}%)`;
  document.getElementById('tvaAmount').textContent = fmt(tvaAmt);
  document.getElementById('totalTTC').textContent = fmt(ttc);
}

function fmt(n, cur) {
  const c = cur || (document.getElementById('currency')?.value || 'FCFA');
  return Math.round(n).toLocaleString('fr-FR') + ' ' + c;
}

// ===== LOGOS =====
function uploadLogo(key, input) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    state.logos[key] = e.target.result;
    const prev = document.getElementById(key + 'Preview');
    const text = document.getElementById(key + 'Text');
    if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
    if (text) text.style.display = 'none';
    if (state.currentStep === 3) renderPreview();
  };
  r.readAsDataURL(f);
}

// ===== TEMPLATES =====
function initTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = '';
  TEMPLATES.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'template-card' + (state.template === i ? ' selected' : '');
    d.onclick = () => selectTemplate(i);
    d.innerHTML = `
      <div class="template-preview" id="tp${i}"></div>
      <div class="template-name">${t.name}</div>`;
    grid.appendChild(d);
  });
  TEMPLATES.forEach((_, i) => renderTemplateMini(i));
  initColorDots();
}

function renderTemplateMini(i) {
  const c = state.color;
  const previews = [
    `<div style="background:${c};height:20px;margin-bottom:6px"></div>
     <div style="padding:4px">
       <div style="background:#eee;height:5px;border-radius:1px;margin-bottom:3px"></div>
       <div style="background:#eee;height:5px;border-radius:1px;width:70%"></div>
     </div>`,
    `<div style="background:${c};height:100%;padding:6px">
       <div style="color:white;font-size:8px;font-weight:500">DEVIS</div>
       <div style="background:rgba(255,255,255,0.2);height:20px;border-radius:3px;margin-top:6px"></div>
     </div>`,
    `<div style="padding:6px">
       <div style="width:30px;height:3px;background:${c};margin-bottom:6px;border-radius:1px"></div>
       <div style="background:#f5f5f5;height:8px;border-radius:2px;margin-bottom:4px"></div>
       <div style="background:#f5f5f5;height:8px;border-radius:2px;width:60%"></div>
     </div>`,
    `<div style="display:flex;height:100%">
       <div style="width:20px;background:${c}"></div>
       <div style="flex:1;padding:6px">
         <div style="font-size:8px;font-weight:500;color:${c}">DEVIS</div>
         <div style="background:#eee;height:5px;border-radius:1px;margin-top:4px"></div>
       </div>
     </div>`,
    `<div style="padding:6px;text-align:center">
       <div style="width:24px;height:24px;background:${c};border-radius:50%;
         margin:0 auto 4px;display:flex;align-items:center;justify-content:center;
         color:white;font-size:9px">D</div>
       <div style="background:#eee;height:5px;border-radius:2px"></div>
     </div>`,
    `<div style="padding:6px">
       <div style="border-bottom:2px solid ${c};padding-bottom:4px;margin-bottom:4px">
         <span style="font-size:8px;font-weight:600;color:${c}">DEVIS</span>
       </div>
       <div style="background:#f9f9f9;height:28px;border-radius:2px"></div>
     </div>`,
    `<div style="background:#0f0f1a;height:100%;padding:6px">
       <div style="color:${c};font-size:8px;font-weight:600;margin-bottom:4px">DEVIS</div>
       <div style="background:rgba(255,255,255,0.1);height:5px;border-radius:1px;margin-bottom:3px"></div>
     </div>`,
    `<div style="padding:8px">
       <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
         <div style="background:${c};width:20px;height:20px;border-radius:3px"></div>
       </div>
       <div style="background:#eee;height:5px;border-radius:1px;margin-bottom:3px"></div>
     </div>`,
    `<div style="padding:6px;height:100%">
       <div style="background:${c};height:3px;border-radius:1px;margin-bottom:6px"></div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
         <div style="background:${c};opacity:0.15;height:14px;border-radius:2px"></div>
         <div style="background:${c};opacity:0.15;height:14px;border-radius:2px"></div>
       </div>
     </div>`,
    `<div style="background:${c};height:100%;padding:6px">
       <div style="background:rgba(255,255,255,0.95);border-radius:3px;
         padding:4px;margin-top:16px">
         <div style="font-size:7px;color:${c};font-weight:600">DEVIS PROFESSIONNEL</div>
       </div>
     </div>`
  ];
  const el = document.getElementById('tp' + i);
  if (el) el.innerHTML = previews[i] || previews[0];
}

function selectTemplate(i) {
  state.template = i;
  document.querySelectorAll('.template-card').forEach((el, j) => {
    el.className = 'template-card' + (j === i ? ' selected' : '');
  });
  if (state.currentStep === 3) renderPreview();
}

// ===== COULEURS =====
function initColorDots() {
  const wrap = document.getElementById('colorDots');
  wrap.innerHTML = '';
  PRESET_COLORS.forEach(c => {
    const d = document.createElement('div');
    d.className = 'color-dot' +
      (state.color.toLowerCase() === c.hex.toLowerCase() ? ' selected' : '');
    d.style.background = c.hex;
    d.dataset.hex = c.hex;
    d.title = c.name;
    d.onclick = () => {
      applyColor(c.hex);
      document.getElementById('hexInput').value = c.hex.replace('#', '');
      document.getElementById('nativePicker').value = c.hex;
      document.getElementById('swatchBtn').style.background = c.hex;
    };
    wrap.appendChild(d);
  });
}

function onHexInput(val) {
  const clean = val.replace('#', '');
  if (clean.length === 6 && /^[0-9A-Fa-f]{6}$/.test(clean)) {
    const full = '#' + clean;
    document.getElementById('swatchBtn').style.background = full;
    document.getElementById('nativePicker').value = full;
    updatePillPreview(full);
  }
}

function onNativePicker(val) {
  const h = val.toUpperCase();
  document.getElementById('swatchBtn').style.background = h;
  document.getElementById('hexInput').value = h.replace('#', '');
  applyColor(h);
}

function applyHex() {
  const raw = document.getElementById('hexInput').value.trim();
  const full = (raw.startsWith('#') ? raw : '#' + raw).toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(full)) {
    showToast('Code couleur invalide (ex: FF5733)', 'danger');
    return;
  }
  document.getElementById('nativePicker').value = full;
  document.getElementById('swatchBtn').style.background = full;
  applyColor(full);
}

function updatePillPreview(hex) {
  document.getElementById('pillSwatch').style.background = hex;
  document.getElementById('pillHex').textContent = hex.toUpperCase();
  const p = PRESET_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  document.getElementById('pillName').textContent = p ? p.name : 'Personnalisée';
}

function applyColor(hex) {
  state.color = hex;
  updatePillPreview(hex);
  document.querySelectorAll('.color-dot').forEach(el => {
    el.classList.toggle('selected',
      el.dataset.hex && el.dataset.hex.toLowerCase() === hex.toLowerCase());
  });
  TEMPLATES.forEach((_, i) => renderTemplateMini(i));
  if (state.currentStep === 3) renderPreview();
}

// ===== APERÇU DEVIS =====
function g(id) { return (document.getElementById(id) || {}).value || ''; }
function escH(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updatePreview() {
  if (state.currentStep === 3) renderPreview();
}

function renderPreview() {
  const container = document.getElementById('devisPreviewContainer');
  if (!container) return;
  container.innerHTML = `
    <div style="background:white;border:1px solid #e5e7eb;
      border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04)">
      ${buildDevisHTML()}
    </div>`;
}

function buildDevisHTML(d) {
  const data = d || {};
  const c = data.color || state.color;
  const tasks = data.tasks || state.tasks;
  const tva = data.tva !== undefined ? data.tva : state.tva;
  const logos = data.logos || state.logos;
  const cur = data.currency || (document.getElementById('currency')?.value || 'FCFA');

  const vals = {
    myName: data.myName || g('myName'),
    myEmail: data.myEmail || g('myEmail'),
    myPhone: data.myPhone || g('myPhone'),
    myAddress: data.myAddress || g('myAddress'),
    clientName: data.clientName || g('clientName'),
    clientEmail: data.clientEmail || g('clientEmail'),
    clientPhone: data.clientPhone || g('clientPhone'),
    clientAddress: data.clientAddress || g('clientAddress'),
    clientContact: data.clientContact || g('clientContact'),
    devisNum: data.devisNum || g('devisNum'),
    devisDate: data.devisDate || g('devisDate'),
    devisExpiry: data.devisExpiry || g('devisExpiry'),
    devisObjet: data.devisObjet || g('devisObjet'),
    devisNotes: data.devisNotes || g('devisNotes'),
  };

  const gv = k => vals[k] || '';
  const ht = tasks.reduce((s, t) => s + t.qty * t.prix, 0);
  const tvaAmt = ht * tva / 100;
  const ttc = ht + tvaAmt;
  const fmtN = n => Math.round(n).toLocaleString('fr-FR') + ' ' + cur;

  const myLogo = logos.myLogo
    ? `<img src="${logos.myLogo}" style="max-height:60px;max-width:130px;object-fit:contain">`
    : `<div style="font-size:18px;font-weight:600;color:${c}">${escH(gv('myName')) || 'Mon Entreprise'}</div>`;

  const clientLogo = logos.clientLogo
    ? `<img src="${logos.clientLogo}" style="max-height:60px;max-width:130px;object-fit:contain">`
    : `<div style="font-size:14px;font-weight:500;color:#666">${escH(gv('clientName')) || 'Client'}</div>`;

  const taskRows = tasks.map(t => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f4f6">
        ${escH(t.desc)}</td>
      <td style="padding:8px 12px;text-align:center;font-size:13px;border-bottom:1px solid #f3f4f6">
        ${t.qty}</td>
      <td style="padding:8px 12px;text-align:right;font-size:13px;border-bottom:1px solid #f3f4f6">
        ${Math.round(t.prix).toLocaleString('fr-FR')}</td>
      <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6">
        ${Math.round(t.qty * t.prix).toLocaleString('fr-FR')}</td>
    </tr>`).join('');

  const info = [
    gv('devisNum') ? `N° ${gv('devisNum')}` : '',
    gv('devisDate') ? `Émis le ${gv('devisDate')}` : '',
    gv('devisExpiry') ? `Expire le ${gv('devisExpiry')}` : '',
    gv('devisObjet') ? `Objet : ${gv('devisObjet')}` : ''
  ].filter(Boolean).join(' · ');

  const addrMy = ['myName', 'myEmail', 'myPhone', 'myAddress']
    .map(k => gv(k)).filter(Boolean)
    .map(p => `<div style="font-size:12px;color:#555;line-height:1.6">${escH(p)}</div>`).join('');

  const addrCl = ['clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'clientContact']
    .map(k => gv(k)).filter(Boolean)
    .map(p => `<div style="font-size:12px;color:#555;line-height:1.6">${escH(p)}</div>`).join('');

  const tableHead = `
    <table style="width:100%;border-collapse:collapse;margin:1.5rem 0">
      <thead>
        <tr style="background:${c}">
          <th style="padding:10px 12px;text-align:left;color:white;font-size:12px;font-weight:500">
            Description</th>
          <th style="padding:10px 12px;text-align:center;color:white;font-size:12px;font-weight:500">
            Qté</th>
          <th style="padding:10px 12px;text-align:right;color:white;font-size:12px;font-weight:500">
            P.U.</th>
          <th style="padding:10px 12px;text-align:right;color:white;font-size:12px;font-weight:500">
            Total</th>
        </tr>
      </thead>
      <tbody>`;

  const totals = `
    <div style="margin-left:auto;max-width:260px;margin-top:1rem">
      <div style="display:flex;justify-content:space-between;
        padding:5px 0;font-size:13px;color:#6b7280">
        <span>Sous-total HT</span><span>${fmtN(ht)}</span></div>
      <div style="display:flex;justify-content:space-between;
        padding:5px 0;font-size:13px;color:#6b7280">
        <span>TVA (${tva}%)</span><span>${fmtN(tvaAmt)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;
        font-size:16px;font-weight:700;border-top:2px solid ${c};margin-top:4px;color:#1a1a2e">
        <span>Total TTC</span><span>${fmtN(ttc)}</span></div>
    </div>`;

  const notes = gv('devisNotes')
  ? `<div style="margin-top:1.5rem;padding:12px;background:#f9fafb;
      border-radius:8px;font-size:12px;color:#6b7280;line-height:1.6">
      <strong style="color:#374151">Notes :</strong><br>${escH(gv('devisNotes'))}
    </div>` : '';

const conditionsPaiement = gv('paymentTerms')
  ? `<div style="margin-top:10px;padding:12px;background:#f0fdf4;
      border-left:3px solid #059669;font-size:12px;color:#065f46;line-height:1.6">
      <strong>Conditions de paiement :</strong> ${escH(gv('paymentTerms'))}
    </div>` : '';

const signature = `
  <div style="margin-top:auto;padding-top:1.5rem;margin-top:2rem">
    <div style="border-top:1px dashed #e5e7eb;padding-top:1.5rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;
            color:#9ca3af;margin-bottom:8px;font-weight:600">
            Signature du prestataire</div>
          <div style="font-size:12px;color:#374151;margin-bottom:50px">
            Nom : ${escH(gv('myName'))}</div>
          <div style="border-bottom:1.5px solid #374151;width:80%;margin-bottom:4px"></div>
          <div style="font-size:11px;color:#9ca3af">Signature & Cachet</div>
        </div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;
            color:#9ca3af;margin-bottom:8px;font-weight:600">
            Signature du client</div>
          <div style="font-size:12px;color:#374151;margin-bottom:50px">
            Nom : ${escH(gv('clientName'))}<br>
            <span style="font-size:11px;color:#9ca3af">
              Lu et approuvé, bon pour accord</span>
          </div>
          <div style="border-bottom:1.5px solid #374151;width:80%;margin-bottom:4px"></div>
          <div style="font-size:11px;color:#9ca3af">Signature & Cachet</div>
        </div>
      </div>
    </div>
  </div>`;

  const tIdx = data.template !== undefined ? data.template : state.template;

  const tpls = [
    // T0 Classique
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:3px solid ${c}">
        <div>${myLogo}<div style="margin-top:8px">${addrMy}</div></div>
        <div style="text-align:right">
          <div style="font-size:36px;font-weight:700;color:${c};letter-spacing:-1px">DEVIS</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px">${info}</div>
          <div style="margin-top:14px">${clientLogo}
            <div style="margin-top:6px">${addrCl}</div></div>
        </div>
      </div>
      ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

    // T1 Moderne
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="background:${c};padding:2rem;display:flex;
        justify-content:space-between;align-items:center">
        <div>${myLogo}
          <div style="margin-top:6px">
            ${['myName','myEmail','myPhone'].map(k =>
              `<div style="font-size:11px;color:rgba(255,255,255,0.8)">${escH(gv(k))}</div>`
            ).join('')}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:40px;font-weight:700;color:white">DEVIS</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px">${info}</div>
        </div>
      </div>
      <div style="padding:2rem">
        <div style="background:#f9fafb;border-radius:8px;padding:1rem;margin-bottom:1.5rem">
          ${clientLogo}${addrCl}
        </div>
${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

    // T2 Minimaliste
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="border-bottom:3px solid ${c};padding-bottom:1.5rem;
        margin-bottom:1.5rem;display:flex;justify-content:space-between">
        <div>
          <div style="font-size:30px;font-weight:300;letter-spacing:3px;color:${c}">DEVIS</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:6px">${info}</div>
        </div>
        <div>${myLogo}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem">
        <div><div style="font-size:10px;text-transform:uppercase;
          letter-spacing:1px;color:#9ca3af;margin-bottom:8px">De</div>${addrMy}</div>
        <div><div style="font-size:10px;text-transform:uppercase;
          letter-spacing:1px;color:#9ca3af;margin-bottom:8px">À</div>
          ${clientLogo}${addrCl}</div>
      </div>
      ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

    // T3 Corporate
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="width:220px;background:${c};padding:1.5rem;flex-shrink:0">
        <div style="margin-bottom:1.5rem">${myLogo}</div>
        <div style="font-size:10px;text-transform:uppercase;
          color:rgba(255,255,255,0.6);letter-spacing:1px;margin-bottom:8px">Contact</div>
        ${['myName','myEmail','myPhone','myAddress'].map(k =>
          `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:3px">
            ${escH(gv(k))}</div>`).join('')}
        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.2)">
          <div style="font-size:10px;text-transform:uppercase;
            color:rgba(255,255,255,0.6);letter-spacing:1px;margin-bottom:8px">Client</div>
          ${clientLogo}
          ${['clientName','clientEmail','clientPhone'].map(k =>
            `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:3px">
              ${escH(gv(k))}</div>`).join('')}
        </div>
      </div>
      <div style="flex:1;padding:2rem">
        <div style="font-size:32px;font-weight:700;color:${c};margin-bottom:4px">DEVIS</div>
        <div style="font-size:11px;color:#9ca3af;margin-bottom:1.5rem">${info}</div>
        ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,


    // T4 Créatif
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;
        align-items:center;margin-bottom:2rem">
        ${myLogo}
        <div style="text-align:center">
          <div style="border:3px solid ${c};padding:10px 24px;display:inline-block">
            <div style="font-size:34px;font-weight:700;
              letter-spacing:6px;color:${c}">DEVIS</div>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:8px">${info}</div>
        </div>
        ${clientLogo}
      </div>
      ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,


    // T5 Élégant
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="padding:2rem 2.5rem;border-bottom:2px solid ${c}">
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div style="font-size:11px;text-transform:uppercase;
              letter-spacing:2px;color:#9ca3af">Document commercial</div>
            <div style="font-size:40px;font-weight:700;color:${c};line-height:1.1">DEVIS</div>
            <div style="font-size:11px;color:#9ca3af">${info}</div>
          </div>
          <div style="text-align:right">${myLogo}${addrMy}</div>
        </div>
      </div>
      <div style="padding:2rem 2.5rem">
        <div style="display:flex;justify-content:flex-end;margin-bottom:1.5rem">
          <div style="text-align:right">${clientLogo}${addrCl}</div>
        </div>
        ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

    // T6 Tech
   () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="border:1px solid ${c};padding:1.5rem;margin-bottom:1.5rem;
        display:flex;justify-content:space-between">
        <div>${myLogo}${addrMy}</div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:700;color:${c}">DEVIS</div>
          <div style="font-size:10px;color:#6b7280;margin-top:4px">${info}</div>
        </div>
      </div>
      <div style="margin-bottom:1.5rem;padding:1rem;border:1px solid #333">
        ${clientLogo}${addrCl}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
        <thead><tr style="border-bottom:1px solid ${c}">
          <th style="padding:8px;text-align:left;color:${c};font-size:11px">DESCRIPTION</th>
          <th style="padding:8px;text-align:center;color:${c};font-size:11px">QTÉ</th>
          <th style="padding:8px;text-align:right;color:${c};font-size:11px">P.U.</th>
          <th style="padding:8px;text-align:right;color:${c};font-size:11px">TOTAL</th>
        </tr></thead>
        <tbody>${tasks.map(t => `
          <tr>
            <td style="padding:8px;font-size:12px;border-bottom:1px solid #1a1a2e;color:#ccc">
              ${escH(t.desc)}</td>
            <td style="padding:8px;text-align:center;font-size:12px;color:#ccc">${t.qty}</td>
            <td style="padding:8px;text-align:right;font-size:12px;color:#ccc">
              ${Math.round(t.prix).toLocaleString('fr-FR')}</td>
            <td style="padding:8px;text-align:right;font-size:12px;color:${c};font-weight:600">
              ${Math.round(t.qty * t.prix).toLocaleString('fr-FR')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-left:auto;max-width:240px">
        <div style="display:flex;justify-content:space-between;
          font-size:12px;color:#6b7280;padding:4px 0">
          <span>HT</span><span>${fmtN(ht)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;
          font-weight:700;color:${c};border-top:1px solid ${c};padding-top:8px;margin-top:4px">
          <span>TOTAL TTC</span><span>${fmtN(ttc)}</span></div> 
      </div></div> ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>,`,

    // T7 Simple
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2rem">
        <div>${myLogo}<div style="margin-top:6px">${addrMy}</div></div>
        <div style="text-align:right">
          <div style="background:${c};display:inline-block;
            padding:10px 24px;border-radius:6px">
            <div style="font-size:22px;font-weight:700;color:white;
              letter-spacing:2px">DEVIS</div>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:10px">${info}</div>
          <div style="margin-top:12px">${clientLogo}${addrCl}</div>
        </div>
      </div>
      ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,


    // T8 Pro+
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="background:white;border-bottom:1px solid #e5e7eb;padding:2rem 2.5rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>${myLogo}<div style="margin-top:8px">${addrMy}</div></div>
          <div style="text-align:right">
            <div style="font-size:11px;text-transform:uppercase;
              letter-spacing:2px;color:#9ca3af">Devis</div>
            <div style="font-size:46px;font-weight:300;color:${c};
              line-height:1.1;margin:-4px 0">
              #${(gv('devisNum') || '001').replace(/[^0-9]/g, '')}</div>
            <div style="font-size:11px;color:#9ca3af">${gv('devisDate') || ''}</div>
          </div>
        </div>
      </div>
      <div style="padding:2rem 2.5rem">
        <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;
          padding:1rem;margin-bottom:1.5rem">
          ${clientLogo}${addrCl}
        </div>
        ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

    // T9 Coloré
    () => `<div style="font-family:Georgia,serif;color:#1a1a2e;background:white;padding:2.5rem;min-height:277mm;display:flex;flex-direction:column;">
      <div style="background:white;border-radius:14px;padding:2rem">
        <div style="display:flex;justify-content:space-between;
          align-items:flex-start;margin-bottom:1.5rem">
          <div>${myLogo}<div style="margin-top:6px">${addrMy}</div></div>
          <div style="text-align:right">
            <div style="background:${c};display:inline-block;padding:6px 16px;
              border-radius:20px;color:white;font-size:13px;font-weight:600;
              letter-spacing:1px">DEVIS</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:8px">${info}</div>
            <div style="margin-top:10px">${clientLogo}${addrCl}</div>
          </div>
        </div>
        <div style="background:${c}18;border-radius:10px;overflow:hidden;margin:1.5rem 0">
        ${tableHead}${taskRows}</tbody></table>
<div style="flex:1"></div>
${totals}${notes}${conditionsPaiement}${signature}</div></div>`,

  ];

  return (tpls[tIdx] || tpls[0])();
}

// ===== SAUVEGARDER DEVIS =====
async function saveDevis() {
  if (!state.token) { showToast('Connectez-vous d\'abord.', 'danger'); return; }

  const cur = document.getElementById('currency')?.value || 'FCFA';
  const ht = state.tasks.reduce((s, t) => s + t.qty * t.prix, 0);
  const total = ht * (1 + state.tva / 100);

  const payload = {
    client_nom: g('clientName'),
    client_email: g('clientEmail'),
    client_telephone: g('clientPhone'),
    client_adresse: g('clientAddress'),
    client_contact: g('clientContact'),
    client_logo: state.logos.clientLogo,
    numero: g('devisNum'),
    date_emission: g('devisDate') || null,
    date_expiration: g('devisExpiry') || null,
    objet: g('devisObjet'),
    notes: g('devisNotes'),
    conditions_paiement: g('paymentTerms'),
    tva: state.tva,
    devise: cur,
    template: state.template,
    couleur: state.color,
    total,
    taches: state.tasks
  };

  try {
    const res = await fetch(`${API_URL}/devis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`Devis "${g('clientName') || 'Sans nom'}" sauvegardé !`, 'success');
    } else {
      showToast(data.message || 'Erreur sauvegarde.', 'danger');
    }
  } catch (e) {
    showToast('Impossible de contacter le serveur.', 'danger');
  }
}

// ===== HISTORIQUE =====
async function loadHistory() {
  if (!state.token) return;
  try {
    const res = await fetch(`${API_URL}/devis`, {
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) return;
    histDevis = await res.json();
    renderHistory();
    updateHistStats();
  } catch (e) {
    showToast('Impossible de charger l\'historique.', 'danger');
  }
}

function updateHistStats() {
  const count = histDevis.length;
  const total = histDevis.reduce((s, d) => s + parseFloat(d.total || 0), 0);
  const clientCount = {};
  histDevis.forEach(d => {
    if (d.client_nom)
      clientCount[d.client_nom] = (clientCount[d.client_nom] || 0) + 1;
  });
  const topClient = Object.entries(clientCount).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('statCount').textContent = count;
  document.getElementById('statTotal').textContent = count > 0
    ? Math.round(total).toLocaleString('fr-FR') + ' ' + (histDevis[0]?.devise || 'FCFA')
    : '0 FCFA';
  document.getElementById('statTop').textContent = topClient ? topClient[0] : '—';
}

function renderHistory() {
  const search = (document.getElementById('histSearch')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('histSort')?.value || 'date_desc';

  let list = [...histDevis];
  if (search) {
    list = list.filter(d =>
      (d.client_nom || '').toLowerCase().includes(search) ||
      (d.numero || '').toLowerCase().includes(search) ||
      (d.objet || '').toLowerCase().includes(search)
    );
  }

  list.sort((a, b) => {
    if (sort === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'total_desc') return parseFloat(b.total) - parseFloat(a.total);
    if (sort === 'total_asc') return parseFloat(a.total) - parseFloat(b.total);
    if (sort === 'client_az') return (a.client_nom || '').localeCompare(b.client_nom || '');
    return 0;
  });

  const container = document.getElementById('histList');
  const countEl = document.getElementById('histCount');

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#9ca3af">
        <i class="ti ti-file-off" style="font-size:40px;display:block;margin-bottom:12px"></i>
        <div style="font-size:15px;font-weight:500;margin-bottom:6px">
          ${search ? 'Aucun devis trouvé' : 'Aucun devis sauvegardé'}</div>
        <div style="font-size:13px">
          ${search ? 'Essayez un autre terme.' : 'Créez votre premier devis !'}</div>
      </div>`;
    if (countEl) countEl.textContent = '';
    return;
  }

  if (countEl) countEl.textContent = `${list.length} devis`;
  container.innerHTML = '';

  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'hist-card';

    const date = d.created_at
      ? new Date(d.created_at).toLocaleDateString('fr-FR',
          { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const initials = (d.client_nom || '?').split(' ')
      .map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const hue = stringToHue(d.client_nom || '');
    const totalFmt = Math.round(d.total || 0).toLocaleString('fr-FR') +
      ' ' + (d.devise || 'FCFA');
    const tplName = TEMPLATES[d.template || 0]?.name || 'Classique';

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:46px;height:46px;border-radius:50%;
          background:hsl(${hue},40%,88%);display:flex;align-items:center;
          justify-content:center;font-weight:600;font-size:15px;
          color:hsl(${hue},40%,35%);flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:15px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${escH(d.client_nom || 'Client sans nom')}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:3px;
            display:flex;gap:12px;flex-wrap:wrap">
            ${d.numero ? `<span><i class="ti ti-hash"></i> ${escH(d.numero)}</span>` : ''}
            <span><i class="ti ti-calendar"></i> ${date}</span>
            ${d.objet ? `<span><i class="ti ti-tag"></i> ${escH(d.objet)}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:16px;font-weight:600;color:#1a1a2e">${totalFmt}</div>
          <div style="display:flex;align-items:center;gap:4px;
            margin-top:4px;justify-content:flex-end">
            <div style="width:10px;height:10px;border-radius:50%;
              background:${d.couleur || '#4F46E5'}"></div>
            <span style="font-size:11px;color:#9ca3af">${tplName}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;padding-top:10px;
        border-top:1px solid #f3f4f6;flex-wrap:wrap">
        <button onclick="openPreviewModal(${d.id})" class="btn" style="font-size:12px;padding:6px 12px">
          <i class="ti ti-eye"></i> Aperçu</button>
        <button onclick="downloadDevis(${d.id})" class="btn btn-success" style="font-size:12px;padding:6px 12px">
          <i class="ti ti-download"></i> PDF</button>
        <button onclick="editDevis(${d.id})" class="btn btn-warning" style="font-size:12px;padding:6px 12px">
          <i class="ti ti-edit"></i> Modifier</button>
        <button onclick="dupliquerDevis(${d.id})" class="btn" style="font-size:12px;padding:6px 12px">
          <i class="ti ti-copy"></i> Dupliquer</button>
        <button onclick="supprimerDevis(${d.id})" class="btn btn-danger"
          style="font-size:12px;padding:6px 12px;margin-left:auto">
          <i class="ti ti-trash"></i> Supprimer</button>
      </div>`;
    container.appendChild(card);
  });
}

function stringToHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// ===== ACTIONS HISTORIQUE =====
async function openPreviewModal(id) {
  try {
    const res = await fetch(`${API_URL}/devis/${id}`, {
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) return;
    const d = await res.json();
    modalDevis = d;

    const tasks = d.taches.map(t => ({
      desc: t.description, qty: t.quantite, prix: t.prix_unitaire
    }));

    const html = buildDevisHTML({
      color: d.couleur, tasks, tva: d.tva,
      logos: { myLogo: state.logos.myLogo, clientLogo: d.client_logo },
      currency: d.devise, template: d.template,
      myName: state.entreprise?.nom, myEmail: state.entreprise?.email,
      clientName: d.client_nom, clientEmail: d.client_email,
      clientPhone: d.client_telephone, clientAddress: d.client_adresse,
      clientContact: d.client_contact,
      devisNum: d.numero, devisDate: d.date_emission,
      devisExpiry: d.date_expiration, devisObjet: d.objet, devisNotes: d.notes
    });

    document.getElementById('modalPreviewContent').innerHTML =
      `<div style="background:white">${html}</div>`;
    document.getElementById('previewModal').style.display = 'flex';
  } catch (e) {
    showToast('Impossible de charger le devis.', 'danger');
  }
}

function closeModal() {
  document.getElementById('previewModal').style.display = 'none';
  modalDevis = null;
}

async function downloadDevis(id) {
  try {
    const res = await fetch(`${API_URL}/devis/${id}`, {
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) return;
    const d = await res.json();
    modalDevis = d;

    const tasks = d.taches.map(t => ({
      desc: t.description, qty: t.quantite, prix: t.prix_unitaire
    }));

    const html = buildDevisHTML({
      color: d.couleur, tasks, tva: d.tva,
      logos: { myLogo: state.logos.myLogo, clientLogo: d.client_logo },
      currency: d.devise, template: d.template,
      myName: state.entreprise?.nom,
      myEmail: state.entreprise?.email,
      clientName: d.client_nom,
      clientEmail: d.client_email,
      clientPhone: d.client_telephone,
      clientAddress: d.client_adresse,
      clientContact: d.client_contact,
      devisNum: d.numero,
      devisDate: d.date_emission,
      devisExpiry: d.date_expiration,
      devisObjet: d.objet,
      devisNotes: d.notes,
      paymentTerms: d.conditions_paiement
    });

    showToast('Génération du PDF...', 'info');

    const pdfRes = await fetch(`${API_URL}/pdf/generer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({
        html,
        filename: `devis-${(d.client_nom || 'devis').replace(/\s+/g, '-')}`
      })
    });

    if (!pdfRes.ok) {
      showToast('Erreur génération PDF.', 'danger');
      return;
    }

    const blob = await pdfRes.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devis-${(d.client_nom || 'devis').replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('PDF téléchargé !', 'success');

  } catch (e) {
    showToast('Impossible de charger le devis.', 'danger');
  }
}

function downloadFromModal() {
  if (modalDevis) exportFromModal();
}

async function exportFromModal() {
  if (!modalDevis) return;

  const tasks = modalDevis.taches
    ? modalDevis.taches.map(t => ({
        desc: t.description, qty: t.quantite, prix: t.prix_unitaire
      }))
    : state.tasks;

  const html = buildDevisHTML({
    color: modalDevis.couleur,
    tasks,
    tva: modalDevis.tva,
    logos: {
      myLogo: state.logos.myLogo,
      clientLogo: modalDevis.client_logo
    },
    currency: modalDevis.devise,
    template: modalDevis.template,
    myName: state.entreprise?.nom,
    myEmail: state.entreprise?.email,
    clientName: modalDevis.client_nom,
    clientEmail: modalDevis.client_email,
    clientPhone: modalDevis.client_telephone,
    clientAddress: modalDevis.client_adresse,
    clientContact: modalDevis.client_contact,
    devisNum: modalDevis.numero,
    devisDate: modalDevis.date_emission,
    devisExpiry: modalDevis.date_expiration,
    devisObjet: modalDevis.objet,
    devisNotes: modalDevis.notes,
    paymentTerms: modalDevis.conditions_paiement
  });

  showToast('Génération du PDF...', 'info');

  try {
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 794px;
      background: white;
      padding: 20px;
    `;
    document.body.appendChild(el);

    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794
    });

    document.body.removeChild(el);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const finalHeight = pdfWidth / ratio;

    if (finalHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, finalHeight);
    } else {
      let position = 0;
      let remainingHeight = finalHeight;
      let page = 0;
      while (remainingHeight > 0) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, pdfWidth, finalHeight);
        position += pdfHeight;
        remainingHeight -= pdfHeight;
        page++;
      }
    }

    const clientName = modalDevis.client_nom || 'devis';
    pdf.save(`devis-${clientName.replace(/\s+/g, '-')}.pdf`);
    showToast('PDF téléchargé !', 'success');

  } catch (e) {
    console.error(e);
    showToast('Erreur génération PDF.', 'danger');
  }
}

async function editDevis(id) {
  try {
    const res = await fetch(`${API_URL}/devis/${id}`, {
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) return;
    const d = await res.json();

    state.tasks = d.taches.map(t => ({
      desc: t.description, qty: parseFloat(t.quantite), prix: parseFloat(t.prix_unitaire)
    }));
    state.tva = parseFloat(d.tva) || 0;
    state.color = d.couleur || '#4F46E5';
    state.template = d.template || 0;
    state.logos.clientLogo = d.client_logo;

    setTimeout(() => {
      document.getElementById('clientName').value = d.client_nom || '';
      document.getElementById('clientEmail').value = d.client_email || '';
      document.getElementById('clientPhone').value = d.client_telephone || '';
      document.getElementById('clientAddress').value = d.client_adresse || '';
      document.getElementById('clientContact').value = d.client_contact || '';
      document.getElementById('devisNum').value = d.numero || '';
      document.getElementById('devisDate').value = d.date_emission
        ? d.date_emission.split('T')[0] : '';
      document.getElementById('devisExpiry').value = d.date_expiration
        ? d.date_expiration.split('T')[0] : '';
      document.getElementById('devisObjet').value = d.objet || '';
      document.getElementById('devisNotes').value = d.notes || '';
      document.getElementById('paymentTerms').value = d.conditions_paiement || '';

      if (d.client_logo) {
        const p = document.getElementById('clientLogoPreview');
        if (p) { p.src = d.client_logo; p.style.display = 'block'; }
        const t = document.getElementById('clientLogoText');
        if (t) t.style.display = 'none';
      }

      renderTasks();
      updateTotals();
      showToast(`Devis "${d.client_nom}" chargé pour modification`, 'info');
    }, 50);

    goStep(0);
  } catch (e) {
    showToast('Impossible de charger le devis.', 'danger');
  }
}

async function dupliquerDevis(id) {
  try {
    const res = await fetch(`${API_URL}/devis/${id}/dupliquer`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Devis dupliqué !', 'success');
      loadHistory();
    } else {
      showToast(data.message || 'Erreur duplication.', 'danger');
    }
  } catch (e) {
    showToast('Impossible de dupliquer.', 'danger');
  }
}

async function supprimerDevis(id) {
  const d = histDevis.find(x => x.id === id);
  if (!confirm(`Supprimer le devis de "${d?.client_nom || 'ce client'}" ?`)) return;
  try {
    const res = await fetch(`${API_URL}/devis/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (res.ok) {
      showToast('Devis supprimé.', 'success');
      loadHistory();
    }
  } catch (e) {
    showToast('Impossible de supprimer.', 'danger');
  }
}

// ===== EXPORT PDF =====
async function exportPDF() {
  const clientName = g('clientName') || 'devis';
  showToast('Génération du PDF...', 'info');

  try {
    const el = document.createElement('div');
    el.innerHTML = buildDevisHTML();
    el.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 794px;
      background: white;
      padding: 20px;
    `;
    document.body.appendChild(el);

    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794
    });

    document.body.removeChild(el);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const finalHeight = pdfWidth / ratio;

    if (finalHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, finalHeight);
    } else {
      let position = 0;
      let remainingHeight = finalHeight;
      let page = 0;
      while (remainingHeight > 0) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, pdfWidth, finalHeight);
        position += pdfHeight;
        remainingHeight -= pdfHeight;
        page++;
      }
    }

    pdf.save(`devis-${clientName.replace(/\s+/g, '-')}.pdf`);
    showToast('PDF téléchargé !', 'success');

  } catch (e) {
    console.error(e);
    showToast('Erreur génération PDF.', 'danger');
  }
}

// ===== TOAST =====
function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}