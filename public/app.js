/* ─── STATE ────────────────────────────────────────────────────────────── */
const state = {
  currentPage: 'dashboard',
  materiali: [],
  config: {}
};

/* ─── UTILS ────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const api = async (path, method = 'GET', body = null) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const fmt = n => '€ ' + parseFloat(n || 0).toFixed(2).replace('.', ',');
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const todayISO = () => new Date().toISOString().split('T')[0];

function toast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = type;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ─── DRIVE UTILS ──────────────────────────────────────────────────────── */
function extractDriveId(url) {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function driveThumbUrl(url) {
  const id = extractDriveId(url);
  if (!id) return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
}

function driveViewUrl(url) {
  const id = extractDriveId(url);
  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/view`;
}

/* ─── MODAL ────────────────────────────────────────────────────────────── */
function openModal(html) {
  $('modal-content').innerHTML = html;
  $('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  $('modal-overlay').classList.add('hidden');
  $('modal-content').innerHTML = '';
}

$('modal-close').onclick = closeModal;
$('modal-overlay').onclick = e => { if (e.target === $('modal-overlay')) closeModal(); };

/* ─── NAVIGATION ───────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = () => navigate(item.dataset.page);
});

function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });
  render(page);
}

function render(page) {
  const pages = { dashboard, modelli, spese, guadagni, configurazione };
  if (pages[page]) pages[page]();
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
async function dashboard() {
  $('page-container').innerHTML = `<div class="loading"><div class="spin"></div> Caricamento...</div>`;
  try {
    const d = await api('/dashboard');
    const saldoClass = d.saldo >= 0 ? 'green' : 'red';
    const saldoColor = d.saldo >= 0 ? 'green' : 'red';

    const maxBar = Math.max(...d.andamento.map(m => Math.max(+m.spese, +m.guadagni)), 1);

    $('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard <span>Overview</span></div>
          <div class="page-subtitle">// riepilogo attività</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card green">
          <div class="stat-label">Guadagni Totali</div>
          <div class="stat-value green">${fmt(d.guadagni.totale)}</div>
          <div class="stat-meta">${d.guadagni.numero} transazioni</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Spese Totali</div>
          <div class="stat-value red">${fmt(d.spese.totale)}</div>
          <div class="stat-meta">${d.spese.numero} transazioni</div>
        </div>
        <div class="stat-card ${saldoClass}">
          <div class="stat-label">Saldo Netto</div>
          <div class="stat-value ${saldoColor}">${fmt(d.saldo)}</div>
          <div class="stat-meta">guadagni − spese</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Modelli Creati</div>
          <div class="stat-value orange">${d.modelli.numero}</div>
          <div class="stat-meta">costo prod. ${fmt(d.modelli.costo_produzione)}</div>
        </div>
      </div>

      <div class="chart-wrap">
        <div class="chart-title">// andamento ultimi 6 mesi</div>
        <div class="bar-chart">
          ${d.andamento.map(m => {
            const hS = Math.round((+m.spese / maxBar) * 100);
            const hG = Math.round((+m.guadagni / maxBar) * 100);
            return `
              <div class="bar-group">
                <div class="bar-bars">
                  <div class="bar guadagni" style="height:${hG}%" title="Guadagni ${fmt(m.guadagni)}"></div>
                  <div class="bar spese"    style="height:${hS}%" title="Spese ${fmt(m.spese)}"></div>
                </div>
                <div class="bar-label">${m.label}</div>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;font-family:var(--mono);color:var(--text3)">
          <span>▮ <span style="color:var(--green)">guadagni</span></span>
          <span>▮ <span style="color:var(--red)">spese</span></span>
        </div>
      </div>

      ${d.top_modelli.length ? `
      <div class="section-title">Ultimi modelli</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>Costo Produzione</th><th>Data</th></tr>
          </thead>
          <tbody>
            ${d.top_modelli.map(m => `
              <tr>
                <td>${m.nome}</td>
                <td class="mono" style="color:var(--accent)">${fmt(m.costo_totale)}</td>
                <td class="mono" style="color:var(--text3)">${fmtDate(m.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
  } catch (e) {
    $('page-container').innerHTML = `<div class="empty-state"><div>❌ Errore: ${e.message}</div></div>`;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SPESE
   ═══════════════════════════════════════════════════════════════════════ */
async function spese() {
  $('page-container').innerHTML = `<div class="loading"><div class="spin"></div></div>`;
  try {
    const rows = await api('/spese');
    const totale = rows.reduce((s, r) => s + parseFloat(r.importo), 0);

    $('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Spese <span>Reali</span></div>
          <div class="page-subtitle">// ${rows.length} voci · totale ${fmt(totale)}</div>
        </div>
        <button class="btn btn-primary" onclick="openSpeseForm()">+ Aggiungi Spesa</button>
      </div>

      ${rows.length === 0 ? emptyState('📉', 'Nessuna spesa registrata', 'Aggiungi la prima voce') : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Importo</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="mono" style="color:var(--text3)">${fmtDate(r.data)}</td>
                <td>${r.descrizione}</td>
                <td>${r.categoria ? `<span class="badge badge-red">${r.categoria}</span>` : '—'}</td>
                <td class="mono" style="color:var(--red);font-weight:700">${fmt(r.importo)}</td>
                <td style="color:var(--text3);font-size:12px">${r.note || '—'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openSpeseForm(${JSON.stringify(r).replace(/"/g,'&quot;')})">✏</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRow('spese', ${r.id}, spese)">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="totals-row">
          TOTALE SPESE: <strong style="color:var(--red)">${fmt(totale)}</strong>
        </div>
      </div>`}
    `;
  } catch (e) {
    $('page-container').innerHTML = `<div class="empty-state">❌ ${e.message}</div>`;
  }
}

function openSpeseForm(row = null) {
  openModal(`
    <div class="modal-title">${row ? 'Modifica' : 'Nuova'} <span>Spesa</span></div>
    <div class="form-grid">
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="f-data" value="${row?.data?.split('T')[0] || todayISO()}">
      </div>
      <div class="form-group">
        <label>Importo (€)</label>
        <input type="number" step="0.01" id="f-importo" value="${row?.importo || ''}" placeholder="0.00">
      </div>
      <div class="form-group full">
        <label>Descrizione</label>
        <input type="text" id="f-descrizione" value="${row?.descrizione || ''}" placeholder="es. Bobina PLA 1kg">
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <input type="text" id="f-categoria" value="${row?.categoria || ''}" placeholder="es. Materiali, Attrezzatura…">
      </div>
      <div class="form-group">
        <label>Note</label>
        <input type="text" id="f-note" value="${row?.note || ''}" placeholder="Facoltativo">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveSpesa(${row?.id || 'null'})">Salva</button>
    </div>
  `);
}

async function saveSpesa(id) {
  const body = {
    data: $('f-data').value,
    descrizione: $('f-descrizione').value,
    importo: $('f-importo').value,
    categoria: $('f-categoria').value,
    note: $('f-note').value
  };
  if (!body.descrizione || !body.importo) return toast('Compila i campi obbligatori', 'error');
  try {
    if (id) await api(`/spese/${id}`, 'PUT', body);
    else await api('/spese', 'POST', body);
    closeModal();
    toast('Spesa salvata ✓');
    spese();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════════════
   GUADAGNI
   ═══════════════════════════════════════════════════════════════════════ */
async function guadagni() {
  $('page-container').innerHTML = `<div class="loading"><div class="spin"></div></div>`;
  try {
    const rows = await api('/guadagni');
    const totale = rows.reduce((s, r) => s + parseFloat(r.importo), 0);

    $('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Guadagni <span>Reali</span></div>
          <div class="page-subtitle">// ${rows.length} voci · totale ${fmt(totale)}</div>
        </div>
        <button class="btn btn-primary" onclick="openGuadagniForm()">+ Aggiungi Guadagno</button>
      </div>

      ${rows.length === 0 ? emptyState('📈', 'Nessun guadagno registrato', 'Aggiungi la prima voce') : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Importo</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="mono" style="color:var(--text3)">${fmtDate(r.data)}</td>
                <td>${r.descrizione}</td>
                <td>${r.categoria ? `<span class="badge badge-green">${r.categoria}</span>` : '—'}</td>
                <td class="mono" style="color:var(--green);font-weight:700">${fmt(r.importo)}</td>
                <td style="color:var(--text3);font-size:12px">${r.note || '—'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openGuadagniForm(${JSON.stringify(r).replace(/"/g,'&quot;')})">✏</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRow('guadagni', ${r.id}, guadagni)">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="totals-row">
          TOTALE GUADAGNI: <strong style="color:var(--green)">${fmt(totale)}</strong>
        </div>
      </div>`}
    `;
  } catch (e) {
    $('page-container').innerHTML = `<div class="empty-state">❌ ${e.message}</div>`;
  }
}

function openGuadagniForm(row = null) {
  openModal(`
    <div class="modal-title">${row ? 'Modifica' : 'Nuovo'} <span>Guadagno</span></div>
    <div class="form-grid">
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="f-data" value="${row?.data?.split('T')[0] || todayISO()}">
      </div>
      <div class="form-group">
        <label>Importo (€)</label>
        <input type="number" step="0.01" id="f-importo" value="${row?.importo || ''}" placeholder="0.00">
      </div>
      <div class="form-group full">
        <label>Descrizione</label>
        <input type="text" id="f-descrizione" value="${row?.descrizione || ''}" placeholder="es. Vendita figurina Dragon Ball">
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <input type="text" id="f-categoria" value="${row?.categoria || ''}" placeholder="es. Vendita, Commissione…">
      </div>
      <div class="form-group">
        <label>Note</label>
        <input type="text" id="f-note" value="${row?.note || ''}" placeholder="Facoltativo">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveGuadagno(${row?.id || 'null'})">Salva</button>
    </div>
  `);
}

async function saveGuadagno(id) {
  const body = {
    data: $('f-data').value,
    descrizione: $('f-descrizione').value,
    importo: $('f-importo').value,
    categoria: $('f-categoria').value,
    note: $('f-note').value
  };
  if (!body.descrizione || !body.importo) return toast('Compila i campi obbligatori', 'error');
  try {
    if (id) await api(`/guadagni/${id}`, 'PUT', body);
    else await api('/guadagni', 'POST', body);
    closeModal();
    toast('Guadagno salvato ✓');
    guadagni();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════════════
   MODELLI
   ═══════════════════════════════════════════════════════════════════════ */
async function modelli() {
  $('page-container').innerHTML = `<div class="loading"><div class="spin"></div></div>`;
  try {
    const [rows, mat] = await Promise.all([api('/modelli'), api('/materiali')]);
    state.materiali = mat;

    $('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Modelli <span>3D</span></div>
          <div class="page-subtitle">// ${rows.length} modelli catalogati</div>
        </div>
        <button class="btn btn-primary" onclick="openModelForm()">+ Nuovo Modello</button>
      </div>

      ${rows.length === 0
        ? emptyState('◻', 'Nessun modello ancora', 'Aggiungi il tuo primo modello 3D')
        : `<div class="models-grid">${rows.map(modelCard).join('')}</div>`
      }
    `;
  } catch (e) {
    $('page-container').innerHTML = `<div class="empty-state">❌ ${e.message}</div>`;
  }
}

function modelCard(m) {
  const imgs = Array.isArray(m.link_immagini)
    ? m.link_immagini
    : (typeof m.link_immagini === 'string' ? JSON.parse(m.link_immagini || '[]') : []);

  const thumb = imgs.length > 0 ? driveThumbUrl(imgs[0]) : null;

  return `
    <div class="model-card">
      <div class="model-card-thumb" onclick="showModelDetail(${m.id})">
        ${thumb
          ? `<img src="${thumb}" alt="${m.nome}" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'><span>◻</span><span>No preview</span></div>'">`
          : `<div class="no-img"><span>◻</span><span>No image</span></div>`
        }
      </div>
      <div class="model-card-body" onclick="showModelDetail(${m.id})">
        <div class="model-card-name">${m.nome}</div>
        <div class="model-card-meta">
          <span>⏱ ${parseFloat(m.tempo_ore).toFixed(1)}h stampa</span>
          <span>◈ ${(m.materiali || []).length} materiale/i</span>
          ${(m.extra || []).length > 0 ? `<span>＋ ${m.extra.length} spesa/e extra</span>` : ''}
          ${imgs.length > 0 ? `<span>🖼 ${imgs.length} immagine/i</span>` : ''}
        </div>
        <div class="model-card-cost">${fmt(m.costo_totale)}</div>
      </div>
      <div class="model-card-actions">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation();openVenditaModal(${m.id})">💰 Vendi</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openModelForm(${m.id})">✏</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteRow('modelli', ${m.id}, modelli)">🗑</button>
      </div>
    </div>
  `;
}

async function showModelDetail(id) {
  const m = await api(`/modelli/${id}`);
  const imgs = Array.isArray(m.link_immagini)
    ? m.link_immagini
    : JSON.parse(m.link_immagini || '[]');

  const cfg = await api('/configurazione');
  const costoOra = parseFloat(cfg.find(c => c.chiave === 'costo_ora_luce')?.valore || 0.25);
  const costoEnergia = parseFloat(m.tempo_ore) * costoOra;
  const costoMat = (m.materiali || []).reduce((s, mat) =>
    s + parseFloat(mat.grammi) * parseFloat(mat.prezzo_per_grammo), 0);

  openModal(`
    <div class="modal-title">${m.nome}</div>

    ${imgs.length > 0 ? `
      <div class="section-title" style="margin-bottom:10px">Immagini</div>
      <div class="drive-preview-grid" style="margin-bottom:20px">
        ${imgs.map(link => {
          const thumb = driveThumbUrl(link);
          const view  = driveViewUrl(link);
          return `
            <a href="${view}" target="_blank" class="drive-preview-item" title="Apri su Drive">
              ${thumb
                ? `<img src="${thumb}" onerror="this.parentElement.innerHTML='<div class=\\'img-fallback\\'><span>🖼</span><span>Drive</span></div>'">`
                : `<div class="img-fallback"><span>🖼</span><span>Drive</span></div>`
              }
            </a>`;
        }).join('')}
      </div>` : ''}

    <div class="cost-summary">
      <div class="cost-item">
        <div class="cost-item-label">Costo Materiali</div>
        <div class="cost-item-value">${fmt(costoMat)}</div>
      </div>
      <div class="cost-item">
        <div class="cost-item-label">Costo Energia</div>
        <div class="cost-item-value">${fmt(costoEnergia)}</div>
      </div>
      <div class="cost-item">
        <div class="cost-item-label">Tempo Stampa</div>
        <div class="cost-item-value">${parseFloat(m.tempo_ore).toFixed(1)}h</div>
      </div>
      <div class="cost-item">
        <div class="cost-item-label">Totale Produzione</div>
        <div class="cost-item-value">${fmt(m.costo_totale)}</div>
      </div>
    </div>

    ${m.materiali?.length > 0 ? `
      <div class="section-title" style="margin-top:20px">Materiali Usati</div>
      <div class="table-wrap" style="margin-top:8px">
        <table>
          <thead><tr><th>Materiale</th><th>Colore</th><th>Grammi</th><th>Costo</th></tr></thead>
          <tbody>
            ${m.materiali.map(mat => `
              <tr>
                <td>${mat.nome}</td>
                <td>
                  ${mat.colore ? `<span class="color-dot" style="background:${mat.colore}"></span>${mat.colore}` : '—'}
                </td>
                <td class="mono">${parseFloat(mat.grammi).toFixed(1)}g</td>
                <td class="mono" style="color:var(--accent)">${fmt(parseFloat(mat.grammi) * parseFloat(mat.prezzo_per_grammo))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

    ${m.link_modello ? `
      <div style="margin-top:16px">
        <a href="${driveViewUrl(m.link_modello)}" target="_blank" class="btn btn-ghost" style="width:100%;justify-content:center">
          ◻ Apri File 3D su Drive
        </a>
      </div>` : ''}

    ${m.note ? `<div style="margin-top:16px;color:var(--text2);font-size:13px"><strong>Note:</strong> ${m.note}</div>` : ''}

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Chiudi</button>
      <button class="btn btn-primary" onclick="closeModal();openModelForm(${m.id})">✏ Modifica</button>
    </div>
  `);
}

/* ─── MODEL FORM ─────────────────────────────────────────────────────── */
// Track image links and material rows and extra in form
let formImgLinks = [];
let formMatRows = [];
let formExtraRows = [];

async function openModelForm(id = null) {
  let m = null;
  if (id) {
    m = await api(`/modelli/${id}`);
  }

  formImgLinks = m
    ? (Array.isArray(m.link_immagini) ? m.link_immagini : JSON.parse(m.link_immagini || '[]'))
    : [];
  formMatRows = m?.materiali?.map(mat => ({ materiale_id: mat.materiale_id, grammi: mat.grammi })) || [];
  formExtraRows = m?.extra?.map(ex => ({ nome: ex.nome, prezzo_per_pezzo: ex.prezzo_per_pezzo })) || [];

  const matOptions = state.materiali.map(mat =>
    `<option value="${mat.id}">${mat.nome}${mat.colore ? ' – ' + mat.colore : ''} (${fmt(mat.prezzo_per_grammo)}/g)</option>`
  ).join('');

  openModal(`
    <div class="modal-title">${id ? 'Modifica' : 'Nuovo'} <span>Modello</span></div>

    <div class="form-grid" style="margin-bottom:20px">
      <div class="form-group full">
        <label>Nome Modello *</label>
        <input type="text" id="f-nome" value="${m?.nome || ''}" placeholder="es. Drago in volo – 15cm">
      </div>
      <div class="form-group">
        <label>Tempo di Stampa (ore) *</label>
        <input type="number" step="0.1" id="f-tempo" value="${m?.tempo_ore || ''}" placeholder="es. 4.5" oninput="updateCostPreview()">
      </div>
      <div class="form-group">
        <label>Link File 3D (Drive)</label>
        <input type="url" id="f-modello" value="${m?.link_modello || ''}" placeholder="https://drive.google.com/…">
      </div>
      <div class="form-group full">
        <label>Note</label>
        <textarea id="f-note" placeholder="Qualsiasi nota sul modello…">${m?.note || ''}</textarea>
      </div>
    </div>

    <div class="section-title">Materiali Usati</div>
    ${state.materiali.length === 0
      ? `<div style="color:var(--text3);font-size:13px;margin-bottom:16px">⚠ Nessun materiale configurato. Aggiungili in <a href="#" onclick="navigate('configurazione')" style="color:var(--accent)">Configurazione</a>.</div>`
      : `
    <div id="mat-rows" class="material-rows" style="margin-bottom:10px">
      ${formMatRows.map((row, i) => matRowHTML(i, row, matOptions, m?.materiali)).join('')}
    </div>
    <button class="add-material-btn" onclick="addMatRow(${JSON.stringify(matOptions).replace(/"/g,'&quot;')})">+ Aggiungi Materiale</button>
    `}

    <div id="cost-preview" class="cost-summary" style="margin-top:16px"></div>

    <div class="section-title" style="margin-top:24px">Spese Extra (opzionali)
      <span style="font-size:10px;color:var(--text3);font-weight:400;margin-left:8px">es. imballaggio, vernice, supporti…</span>
    </div>
    <div id="extra-rows" class="material-rows" style="margin-bottom:10px">
      ${formExtraRows.map((row, i) => extraRowHTML(i, row)).join('')}
    </div>
    <button class="add-material-btn" onclick="addExtraRow()">+ Aggiungi Spesa Extra</button>

    <div class="section-title" style="margin-top:24px">Immagini (link Google Drive)</div>
    <div id="img-links-list" class="img-links-section">
      ${formImgLinks.map((link, i) => imgLinkRow(i, link)).join('')}
    </div>
    <button class="add-material-btn" onclick="addImgLink()" style="margin-top:8px">+ Aggiungi Link Immagine</button>

    <div id="img-preview-grid" class="drive-preview-grid" style="margin-top:12px">
      ${formImgLinks.map(link => {
        const thumb = driveThumbUrl(link);
        return thumb ? `<div class="drive-preview-item"><img src="${thumb}" onerror="this.style.display='none'"></div>` : '';
      }).join('')}
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveModel(${id || 'null'})">Salva Modello</button>
    </div>
  `);

  updateCostPreview();
}

function matRowHTML(i, row, matOptions, existingMaterials) {
  const selectedId = row.materiale_id || '';
  const grammi = row.grammi || '';
  const opts = state.materiali.map(mat =>
    `<option value="${mat.id}" ${mat.id == selectedId ? 'selected' : ''}>${mat.nome}${mat.colore ? ' – ' + mat.colore : ''} (${fmt(mat.prezzo_per_grammo)}/g)</option>`
  ).join('');
  return `
    <div class="material-row" id="mat-row-${i}">
      <select onchange="updateCostPreview()" id="mat-sel-${i}">${opts}</select>
      <div style="display:flex;align-items:center;gap:6px">
        <input type="number" step="0.1" placeholder="grammi" id="mat-g-${i}" value="${grammi}"
          oninput="updateCostPreview()" style="width:100%">
        <span style="color:var(--text3);font-size:12px;white-space:nowrap">g</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeMatRow(${i})">✕</button>
    </div>`;
}

function extraRowHTML(i, row = {}) {
  return `
    <div class="material-row" id="extra-row-${i}">
      <input type="text" id="extra-nome-${i}" placeholder="es. Imballaggio, Vernice, Supporti…"
        value="${row.nome || ''}" style="flex:1">
      <div style="display:flex;align-items:center;gap:6px;min-width:120px">
        <span style="color:var(--text3);font-size:12px;white-space:nowrap">€</span>
        <input type="number" step="0.01" placeholder="0.00" id="extra-prezzo-${i}"
          value="${row.prezzo_per_pezzo || ''}" style="width:100%">
        <span style="color:var(--text3);font-size:10px;white-space:nowrap">/pz</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeExtraRow(${i})">✕</button>
    </div>`;
}

let extraRowCount = 0;
function addExtraRow() {
  extraRowCount++;
  const i = extraRowCount + 200;
  const el = document.createElement('div');
  el.innerHTML = extraRowHTML(i);
  $('extra-rows').appendChild(el.firstElementChild);
}

function removeExtraRow(i) {
  const el = $(`extra-row-${i}`);
  if (el) el.remove();
}

function getExtraRows() {
  const rows = [];
  document.querySelectorAll('[id^="extra-row-"]').forEach(row => {
    const i = row.id.replace('extra-row-', '');
    const nome = $(`extra-nome-${i}`);
    const prezzo = $(`extra-prezzo-${i}`);
    if (nome && prezzo && nome.value.trim() && prezzo.value) {
      rows.push({ nome: nome.value.trim(), prezzo_per_pezzo: parseFloat(prezzo.value) });
    }
  });
  return rows;
}

function addMatRow(matOptions) {
  const i = formMatRows.length;
  formMatRows.push({ materiale_id: '', grammi: '' });
  const el = document.createElement('div');
  el.innerHTML = matRowHTML(i, {}, matOptions, []);
  $('mat-rows').appendChild(el.firstElementChild);
}

function removeMatRow(i) {
  const el = $(`mat-row-${i}`);
  if (el) el.remove();
  updateCostPreview();
}

function imgLinkRow(i, val = '') {
  return `
    <div class="img-link-row" id="img-row-${i}">
      <input type="url" id="img-inp-${i}" value="${val}" placeholder="https://drive.google.com/file/d/…"
        oninput="refreshImgPreviews()">
      <button class="btn btn-danger btn-sm" onclick="removeImgRow(${i})">✕</button>
    </div>`;
}

let imgLinkCount = 0;
function addImgLink() {
  imgLinkCount++;
  const el = document.createElement('div');
  el.innerHTML = imgLinkRow(imgLinkCount + 100);
  $('img-links-list').appendChild(el.firstElementChild);
}

function removeImgRow(i) {
  const el = $(`img-row-${i}`);
  if (el) { el.remove(); refreshImgPreviews(); }
}

function refreshImgPreviews() {
  const links = getImgLinks();
  const grid = $('img-preview-grid');
  if (!grid) return;
  grid.innerHTML = links.map(link => {
    const thumb = driveThumbUrl(link);
    return thumb ? `<div class="drive-preview-item"><img src="${thumb}" onerror="this.parentElement.style.display='none'"></div>` : '';
  }).join('');
}

function getImgLinks() {
  const links = [];
  document.querySelectorAll('[id^="img-inp-"]').forEach(inp => {
    if (inp.value.trim()) links.push(inp.value.trim());
  });
  return links;
}

function getMatRows() {
  const rows = [];
  document.querySelectorAll('[id^="mat-row-"]').forEach(row => {
    const i = row.id.replace('mat-row-', '');
    const sel = $(`mat-sel-${i}`);
    const g = $(`mat-g-${i}`);
    if (sel && g && sel.value && g.value) {
      rows.push({ materiale_id: parseInt(sel.value), grammi: parseFloat(g.value) });
    }
  });
  return rows;
}

function updateCostPreview() {
  const preview = $('cost-preview');
  if (!preview) return;

  const rows = getMatRows();
  const tempo = parseFloat($('f-tempo')?.value || 0);
  const costoOra = parseFloat(state.config.costo_ora_luce || 0.25);

  let costoMat = 0;
  rows.forEach(row => {
    const mat = state.materiali.find(m => m.id == row.materiale_id);
    if (mat) costoMat += parseFloat(mat.prezzo_per_grammo) * row.grammi;
  });
  const costoEnergia = tempo * costoOra;
  const totale = costoMat + costoEnergia;

  preview.innerHTML = `
    <div class="cost-item">
      <div class="cost-item-label">Materiali</div>
      <div class="cost-item-value">${fmt(costoMat)}</div>
    </div>
    <div class="cost-item">
      <div class="cost-item-label">Energia (${tempo}h × €${costoOra}/h)</div>
      <div class="cost-item-value">${fmt(costoEnergia)}</div>
    </div>
    <div class="cost-item">
      <div class="cost-item-label">Costo Totale</div>
      <div class="cost-item-value" style="font-size:20px">${fmt(totale)}</div>
    </div>
  `;
}

async function saveModel(id) {
  const nome = $('f-nome')?.value;
  const tempo_ore = $('f-tempo')?.value;
  if (!nome || !tempo_ore) return toast('Nome e tempo sono obbligatori', 'error');

  const body = {
    nome,
    tempo_ore: parseFloat(tempo_ore),
    link_modello: $('f-modello')?.value || null,
    link_immagini: getImgLinks(),
    note: $('f-note')?.value || null,
    materiali: getMatRows(),
    extra: getExtraRows()
  };

  try {
    if (id) await api(`/modelli/${id}`, 'PUT', body);
    else await api('/modelli', 'POST', body);
    closeModal();
    toast('Modello salvato ✓');
    modelli();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFIGURAZIONE
   ═══════════════════════════════════════════════════════════════════════ */
async function configurazione() {
  $('page-container').innerHTML = `<div class="loading"><div class="spin"></div></div>`;
  try {
    const [cfg, mat] = await Promise.all([api('/configurazione'), api('/materiali')]);
    state.materiali = mat;

    // Mappa config
    const cfgMap = {};
    cfg.forEach(c => { cfgMap[c.chiave] = c; state.config[c.chiave] = c.valore; });

    $('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Configura<span>zione</span></div>
          <div class="page-subtitle">// parametri di calcolo e materiali</div>
        </div>
      </div>

      <!-- Parametri di calcolo -->
      <div class="section-title">Parametri di Calcolo</div>
      <div class="table-wrap card" style="margin-bottom:28px;padding:0">
        <div class="config-row">
          <div>
            <div class="config-key">Costo Ora di Luce</div>
            <div class="config-desc">€/ora · usato per calcolare il costo energetico dei modelli</div>
          </div>
          <input type="number" step="0.001" id="cfg-costo_ora_luce" value="${cfgMap['costo_ora_luce']?.valore || 0.25}" style="max-width:180px">
          <button class="btn btn-primary btn-sm" onclick="saveConfig('costo_ora_luce', '€/ora energia elettrica')">Salva</button>
        </div>
        <div class="config-row">
          <div>
            <div class="config-key">IVA (%)</div>
            <div class="config-desc">aliquota IVA di riferimento</div>
          </div>
          <input type="number" step="1" id="cfg-iva_percentuale" value="${cfgMap['iva_percentuale']?.valore || 22}" style="max-width:180px">
          <button class="btn btn-primary btn-sm" onclick="saveConfig('iva_percentuale', 'Aliquota IVA %')">Salva</button>
        </div>
        <div class="config-row">
          <div>
            <div class="config-key">Margine Minimo (%)</div>
            <div class="config-desc">margine di profitto minimo consigliato</div>
          </div>
          <input type="number" step="1" id="cfg-margine_minimo" value="${cfgMap['margine_minimo']?.valore || 30}" style="max-width:180px">
          <button class="btn btn-primary btn-sm" onclick="saveConfig('margine_minimo', 'Margine minimo consigliato')">Salva</button>
        </div>
      </div>

      <!-- Materiali -->
      <div class="page-header" style="margin-bottom:16px">
        <div class="section-title" style="margin:0">Materiali e Filamenti</div>
        <button class="btn btn-primary btn-sm" onclick="openMaterialForm()">+ Aggiungi Materiale</button>
      </div>

      ${mat.length === 0 ? emptyState('🎨', 'Nessun materiale ancora', 'Aggiungi i tuoi filamenti con il prezzo al grammo') : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>Colore</th><th>€/grammo</th><th>€/100g</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            ${mat.map(m => `
              <tr>
                <td style="font-weight:600">${m.nome}</td>
                <td>
                  ${m.colore
                    ? `<span class="color-dot" style="background:${m.colore.startsWith('#') ? m.colore : 'transparent'}"></span>${m.colore}`
                    : '—'}
                </td>
                <td class="mono" style="color:var(--accent)">${parseFloat(m.prezzo_per_grammo).toFixed(4)}</td>
                <td class="mono" style="color:var(--text2)">${fmt(parseFloat(m.prezzo_per_grammo) * 100)}</td>
                <td style="color:var(--text3);font-size:12px">${m.note || '—'}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="openMaterialForm(${JSON.stringify(m).replace(/"/g,'&quot;')})">✏</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRow('materiali', ${m.id}, configurazione)">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}

      <div style="margin-top:16px;padding:14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;color:var(--text3);font-family:var(--mono)">
        💡 Calcolo grammi per bobina: se paghi € 25 per una bobina da 1000g → prezzo al grammo = 0.0250 €/g<br>
        I costi vengono ricalcolati automaticamente ogni volta che salvi un modello.
      </div>
    `;
  } catch (e) {
    $('page-container').innerHTML = `<div class="empty-state">❌ ${e.message}</div>`;
  }
}

async function saveConfig(chiave, descrizione) {
  const val = $(`cfg-${chiave}`)?.value;
  if (!val) return;
  try {
    await api(`/configurazione/${chiave}`, 'PUT', { valore: parseFloat(val), descrizione });
    state.config[chiave] = parseFloat(val);
    toast('Configurazione salvata ✓');
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

function openMaterialForm(m = null) {
  openModal(`
    <div class="modal-title">${m ? 'Modifica' : 'Nuovo'} <span>Materiale</span></div>
    <div class="form-grid">
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" id="f-nome" value="${m?.nome || ''}" placeholder="es. PLA, PETG, Resina…">
      </div>
      <div class="form-group">
        <label>Colore</label>
        <input type="text" id="f-colore" value="${m?.colore || ''}" placeholder="es. #FF6B2B oppure Rosso">
      </div>
      <div class="form-group">
        <label>Prezzo al Grammo (€/g) *</label>
        <input type="number" step="0.0001" id="f-prezzo" value="${m?.prezzo_per_grammo || ''}" placeholder="es. 0.0250">
      </div>
      <div class="form-group">
        <label>Prezzo per 1000g (helper)</label>
        <input type="number" step="0.01" id="f-prezzo-kg" placeholder="es. 25.00"
          oninput="$('f-prezzo').value = (parseFloat(this.value)/1000).toFixed(6)">
      </div>
      <div class="form-group full">
        <label>Note</label>
        <input type="text" id="f-note" value="${m?.note || ''}" placeholder="Brand, tipo, link acquisto…">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveMaterial(${m?.id || 'null'})">Salva</button>
    </div>
  `);
}

async function saveMaterial(id) {
  const body = {
    nome: $('f-nome').value,
    colore: $('f-colore').value,
    prezzo_per_grammo: parseFloat($('f-prezzo').value),
    note: $('f-note').value
  };
  if (!body.nome || isNaN(body.prezzo_per_grammo)) return toast('Compila nome e prezzo', 'error');
  try {
    if (id) await api(`/materiali/${id}`, 'PUT', body);
    else await api('/materiali', 'POST', body);
    closeModal();
    toast('Materiale salvato ✓');
    configurazione();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════════════
   VENDITA MODAL
   ═══════════════════════════════════════════════════════════════════════ */
async function openVenditaModal(id) {
  const [m, cfg] = await Promise.all([
    api(`/modelli/${id}`),
    api('/configurazione')
  ]);
  const margine = parseFloat(cfg.find(c => c.chiave === 'margine_minimo')?.valore || 30);
  const costoProd = parseFloat(m.costo_totale);
  const extra = m.extra || [];

  openModal(`
    <div class="modal-title">💰 Vendi <span>${m.nome}</span></div>

    <div class="form-grid" style="margin-bottom:20px">
      <div class="form-group">
        <label>Data Vendita</label>
        <input type="date" id="v-data" value="${todayISO()}">
      </div>
      <div class="form-group">
        <label>Quantità</label>
        <input type="number" min="1" step="1" id="v-qty" value="1" oninput="updateVenditaCalc(${costoProd}, ${margine})">
      </div>
      <div class="form-group">
        <label>Note vendita</label>
        <input type="text" id="v-note" placeholder="es. Cliente Mario, Etsy…">
      </div>
    </div>

    ${extra.length > 0 ? `
      <div class="section-title">Spese Extra — seleziona quelle incluse in questa vendita</div>
      <div class="extra-checkbox-list" id="v-extra-list">
        ${extra.map(ex => `
          <label class="extra-checkbox-item" id="v-extra-item-${ex.id}"
            onclick="this.classList.toggle('checked');updateVenditaCalc(${costoProd}, ${margine})">
            <input type="checkbox" id="v-ex-${ex.id}" value="${ex.prezzo_per_pezzo}"
              onclick="event.stopPropagation();this.closest('.extra-checkbox-item').classList.toggle('checked');updateVenditaCalc(${costoProd}, ${margine})">
            <span class="extra-nome">${ex.nome}</span>
            <span class="extra-prezzo">${fmt(ex.prezzo_per_pezzo)}/pz</span>
          </label>
        `).join('')}
      </div>
    ` : `<div style="color:var(--text3);font-size:12px;font-family:var(--mono);margin-bottom:16px">Nessuna spesa extra configurata per questo modello.</div>`}

    <div id="v-prezzo-cons" class="price-consigliato">
      <span>Prezzo consigliato (margine ${margine}%)</span>
      <strong id="v-cons-val">—</strong>
    </div>

    <div class="form-group" style="margin-bottom:12px">
      <label>Prezzo di Vendita Fatto (€) *</label>
      <input type="number" step="0.01" id="v-prezzo" placeholder="0.00"
        oninput="updateVenditaCalc(${costoProd}, ${margine})"
        style="font-size:18px;font-weight:700;font-family:var(--mono)">
    </div>

    <div id="v-breakdown" class="vendita-breakdown"></div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveVendita(${m.id}, '${m.nome.replace(/'/g,"\\'")}', ${costoProd})">
        ✓ Registra Vendita
      </button>
    </div>
  `);

  updateVenditaCalc(costoProd, margine);
}

function getExtraSelezionati() {
  const selected = [];
  document.querySelectorAll('[id^="v-ex-"]').forEach(cb => {
    if (cb.checked) {
      const id = cb.id.replace('v-ex-', '');
      const label = cb.closest('.extra-checkbox-item');
      const nome = label.querySelector('.extra-nome').textContent;
      selected.push({ id: parseInt(id), nome, prezzo_per_pezzo: parseFloat(cb.value) });
    }
  });
  return selected;
}

function updateVenditaCalc(costoProd, margine) {
  const qty = parseInt($('v-qty')?.value || 1);
  const prezzoFatto = parseFloat($('v-prezzo')?.value || 0);
  const extraSel = getExtraSelezionati();
  const costoExtraUnit = extraSel.reduce((s, ex) => s + ex.prezzo_per_pezzo, 0);
  const costoUnitTot = costoProd + costoExtraUnit;
  const costoTotale = costoUnitTot * qty;
  const prezzoConsigliato = costoTotale * (1 + margine / 100);
  const netto = prezzoFatto - costoTotale;

  // Aggiorna prezzo consigliato
  const consEl = $('v-cons-val');
  if (consEl) consEl.textContent = fmt(prezzoConsigliato);

  // Aggiorna breakdown
  const bd = $('v-breakdown');
  if (!bd) return;

  if (prezzoFatto === 0) {
    bd.innerHTML = `<div style="color:var(--text3);font-size:12px;font-family:var(--mono);text-align:center">Inserisci il prezzo di vendita per vedere il riepilogo</div>`;
    return;
  }

  const nettoClass = netto >= 0 ? '' : 'negative';
  bd.innerHTML = `
    <div class="breakdown-row">
      <span>Costo produzione × ${qty}</span>
      <span style="color:var(--red)">${fmt(costoProd * qty)}</span>
    </div>
    ${extraSel.map(ex => `
      <div class="breakdown-row">
        <span>${ex.nome} × ${qty}</span>
        <span style="color:var(--red)">${fmt(ex.prezzo_per_pezzo * qty)}</span>
      </div>
    `).join('')}
    <div class="breakdown-row total">
      <span>Totale costi</span>
      <span style="color:var(--red)">${fmt(costoTotale)}</span>
    </div>
    <div class="breakdown-row total">
      <span>Prezzo di vendita</span>
      <span>${fmt(prezzoFatto)}</span>
    </div>
    <div class="breakdown-row netto ${nettoClass}" style="margin-top:4px">
      <span style="font-size:14px">PROFITTO NETTO</span>
      <span style="font-size:20px">${fmt(netto)}</span>
    </div>
  `;
}

async function saveVendita(modelloId, modelloNome, costoProdUnit) {
  const qty = parseInt($('v-qty')?.value || 1);
  const prezzoVendita = parseFloat($('v-prezzo')?.value || 0);
  if (!prezzoVendita || prezzoVendita <= 0) return toast('Inserisci il prezzo di vendita', 'error');

  const extraUsati = getExtraSelezionati();
  const body = {
    modello_id: modelloId,
    modello_nome: modelloNome,
    quantita: qty,
    prezzo_vendita: prezzoVendita,
    costo_produzione_unit: costoProdUnit,
    extra_usati: extraUsati,
    note: $('v-note')?.value || null,
    data: $('v-data')?.value || todayISO()
  };

  try {
    const result = await api('/vendite', 'POST', body);
    closeModal();
    const netto = result.guadagno.importo;
    toast(`Vendita registrata! Profitto netto: ${fmt(netto)} ✓`);
    modelli();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ─── GENERIC DELETE ─────────────────────────────────────────────────── */
async function deleteRow(endpoint, id, reloadFn) {
  if (!confirm('Eliminare questo elemento?')) return;
  try {
    await api(`/${endpoint}/${id}`, 'DELETE');
    toast('Eliminato ✓');
    reloadFn();
  } catch (e) { toast('Errore: ' + e.message, 'error'); }
}

/* ─── EMPTY STATE HTML ───────────────────────────────────────────────── */
function emptyState(icon, text, sub) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-text">${text}</div>
      <div class="empty-state-sub">${sub}</div>
    </div>`;
}

/* ─── INIT ───────────────────────────────────────────────────────────── */
(async () => {
  try {
    const cfg = await api('/configurazione');
    cfg.forEach(c => { state.config[c.chiave] = c.valore; });
    const mat = await api('/materiali');
    state.materiali = mat;
  } catch {}
  dashboard();
})();
