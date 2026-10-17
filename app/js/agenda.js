// ============================================================
// VetCare Pro 2.0 — Módulo Agenda
// Turnos/citas con filtros por rango y estado, alta/edición,
// cambio de estado inline y recordatorio por WhatsApp.
// ============================================================

const APPOINTMENT_STATUS = {
  pending:   { label: 'Pendiente', badge: 'badge-warning' },
  confirmed: { label: 'Confirmado', badge: 'badge-info' },
  completed: { label: 'Atendido', badge: 'badge-success' },
  cancelled: { label: 'Cancelado', badge: 'badge-danger' }
};

const Agenda = {
  _appointments: [],
  _patients: [],
  _range: 'today',
  _status: '',
  _editingId: null,

  async init() {
    this.bindControls();
    await this.loadPatients();
    await this.load();
  },

  bindControls() {
    const rangeEl = document.getElementById('agenda-range');
    if (rangeEl) {
      rangeEl.querySelectorAll('[data-range]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._range = btn.getAttribute('data-range');
          rangeEl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.render();
        });
      });
    }
    const status = document.getElementById('agenda-status');
    if (status) status.addEventListener('change', () => { this._status = status.value; this.render(); });

    const form = document.getElementById('appointment-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });

    const modal = document.getElementById('modal-appointment');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeForm(); });
  },

  async loadPatients() {
    this._patients = await DB.getAllPatients();
  },

  async load() {
    this._appointments = await DB.getAllAppointments();
    this.render();
  },

  _patientName(id) {
    const p = this._patients.find(x => x.id === id);
    return p ? p.name : 'Paciente';
  },

  _inRange(date) {
    if (this._range === 'all' || !date) return true;
    if (this._range === 'today') return date === getToday();
    if (this._range === 'week') { const w = getWeekRange(); return date >= w.start && date <= w.end; }
    if (this._range === 'month') { const m = getMonthRange(); return date >= m.start && date <= m.end; }
    return true;
  },

  render() {
    const host = document.getElementById('agenda-list');
    if (!host) return;

    let list = this._appointments.filter(a => this._inRange(a.date));
    if (this._status) list = list.filter(a => (a.status || 'pending') === this._status);
    list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

    if (!list.length) {
      host.innerHTML = `<div class="card empty-state">
        <span class="material-symbols-outlined">event</span>
        <div>No hay turnos en este rango.</div>
        <button class="btn btn-primary mt" onclick="Agenda.openForm()"><span class="material-symbols-outlined">add</span> Nuevo turno</button>
      </div>`;
      return;
    }

    // Agrupar por fecha.
    const groups = {};
    list.forEach(a => { (groups[a.date] = groups[a.date] || []).push(a); });

    const html = Object.keys(groups).sort().map(date => `
      <div class="mb">
        <div class="card-title mb" style="margin-top:6px">${this._dayLabel(date)}</div>
        ${groups[date].map(a => this._rowHtml(a)).join('')}
      </div>`).join('');

    host.innerHTML = html;
  },

  _dayLabel(date) {
    const today = getToday();
    if (date === today) return 'Hoy · ' + formatDateShort(date);
    return formatDate(date);
  },

  _rowHtml(a) {
    const st = APPOINTMENT_STATUS[a.status || 'pending'] || APPOINTMENT_STATUS.pending;
    return `<div class="card mb" style="padding:14px 16px">
      <div class="row between wrap" style="gap:10px">
        <div class="row" style="gap:12px;min-width:0">
          <div class="text-center" style="min-width:56px">
            <div style="font-size:1.15rem;font-weight:800;color:var(--text-strong)" class="mono">${escapeHtml(a.time || '--:--')}</div>
          </div>
          <div style="min-width:0">
            <div style="font-weight:700;color:var(--text-strong)">${escapeHtml(this._patientName(a.patientId))}</div>
            <div class="muted" style="font-size:0.84rem">${escapeHtml(a.type || 'Turno')}</div>
            ${a.notes ? `<div class="muted" style="font-size:0.78rem">${escapeHtml(a.notes)}</div>` : ''}
          </div>
        </div>
        <div class="row wrap" style="gap:6px">
          <span class="badge ${st.badge}">${st.label}</span>
          <select class="input" style="width:auto;padding:5px 8px;font-size:0.8rem" onchange="Agenda.setStatus('${escapeHtml(a.id)}', this.value)">
            ${Object.entries(APPOINTMENT_STATUS).map(([k, v]) => `<option value="${k}" ${(a.status||'pending')===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-ghost" onclick="Agenda.sendReminder('${escapeHtml(a.id)}')" title="Recordatorio WhatsApp">
            <span class="material-symbols-outlined">chat</span>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="Agenda.openForm('${escapeHtml(a.id)}')" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="Agenda.remove('${escapeHtml(a.id)}')" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>`;
  },

  // ---------- Alta / edición ----------
  async openForm(id = null) {
    await this.loadPatients();   // refrescar pacientes recién creados
    const modal = document.getElementById('modal-appointment');
    const title = document.getElementById('appointment-modal-title');
    const form = document.getElementById('appointment-form');
    if (!modal || !form) return;
    form.reset();

    const patSel = document.getElementById('apf-patient');
    if (patSel) {
      patSel.innerHTML = '<option value="">Elegir paciente…</option>' +
        this._patients.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.ownerName || 'Sin dueño')})</option>`).join('');
    }
    const typeSel = document.getElementById('apf-type');
    if (typeSel) typeSel.innerHTML = SERVICE_TYPES.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    document.getElementById('apf-date').value = getToday();

    if (id) {
      const a = this._appointments.find(x => x.id === id);
      if (a) {
        if (title) title.textContent = 'Editar turno';
        patSel.value = a.patientId || '';
        // Asegurar que el tipo exista en el select (por si es custom).
        if (a.type && ![...typeSel.options].some(o => o.value === a.type)) {
          typeSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a.type)}">${escapeHtml(a.type)}</option>`);
        }
        typeSel.value = a.type || SERVICE_TYPES[0];
        form.elements['date'].value = a.date || getToday();
        form.elements['time'].value = a.time || '';
        form.elements['status'].value = a.status || 'pending';
        form.elements['notes'].value = a.notes || '';
      }
    } else {
      if (title) title.textContent = 'Nuevo turno';
    }

    this._editingId = id;
    modal.classList.add('open');
  },

  closeForm() {
    const modal = document.getElementById('modal-appointment');
    if (modal) modal.classList.remove('open');
    this._editingId = null;
  },

  async save() {
    const form = document.getElementById('appointment-form');
    if (!form) return;
    const fd = new FormData(form);

    const patientId = (fd.get('patientId') || '').toString();
    if (!patientId) { toast('Elegí un paciente.', 'error'); return; }
    const date = (fd.get('date') || '').toString();
    if (!date) { toast('Ingresá la fecha.', 'error'); return; }

    const data = {
      patientId,
      type: (fd.get('type') || '').toString(),
      date,
      time: (fd.get('time') || '').toString(),
      status: (fd.get('status') || 'pending').toString(),
      notes: (fd.get('notes') || '').toString().trim()
    };

    if (this._editingId) {
      await DB.updateAppointment(this._editingId, data);
      toast('Turno actualizado.', 'success');
    } else {
      data.id = generateId('TUR');
      await DB.addAppointment(data);
      toast('Turno registrado.', 'success');
    }

    this.closeForm();
    await this.load();
  },

  async setStatus(id, status) {
    await DB.updateAppointment(id, { status });
    const a = this._appointments.find(x => x.id === id);
    toast(`Turno de ${this._patientName(a?.patientId)}: ${(APPOINTMENT_STATUS[status]||{}).label}.`, 'success');
    await this.load();
  },

  async remove(id) {
    if (!confirm('¿Eliminar este turno?')) return;
    await DB.deleteAppointment(id);
    toast('Turno eliminado.', 'success');
    await this.load();
  },

  // ---------- Recordatorio WhatsApp ----------
  async sendReminder(id) {
    const a = await DB.getAppointment(id);
    if (!a) return;
    const patient = await DB.getPatient(a.patientId);
    if (!patient || !patient.ownerPhone) {
      toast('Este paciente no tiene teléfono cargado.', 'error');
      return;
    }
    const settings = await DB.getClinicSettings();
    const clinic = settings.clinicName || 'la clínica';
    const text =
`Hola ${patient.ownerName || ''}! 🐾
Te recordamos el turno de ${patient.name} en *${clinic}*.
📅 ${formatDate(a.date)}${a.time ? ' a las ' + a.time : ''}
🩺 ${a.type || 'Control'}

Si no podés asistir, avisanos. ¡Gracias!`;

    const clean = patient.ownerPhone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  }
};
