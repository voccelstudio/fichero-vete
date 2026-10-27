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

  init() {
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
    if (view === 'settings') this.loadSettingsView();
    if (view === 'sales') Sales.load().then(() => Sales.render());
    if (view === 'inventory') Inventory.load();
    if (view === 'patients') Patients.load();
    if (view === 'agenda') Agenda.load();
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
    if (host) {
      host.innerHTML =
        dashKpi('Pacientes registrados', 'pets', stats.totalPatients) +
        dashKpi('Servicios (mes)', 'medical_services', stats.monthServices) +
        dashKpi('Turnos hoy', 'event', stats.todayAppointments) +
        dashKpi('Facturación hoy', 'payments', formatMoneyCompact(stats.todaySalesTotal)) +
        dashKpi('Ventas hoy', 'receipt_long', stats.todaySalesCount) +
        dashKpi('Facturación mes', 'trending_up', formatMoneyCompact(stats.monthSalesTotal));
    }
    await this.loadDashboardReminders();
    await this.loadDashboardBackupStatus();
  },

  async loadDashboardBackupStatus() {
    const el = document.getElementById('dash-backup-status');
    if (!el) return;
    const last = await DB.getLastBackupDate();
    if (!last) {
      el.innerHTML = '<span style="color:var(--warn)">Sin respaldo aún</span>';
      return;
    }
    const days = daysSince(last);
    if (days >= 7) {
      el.innerHTML = `<span style="color:var(--warn)">Hace ${days} días sin respaldo</span>`;
    } else {
      el.innerHTML = `Último respaldo: hace ${days} día${days === 1 ? '' : 's'}`;
    }
  },

  async loadDashboardReminders() {
    const host = document.getElementById('dash-reminders');
    if (!host) return;
    const [vaccinations, procedures] = await Promise.all([
      DB.getAllVaccinations().catch(() => []),
      DB.getAllPatientProcedures ? DB.getAllPatientProcedures().catch(() => []) : []
    ]);
    const today = getToday();
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitStr = formatDateInput(limit);
    const vac = vaccinations.filter(v => v.nextDoseDate && v.nextDoseDate >= today && v.nextDoseDate <= limitStr).sort((a,b) => (a.nextDoseDate||'').localeCompare(b.nextDoseDate||'')).slice(0, 5);
    const proc = procedures.filter(p => (p.category === 'Vacunas' || p.category === 'Pipetas') && p.nextDate && p.nextDate >= today && p.nextDate <= limitStr).sort((a,b) => (a.nextDate||'').localeCompare(b.nextDate||'')).slice(0, 5);

    if (!vac.length && !proc.length) {
      host.innerHTML = `<div class="muted" style="padding:6px 0">Sin vacunas o procedimientos próximos en los próximos 30 días.</div>`;
      return;
    }

    let html = '';
    if (vac.length) {
      html += `<div style="font-weight:600;margin-bottom:6px">Vacunas próximas</div>`;
      for (const v of vac) {
        const p = await DB.getPatient(v.patientId).catch(() => null);
        html += `<div class="row between" style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
          <div><strong>${escapeHtml(p?.name || 'Paciente')}</strong><div class="muted" style="font-size:0.78rem">${escapeHtml(v.vaccineName || '')}</div></div>
          <span class="muted">${formatDateShort(v.nextDoseDate)}</span>
        </div>`;
      }
    }
    if (proc.length) {
      html += `<div style="font-weight:600;margin:10px 0 6px">Procedimientos próximos</div>`;
      for (const pr of proc) {
        const p = await DB.getPatient(pr.patientId).catch(() => null);
        html += `<div class="row between" style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
          <div><strong>${escapeHtml(p?.name || 'Paciente')}</strong><div class="muted" style="font-size:0.78rem">${escapeHtml(pr.name || pr.description || pr.category)}</div></div>
          <span class="muted">${formatDateShort(pr.nextDate)}</span>
        </div>`;
      }
    }
    host.innerHTML = html;
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
  },

  async loadSettingsView() {
    const s = await DB.getClinicSettings();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('cfg-clinicName', s.clinicName);
    set('cfg-clinicEmail', s.clinicEmail);
    set('cfg-clinicPhone', s.clinicPhone);
    set('cfg-clinicAddress', s.clinicAddress);
    set('cfg-clinicTaxId', s.clinicTaxId);
    set('cfg-clinicVeterinarian', s.clinicVeterinarian);
    const logoPrev = document.getElementById('cfg-logo-preview');
    const logoArea = document.getElementById('cfg-logo-area');
    if (logoPrev) {
      if (s.clinicLogo) {
        logoPrev.src = s.clinicLogo;
        logoPrev.style.display = 'block';
        if (logoArea) logoArea.classList.add('has-logo');
      } else {
        logoPrev.removeAttribute('src');
        logoPrev.style.display = 'none';
        if (logoArea) logoArea.classList.remove('has-logo');
      }
    }
    const tLogo = document.getElementById('cfg-pdf-logo');
    const tVat = document.getElementById('cfg-pdf-vat');
    if (tLogo) tLogo.checked = s.pdfShowLogo !== false;
    if (tVat) tVat.checked = s.pdfShowVat !== false;
    const tDark = document.getElementById('cfg-theme-dark');
    if (tDark) tDark.checked = !!s.themeDarkMode;
  },

  async handleLogoConfigUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('El logo es muy grande (máx 2MB).', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const logoPrev = document.getElementById('cfg-logo-preview');
      const logoArea = document.getElementById('cfg-logo-area');
      if (logoPrev) {
        logoPrev.src = dataUrl;
        logoPrev.style.display = 'block';
        if (logoArea) logoArea.classList.add('has-logo');
      }
      document.getElementById('cfg-clinicLogo-data').value = dataUrl;
      toast('Logo cargado. Guardá la configuración.', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  },

  async saveSettingsView() {
    const get = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const data = {
      clinicName: get('cfg-clinicName').trim(),
      clinicEmail: get('cfg-clinicEmail').trim(),
      clinicPhone: get('cfg-clinicPhone').trim(),
      clinicAddress: get('cfg-clinicAddress').trim(),
      clinicTaxId: get('cfg-clinicTaxId').trim(),
      clinicVeterinarian: get('cfg-clinicVeterinarian').trim(),
      clinicLogo: get('cfg-clinicLogo-data'),
      pdfShowLogo: document.getElementById('cfg-pdf-logo')?.checked !== false,
      pdfShowVat: document.getElementById('cfg-pdf-vat')?.checked !== false,
      themeDarkMode: document.getElementById('cfg-theme-dark')?.checked === true
    };
    await DB.saveClinicSettings(data);
    if (data.themeDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('rm2_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('rm2_theme', 'light');
    }
    toast('Configuración guardada.', 'success');
    await this.loadDashboard();
  },

  removeLogoConfig() {
    document.getElementById('cfg-clinicLogo-data').value = '';
    const logoPrev = document.getElementById('cfg-logo-preview');
    const logoArea = document.getElementById('cfg-logo-area');
    if (logoPrev) {
      logoPrev.removeAttribute('src');
      logoPrev.style.display = 'none';
    }
    if (logoArea) logoArea.classList.remove('has-logo');
    toast('Logo eliminado. Guardá la configuración.', 'info');
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
