// ============================================================
// VetCare Pro 2.0 — MODO DEMO
// Carga automáticamente datos de ejemplo la primera vez que se
// abre la app con la base vacía, para que se vea poblada.
//
// - Los datos vienen de `window.DEMO_DATA` (js/demo-data.js).
// - Las fechas se desplazan hasta "hoy" para que los filtros por
//   rango (Movimiento, Ventas del mes, Agenda) muestren contenido.
// ============================================================

const DEMO_SEED_KEY = 'rm2_demo_seeded';

const Demo = {
  // Punto de entrada: se llama al arrancar la app.
  async maybeSeed() {
    if (!window.DEMO_DATA) return false;
    if (localStorage.getItem(DEMO_SEED_KEY) === '1') return false;

    try {
      if (!(await this.isEmpty())) {
        // Ya hay datos reales: no sembramos y no volvemos a intentar.
        localStorage.setItem(DEMO_SEED_KEY, '1');
        return false;
      }

      const data = JSON.parse(JSON.stringify(window.DEMO_DATA));
      const offset = this._dayOffset(data.exportedAt);
      this._shiftDates(data, offset);
      await importLegacyBackup(data, DB);

      localStorage.setItem(DEMO_SEED_KEY, '1');
      console.info(`[DEMO] Datos de ejemplo cargados (fechas +${offset} días).`);
      return true;
    } catch (err) {
      console.warn('[DEMO] No se pudieron cargar los datos de ejemplo:', err);
      return false;
    }
  },

  // ¿La base está vacía? (sin ningún registro en los stores principales)
  async isEmpty() {
    const [patients, services, appointments, products, sales] = await Promise.all([
      DB.getAllPatients(),
      DB.getAllServices(),
      DB.getAllAppointments(),
      DB.getAllProducts(),
      DB.getAllSales()
    ]);
    return !(patients.length || services.length || appointments.length || products.length || sales.length);
  },

  // Borra la marca y recarga la página para volver a sembrar (útil para demos).
  async reset() {
    localStorage.removeItem(DEMO_SEED_KEY);
    location.reload();
  },

  // ---------- utilidades de fecha ----------
  // Diferencia en días entre la fecha de export del dataset y hoy.
  _dayOffset(exportedAt) {
    const m = String(exportedAt || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    const baseUtc = m
      ? Date.UTC(+m[1], +m[2] - 1, +m[3])
      : Date.UTC(2026, 4, 20);
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((todayUtc - baseUtc) / 86400000);
  },

  _addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  },

  // Recorre el dataset y desplaza cualquier string con formato YYYY-MM-DD.
  _shiftDates(node, days) {
    if (days === 0) return;
    if (Array.isArray(node)) {
      node.forEach(n => this._shiftDates(n, days));
      return;
    }
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
          node[key] = this._addDays(val, days);
        } else if (val && typeof val === 'object') {
          this._shiftDates(val, days);
        }
      }
    }
  }
};
