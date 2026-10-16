// ============================================================
// VetCare Pro 2.0 — Módulo Inventario
// CRUD de productos/insumos con alertas de stock bajo.
// ============================================================

const Inventory = {
  _editingId: null,
  _products: [],

  async init() {
    this.bindControls();
    await this.load();
  },

  bindControls() {
    const search = document.getElementById('inv-search');
    if (search) search.addEventListener('input', debounce(() => this.render(), 200));

    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });

    const formModal = document.getElementById('modal-product');
    if (formModal) {
      formModal.addEventListener('click', (e) => {
        if (e.target === formModal) this.closeForm();
      });
    }
  },

  async load() {
    this._products = await DB.getAllProducts();
    this.render();
    this.renderStats();
  },

  renderStats() {
    const host = document.getElementById('inv-stats');
    if (!host) return;
    const total = this._products.length;
    const low = this._products.filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length;
    const out = this._products.filter(p => (Number(p.stock) || 0) === 0).length;
    const value = this._products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

    host.innerHTML =
      dashKpi('Productos', 'inventory_2', total) +
      dashKpi('Stock bajo', 'warning', low) +
      dashKpi('Sin stock', 'remove_shopping_cart', out) +
      dashKpi('Valor en stock', 'payments', formatMoneyCompact(value));
  },

  render() {
    const host = document.getElementById('inv-list');
    if (!host) return;
    const q = (document.getElementById('inv-search')?.value || '').toLowerCase().trim();
    let list = this._products;
    if (q) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q));
    }

    if (!list.length) {
      host.innerHTML = `<div class="empty-state glass">
        <span class="material-symbols-outlined">inventory_2</span>
        <div>${q ? 'Sin resultados para tu búsqueda.' : 'No hay productos cargados. Agregá el primero.'}</div>
      </div>`;
      return;
    }

    const rows = list.map(p => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.minStock) || 0;
      let badge = '<span class="badge badge-success">Disponible</span>';
      if (stock === 0) badge = '<span class="badge badge-danger">Sin stock</span>';
      else if (min && stock <= min) badge = '<span class="badge badge-warning">Stock bajo</span>';

      return `<tr>
        <td><strong>${escapeHtml(p.name)}</strong>${p.category ? `<div class="muted" style="font-size:0.76rem">${escapeHtml(p.category)}</div>` : ''}</td>
        <td class="mono">${stock}</td>
        <td class="mono">${formatMoney(p.price || 0)}</td>
        <td>${badge}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-ghost" onclick="Inventory.openForm('${escapeHtml(p.id)}')" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="Inventory.remove('${escapeHtml(p.id)}')" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>`;
    }).join('');

    host.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Producto</th><th>Stock</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  },

  openForm(id = null) {
    this._editingId = id;
    const modal = document.getElementById('modal-product');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    form.reset();
    if (title) title.textContent = id ? 'Editar producto' : 'Nuevo producto';

    if (id) {
      const p = this._products.find(x => x.id === id);
      if (p) {
        form.elements['name'].value = p.name || '';
        form.elements['category'].value = p.category || '';
        form.elements['barcode'].value = p.barcode || '';
        form.elements['stock'].value = p.stock ?? 0;
        form.elements['minStock'].value = p.minStock ?? 0;
        form.elements['price'].value = p.price ?? 0;
        form.elements['description'].value = p.description || '';
      }
    }
    modal.classList.add('open');
  },

  closeForm() {
    const modal = document.getElementById('modal-product');
    if (modal) modal.classList.remove('open');
    this._editingId = null;
  },

  async save() {
    const form = document.getElementById('product-form');
    if (!form) return;
    const fd = new FormData(form);
    const data = {
      name: (fd.get('name') || '').toString().trim(),
      category: (fd.get('category') || '').toString().trim(),
      barcode: (fd.get('barcode') || '').toString().trim(),
      stock: parseFloat(fd.get('stock')) || 0,
      minStock: parseFloat(fd.get('minStock')) || 0,
      price: parseFloat(fd.get('price')) || 0,
      description: (fd.get('description') || '').toString().trim(),
      updatedAt: getToday()
    };

    if (!data.name) { toast('Ingresá el nombre del producto.', 'error'); return; }

    if (this._editingId) {
      const existing = this._products.find(x => x.id === this._editingId);
      await DB.addProduct({ ...existing, ...data });
      toast('Producto actualizado.', 'success');
    } else {
      data.id = generateId('PRD');
      data.createdAt = getToday();
      await DB.addProduct(data);
      toast('Producto agregado.', 'success');
    }
    this.closeForm();
    await this.load();
    // Refrescar el picker del POS si está abierto.
    if (typeof Sales !== 'undefined' && Sales._products !== undefined) await Sales.loadCatalog();
  },

  async remove(id) {
    const p = this._products.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await DB.deleteProduct(id);
    toast('Producto eliminado.', 'success');
    await this.load();
  },

  // Descuenta stock (usado al confirmar una venta). No baja de 0.
  async deductStock(items) {
    for (const it of items) {
      if (it.type !== 'product' || !it.refId) continue;
      const p = await DB.getProduct(it.refId);
      if (!p) continue;
      const newStock = Math.max(0, (Number(p.stock) || 0) - (Number(it.qty) || 0));
      await DB.addProduct({ ...p, stock: newStock, updatedAt: getToday() });
    }
  },

  // Devuelve stock (usado al anular una venta).
  async restoreStock(items) {
    for (const it of items) {
      if (it.type !== 'product' || !it.refId) continue;
      const p = await DB.getProduct(it.refId);
      if (!p) continue;
      const newStock = (Number(p.stock) || 0) + (Number(it.qty) || 0);
      await DB.addProduct({ ...p, stock: newStock, updatedAt: getToday() });
    }
  }
};
