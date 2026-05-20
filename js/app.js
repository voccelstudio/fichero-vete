const App = {
  currentView: 'dashboard',
  currentPatientId: null,
  editingPatientId: null,

  async init() {
    const settings = await DB.getClinicSettings();
    if (settings.clinicName) {
      document.getElementById('sidebar-clinic-name').textContent = settings.clinicName;
    }
    this.loadSpeciesFilter();
    this.loadServiceTypes();
    this.navigate('dashboard');
    this.checkBackupReminder();
    document.getElementById('global-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.searchPatients(e.target.value);
    });
  },

  // ===== NAVIGATION =====
  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    const link = document.querySelector(`.sidebar-link[data-view="${view}"]`);
    if (link) link.classList.add('active');

    switch (view) {
      case 'dashboard': this.loadDashboard(); break;
      case 'patients': this.loadPatients(); break;
      case 'services': this.loadServices(); break;
      case 'settings': this.loadSettingsForm(); break;
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    } else {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    }
  },

  // ===== DASHBOARD =====
  async loadDashboard() {
    const stats = await DB.getDashboardStats();
    document.getElementById('stat-patients').textContent = stats.totalPatients;
    document.getElementById('stat-month-services').textContent = stats.monthServices;
    document.getElementById('dashboard-greeting').textContent = `¡Hola! Bienvenido a VetCare Pro`;
    document.getElementById('dashboard-subtitle').textContent = `${getTodayDisplay()} — ${stats.totalPatients} pacientes registrados.`;
    document.getElementById('top-date').textContent = getTodayDisplay();

    const sidebarName = document.getElementById('sidebar-clinic-name');
    const settings = await DB.getClinicSettings();
    if (settings.clinicName) sidebarName.textContent = settings.clinicName;

    await this.renderDashboardServices();
    await this.renderDashboardAgenda();
    await this.renderSpeciesChart();
  },

  async renderDashboardServices() {
    const services = await DB.getRecentServices(5);
    const container = document.getElementById('dashboard-services-table');
    if (services.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon material-symbols-outlined">medical_services</div><p>No hay servicios registrados aún</p></div>`;
      return;
    }
    let html = `<table class="data-table"><thead><tr><th>Paciente</th><th>Servicio</th><th>Fecha</th><th>Profesional</th></tr></thead><tbody>`;
    for (const s of services) {
      const patient = s.patientId ? await DB.getPatient(s.patientId) : null;
      html += `<tr>
        <td class="font-medium">${patient ? escapeHtml(patient.name) : '—'}</td>
        <td>${escapeHtml(s.serviceType)}</td>
        <td class="text-on-surface-variant">${formatDateShort(s.date)}</td>
        <td>${escapeHtml(s.performedBy || '—')}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  async renderDashboardAgenda() {
    const today = getToday();
    const appointments = await DB.getAppointmentsByDate(today);
    const container = document.getElementById('dashboard-agenda');
    if (appointments.length === 0) {
      container.innerHTML = `<div class="empty-state !p-4"><div class="icon material-symbols-outlined">event</div><p class="text-sm">Sin citas para hoy</p></div>`;
      return;
    }
    let html = `<div class="space-y-2">`;
    for (const a of appointments) {
      const patient = await DB.getPatient(a.patientId);
      html += `<div class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors border-l-4 border-primary">
        <div class="text-center min-w-[50px]"><p class="font-bold text-sm">${a.time || '--:--'}</p></div>
        <div class="flex-1"><p class="font-bold text-sm">${patient ? escapeHtml(patient.name) : '—'}</p><p class="text-xs text-on-surface-variant">${a.type || 'Cita'}</p></div>
        <span class="material-symbols-outlined text-outline">more_vert</span>
      </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  },

  async renderSpeciesChart() {
    const patients = await DB.getAllPatients();
    const container = document.getElementById('species-chart');
    if (patients.length === 0) {
      container.innerHTML = `<div class="empty-state !p-4"><div class="icon material-symbols-outlined">pets</div><p class="text-sm">Sin datos</p></div>`;
      return;
    }
    const counts = {};
    const colors = ['#00366b', '#006a63', '#293939', '#a7c8ff', '#8bf1e6', '#d4e6e5', '#1b4d89', '#737781'];
    patients.forEach(p => { counts[p.species] = (counts[p.species] || 0) + 1; });
    const total = patients.length;
    let html = '';
    let i = 0;
    for (const [species, count] of Object.entries(counts)) {
      const pct = Math.round((count / total) * 100);
      html += `<div>
        <div class="flex justify-between text-sm mb-1"><span>${escapeHtml(species)}</span><span class="font-bold">${count}</span></div>
        <div class="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${pct}%;background:${colors[i % colors.length]};"></div>
        </div>
      </div>`;
      i++;
    }
    container.innerHTML = html;
  },

  // ===== PATIENTS =====
  async loadPatients() {
    const patients = await DB.getAllPatients();
    this.renderPatientsList(patients);
  },

  renderPatientsList(patients) {
    const container = document.getElementById('patients-table-container');
    if (patients.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="icon material-symbols-outlined">pets</div>
        <h4 class="font-bold text-lg mb-2">No hay pacientes</h4>
        <p class="mb-4">Comienza registrando tu primer paciente.</p>
        <button class="btn-primary" onclick="App.openPatientForm()"><span class="material-symbols-outlined">add</span> Registrar Paciente</button>
      </div>`;
      return;
    }
    let html = `<table class="data-table"><thead><tr><th style="width:44px"></th><th>Nombre</th><th>Especie</th><th>Raza</th><th>Dueño</th><th>Teléfono</th><th></th></tr></thead><tbody>`;
    for (const p of patients) {
      const thumb = p.photo
        ? `<img src="${escapeHtml(p.photo)}" class="w-8 h-8 rounded-full object-cover border border-outline-variant">`
        : `<div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center"><span class="material-symbols-outlined text-sm text-primary">pets</span></div>`;
      html += `<tr class="cursor-pointer hover:bg-surface-container-low" onclick="App.viewPatient('${p.id}')">
        <td>${thumb}</td>
        <td class="font-bold text-primary">${escapeHtml(p.name)}</td>
        <td><span class="badge badge-secondary">${escapeHtml(p.species)}</span></td>
        <td>${escapeHtml(p.breed)}</td>
        <td>${escapeHtml(p.ownerName)}</td>
        <td class="text-on-surface-variant">${escapeHtml(p.ownerPhone)}</td>
        <td onclick="event.stopPropagation()">
          <div class="flex gap-1">
            <button class="btn-ghost p-1" onclick="App.openPatientForm('${p.id}')" title="Editar"><span class="material-symbols-outlined text-sm">edit</span></button>
            <button class="btn-ghost p-1" onclick="App.showDeletePatient('${p.id}')" title="Eliminar"><span class="material-symbols-outlined text-sm text-error">delete</span></button>
          </div>
        </td>
      </tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  async searchPatients(query) {
    const patients = await DB.searchPatients(query);
    const speciesFilter = document.getElementById('species-filter').value;
    const filtered = speciesFilter ? patients.filter(p => p.species === speciesFilter) : patients;
    this.renderPatientsList(filtered);
  },

  async filterPatients() {
    const query = document.getElementById('patient-search').value;
    await this.searchPatients(query);
  },

  loadSpeciesFilter() {
    const select = document.getElementById('species-filter');
    select.innerHTML = '<option value="">Todas las especies</option>';
    SPECIES.forEach(s => {
      select.innerHTML += `<option value="${s}">${s}</option>`;
    });
  },

  async openPatientForm(patientId) {
    this.editingPatientId = patientId || null;
    const modal = document.getElementById('patient-form-modal');
    const title = document.getElementById('patient-form-title');
    const speciesSelect = document.getElementById('pf-species');

    // Populate species
    speciesSelect.innerHTML = '';
    SPECIES.forEach(s => {
      speciesSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });

    if (patientId) {
      const p = await DB.getPatient(patientId);
      if (!p) return;
      title.textContent = 'Editar Paciente';
      document.getElementById('pf-name').value = p.name || '';
      speciesSelect.value = p.species || 'Perro';
      this.updateBreeds();
      document.getElementById('pf-breed').value = p.breed || '';
      document.getElementById('pf-sex').value = p.sex || 'Macho';
      document.getElementById('pf-neutered').value = p.neutered ? 'yes' : 'no';
      document.getElementById('pf-age-years').value = p.ageYears || 0;
      document.getElementById('pf-age-months').value = p.ageMonths || 0;
      document.getElementById('pf-weight').value = p.weight || '';
      document.getElementById('pf-color').value = p.color || '';
      document.getElementById('pf-microchip').value = p.microchip || '';
      document.getElementById('pf-marks').value = p.marks || '';
      document.getElementById('pf-owner').value = p.ownerName || '';
      document.getElementById('pf-owner-phone').value = p.ownerPhone || '';
      document.getElementById('pf-owner-email').value = p.ownerEmail || '';
      document.getElementById('pf-owner-address').value = p.ownerAddress || '';
      document.getElementById('pf-alerts').value = p.alerts || '';
      document.getElementById('pf-notes').value = p.notes || '';
      // Photo
      if (p.photo) {
        document.getElementById('pf-photo-preview').src = p.photo;
        document.getElementById('pf-photo-preview').style.display = 'block';
        document.getElementById('pf-photo-icon').style.display = 'none';
        document.getElementById('pf-photo-text').textContent = 'Cambiar foto';
        document.getElementById('pf-photo-remove').style.display = 'inline';
      }
    } else {
      title.textContent = 'Nuevo Paciente';
      document.querySelectorAll('#patient-form-modal input, #patient-form-modal textarea').forEach(el => {
        if (el.type !== 'number') el.value = '';
      });
      document.getElementById('pf-age-years').value = 0;
      document.getElementById('pf-age-months').value = 0;
      document.getElementById('pf-sex').value = 'Macho';
      document.getElementById('pf-neutered').value = 'no';
      speciesSelect.value = 'Perro';
      this.updateBreeds();
      // Reset photo
      document.getElementById('pf-photo-preview').src = '';
      document.getElementById('pf-photo-preview').style.display = 'none';
      document.getElementById('pf-photo-icon').style.display = 'block';
      document.getElementById('pf-photo-text').textContent = 'Agregar foto';
      document.getElementById('pf-photo-remove').style.display = 'none';
    }
    modal.classList.add('open');
  },

  handlePatientPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('pf-photo-preview');
      preview.src = e.target.result;
      preview.style.display = 'block';
      document.getElementById('pf-photo-icon').style.display = 'none';
      document.getElementById('pf-photo-text').textContent = 'Cambiar foto';
      document.getElementById('pf-photo-remove').style.display = 'inline';
    };
    reader.readAsDataURL(file);
  },

  removePatientPhoto(e) {
    e.stopPropagation();
    document.getElementById('pf-photo-preview').src = '';
    document.getElementById('pf-photo-preview').style.display = 'none';
    document.getElementById('pf-photo-icon').style.display = 'block';
    document.getElementById('pf-photo-text').textContent = 'Agregar foto';
    document.getElementById('pf-photo-remove').style.display = 'none';
  },

  async savePatientForm() {
    const name = document.getElementById('pf-name').value.trim();
    if (!name) { alert('El nombre del animal es obligatorio.'); return; }
    const owner = document.getElementById('pf-owner').value.trim();
    if (!owner) { alert('El nombre del propietario es obligatorio.'); return; }
    const phone = document.getElementById('pf-owner-phone').value.trim();
    if (!phone) { alert('El teléfono del propietario es obligatorio.'); return; }

    const data = {
      name,
      species: document.getElementById('pf-species').value,
      breed: document.getElementById('pf-breed').value,
      sex: document.getElementById('pf-sex').value,
      neutered: document.getElementById('pf-neutered').value === 'yes',
      ageYears: parseInt(document.getElementById('pf-age-years').value) || 0,
      ageMonths: parseInt(document.getElementById('pf-age-months').value) || 0,
      weight: parseFloat(document.getElementById('pf-weight').value) || 0,
      color: document.getElementById('pf-color').value.trim(),
      microchip: document.getElementById('pf-microchip').value.trim(),
      marks: document.getElementById('pf-marks').value.trim(),
      ownerName: owner,
      ownerPhone: phone,
      ownerEmail: document.getElementById('pf-owner-email').value.trim(),
      ownerAddress: document.getElementById('pf-owner-address').value.trim(),
      photo: document.getElementById('pf-photo-preview').src || '',
      alerts: document.getElementById('pf-alerts').value.trim(),
      notes: document.getElementById('pf-notes').value.trim(),
      updatedAt: getToday()
    };

    if (this.editingPatientId) {
      data.id = this.editingPatientId;
      await DB.updatePatient(data);
    } else {
      data.id = generateId('PAC');
      data.createdAt = getToday();
      await DB.addPatient(data);
    }

    this.closeModal('patient-form-modal');
    if (this.currentView === 'patients') await this.loadPatients();
    else if (this.currentView === 'dashboard') await this.loadDashboard();
    if (this.editingPatientId && this.currentView === 'patient-detail') {
      await this.loadPatientDetail(this.editingPatientId);
    }
  },

  showDeletePatient(id) {
    this.showConfirm(
      'Eliminar Paciente',
      '¿Estás seguro de eliminar este paciente? Esta acción no se puede deshacer.',
      async () => {
        await DB.deletePatient(id);
        await this.loadPatients();
      }
    );
  },

  async viewPatient(id) {
    this.currentPatientId = id;
    this.currentView = 'patient-detail';
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-patient-detail').classList.add('active');
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('.sidebar-link[data-view="patients"]');
    if (link) link.classList.add('active');
    await this.loadPatientDetail(id);
  },

  async loadPatientDetail(id) {
    const p = await DB.getPatient(id);
    if (!p) { this.navigate('patients'); return; }
    this.currentPatientId = id;

    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-id').textContent = `ID: ${p.id}`;
    // Photo
    const photoImg = document.getElementById('pd-photo-img');
    const photoPlaceholder = document.getElementById('pd-photo-placeholder');
    if (p.photo) {
      photoImg.src = p.photo;
      photoImg.style.display = 'block';
      photoPlaceholder.style.display = 'none';
    } else {
      photoImg.style.display = 'none';
      photoPlaceholder.style.display = 'block';
    }

    document.getElementById('pd-name').textContent = p.name;
    document.getElementById('pd-breed').textContent = p.species + (p.breed ? ` • ${p.breed}` : '');
    document.getElementById('pd-age').textContent = p.ageYears + ' años' + (p.ageMonths > 0 ? ' y ' + p.ageMonths + ' meses' : '');
    document.getElementById('pd-weight').textContent = p.weight ? p.weight + ' kg' : '—';
    document.getElementById('pd-sex').textContent = p.sex + (p.neutered ? ' (E/C)' : '');
    document.getElementById('pd-idnum').textContent = p.id;
    document.getElementById('pd-owner').textContent = p.ownerName;
    document.getElementById('pd-owner-phone').textContent = p.ownerPhone || '';
    document.getElementById('pd-owner-email').textContent = p.ownerEmail || '';

    // Alerts
    const alertsContainer = document.getElementById('pd-alerts-container');
    if (p.alerts) {
      alertsContainer.style.display = 'block';
      document.getElementById('pd-alerts').textContent = p.alerts;
    } else {
      alertsContainer.style.display = 'none';
    }

    // Notes
    const notesContainer = document.getElementById('pd-notes-container');
    if (p.notes) {
      notesContainer.style.display = 'block';
      document.getElementById('pd-notes').textContent = p.notes;
    } else {
      notesContainer.style.display = 'none';
    }

    // Info tab
    document.getElementById('pi-species').textContent = p.species;
    document.getElementById('pi-breed').textContent = p.breed || '—';
    document.getElementById('pi-color').textContent = p.color || '—';
    document.getElementById('pi-microchip').textContent = p.microchip || '—';
    document.getElementById('pi-marks').textContent = p.marks || 'Sin señas particulares';

    // History tab
    await this.renderPatientHistory(id);
  },

  async renderPatientHistory(patientId) {
    const services = await DB.getServicesByPatient(patientId);
    services.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const container = document.getElementById('patient-history');
    if (services.length === 0) {
      container.innerHTML = `<div class="empty-state !p-8"><div class="icon material-symbols-outlined">history</div><p>Sin servicios registrados</p><button class="btn-secondary mt-3" onclick="App.openServiceForm('${patientId}')">Registrar Servicio</button></div>`;
      return;
    }
    let html = `<table class="data-table"><thead><tr><th>Fecha</th><th>Servicio</th><th>Profesional</th><th>Observaciones</th></tr></thead><tbody>`;
    for (const s of services) {
      html += `<tr>
        <td class="text-sm">${formatDateShort(s.date)} ${s.time || ''}</td>
        <td class="font-medium">${escapeHtml(s.serviceType)}</td>
        <td>${escapeHtml(s.performedBy || '—')}</td>
        <td class="text-sm text-on-surface-variant max-w-xs truncate">${escapeHtml(s.notes || '')}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  switchPatientTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  },

  async editCurrentPatient() {
    if (this.currentPatientId) {
      this.openPatientForm(this.currentPatientId);
    }
  },

  async exportPatientPDF() {
    if (!this.currentPatientId) return;
    try {
      const btn = event.target.closest('button');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Generando...';
      await generatePatientPDF(this.currentPatientId);
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">picture_as_pdf</span> PDF';
    } catch (e) {
      console.error('PDF error:', e);
      alert('Error al generar el PDF. Revisa la consola.');
    }
  },

  updateBreeds() {
    const species = document.getElementById('pf-species').value;
    const breedSelect = document.getElementById('pf-breed');
    breedSelect.innerHTML = '';
    const breeds = BREEDS_BY_SPECIES[species] || ['Otro'];
    breeds.forEach(b => {
      breedSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
  },

  // ===== SERVICES =====
  loadServiceTypes() {
    const select = document.getElementById('sf-type');
    select.innerHTML = '';
    SERVICE_TYPES.forEach(t => {
      select.innerHTML += `<option value="${t}">${t}</option>`;
    });
  },

  async loadServices() {
    const services = await DB.getAllServices();
    this.renderServicesList(services);
  },

  renderServicesList(services) {
    const container = document.getElementById('services-table-container');
    if (services.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon material-symbols-outlined">medical_services</div><h4 class="font-bold text-lg mb-2">No hay servicios</h4><p class="mb-4">Registra el primer servicio.</p><button class="btn-primary" onclick="App.openServiceForm()">Registrar Servicio</button></div>`;
      return;
    }
    let html = `<table class="data-table"><thead><tr><th>Paciente</th><th>Servicio</th><th>Fecha</th><th>Profesional</th><th></th></tr></thead><tbody>`;
    // Sort by date desc
    const sorted = [...services].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    // Use map to load patients
    const htmlPromise = Promise.all(sorted.map(async s => {
      const patient = s.patientId ? await DB.getPatient(s.patientId) : null;
      return `<tr>
        <td class="font-bold text-primary">${patient ? escapeHtml(patient.name) : '—'}</td>
        <td><span class="badge badge-secondary">${escapeHtml(s.serviceType)}</span></td>
        <td class="text-on-surface-variant">${formatDateShort(s.date)} ${s.time || ''}</td>
        <td>${escapeHtml(s.performedBy || '—')}</td>
        <td>
          <button class="btn-ghost p-1 text-error" onclick="App.showDeleteService('${s.id}')" title="Eliminar"><span class="material-symbols-outlined text-sm">delete</span></button>
        </td>
      </tr>`;
    }));
    htmlPromise.then(rows => {
      container.innerHTML = `<table class="data-table"><thead><tr><th>Paciente</th><th>Servicio</th><th>Fecha</th><th>Profesional</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    });
  },

  async searchServices(query) {
    const all = await DB.getAllServices();
    if (!query) { this.renderServicesList(all); return; }
    const q = query.toLowerCase();
    // We need to filter by patient name too
    const patients = await DB.getAllPatients();
    const patientMap = {};
    patients.forEach(p => { patientMap[p.id] = p; });
    const filtered = all.filter(s => {
      const patient = patientMap[s.patientId];
      const patientName = patient ? patient.name.toLowerCase() : '';
      return s.serviceType.toLowerCase().includes(q) ||
             s.notes.toLowerCase().includes(q) ||
             s.performedBy.toLowerCase().includes(q) ||
             patientName.includes(q);
    });
    this.renderServicesList(filtered);
  },

  async openServiceForm(patientId) {
    const modal = document.getElementById('service-form-modal');
    // Populate patients
    const select = document.getElementById('sf-patient');
    select.innerHTML = '<option value="">Seleccionar paciente...</option>';
    const patients = await DB.getAllPatients();
    patients.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.species)})</option>`;
    });
    if (patientId) select.value = patientId;

    document.getElementById('sf-date').value = getToday();
    document.getElementById('sf-time').value = new Date().toTimeString().slice(0, 5);
    document.getElementById('sf-performer').value = '';
    document.getElementById('sf-notes').value = '';
    document.getElementById('sf-type').value = SERVICE_TYPES[0];
    modal.classList.add('open');
  },

  async saveServiceForm() {
    const patientId = document.getElementById('sf-patient').value;
    if (!patientId) { alert('Selecciona un paciente.'); return; }
    const serviceType = document.getElementById('sf-type').value;
    const date = document.getElementById('sf-date').value;
    if (!date) { alert('Selecciona una fecha.'); return; }

    const data = {
      id: generateId('SVC'),
      patientId,
      serviceType,
      performedBy: document.getElementById('sf-performer').value.trim(),
      date,
      time: document.getElementById('sf-time').value,
      notes: document.getElementById('sf-notes').value.trim(),
      createdAt: getToday()
    };

    await DB.addService(data);
    this.closeModal('service-form-modal');

    if (this.currentView === 'services') await this.loadServices();
    else if (this.currentView === 'dashboard') await this.loadDashboard();
    if (this.currentView === 'patient-detail' && this.currentPatientId) {
      await this.renderPatientHistory(this.currentPatientId);
    }
  },

  showDeleteService(id) {
    this.showConfirm(
      'Eliminar Servicio',
      '¿Estás seguro de eliminar este servicio?',
      async () => {
        await DB.deleteService(id);
        await this.loadServices();
      }
    );
  },

  // ===== SETTINGS =====
  async loadSettings() {
    const settings = await DB.getClinicSettings();
    document.getElementById('set-clinic-name').value = settings.clinicName || '';
    document.getElementById('set-clinic-email').value = settings.clinicEmail || '';
    document.getElementById('set-clinic-address').value = settings.clinicAddress || '';
    document.getElementById('set-clinic-phone').value = settings.clinicPhone || '';
    document.getElementById('set-clinic-taxid').value = settings.clinicTaxId || '';

    // Logo
    if (settings.clinicLogo) {
      const preview = document.getElementById('logo-preview');
      preview.src = settings.clinicLogo;
      preview.style.display = 'block';
      document.getElementById('logo-placeholder').style.display = 'none';
      document.getElementById('logo-text').textContent = 'Cambiar Logo';
      document.getElementById('logo-area').classList.add('has-logo');
    }

    // PDF toggles
    const logoToggle = document.getElementById('toggle-pdf-logo');
    const vatToggle = document.getElementById('toggle-pdf-vat');
    if (settings.pdfShowLogo) logoToggle.classList.add('active'); else logoToggle.classList.remove('active');
    if (settings.pdfShowVat) vatToggle.classList.add('active'); else vatToggle.classList.remove('active');

    // Preview name
    document.getElementById('preview-clinic-name').textContent = settings.clinicName || 'Mi Clínica';

    // Backup date
    const lastBackup = await DB.getLastBackupDate();
    document.getElementById('last-backup-display').textContent = lastBackup ? formatDate(lastBackup) : 'Nunca';
  },

  async loadSettingsForm() {
    await this.loadSettings();
    this.switchSettingsTab('clinic');
  },

  async saveSettings() {
    const data = {
      clinicName: document.getElementById('set-clinic-name').value.trim(),
      clinicEmail: document.getElementById('set-clinic-email').value.trim(),
      clinicAddress: document.getElementById('set-clinic-address').value.trim(),
      clinicPhone: document.getElementById('set-clinic-phone').value.trim(),
      clinicTaxId: document.getElementById('set-clinic-taxid').value.trim(),
      clinicLogo: document.getElementById('logo-preview').src || '',
      pdfShowLogo: document.getElementById('toggle-pdf-logo').classList.contains('active'),
      pdfShowVat: document.getElementById('toggle-pdf-vat').classList.contains('active')
    };
    await DB.saveClinicSettings(data);
    document.getElementById('sidebar-clinic-name').textContent = data.clinicName || 'VetCare Pro';
    document.getElementById('preview-clinic-name').textContent = data.clinicName || 'Mi Clínica';
    alert('Configuración guardada correctamente.');
  },

  switchSettingsTab(tab) {
    document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.lg\\:col-span-1 .card button').forEach(b => {
      b.classList.remove('bg-primary', 'text-on-primary', 'font-bold', 'shadow-md');
      b.classList.add('text-on-surface-variant');
    });
    const section = document.getElementById('settings-' + tab);
    if (section) section.style.display = 'block';
    // Find and highlight the button by text content
    document.querySelectorAll('.lg\\:col-span-1 .card button').forEach(b => {
      if ((tab === 'clinic' && b.textContent.includes('Datos')) ||
          (tab === 'branding' && b.textContent.includes('Logo')) ||
          (tab === 'pdf' && b.textContent.includes('PDF')) ||
          (tab === 'backup' && b.textContent.includes('Respaldo'))) {
        b.classList.remove('text-on-surface-variant');
        b.classList.add('bg-primary', 'text-on-primary', 'font-bold', 'shadow-md');
      }
    });
  },

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const preview = document.getElementById('logo-preview');
      preview.src = dataUrl;
      preview.style.display = 'block';
      document.getElementById('logo-placeholder').style.display = 'none';
      document.getElementById('logo-text').textContent = 'Cambiar Logo';
      document.getElementById('logo-area').classList.add('has-logo');
    };
    reader.readAsDataURL(file);
  },

  togglePdfOption(option) {
    const toggle = document.getElementById('toggle-pdf-' + option);
    toggle.classList.toggle('active');
  },

  // ===== BACKUP =====
  async checkBackupReminder() {
    const lastBackup = await DB.getLastBackupDate();
    const banner = document.getElementById('backup-banner');
    const statusEl = document.getElementById('backup-status');

    if (lastBackup) {
      const days = daysSince(lastBackup);
      statusEl.innerHTML = `<span class="material-symbols-outlined text-sm">backup</span><span>Último respaldo: hace ${days} días</span>`;
      if (days >= 7) {
        banner.classList.add('show');
        document.getElementById('backup-banner-text').textContent = `Hace ${days} días que no realizas un respaldo. Te recomendamos hacerlo semanalmente.`;
      } else {
        banner.classList.remove('show');
      }
    } else {
      statusEl.innerHTML = `<span class="material-symbols-outlined text-sm">backup</span><span>Sin respaldo aún</span>`;
      banner.classList.add('show');
      document.getElementById('backup-banner-text').textContent = 'Aún no has realizado ningún respaldo. Te recomendamos hacerlo ahora.';
    }
  },

  async exportBackup() {
    const backup = await DB.exportAllData();
    await DB.setLastBackupDate(getToday());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vetcare_backup_${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.checkBackupReminder();
  },

  importBackup() {
    document.getElementById('backup-input').click();
  },

  async handleBackupImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await DB.importAllData(backup);
      await DB.setLastBackupDate(getToday());
      alert('Datos restaurados correctamente. Se recargará la página.');
      location.reload();
    } catch (e) {
      alert('Error al restaurar el backup. Verifica que el archivo tenga el formato correcto.');
      console.error(e);
    }
    event.target.value = '';
  },

  clearAllData() {
    this.showConfirm(
      'Eliminar Todos los Datos',
      'Esta acción eliminará PERMANENTEMENTE todos los pacientes, servicios, citas y configuraciones. ¿Estás completamente seguro?',
      async () => {
        await DB.clearAll();
        alert('Todos los datos han sido eliminados. Se recargará la página.');
        location.reload();
      }
    );
  },

  // ===== MODALS =====
  closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'patient-form-modal') {
      this.editingPatientId = null;
    }
  },

  showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-btn').onclick = async () => {
      this.closeModal('confirm-modal');
      await onConfirm();
    };
    document.getElementById('confirm-modal').classList.add('open');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
