// ============================================================
// VetCare Pro 2.0 — Capa de datos (IndexedDB v6)
// Compatible con 1.0 (mismos stores y API). Agrega:
//  - store 'sales' (ventas) para el módulo Caja/Movimiento
//  - upgrade desde v5 sin perder datos
//  - métodos de analítica que alimentan el módulo Movimiento
// ============================================================

const DB_NAME = 'VetCareProDB';   // misma base que 1.0 -> hereda los datos
const DB_VERSION = 6;             // 5 -> 6 agrega 'sales'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion || 0;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('patients')) {
        const store = db.createObjectStore('patients', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('ownerName', 'ownerName', { unique: false });
        store.createIndex('species', 'species', { unique: false });
      }
      if (!db.objectStoreNames.contains('services')) {
        const store = db.createObjectStore('services', { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('appointments')) {
        const store = db.createObjectStore('appointments', { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('vaccinations')) {
        const store = db.createObjectStore('vaccinations', { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('nextDoseDate', 'nextDoseDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('prescriptions')) {
        const store = db.createObjectStore('prescriptions', { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('inventory')) {
        const store = db.createObjectStore('inventory', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('patientProcedures')) {
        const store = db.createObjectStore('patientProcedures', { keyPath: 'id' });
        store.createIndex('patientId', 'patientId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('nextDate', 'nextDate', { unique: false });
      }
      // --- Nuevo en 2.0: ventas ---
      if (!db.objectStoreNames.contains('sales')) {
        const store = db.createObjectStore('sales', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('patientId', 'patientId', { unique: false });
      }
      // (oldVersion se deja explícito para futuras migraciones encadenadas)
      void oldVersion;
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function dbOperation(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = () => {
        resolve(result);
        db.close();
      };
      tx.onerror = (e) => {
        reject(e.target.error);
        db.close();
      };
    }).catch(reject);
  });
}

const DB = {
  // ---- SETTINGS ----
  async saveSetting(key, value) {
    return dbOperation('settings', 'readwrite', store => {
      store.put({ key, value });
    });
  },
  async getSetting(key) {
    return dbOperation('settings', 'readonly', store => {
      const req = store.get(key);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllSettings() {
    return dbOperation('settings', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          const obj = {};
          req.result.forEach(item => { obj[item.key] = item.value; });
          resolve(obj);
        };
        req.onerror = () => reject(req.error);
      });
    });
  },
  async saveClinicSettings(data) {
    const entries = {
      clinicName: data.clinicName || '',
      clinicEmail: data.clinicEmail || '',
      clinicAddress: data.clinicAddress || '',
      clinicPhone: data.clinicPhone || '',
      clinicTaxId: data.clinicTaxId || '',
      clinicLogo: data.clinicLogo || '',
      clinicVeterinarian: data.clinicVeterinarian || '',
      pdfShowLogo: data.pdfShowLogo !== undefined ? data.pdfShowLogo : true,
      pdfShowVat: data.pdfShowVat !== undefined ? data.pdfShowVat : true,
      themePrimary: data.themePrimary || '#00366b',
      themeSecondary: data.themeSecondary || '#006a63',
      themeDarkMode: data.themeDarkMode || false
    };
    return dbOperation('settings', 'readwrite', store => {
      for (const [key, value] of Object.entries(entries)) {
        store.put({ key, value });
      }
    });
  },
  async getClinicSettings() {
    const all = await this.getAllSettings();
    return {
      clinicName: all.clinicName || 'VetCare Pro',
      clinicEmail: all.clinicEmail || '',
      clinicAddress: all.clinicAddress || '',
      clinicPhone: all.clinicPhone || '',
      clinicTaxId: all.clinicTaxId || '',
      clinicLogo: all.clinicLogo || '',
      clinicVeterinarian: all.clinicVeterinarian || '',
      pdfShowLogo: all.pdfShowLogo !== false,
      pdfShowVat: all.pdfShowVat !== false,
      themePrimary: all.themePrimary || '#005da7',
      themeSecondary: all.themeSecondary || '#775a00',
      themeDarkMode: all.themeDarkMode || false
    };
  },
  async getLastBackupDate() {
    const val = await this.getSetting('lastBackupDate');
    return val || null;
  },
  async setLastBackupDate(date) {
    return this.saveSetting('lastBackupDate', date);
  },

  // ---- PATIENTS ----
  async addPatient(patient) {
    return dbOperation('patients', 'readwrite', store => {
      const req = store.put(patient);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(patient);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async updatePatient(patient) {
    return this.addPatient(patient);
  },
  async deletePatient(id) {
    // Borrado en cascada de datos vinculados (como la 1.0).
    const [services, appointments, vaccinations, prescriptions, procedures, sales] = await Promise.all([
      this.getServicesByPatient(id),
      this.getAppointmentsByPatient(id),
      this.getVaccinationsByPatient(id),
      this.getPrescriptionsByPatient(id),
      this.getPatientProceduresByPatient(id),
      this.getSalesByPatient(id)
    ]);
    for (const s of services) await this.deleteService(s.id);
    for (const a of appointments) await this.deleteAppointment(a.id);
    for (const v of vaccinations) await this.deleteVaccination(v.id);
    for (const rx of prescriptions) await this.deletePrescription(rx.id);
    for (const pp of procedures) await this.deletePatientProcedure(pp.id);
    // Las ventas NO se borran: conservan el historial económico; solo se
    // desvincula el paciente para no dejar referencias colgantes.
    for (const sale of sales) {
      await this.updateSale(sale.id, { patientId: null });
    }
    return dbOperation('patients', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPatient(id) {
    return dbOperation('patients', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllPatients() {
    return dbOperation('patients', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async searchPatients(query) {
    const all = await this.getAllPatients();
    if (!query) return all;
    const q = query.toLowerCase().trim();
    return all.filter(p => {
      return (p.name && p.name.toLowerCase().includes(q)) ||
        (p.lastName && p.lastName.toLowerCase().includes(q)) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
        (p.species && p.species.toLowerCase().includes(q)) ||
        (p.breed && p.breed.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.ownerPhone && p.ownerPhone.toLowerCase().includes(q));
    });
  },

  // ---- SERVICES ----
  async addService(service) {
    return dbOperation('services', 'readwrite', store => {
      const req = store.put(service);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(service);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async updateService(service) {
    return this.addService(service);
  },
  async deleteService(id) {
    return dbOperation('services', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getService(id) {
    return dbOperation('services', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getServicesByPatient(patientId) {
    return dbOperation('services', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllServices() {
    return dbOperation('services', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getRecentServices(limit = 10) {
    const all = await this.getAllServices();
    return all.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, limit);
  },
  async getServicesByDateRange(startDate, endDate) {
    const all = await this.getAllServices();
    return all.filter(s => s.date >= startDate && s.date <= endDate);
  },

  // ---- APPOINTMENTS ----
  async addAppointment(appointment) {
    return dbOperation('appointments', 'readwrite', store => {
      const req = store.put(appointment);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(appointment);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async deleteAppointment(id) {
    return dbOperation('appointments', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAppointment(id) {
    return dbOperation('appointments', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAppointmentsByDate(date) {
    return dbOperation('appointments', 'readonly', store => {
      const idx = store.index('date');
      const req = idx.getAll(date);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAppointmentsByPatient(patientId) {
    return dbOperation('appointments', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllAppointments() {
    return dbOperation('appointments', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async updateAppointment(id, data) {
    const current = await dbOperation('appointments', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
    if (!current) return null;
    const merged = { ...current, ...data };
    return this.addAppointment(merged);
  },
  async getAppointmentsByRange(startDate, endDate) {
    const all = await this.getAllAppointments();
    return all.filter(a => a.date >= startDate && a.date <= endDate);
  },

  // ---- VACCINATIONS ----
  async addVaccination(vac) {
    return dbOperation('vaccinations', 'readwrite', store => {
      const req = store.put(vac);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(vac);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getVaccinationsByPatient(patientId) {
    return dbOperation('vaccinations', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllVaccinations() {
    return dbOperation('vaccinations', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getVaccinationsDueSoon(daysAhead = 30) {
    const all = await this.getAllVaccinations();
    const today = getToday();
    const limit = formatDateInput(new Date(Date.now() + daysAhead * 86400000));
    return all.filter(v => v.nextDoseDate && v.nextDoseDate >= today && v.nextDoseDate <= limit);
  },
  async getVaccinationsOverdue() {
    const all = await this.getAllVaccinations();
    const today = getToday();
    return all.filter(v => v.nextDoseDate && v.nextDoseDate < today);
  },
  async deleteVaccination(id) {
    return dbOperation('vaccinations', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },

  // ---- PRESCRIPTIONS ----
  async addPrescription(rx) {
    return dbOperation('prescriptions', 'readwrite', store => {
      const req = store.put(rx);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(rx);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPrescriptionsByPatient(patientId) {
    return dbOperation('prescriptions', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPrescription(id) {
    return dbOperation('prescriptions', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async deletePrescription(id) {
    return dbOperation('prescriptions', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllPrescriptions() {
    return dbOperation('prescriptions', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },

  // ---- INVENTORY / PRODUCTS ----
  async addProduct(product) {
    return dbOperation('inventory', 'readwrite', store => {
      const req = store.put(product);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(product);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async updateProduct(product) {
    return this.addProduct(product);
  },
  async deleteProduct(id) {
    return dbOperation('inventory', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getProduct(id) {
    return dbOperation('inventory', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllProducts() {
    return dbOperation('inventory', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getProductByBarcode(barcode) {
    const all = await this.getAllProducts();
    return all.find(p => p.barcode && p.barcode === barcode) || null;
  },

  // ---- SALES (nuevo en 2.0) ----
  // Formato de venta:
  // { id, number, date, time, status ('completed'|'void'), patientId,
  //   customerName, items:[{type:'service'|'product', refId, name, qty,
  //   unitPrice, subtotal}], subtotal, discount, total, paymentMethod, notes,
  //   createdAt, updatedAt }
  async addSale(sale) {
    return dbOperation('sales', 'readwrite', store => {
      const req = store.put(sale);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(sale);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async updateSale(id, data) {
    const current = await this.getSale(id);
    if (!current) return null;
    const merged = { ...current, ...data, updatedAt: getToday() };
    return this.addSale(merged);
  },
  async getSale(id) {
    return dbOperation('sales', 'readonly', store => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async deleteSale(id) {
    return dbOperation('sales', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllSales() {
    return dbOperation('sales', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getSalesByPatient(patientId) {
    return dbOperation('sales', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getSalesByRange(startDate, endDate) {
    const all = await this.getAllSales();
    return all.filter(s => s.status !== 'void' && s.date >= startDate && s.date <= endDate);
  },
  // Correlativo de comprobante: VTA-0001, VTA-0002...
  async getNextSaleNumber() {
    const all = await this.getAllSales();
    let max = 0;
    all.forEach(s => {
      if (s.number) {
        const n = parseInt(String(s.number).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return 'VTA-' + String(max + 1).padStart(4, '0');
  },

  // ---- PATIENT PROCEDURES ----
  async getProcedureCategories() {
    const val = await this.getSetting('procedureCategories');
    return val || { 'Baño': [], 'Control': [], 'Vacunas': [], 'Pipetas': [] };
  },
  async saveProcedureCategories(data) {
    return this.saveSetting('procedureCategories', data);
  },
  async addPatientProcedure(pp) {
    return dbOperation('patientProcedures', 'readwrite', store => {
      const req = store.put(pp);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(pp);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPatientProceduresByPatient(patientId) {
    return dbOperation('patientProcedures', 'readonly', store => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAllPatientProcedures() {
    return dbOperation('patientProcedures', 'readonly', store => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPatientProceduresByCategory(category) {
    const all = await this.getAllPatientProcedures();
    return all.filter(p => p.category === category);
  },
  async deletePatientProcedure(id) {
    return dbOperation('patientProcedures', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getPatientProceduresDueSoon(daysAhead = 30) {
    const all = await this.getAllPatientProcedures();
    const today = getToday();
    const limit = formatDateInput(new Date(Date.now() + daysAhead * 86400000));
    return all.filter(p => p.nextDate && p.nextDate >= today && p.nextDate <= limit);
  },
  async getPatientProceduresOverdue() {
    const all = await this.getAllPatientProcedures();
    const today = getToday();
    return all.filter(p => p.nextDate && p.nextDate < today);
  },

  // ---- DASHBOARD (KPIs) ----
  async getDashboardStats() {
    const [patients, services, appointments, vaccinations, sales] = await Promise.all([
      this.getAllPatients(),
      this.getAllServices(),
      this.getAllAppointments(),
      this.getAllVaccinations(),
      this.getAllSales()
    ]);
    const today = getToday();
    const week = getWeekRange();
    const month = getMonthRange();
    const activeSales = sales.filter(s => s.status !== 'void');

    return {
      totalPatients: patients.length,
      totalServices: services.length,
      todayAppointments: appointments.filter(a => a.date === today).length,
      todayServices: services.filter(s => s.date === today).length,
      weekServices: services.filter(s => s.date >= week.start && s.date <= week.end).length,
      monthServices: services.filter(s => s.date >= month.start && s.date <= month.end).length,
      totalAppointments: appointments.length,
      todaySalesCount: activeSales.filter(s => s.date === today).length,
      todaySalesTotal: activeSales.filter(s => s.date === today).reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      monthSalesTotal: activeSales.filter(s => s.date >= month.start && s.date <= month.end).reduce((sum, s) => sum + (Number(s.total) || 0), 0)
    };
  },

  // ---- MOVIMIENTO (analítica comparativa 2.0) ----
  // Devuelve todas las métricas de un periodo {start,end} para el comparativo.
  async getPeriodMetrics(range) {
    const [patients, services, appointments, vaccinations, sales, procedures] = await Promise.all([
      this.getAllPatients(),
      this.getAllServices(),
      this.getAllAppointments(),
      this.getAllVaccinations(),
      this.getAllSales(),
      this.getAllPatientProcedures()
    ]);

    const pServices = services.filter(s => inRange(s.date, range));
    const pAppointments = appointments.filter(a => inRange(a.date, range));
    const pVaccinations = vaccinations.filter(v => inRange(v.dateApplied, range));
    const pProcedures = procedures.filter(p => inRange(p.date, range));
    const pSales = sales.filter(s => s.status !== 'void' && inRange(s.date, range));

    // Pacientes: únicos atendidos (con servicio) y nuevos dados de alta.
    const uniqueTreated = new Set(pServices.map(s => s.patientId).filter(Boolean)).size;
    const newPatients = patients.filter(p => inRange(p.createdAt, range)).length;

    // Servicios por tipo (para top/gráfico).
    const serviceTypeCounts = {};
    pServices.forEach(s => {
      const t = s.serviceType || 'Sin tipo';
      serviceTypeCounts[t] = (serviceTypeCounts[t] || 0) + 1;
    });

    // Ventas: dinero, cantidad, ticket promedio, split servicios vs productos.
    const salesTotal = pSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    let servicesRevenue = 0;
    let productsRevenue = 0;
    const productQty = {};
    pSales.forEach(sale => {
      (sale.items || []).forEach(it => {
        const sub = Number(it.subtotal) || (Number(it.qty) * Number(it.unitPrice)) || 0;
        if (it.type === 'product') {
          productsRevenue += sub;
          const key = it.name || 'Producto';
          productQty[key] = (productQty[key] || 0) + (Number(it.qty) || 0);
        } else {
          servicesRevenue += sub;
        }
      });
    });

    const topProducts = Object.entries(productQty)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const topServices = Object.entries(serviceTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      range,
      patients: {
        newPatients,
        uniqueTreated,
        totalTreated: pServices.length,
        appointments: pAppointments.length,
        appointmentsCompleted: pAppointments.filter(a => a.status === 'completed').length,
        vaccinations: pVaccinations.length,
        procedures: pProcedures.length
      },
      sales: {
        total: salesTotal,
        count: pSales.length,
        ticket: pSales.length ? salesTotal / pSales.length : 0,
        servicesRevenue,
        productsRevenue,
        topProducts,
        topServices
      },
      // Series para gráficas.
      series: {
        services: bucketize(pServices, range, 'date'),
        sales: bucketize(pSales, range, 'date', s => Number(s.total) || 0),
        newPatients: bucketize(patients.filter(p => inRange(p.createdAt, range)), range, 'createdAt'),
        appointments: bucketize(pAppointments, range, 'date')
      }
    };
  },

  // Comparativo de dos rangos (A y B) con series alineadas.
  async getMovementComparison(rangeA, rangeB) {
    const [a, b] = await Promise.all([
      this.getPeriodMetrics(rangeA),
      this.getPeriodMetrics(rangeB)
    ]);
    return { a, b };
  },

  // ---- BACKUP (v6, compatible con la 1.0) ----
  async exportAllData() {
    const [patients, services, appointments, vaccinations, prescriptions, products, patientProcedures, sales] = await Promise.all([
      this.getAllPatients(),
      this.getAllServices(),
      this.getAllAppointments(),
      this.getAllVaccinations(),
      this.getAllPrescriptions(),
      this.getAllProducts(),
      this.getAllPatientProcedures(),
      this.getAllSales()
    ]);
    const settings = await this.getAllSettings();
    return {
      version: 6,
      app: 'republica-mascotas',
      exportedAt: new Date().toISOString(),
      data: { patients, services, appointments, vaccinations, prescriptions, products, settings, patientProcedures, sales }
    };
  },

  // La importación real (con normalización 1.0 -> 2.0) vive en backup.js:
  // importLegacyBackup(). Este método queda como alias para no romper la API.
  async importAllData(backup) {
    if (typeof importLegacyBackup === 'function') {
      return importLegacyBackup(backup, this);
    }
    // Fallback mínimo si backup.js no se cargó.
    if (!backup || !backup.data) throw new Error('Formato de backup inválido');
    return { imported: true, counts: {}, warnings: [] };
  },

  // ---- CLEAR ALL ----
  async clearAll() {
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const stores = ['settings', 'patients', 'services', 'appointments', 'vaccinations', 'prescriptions', 'inventory', 'patientProcedures', 'sales'];
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = (e) => { db.close(); reject(e.target.error); };
      }).catch(reject);
    });
  }
};
