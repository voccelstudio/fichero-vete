// ============================================================
// VetCare Pro 2.0 — Módulo Servicios
// Historial de servicios con búsqueda, alta/edición/baja.
// El campo `price` es nuevo en 2.0 (opcional): permite facturar
// el servicio desde el punto de venta.
// ============================================================

const Services = {
  _services: [],
  _patients: [],
  _products: [],
  _editingId: null,

  async init() {
    this.bindControls();
    await this.loadCatalog();
    await this.load();
  },

  bindControls() {
    const search = document.getElementById('svc-search');
    if (search) search.addEventListener('input', debounce(() => this.render(), 200));

    const form = document.getElementById('service-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });

    const modal = document.getElementById('modal-service');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeForm(); });

    const prodSel = document.getElementById('sf-product');
    if (prodSel) prodSel.addEventListener('change', () => this.toggleQty());
  },

  async loadCatalog() {
    [this._patients, this._products] = await Promise.all([
      DB.getAllPatients(),
      DB.getAllProducts()
    ]);
  },

  async load() {
    this._services = await DB.getAllServices();
    this.render();
  },

  _patientName(id) {
    const p = this._patients.find(x => x.id === id);
    return p ? p.name : 'Paciente';
  },

  render() {
    const host = document.getElementById('svc-list');
    if (!host) return;
    const q = (document.getElementById('svc-search')?.value || '').toLowerCase().trim();

    let list = [...this._services].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (q) {
      list = list.filter(s =>
        (s.serviceType || '').toLowerCase().includes(q) ||
        (s.performedBy || '').toLowerCase().includes(q) ||
        this._patientName(s.patientId).toLowerCase().includes(q));
    }

    if (!list.length) {
      host.innerHTML = `<div class="card empty-state">
        <span class="material-symbols-outlined">medical_services</span>
        <div>${q ? 'Sin resultados.' : 'No hay servicios registrados.'}</div>
        ${q ? '' : '<button class="btn btn-primary mt" onclick="Services.openForm()"><span class="material-symbols-outlined">add</span> Registrar servicio</button>'}
      </div>`;
      return;
    }

    const rows = list.map(s => `
      <tr>
        <td>${formatDateShort(s.date)}${s.time ? `<div class="muted" style="font-size:0.76rem">${escapeHtml(s.time)}</div>` : ''}</td>
        <td><strong>${escapeHtml(this._patientName(s.patientId))}</strong></td>
        <td><span class="badge badge-info">${escapeHtml(s.serviceType || '—')}</span></td>
        <td class="muted">${escapeHtml(s.performedBy || '—')}</td>
        <td class="mono">${s.price ? formatMoney(s.price) : '<span class="muted">—</span>'}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-ghost" onclick="Services.edit('${escapeHtml(s.id)}')" title="Editar">
            <span class="material-symbols-outlined">edit</span></button>
          <button class="btn btn-sm btn-ghost" onclick="Services.remove('${escapeHtml(s.id)}')" title="Eliminar">
            <span class="material-symbols-outlined">delete</span></button>
        </td>
      </tr>`).join('');

    host.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Paciente</th><th>Tipo</th><th>Profesional</th><th>Precio</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  // ---------- Alta / edición ----------
  openForm(id = null) {
    const modal = document.getElementById('modal-service');
    const title = document.getElementById('service-modal-title');
    const form = document.getElementById('service-form');
    if (!modal || !form) return;
    form.reset();

    const patSel = document.getElementById('sf-patient');
    if (patSel) {
      patSel.innerHTML = '<option value="">Elegir paciente…</option>' +
        this._patients.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.ownerName || 'Sin dueño')})</option>`).join('');
    }
    const typeSel = document.getElementById('sf-type');
    if (typeSel) typeSel.innerHTML = SERVICE_TYPES.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    const prodSel = document.getElementById('sf-product');
    if (prodSel) {
      prodSel.innerHTML = '<option value="">Ninguno</option>' +
        this._products.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (stock: ${p.stock ?? 0})</option>`).join('');
    }
    document.getElementById('sf-date').value = getToday();
    this.toggleQty();

    if (id) {
      const s = this._services.find(x => x.id === id);
      if (s) {
        if (title) title.textContent = 'Editar servicio';
        patSel.value = s.patientId || '';
        if (s.serviceType && ![...typeSel.options].some(o => o.value === s.serviceType)) {
          typeSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s.serviceType)}">${escapeHtml(s.serviceType)}</option>`);
        }
        typeSel.value = s.serviceType || SERVICE_TYPES[0];
        form.elements['performedBy'].value = s.performedBy || '';
        form.elements['date'].value = s.date || getToday();
        form.elements['time'].value = s.time || '';
        form.elements['price'].value = s.price ?? '';
        form.elements['notes'].value = s.notes || '';
      }
    } else {
      if (title) title.textContent = 'Registrar servicio';
    }

    this._editingId = id;
    modal.classList.add('open');
  },

  toggleQty() {
    const prodSel = document.getElementById('sf-product');
    const qtyField = document.getElementById('sf-qty-field');
    if (prodSel && qtyField) qtyField.style.display = prodSel.value ? '' : 'none';
  },

  closeForm() {
    const modal = document.getElementById('modal-service');
    if (modal) modal.classList.remove('open');
    this._editingId = null;
  },

  async save() {
    const form = document.getElementById('service-form');
    if (!form) return;
    const fd = new FormData(form);

    const patientId = (fd.get('patientId') || '').toString();
    if (!patientId) { toast('Elegí un paciente.', 'error'); return; }
    const date = (fd.get('date') || '').toString();
    if (!date) { toast('Ingresá la fecha.', 'error'); return; }

    // Consumo opcional de insumo (descuenta stock).
    const productId = (fd.get('productId') || '').toString();
    const qty = parseInt(fd.get('qty')) || 1;
    let productNotes = '';
    if (productId) {
      const pr = await DB.getProduct(productId);
      if (pr) {
        const current = this._editingId ? (this._services.find(x => x.id === this._editingId)?.notes || '') : '';
        const alreadyNoted = current.includes(`[Insumo utilizado: ${pr.name} x${qty}]`);
        if (!alreadyNoted) {
          if ((Number(pr.stock) || 0) < qty) {
            toast(`Stock insuficiente de ${pr.name} (disponible: ${pr.stock}).`, 'error');
            return;
          }
          await DB.addProduct({ ...pr, stock: Math.max(0, (Number(pr.stock) || 0) - qty), updatedAt: getToday() });
        }
        productNotes = `\n[Insumo utilizado: ${pr.name} x${qty}]`;
      }
    }

    const data = {
      patientId,
      serviceType: (fd.get('serviceType') || '').toString(),
      performedBy: (fd.get('performedBy') || '').toString().trim(),
      date,
      time: (fd.get('time') || '').toString(),
      price: parseFloat(fd.get('price')) || 0,
      notes: (fd.get('notes') || '').toString().trim() + productNotes
    };

    if (this._editingId) {
      const existing = await DB.getService(this._editingId);
      await DB.addService({ ...existing, ...data, createdAt: existing?.createdAt || getToday() });
      toast('Servicio actualizado.', 'success');
    } else {
      data.id = generateId('SVC');
      data.createdAt = getToday();
      await DB.addService(data);
      toast('Servicio registrado.', 'success');
    }

    this.closeForm();
    await this.loadCatalog();
    await this.load();
    if (typeof Movement !== 'undefined' && App.currentView === 'movement') Movement.refresh();
  },

  async edit(id) {
    this.openForm(id);
  },

  async remove(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    await DB.deleteService(id);
    toast('Servicio eliminado.', 'success');
    await this.load();
    if (typeof Movement !== 'undefined' && App.currentView === 'movement') Movement.refresh();
  }
};
