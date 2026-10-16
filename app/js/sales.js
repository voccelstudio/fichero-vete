// ============================================================
// VetCare Pro 2.0 — Módulo Ventas / Caja
// Punto de venta que registra ventas (servicios con precio +
// productos/insumos), alimenta el comparativo Movimiento.
//
// Modelo de venta:
// { id, number, date, time, status('completed'|'void'), patientId,
//   customerName, items:[{type:'service'|'product', refId, name, qty,
//   unitPrice, subtotal}], subtotal, discount, total, paymentMethod,
//   notes, createdAt, updatedAt }
// ============================================================

const PAYMENT_METHODS = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Otro'];

const Sales = {
  _sales: [],
  _products: [],        // catálogo para el picker del POS
  _patients: [],
  _cart: [],            // items de la venta en edición
  _filterFrom: null,
  _filterTo: null,

  async init() {
    this.bindControls();
    await this.loadCatalog();
    await this.load();
    // Rango por defecto: mes en curso.
    const m = getMonthRange();
    this._filterFrom = m.start;
    this._filterTo = m.end;
    const from = document.getElementById('sales-from');
    const to = document.getElementById('sales-to');
    if (from) from.value = m.start;
    if (to) to.value = m.end;
    this.render();
  },

  bindControls() {
    const form = document.getElementById('sale-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });

    const modal = document.getElementById('modal-sale');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeForm(); });

    const from = document.getElementById('sales-from');
    const to = document.getElementById('sales-to');
    if (from) from.addEventListener('change', () => { this._filterFrom = from.value; this.render(); });
    if (to) to.addEventListener('change', () => { this._filterTo = to.value; this.render(); });

    const closeBtn = document.getElementById('btn-cash-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.showCashClose());

    const addBtn = document.getElementById('btn-add-item');
    if (addBtn) addBtn.addEventListener('click', () => this.addItem());
  },

  async loadCatalog() {
    [this._products, this._patients] = await Promise.all([
      DB.getAllProducts(),
      DB.getAllPatients()
    ]);
  },

  async load() {
    this._sales = await DB.getAllSales();
  },

  // ---------- Listado + filtros ----------
  _filtered() {
    return this._sales
      .filter(s => {
        if (this._filterFrom && s.date < this._filterFrom) return false;
        if (this._filterTo && s.date > this._filterTo) return false;
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));
  },

  render() {
    this.renderSummary();
    this.renderList();
  },

  renderSummary() {
    const host = document.getElementById('sales-summary');
    if (!host) return;
    const list = this._filtered().filter(s => s.status !== 'void');
    const total = list.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const count = list.length;
    const ticket = count ? total / count : 0;

    let byMethod = {};
    list.forEach(s => {
      const m = s.paymentMethod || 'Sin definir';
      byMethod[m] = (byMethod[m] || 0) + (Number(s.total) || 0);
    });
    const methodChips = Object.entries(byMethod)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v]) => `<span class="badge badge-info" style="margin:2px 4px 2px 0">${escapeHtml(m)} · ${formatMoneyCompact(v)}</span>`)
      .join('') || '<span class="muted">Sin ventas en el rango</span>';

    host.innerHTML =
      dashKpi('Facturado', 'payments', formatMoneyCompact(total)) +
      dashKpi('Ventas', 'receipt_long', count) +
      dashKpi('Ticket promedio', 'point_of_sale', formatMoneyCompact(Math.round(ticket))) +
      `<div class="card kpi" style="grid-column:span 2">
         <div class="kpi-label"><span class="material-symbols-outlined">account_balance_wallet</span>Por método de pago</div>
         <div style="margin-top:12px">${methodChips}</div>
       </div>`;
  },

  renderList() {
    const host = document.getElementById('sales-list');
    if (!host) return;
    const list = this._filtered();

    if (!list.length) {
      host.innerHTML = `<div class="empty-state glass">
        <span class="material-symbols-outlined">receipt_long</span>
        <div>No hay ventas registradas en este rango.</div>
      </div>`;
      return;
    }

    const rows = list.map(s => {
      const isVoid = s.status === 'void';
      const statusBadge = isVoid
        ? '<span class="badge badge-danger">Anulada</span>'
        : '<span class="badge badge-success">Completada</span>';
      return `<tr style="${isVoid ? 'opacity:0.55' : ''}">
        <td class="mono">${escapeHtml(s.number || s.id)}</td>
        <td>${formatDateShort(s.date)}<div class="muted" style="font-size:0.76rem">${escapeHtml(s.time || '')}</div></td>
        <td>${escapeHtml(s.customerName || '—')}</td>
        <td class="mono">${(s.items || []).length}</td>
        <td class="mono"><strong>${formatMoney(s.total || 0)}</strong></td>
        <td>${escapeHtml(s.paymentMethod || '—')}</td>
        <td>${statusBadge}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-ghost" onclick="Sales.viewSale('${escapeHtml(s.id)}')" title="Ver">
            <span class="material-symbols-outlined">visibility</span>
          </button>
          ${isVoid ? '' : `
          <button class="btn btn-sm btn-ghost" onclick="Sales.voidSale('${escapeHtml(s.id)}')" title="Anular">
            <span class="material-symbols-outlined">cancel</span>
          </button>`}
        </td>
      </tr>`;
    }).join('');

    host.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>Ítems</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  },

  // ---------- Punto de venta (alta) ----------
  openForm() {
    this._cart = [];
    const modal = document.getElementById('modal-sale');
    const form = document.getElementById('sale-form');
    if (!modal || !form) return;
    form.reset();

    // Cargar selector de paciente/cliente.
    const sel = form.elements['patientId'];
    if (sel) {
      sel.innerHTML = '<option value="">— Sin paciente —</option>' +
        this._patients.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.ownerName || 'Sin dueño')})</option>`).join('');
    }
    // Cargar selector de producto.
    const prodSel = document.getElementById('item-ref-product');
    if (prodSel) {
      prodSel.innerHTML = '<option value="">Elegir producto…</option>' +
        this._products.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${formatMoney(p.price || 0)} (stock: ${p.stock ?? 0})</option>`).join('');
    }
    // Cargar selector de tipo de servicio.
    const svcSel = document.getElementById('item-service-type');
    if (svcSel) {
      svcSel.innerHTML = '<option value="">Elegir servicio…</option>' +
        SERVICE_TYPES.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    }
    // Métodos de pago.
    const paySel = form.elements['paymentMethod'];
    if (paySel) {
      paySel.innerHTML = PAYMENT_METHODS.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    }

    this.renderCart();
    modal.classList.add('open');
  },

  closeForm() {
    const modal = document.getElementById('modal-sale');
    if (modal) modal.classList.remove('open');
  },

  // Tipo de item cambia -> mostrar el picker correspondiente.
  onItemTypeChange() {
    const type = document.getElementById('item-type').value;
    document.getElementById('item-picker-product').style.display = type === 'product' ? '' : 'none';
    document.getElementById('item-picker-service').style.display = type === 'service' ? '' : 'none';
  },

  // Al elegir un producto, autollenar nombre y precio.
  onProductPick() {
    const id = document.getElementById('item-ref-product').value;
    const p = this._products.find(x => x.id === id);
    if (p) {
      document.getElementById('item-name').value = p.name || '';
      document.getElementById('item-unit-price').value = p.price ?? 0;
    }
  },

  // Al elegir un servicio, autollenar nombre (el precio se ingresa).
  onServicePick() {
    const t = document.getElementById('item-service-type').value;
    if (t) document.getElementById('item-name').value = t;
  },

  addItem() {
    const type = document.getElementById('item-type').value;
    const name = document.getElementById('item-name').value.trim();
    const qty = parseFloat(document.getElementById('item-qty').value) || 1;
    const unitPrice = parseFloat(document.getElementById('item-unit-price').value) || 0;
    const refId = type === 'product' ? document.getElementById('item-ref-product').value : null;

    if (!name) { toast('Completá el ítem (nombre).', 'error'); return; }
    if (qty <= 0) { toast('La cantidad debe ser mayor a cero.', 'error'); return; }

    // Validar stock para productos.
    if (type === 'product' && refId) {
      const p = this._products.find(x => x.id === refId);
      if (p && (Number(p.stock) || 0) < qty) {
        toast(`Stock insuficiente de "${p.name}" (disponible: ${p.stock}).`, 'error');
        return;
      }
    }

    this._cart.push({
      type,
      refId: refId || null,
      name,
      qty,
      unitPrice,
      subtotal: qty * unitPrice
    });

    // Limpiar el picker.
    document.getElementById('item-name').value = '';
    document.getElementById('item-qty').value = 1;
    document.getElementById('item-unit-price').value = '';
    document.getElementById('item-ref-product').value = '';
    document.getElementById('item-service-type').value = '';

    this.renderCart();
  },

  removeItem(index) {
    this._cart.splice(index, 1);
    this.renderCart();
  },

  renderCart() {
    const host = document.getElementById('sale-cart');
    if (!host) return;

    if (!this._cart.length) {
      host.innerHTML = '<div class="empty-state" style="padding:22px"><div class="muted">Sin ítems. Agregá servicios o productos.</div></div>';
    } else {
      host.innerHTML = this._cart.map((it, i) => `
        <div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          <div>
            <span class="badge ${it.type === 'product' ? 'badge-success' : 'badge-info'}" style="margin-right:8px">
              ${it.type === 'product' ? 'Producto' : 'Servicio'}
            </span>
            ${escapeHtml(it.name)}
            <span class="muted"> · ${it.qty} x ${formatMoney(it.unitPrice)}</span>
          </div>
          <div class="row">
            <strong class="mono">${formatMoney(it.subtotal)}</strong>
            <button class="btn btn-sm btn-ghost" onclick="Sales.removeItem(${i})" title="Quitar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>`).join('');
    }

    this.updateTotals();
  },

  updateTotals() {
    const subtotal = this._cart.reduce((s, it) => s + it.subtotal, 0);
    const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;
    const total = Math.max(0, subtotal - discount);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('sale-subtotal', formatMoney(subtotal));
    set('sale-total', formatMoney(total));
  },

  async save() {
    const form = document.getElementById('sale-form');
    if (!form) return;

    if (!this._cart.length) { toast('Agregá al menos un ítem a la venta.', 'error'); return; }

    const fd = new FormData(form);
    const patientId = (fd.get('patientId') || '').toString() || null;
    const patient = patientId ? this._patients.find(p => p.id === patientId) : null;
    const customerName = patient ? patient.name : (fd.get('customerName') || '').toString().trim();

    const subtotal = this._cart.reduce((s, it) => s + it.subtotal, 0);
    const discount = parseFloat(fd.get('discount')) || 0;
    const total = Math.max(0, subtotal - discount);

    const number = await DB.getNextSaleNumber();
    const now = new Date();

    const sale = {
      id: generateId('VTA'),
      number,
      date: getToday(),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      status: 'completed',
      patientId,
      customerName,
      items: this._cart.slice(),
      subtotal,
      discount,
      total,
      paymentMethod: (fd.get('paymentMethod') || '').toString(),
      notes: (fd.get('notes') || '').toString().trim(),
      createdAt: getToday(),
      updatedAt: getToday()
    };

    await DB.addSale(sale);

    // Descontar stock de los productos vendidos.
    await Inventory.deductStock(sale.items);

    toast(`Venta ${number} registrada por ${formatMoney(total)}.`, 'success');
    this.closeForm();
    await this.loadCatalog();
    await this.load();
    this.render();
    if (typeof Movement !== 'undefined' && App.currentView === 'movement') Movement.refresh();
  },

  // ---------- Detalle ----------
  async viewSale(id) {
    const s = await DB.getSale(id);
    if (!s) return;
    const modal = document.getElementById('modal-sale-view');
    const body = document.getElementById('sale-view-body');
    if (!modal || !body) return;

    const items = (s.items || []).map(it => `
      <div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div>
          <span class="badge ${it.type === 'product' ? 'badge-success' : 'badge-info'}" style="margin-right:8px">
            ${it.type === 'product' ? 'Producto' : 'Servicio'}</span>
          ${escapeHtml(it.name)} <span class="muted">· ${it.qty} x ${formatMoney(it.unitPrice)}</span>
        </div>
        <strong class="mono">${formatMoney(it.subtotal)}</strong>
      </div>`).join('');

    body.innerHTML = `
      <div class="row between mb">
        <div>
          <div class="card-title">${escapeHtml(s.number || s.id)}</div>
          <div class="card-sub">${formatDate(s.date)} ${escapeHtml(s.time || '')}</div>
        </div>
        ${s.status === 'void' ? '<span class="badge badge-danger">Anulada</span>' : '<span class="badge badge-success">Completada</span>'}
      </div>
      <div class="mb"><span class="muted">Cliente:</span> <strong>${escapeHtml(s.customerName || '—')}</strong></div>
      <div class="mb"><span class="muted">Pago:</span> ${escapeHtml(s.paymentMethod || '—')}</div>
      <div class="divider"></div>
      ${items}
      <div class="divider"></div>
      <div class="row between"><span class="muted">Subtotal</span><span class="mono">${formatMoney(s.subtotal || 0)}</span></div>
      ${s.discount ? `<div class="row between"><span class="muted">Descuento</span><span class="mono">-${formatMoney(s.discount)}</span></div>` : ''}
      <div class="row between" style="font-size:1.1rem;margin-top:8px"><strong>Total</strong><strong class="mono">${formatMoney(s.total || 0)}</strong></div>
      ${s.notes ? `<div class="mt muted">Nota: ${escapeHtml(s.notes)}</div>` : ''}

      <div class="row mt">
        <button class="btn" onclick="Sales.printReceipt('${escapeHtml(s.id)}')">
          <span class="material-symbols-outlined">picture_as_pdf</span> Recibo PDF</button>
        <button class="btn" onclick="Sales.sendWhatsApp('${escapeHtml(s.id)}')">
          <span class="material-symbols-outlined">chat</span> Enviar por WhatsApp</button>
      </div>`;

    modal.classList.add('open');
  },

  closeView() {
    const modal = document.getElementById('modal-sale-view');
    if (modal) modal.classList.remove('open');
  },

  // ---------- Anular ----------
  async voidSale(id) {
    const s = await DB.getSale(id);
    if (!s || s.status === 'void') return;
    if (!confirm(`¿Anular la venta ${s.number || s.id}? Se devolverá el stock de productos.`)) return;
    await DB.updateSale(id, { status: 'void' });
    await Inventory.restoreStock(s.items || []);
    toast(`Venta ${s.number || s.id} anulada.`, 'info');
    this.closeView();
    await this.load();
    this.render();
  },

  // ---------- Cierre de caja ----------
  showCashClose() {
    const modal = document.getElementById('modal-cash-close');
    const body = document.getElementById('cash-close-body');
    if (!modal || !body) return;

    const today = getToday();
    const list = this._sales.filter(s => s.status !== 'void' && s.date === today);
    const total = list.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    let byMethod = {};
    list.forEach(s => {
      const m = s.paymentMethod || 'Sin definir';
      byMethod[m] = (byMethod[m] || 0) + (Number(s.total) || 0);
    });

    const methodsHtml = Object.entries(byMethod)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v]) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          <span>${escapeHtml(m)}</span><strong class="mono">${formatMoney(v)}</strong></div>`)
      .join('') || '<div class="muted">Sin ventas hoy.</div>';

    // Desglose servicios vs productos del día.
    let svcRev = 0, prodRev = 0;
    list.forEach(s => (s.items || []).forEach(it => {
      const sub = Number(it.subtotal) || 0;
      if (it.type === 'product') prodRev += sub; else svcRev += sub;
    }));

    body.innerHTML = `
      <div class="mb"><span class="muted">Fecha:</span> <strong>${formatDate(today)}</strong></div>
      <div class="row between mb">
        <span class="muted">Total del día</span>
        <strong style="font-size:1.4rem" class="mono">${formatMoney(total)}</strong>
      </div>
      <div class="row between mb"><span class="muted">Ventas</span><span class="mono">${list.length}</span></div>
      <div class="divider"></div>
      <div class="card-title mb">Por método de pago</div>
      ${methodsHtml}
      <div class="divider"></div>
      <div class="row between"><span class="muted">Servicios</span><span class="mono">${formatMoney(svcRev)}</span></div>
      <div class="row between"><span class="muted">Productos</span><span class="mono">${formatMoney(prodRev)}</span></div>`;

    modal.classList.add('open');
  },

  closeCashClose() {
    const modal = document.getElementById('modal-cash-close');
    if (modal) modal.classList.remove('open');
  },

  // ---------- Recibo PDF ----------
  async printReceipt(id) {
    const s = await DB.getSale(id);
    if (!s) return;
    if (typeof generateSaleReceiptPDF !== 'function') {
      toast('El PDF del recibo aún no está disponible.', 'info');
      return;
    }
    const settings = await DB.getClinicSettings();
    await generateSaleReceiptPDF(s, settings);
  },

  // ---------- WhatsApp ----------
  async sendWhatsApp(id) {
    const s = await DB.getSale(id);
    if (!s) return;
    const settings = await DB.getClinicSettings();
    const clinic = settings.clinicName || 'la clínica';

    // Intentar obtener el teléfono del paciente vinculado.
    let phone = '';
    if (s.patientId) {
      const p = await DB.getPatient(s.patientId);
      if (p && p.ownerPhone) phone = p.ownerPhone;
    }

    const items = (s.items || []).map(it => `• ${it.name} (${it.qty} x ${formatMoney(it.unitPrice)})`).join('\n');
    const text =
`🧾 *Comprobante de pago — ${clinic}*
${s.number || ''} · ${formatDate(s.date)}

${items}

Subtotal: ${formatMoney(s.subtotal || 0)}${s.discount ? `\nDescuento: -${formatMoney(s.discount)}` : ''}
*Total: ${formatMoney(s.total || 0)}*
Método de pago: ${s.paymentMethod || '—'}

¡Gracias por tu compra! 🐾`;

    if (phone) {
      const clean = phone.replace(/[^\d+]/g, '');
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      // Sin teléfono: copiar al portapapeles.
      navigator.clipboard.writeText(text).then(
        () => toast('Sin teléfono del cliente. Mensaje copiado al portapapeles.', 'info'),
        () => toast('No se pudo generar el enlace de WhatsApp.', 'error')
      );
    }
  }
};
