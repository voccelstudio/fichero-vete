// ============================================================
// VetCare Pro 2.0 — Módulo Pacientes
// Listado, búsqueda/filtro, alta/edición y ficha de detalle.
// ============================================================

const Patients = {
  _patients: [],
  _currentId: null,

  async init() {
    this.bindControls();
    await this.load();
  },

  bindControls() {
    const search = document.getElementById('pat-search');
    if (search) search.addEventListener('input', debounce(() => this.render(), 200));

    const species = document.getElementById('pat-species');
    if (species) species.addEventListener('change', () => this.render());

    const form = document.getElementById('patient-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });

    const modal = document.getElementById('modal-patient');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeForm(); });

    const pfSpecies = document.getElementById('pf-species');
    if (pfSpecies) pfSpecies.addEventListener('change', () => this.syncBreed());
  },

  async load() {
    this._patients = await DB.getAllPatients();
    this.populateSpeciesFilter();
    this.render();
  },

  populateSpeciesFilter() {
    const sel = document.getElementById('pat-species');
    if (!sel) return;
    const current = sel.value;
    const used = [...new Set(this._patients.map(p => p.species).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todas las especies</option>' +
      used.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    sel.value = current;
  },

  render() {
    const host = document.getElementById('patients-list');
    if (!host) return;
    const q = (document.getElementById('pat-search')?.value || '').toLowerCase().trim();
    const sp = document.getElementById('pat-species')?.value || '';

    let list = this._patients;
    if (sp) list = list.filter(p => p.species === sp);
    if (q) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.ownerName || '').toLowerCase().includes(q) ||
        (p.breed || '').toLowerCase().includes(q) ||
        (p.ownerPhone || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q));
    }

    if (!list.length) {
      host.innerHTML = `<div class="card empty-state">
        <span class="material-symbols-outlined">pets</span>
        <div>${(q || sp) ? 'Sin resultados.' : 'No hay pacientes cargados.'}</div>
        ${(q || sp) ? '' : '<button class="btn btn-primary mt" onclick="Patients.openForm()"><span class="material-symbols-outlined">add</span> Registrar paciente</button>'}
      </div>`;
      return;
    }

    const cards = list.map(p => this._cardHtml(p)).join('');
    host.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">${cards}</div>`;
  },

  _cardHtml(p) {
    const initial = (p.name || '?').charAt(0).toUpperCase();
    const avatar = (p.photo && p.photo.startsWith('data:'))
      ? `<img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover" />`
      : `<span style="font-size:1.4rem;font-weight:800">${escapeHtml(initial)}</span>`;
    const alert = p.alerts ? `<span class="badge badge-danger" style="margin-top:8px"><span class="material-symbols-outlined" style="font-size:13px">warning</span> Alerta</span>` : '';

    return `<div class="card" style="cursor:pointer" onclick="Patients.view('${escapeHtml(p.id)}')">
      <div class="row" style="gap:12px">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--grad-accent);display:grid;place-items:center;color:#fff;overflow:hidden;flex-shrink:0">${avatar}</div>
        <div style="min-width:0">
          <div style="font-weight:700;color:var(--text-strong)">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:0.82rem">${escapeHtml(p.breed || p.species || '')}</div>
        </div>
      </div>
      <div class="mt muted" style="font-size:0.82rem">
        <div class="row" style="gap:6px"><span class="material-symbols-outlined" style="font-size:15px">person</span> ${escapeHtml(p.ownerName || 'Sin dueño')}</div>
      </div>
      ${alert}
    </div>`;
  },

  // ---------- Detalle ----------
  async view(id) {
    const p = await DB.getPatient(id);
    if (!p) return;
    this._currentId = id;

    const name = document.getElementById('pd-name');
    const sub = document.getElementById('pd-sub');
    if (name) name.textContent = p.name || 'Paciente';
    if (sub) sub.textContent = [p.breed || p.species, p.ownerName].filter(Boolean).join(' · ');

    // Actividad reciente del paciente.
    const [services, vaccinations] = await Promise.all([
      DB.getServicesByPatient(id),
      DB.getVaccinationsByPatient(id)
    ]);
    services.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    vaccinations.sort((a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''));

    const avatar = (p.photo && p.photo.startsWith('data:'))
      ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
      : `<span style="font-size:2rem;font-weight:800;color:#fff">${escapeHtml((p.name||'?').charAt(0).toUpperCase())}</span>`;

    const infoRow = (label, value) => `<div class="row between" style="padding:7px 0;border-bottom:1px solid rgba(128,128,128,0.12)">
      <span class="muted">${label}</span><span>${escapeHtml(value || '—')}</span></div>`;

    const svcRows = services.slice(0, 12).map(s => `
      <div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
        <div><strong>${escapeHtml(s.serviceType || 'Servicio')}</strong><div class="muted" style="font-size:0.78rem">${escapeHtml(s.performedBy || '')}${s.notes ? ' · ' + escapeHtml(s.notes) : ''}</div></div>
        <div class="row" style="gap:6px">
          <span class="muted">${formatDateShort(s.date)}</span>
          <button class="btn btn-sm btn-ghost" title="Enviar reporte por WhatsApp" onclick="Patients.sendServiceWhatsApp('${escapeHtml(s.id)}')"><span class="material-symbols-outlined" style="color:#25D366">chat</span></button>
        </div>
      </div>`).join('') || '<div class="muted">Sin servicios registrados.</div>';

    const vacRows = vaccinations.slice(0, 12).map(v => `
      <div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
        <div>
          <strong>${escapeHtml(v.vaccineName || 'Vacuna')}</strong>
          ${v.nextDoseDate ? `<div class="muted" style="font-size:0.78rem">Próxima: ${formatDateShort(v.nextDoseDate)}</div>` : ''}
        </div>
        <div class="row" style="gap:6px">
          <span class="muted">${formatDateShort(v.dateApplied)}</span>
          ${v.nextDoseDate && patient.ownerPhone ? `<button class="btn btn-sm btn-ghost" title="Recordatorio WhatsApp" onclick="Patients.sendVaccineReminder('${escapeHtml(v.id)}')"><span class="material-symbols-outlined" style="color:#25D366">chat</span></button>` : ''}
        </div>
      </div>`).join('') || '<div class="muted">Sin vacunas registradas.</div>';

    const prescriptions = await DB.getPrescriptionsByPatient(id).catch(() => []);
    prescriptions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const rxRows = prescriptions.slice(0, 10).map(rx => {
      const meds = Array.isArray(rx.medications) ? rx.medications.map(m => m.name).filter(Boolean).join(', ') : '';
      return `<div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(128,128,128,0.1)">
        <div>
          <strong>Receta</strong>
          <div class="muted" style="font-size:0.78rem">${escapeHtml(meds || 'Sin medicamentos detallados')}</div>
        </div>
        <div class="row" style="gap:6px">
          <span class="muted">${formatDateShort(rx.date)}</span>
          <button class="btn btn-sm btn-ghost" title="Exportar receta PDF" onclick="Patients.exportPrescriptionPDF('${escapeHtml(rx.id)}')"><span class="material-symbols-outlined">picture_as_pdf</span></button>
        </div>
      </div>`;
    }).join('') || '<div class="muted">Sin recetas registradas.</div>';

    const body = document.getElementById('patient-detail-body');
    if (body) {
      body.innerHTML = `
      <div class="grid-main-side">
        <div>
          <div class="card mb">
            <div class="row between mb">
              <div class="card-title">Ficha</div>
              <div class="row" style="gap:6px">
                <button class="btn btn-sm btn-ghost" onclick="Patients.openForm('${escapeHtml(p.id)}')" title="Editar"><span class="material-symbols-outlined">edit</span></button>
                <button class="btn btn-sm btn-ghost" onclick="Patients.exportPDF('${escapeHtml(p.id)}')" title="Exportar ficha PDF"><span class="material-symbols-outlined">picture_as_pdf</span></button>
              </div>
            </div>
            ${infoRow('Especie', p.species)}
            ${infoRow('Raza', p.breed)}
            ${infoRow('Sexo', p.sex)}
            ${infoRow('Edad', `${p.ageYears || 0} años ${p.ageMonths || 0} meses`)}
            ${infoRow('Peso', p.weight ? p.weight + ' kg' : '')}
            ${infoRow('Color', p.color)}
            ${infoRow('Microchip', p.microchip)}
            ${infoRow('Esterilizado', p.neutered ? 'Sí' : 'No')}
            ${infoRow('Señas', p.marks)}
          </div>
          ${p.alerts ? `<div class="card mb" style="border-color:rgba(239,68,68,0.4)">
            <div class="row" style="gap:8px;color:var(--danger)"><span class="material-symbols-outlined">warning</span><strong>Alertas médicas</strong></div>
            <div class="mt">${escapeHtml(p.alerts)}</div></div>` : ''}
          ${p.notes ? `<div class="card mb"><div class="card-title mb">Notas</div>${escapeHtml(p.notes)}</div>` : ''}
        </div>
        <div>
          <div class="card" style="text-align:center">
            <div style="width:88px;height:88px;margin:0 auto 12px;border-radius:50%;background:var(--grad-accent);display:grid;place-items:center;overflow:hidden">${avatar}</div>
            <div class="card-title">${escapeHtml(p.name)}</div>
            <div class="card-sub mb">Dueño: ${escapeHtml(p.ownerName || '—')}</div>
            <div class="text-right" style="font-size:0.84rem">
              <div class="muted">Tel: ${escapeHtml(p.ownerPhone || '—')}</div>
              <div class="muted">Email: ${escapeHtml(p.ownerEmail || '—')}</div>
              <div class="muted">Dir: ${escapeHtml(p.ownerAddress || '—')}</div>
            </div>
            <div class="row" style="justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-sm btn-primary" onclick="Patients.exportPDF('${escapeHtml(p.id)}')"><span class="material-symbols-outlined">picture_as_pdf</span> Ficha PDF</button>
              ${patient.ownerPhone ? `<button class="btn btn-sm btn-ghost" onclick="Patients.contactWhatsApp('${escapeHtml(p.id)}')" title="Contactar por WhatsApp"><span class="material-symbols-outlined" style="color:#25D366">chat</span></button>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-title mb">Historial de servicios (${services.length})</div>${svcRows}</div>
        <div class="card"><div class="card-title mb">Vacunas (${vaccinations.length})</div>${vacRows}</div>
      </div>
      <div class="card mt"><div class="card-title mb">Recetas médicas (${prescriptions.length})</div>${rxRows}</div>`;
    }

    App.navigate('patient-detail');
  },

  async exportPDF(id) {
    try {
      if (typeof generatePatientPDF !== 'function') {
        toast('Generador de PDF no disponible.', 'error');
        return;
      }
      await generatePatientPDF(id);
      toast('Ficha PDF generada.', 'success');
    } catch (e) {
      console.error(e);
      toast('Error al generar PDF de la ficha.', 'error');
    }
  },

  async sendServiceWhatsApp(serviceId) {
    const s = await DB.getService(serviceId);
    if (!s) return;
    const patient = await DB.getPatient(s.patientId);
    if (!patient) return;
    const phone = patient.ownerPhone;
    if (!phone) {
      toast('El paciente no tiene teléfono registrado.', 'error');
      return;
    }
    const settings = await DB.getClinicSettings();
    const clinic = settings.clinicName || 'VetCare Pro';
    let message = `🐾 *${clinic} - Reporte Médico*\n\n`;
    message += `Estimado/a *${patient.ownerName || ''}*,\n`;
    message += `Te compartimos el reporte de la atención de *${patient.name}*:\n\n`;
    message += `📅 *Fecha:* ${formatDateShort(s.date)} ${s.time || ''}\n`;
    message += `🩺 *Servicio:* ${s.serviceType || 'Servicio'}\n`;
    if (s.performedBy) message += `👨‍⚕️ *Profesional:* ${s.performedBy}\n`;
    if (s.notes) message += `📝 *Detalles:* ${s.notes}\n`;
    message += `\n¡Gracias por confiar el cuidado de ${patient.name} en nosotros! 🐾`;
    const clean = phone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank');
  },

  async sendVaccineReminder(vaccineId) {
    const allVac = await DB.getAllVaccinations();
    const v = allVac.find(x => x.id === vaccineId);
    if (!v) return;
    const patient = await DB.getPatient(v.patientId);
    if (!patient || !patient.ownerPhone) {
      toast('El paciente no tiene teléfono registrado.', 'error');
      return;
    }
    const settings = await DB.getClinicSettings();
    const clinic = settings.clinicName || 'VetCare Pro';
    const isOverdue = v.nextDoseDate && v.nextDoseDate < getToday();
    let message = `🐾 *${clinic} - Recordatorio de Vacuna*\n\n`;
    message += `Hola *${patient.ownerName || ''}*,\n`;
    if (isOverdue) {
      message += `Te recordamos que *${patient.name}* tiene vencida la vacuna: *${v.vaccineName}* (venció el ${formatDateShort(v.nextDoseDate)}).\n`;
    } else {
      message += `Te recordamos que se aproxima la siguiente dosis de la vacuna *${v.vaccineName}* de *${patient.name}* el día *${formatDateShort(v.nextDoseDate)}*.\n`;
    }
    message += `Por favor, agenda un turno para su aplicación.\n\n¡Saludos de ${clinic}! 🐾`;
    const clean = patient.ownerPhone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank');
  },

  async contactWhatsApp(id) {
    const patient = await DB.getPatient(id);
    if (!patient || !patient.ownerPhone) {
      toast('El paciente no tiene teléfono registrado.', 'error');
      return;
    }
    const settings = await DB.getClinicSettings();
    const clinic = settings.clinicName || 'VetCare Pro';
    const message = `Hola ${patient.ownerName || ''}, te escribimos desde ${clinic} para coordinar atención de ${patient.name}.`;
    const clean = patient.ownerPhone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank');
  },

  async exportPrescriptionPDF(id) {
    try {
      if (typeof generatePrescriptionPDF !== 'function') {
        toast('Generador de PDF no disponible.', 'error');
        return;
      }
      await generatePrescriptionPDF(id);
      toast('Receta PDF generada.', 'success');
    } catch (e) {
      console.error(e);
      toast('Error al generar PDF de la receta.', 'error');
    }
  },

  // ---------- Alta / edición ----------
  openForm(id = null) {
    const modal = document.getElementById('modal-patient');
    const title = document.getElementById('patient-modal-title');
    const form = document.getElementById('patient-form');
    if (!modal || !form) return;
    form.reset();

    // Selector de especie.
    const spSel = document.getElementById('pf-species');
    if (spSel) spSel.innerHTML = SPECIES.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

    if (id) {
      const p = this._patients.find(x => x.id === id) || this._currentPatient;
      if (p) {
        if (title) title.textContent = 'Editar paciente';
        form.elements['name'].value = p.name || '';
        spSel.value = p.species || 'Perro';
        this.syncBreed(p.breed);
        form.elements['sex'].value = p.sex || 'Macho';
        form.elements['ageYears'].value = p.ageYears ?? 0;
        form.elements['ageMonths'].value = p.ageMonths ?? 0;
        form.elements['weight'].value = p.weight ?? 0;
        form.elements['color'].value = p.color || '';
        form.elements['microchip'].value = p.microchip || '';
        form.elements['neutered'].value = p.neutered ? 'yes' : 'no';
        form.elements['marks'].value = p.marks || '';
        form.elements['ownerName'].value = p.ownerName || '';
        form.elements['ownerPhone'].value = p.ownerPhone || '';
        form.elements['ownerEmail'].value = p.ownerEmail || '';
        form.elements['ownerAddress'].value = p.ownerAddress || '';
        form.elements['alerts'].value = p.alerts || '';
        form.elements['notes'].value = p.notes || '';
      }
    } else {
      if (title) title.textContent = 'Nuevo paciente';
      this.syncBreed('');
    }

    this._editingId = id;
    modal.classList.add('open');
  },

  // Completa el input de raza según la especie (con opción "Otro").
  syncBreed(preset) {
    const spSel = document.getElementById('pf-species');
    const breedInput = document.getElementById('pf-breed');
    if (!spSel || !breedInput) return;
    const breeds = BREEDS_BY_SPECIES[spSel.value] || [];
    const val = preset !== undefined ? preset : breedInput.value;
    // Usamos un input de texto con las razas como sugerencias (datalist).
    let dl = document.getElementById('pf-breed-list');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'pf-breed-list';
      breedInput.setAttribute('list', 'pf-breed-list');
      document.body.appendChild(dl);
    }
    dl.innerHTML = breeds.map(b => `<option value="${escapeHtml(b)}"></option>`).join('');
    // Si la raza actual no corresponde a la especie, limpiar.
    if (preset === undefined && val && breeds.length && !breeds.includes(val)) {
      // Mantener: el usuario pudo escribir una raza custom.
    }
  },

  closeForm() {
    const modal = document.getElementById('modal-patient');
    if (modal) modal.classList.remove('open');
    this._editingId = null;
  },

  async save() {
    const form = document.getElementById('patient-form');
    if (!form) return;
    const fd = new FormData(form);

    const data = {
      name: (fd.get('name') || '').toString().trim(),
      species: (fd.get('species') || '').toString(),
      breed: (fd.get('breed') || '').toString().trim(),
      sex: (fd.get('sex') || '').toString(),
      ageYears: parseInt(fd.get('ageYears')) || 0,
      ageMonths: parseInt(fd.get('ageMonths')) || 0,
      weight: parseFloat(fd.get('weight')) || 0,
      color: (fd.get('color') || '').toString().trim(),
      microchip: (fd.get('microchip') || '').toString().trim(),
      neutered: fd.get('neutered') === 'yes',
      marks: (fd.get('marks') || '').toString().trim(),
      ownerName: (fd.get('ownerName') || '').toString().trim(),
      ownerPhone: (fd.get('ownerPhone') || '').toString().trim(),
      ownerEmail: (fd.get('ownerEmail') || '').toString().trim(),
      ownerAddress: (fd.get('ownerAddress') || '').toString().trim(),
      alerts: (fd.get('alerts') || '').toString().trim(),
      notes: (fd.get('notes') || '').toString().trim(),
      updatedAt: getToday()
    };

    if (!data.name) { toast('Ingresá el nombre de la mascota.', 'error'); return; }
    if (!data.ownerName) { toast('Ingresá el nombre del dueño.', 'error'); return; }

    if (this._editingId) {
      const existing = await DB.getPatient(this._editingId);
      await DB.addPatient({ ...existing, ...data });
      toast('Paciente actualizado.', 'success');
    } else {
      data.id = generateId('PAC');
      data.createdAt = getToday();
      data.photo = '';   // foto se puede agregar en una próxima iteración
      await DB.addPatient(data);
      toast('Paciente registrado.', 'success');
    }

    this.closeForm();
    await this.load();
    // Refrescar selectores dependientes.
    if (typeof Agenda !== 'undefined') await Agenda.loadPatients();
    if (typeof Sales !== 'undefined') await Sales.loadCatalog();
  },

  async editCurrent() {
    if (!this._currentId) return;
    this._currentPatient = await DB.getPatient(this._currentId);
    this.openForm(this._currentId);
  },

  async removeCurrent() {
    if (!this._currentId) return;
    const p = await DB.getPatient(this._currentId);
    if (!p) return;
    if (!confirm(`¿Eliminar a ${p.name}? Se borrarán también sus servicios, vacunas, recetas y turnos. Las ventas se conservan.`)) return;
    await DB.deletePatient(this._currentId);
    toast('Paciente eliminado.', 'success');
    this._currentId = null;
    await this.load();
    App.navigate('patients');
  }
};
