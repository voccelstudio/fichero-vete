// ============================================================
// VetCare Pro 2.0 — App principal
// Navegación SPA, dashboard, backup y arranque.
// ============================================================

// ---- Toast global ----
function toast(message, type = 'info') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast glass ${type}`;
  el.innerHTML = `<span class="material-symbols-outlined">${icons[type] || 'info'}</span><span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

const App = {
  currentView: 'dashboard',

  async init() {
    this.applyTheme();
    this.applySkin();
    this.bindNav();
    this.bindMobileMenu();
    this.bindThemeControls();
    this.bindBackupControls();
    Movement.init();
    Inventory.init();
    Sales.init();
    Patients.init();
    Agenda.init();
    Services.init();
    // MODO DEMO: carga datos de ejemplo si la base está vacía.
    if (typeof Demo !== 'undefined') await Demo.maybeSeed();
    this.navigate('movement');   // primer landing: el módulo estrella
    this.loadDashboard();
  },

  // ---- Navegación ----
  bindNav() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => this.navigate(el.getAttribute('data-nav')));
    });
  },

  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav') === view);
    });
    // Cerrar menú móvil.
    const sb = document.querySelector('.sidebar');
    if (sb) sb.classList.remove('open');

    if (view === 'dashboard') this.loadDashboard();
    if (view === 'movement') Movement.refresh();
    if (view === 'backup') this.loadBackupView();
    if (view === 'sales') Sales.load().then(() => Sales.render());
    if (view === 'inventory') Inventory.load();
    if (view === 'patients') Patients.load();
    if (view === 'agenda') Agenda.load();
    if (view === 'services') Services.load();
  },

  bindMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sb = document.querySelector('.sidebar');
    if (toggle && sb) toggle.addEventListener('click', () => sb.classList.toggle('open'));
  },

  // ---- Tema (claro/oscuro) y skin visual ----
  applyTheme() {
    const stored = localStorage.getItem('rm2_theme') || 'light';
    document.documentElement.setAttribute('data-theme', stored);
  },
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rm2_theme', next);
    // Redibujar gráficas para re-pintar colores del eje según el modo.
    if (this.currentView === 'movement') Movement.refresh();
  },

  // Skin visual: 'glass' (default) | 'classic' | 'soft'.
  applySkin() {
    const skin = localStorage.getItem('rm2_skin') || 'glass';
    document.documentElement.setAttribute('data-skin', skin);
    this._syncSkinSwatches(skin);
  },
  setSkin(skin) {
    document.documentElement.setAttribute('data-skin', skin);
    localStorage.setItem('rm2_skin', skin);
    this._syncSkinSwatches(skin);
    // Las gráficas usan colores de eje según el skin; redibujar.
    if (this.currentView === 'movement') Movement.refresh();
  },
  _syncSkinSwatches(active) {
    document.querySelectorAll('[data-skin-opt]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-skin-opt') === active);
    });
  },
  bindThemeControls() {
    document.querySelectorAll('[data-skin-opt]').forEach(btn => {
      btn.addEventListener('click', () => this.setSkin(btn.getAttribute('data-skin-opt')));
    });
  },

  // ---- Dashboard ----
  async loadDashboard() {
    const stats = await DB.getDashboardStats();
    const host = document.getElementById('dash-kpis');
    if (!host) return;
    host.innerHTML =
      dashKpi('Pacientes registrados', 'pets', stats.totalPatients) +
      dashKpi('Servicios (mes)', 'medical_services', stats.monthServices) +
      dashKpi('Turnos hoy', 'event', stats.todayAppointments) +
      dashKpi('Facturación hoy', 'payments', formatMoneyCompact(stats.todaySalesTotal)) +
      dashKpi('Ventas hoy', 'receipt_long', stats.todaySalesCount) +
      dashKpi('Facturación mes', 'trending_up', formatMoneyCompact(stats.monthSalesTotal));
  },

  // ---- Backup ----
  bindBackupControls() {
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', async () => {
      await downloadBackup();
      toast('Backup exportado correctamente.', 'success');
    });

    const importBtn = document.getElementById('btn-import');
    const fileInput = document.getElementById('backup-file');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const result = await importBackupFromFile(file);
          const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
          let msg = `Backup v${result.version} importado: ${total} registros.`;
          if (result.warnings && result.warnings.length) {
            msg += ` (${result.warnings.length} avisos)`;
          }
          toast(msg, 'success');
          this.loadBackupView();
          if (this.currentView === 'movement') Movement.refresh();
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          fileInput.value = '';
        }
      });
    }
  },

  async loadBackupView() {
    const last = await DB.getLastBackupDate();
    const host = document.getElementById('backup-last');
    if (host) {
      host.innerHTML = last
        ? `Último respaldo: <strong>${formatDateShort(last)}</strong> (hace ${daysSince(last)} días)`
        : 'Todavía no se ha generado ningún respaldo local.';
    }
  }
};

// Helper de KPI del dashboard (fuera de la clase para no depender de `this`).
function dashKpi(label, icon, value) {
  return `
    <div class="card kpi">
      <div class="kpi-label"><span class="material-symbols-outlined">${icon}</span>${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
}

// ---- Arranque ----
window.addEventListener('DOMContentLoaded', () => App.init());
