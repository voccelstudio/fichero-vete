const DB_NAME = 'VetCareProDB';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
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
    await this.saveSetting('clinicName', data.clinicName || '');
    await this.saveSetting('clinicEmail', data.clinicEmail || '');
    await this.saveSetting('clinicAddress', data.clinicAddress || '');
    await this.saveSetting('clinicPhone', data.clinicPhone || '');
    await this.saveSetting('clinicTaxId', data.clinicTaxId || '');
    await this.saveSetting('clinicLogo', data.clinicLogo || '');
    await this.saveSetting('pdfShowLogo', data.pdfShowLogo !== undefined ? data.pdfShowLogo : true);
    await this.saveSetting('pdfShowVat', data.pdfShowVat !== undefined ? data.pdfShowVat : true);
  },
  async getClinicSettings() {
    const all = await this.getAllSettings();
    return {
      clinicName: all.clinicName || 'Mi Clínica Veterinaria',
      clinicEmail: all.clinicEmail || '',
      clinicAddress: all.clinicAddress || '',
      clinicPhone: all.clinicPhone || '',
      clinicTaxId: all.clinicTaxId || '',
      clinicLogo: all.clinicLogo || '',
      pdfShowLogo: all.pdfShowLogo !== false,
      pdfShowVat: all.pdfShowVat !== false
    };
  },
  async getLastBackupDate() {
    return this.getSetting('lastBackupDate') || null;
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
    return dbOperation('patients', 'readwrite', store => {
      const req = store.delete(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve();
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
    const patients = await this.getAllPatients();
    if (!query) return patients;
    const q = query.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      p.species.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.ownerPhone.includes(q)
    );
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
        req.onsuccess = () => resolve();
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
      const req = store.index('patientId').getAll(patientId);
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
    const services = await this.getAllServices();
    services.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return services.slice(0, limit);
  },
  async getServicesByDateRange(startDate, endDate) {
    const services = await this.getAllServices();
    return services.filter(s => s.date >= startDate && s.date <= endDate);
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
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAppointmentsByDate(date) {
    return dbOperation('appointments', 'readonly', store => {
      const req = store.index('date').getAll(date);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async getAppointmentsByPatient(patientId) {
    return dbOperation('appointments', 'readonly', store => {
      const req = store.index('patientId').getAll(patientId);
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

  // ---- DASHBOARD STATS ----
  async getDashboardStats() {
    const patients = await this.getAllPatients();
    const services = await this.getAllServices();
    const appointments = await this.getAllAppointments();
    const today = getToday();

    const todayAppointments = appointments.filter(a => a.date === today);
    const todayServices = services.filter(s => s.date === today);
    const weekRange = getWeekRange();
    const weekServices = services.filter(s => s.date >= weekRange.start && s.date <= weekRange.end);
    const monthRange = getMonthRange();
    const monthServices = services.filter(s => s.date >= monthRange.start && s.date <= monthRange.end);

    return {
      totalPatients: patients.length,
      totalServices: services.length,
      todayAppointments: todayAppointments.length,
      todayServices: todayServices.length,
      weekServices: weekServices.length,
      monthServices: monthServices.length,
      totalAppointments: appointments.length
    };
  },

  // ---- BACKUP ----
  async exportAllData() {
    const patients = await this.getAllPatients();
    const services = await this.getAllServices();
    const appointments = await this.getAllAppointments();
    const settings = await this.getAllSettings();
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      data: { patients, services, appointments, settings }
    };
  },
  async importAllData(backup) {
    if (!backup || !backup.data) throw new Error('Formato de backup inválido');
    const { patients, services, appointments, settings } = backup.data;

    if (patients && patients.length > 0) {
      for (const p of patients) await this.addPatient(p);
    }
    if (services && services.length > 0) {
      for (const s of services) await this.addService(s);
    }
    if (appointments && appointments.length > 0) {
      for (const a of appointments) await this.addAppointment(a);
    }
    if (settings) {
      for (const key of Object.keys(settings)) {
        if (key !== 'lastBackupDate') {
          await this.saveSetting(key, settings[key]);
        }
      }
    }
    await this.setLastBackupDate(getToday());
    return { patients: patients?.length || 0, services: services?.length || 0, appointments: appointments?.length || 0 };
  },

  // ---- CLEAR ALL ----
  async clearAll() {
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const stores = ['settings', 'patients', 'services', 'appointments'];
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = (e) => { db.close(); reject(e.target.error); };
      }).catch(reject);
    });
  }
};
