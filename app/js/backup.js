// ============================================================
// VetCare Pro 2.0 — Backup e Importación
// Garantiza compatibilidad con los backups de la 1.0.
//
// Backups de la 1.0 conocidos:
//   version 2: data = { settings, patients, services, appointments }
//   version 5: data = { patients, services, appointments, vaccinations,
//                       prescriptions, products, settings, patientProcedures }
//   version 6 (2.0): + sales
//
// Derivas de schema que este importador normaliza:
//   - products (backup)  -> inventory (store interna)
//   - appointments.reason -> appointments.type  (+ status 'pending' si falta)
//   - patients.lastName  opcional (queda '')
//   - products.category / description ausentes -> ''
//   - service.price ausente -> 0 (los servicios viejos no tienen importe)
// ============================================================

const BACKUP_SUPPORTED_MIN = 2;
const BACKUP_SUPPORTED_MAX = 6;

// Mapeo de clave de backup -> store interna.
const BACKUP_KEY_TO_STORE = {
  patients: 'patients',
  services: 'services',
  appointments: 'appointments',
  vaccinations: 'vaccinations',
  prescriptions: 'prescriptions',
  products: 'inventory',     // en la 1.0 el export llama 'products' al store 'inventory'
  inventory: 'inventory',    // por si un backup futuro usa el nombre directo
  patientProcedures: 'patientProcedures',
  sales: 'sales'
};

// Detecta la versión del backup. Devuelve number o null si no se puede leer.
function detectBackupVersion(backup) {
  if (!backup || typeof backup !== 'object') return null;
  if (typeof backup.version === 'number') return backup.version;
  // Backups muy viejos podrían no traer versión: inferir por contenido.
  if (backup.data) {
    if (backup.data.sales) return 6;
    if (backup.data.patientProcedures) return 5;
    return 2;
  }
  return null;
}

// Valida la estructura general del backup. Lanza Error con mensaje claro.
function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('El archivo no parece un backup válido (JSON ilegible).');
  }
  if (!backup.data || typeof backup.data !== 'object') {
    throw new Error('El archivo no tiene la estructura esperada (falta "data").');
  }
  const version = detectBackupVersion(backup);
  if (version === null) {
    throw new Error('No se pudo determinar la versión del backup.');
  }
  if (version < BACKUP_SUPPORTED_MIN) {
    throw new Error(`Backup versión ${version} demasiado antiguo (mínimo soportado: ${BACKUP_SUPPORTED_MIN}).`);
  }
  if (version > BACKUP_SUPPORTED_MAX) {
    throw new Error(`Backup versión ${version} creado por una versión más nueva de la app (soportamos hasta la ${BACKUP_SUPPORTED_MAX}).`);
  }
  return version;
}

// ---- Normalizadores por entidad ----
// Cada uno recibe el objeto crudo del backup y devuelve una lista de
// advertencias (strings) además del objeto normalizado.

function normalizePatient(p, warnings) {
  const out = { ...p };
  if (out.lastName === undefined || out.lastName === null) out.lastName = '';
  if (out.photo === undefined) out.photo = '';
  if (out.alerts === undefined) out.alerts = '';
  if (out.notes === undefined) out.notes = '';
  if (!out.createdAt) {
    out.createdAt = out.updatedAt || getToday();
  }
  // Asegurar campos numéricos.
  ['ageYears', 'ageMonths', 'weight'].forEach(k => {
    if (out[k] === undefined || out[k] === null || out[k] === '') out[k] = 0;
  });
  if (!out.id) { warnings.push('Paciente sin id: se generó uno nuevo.'); out.id = generateId('PAC'); }
  if (!out.name) { warnings.push(`Paciente ${out.id} sin nombre.`); }
  return out;
}

function normalizeService(s, warnings) {
  const out = { ...s };
  // 2.0: los servicios pueden tener precio; los viejos no. Default 0.
  if (out.price === undefined) out.price = 0;
  if (!out.date) { out.date = out.createdAt || getToday(); }
  if (!out.id) { warnings.push('Servicio sin id: se generó uno nuevo.'); out.id = generateId('SVC'); }
  return out;
}

// Estados válidos en 2.0 (espejo, con nombres propios para no chocar
// con el `APPOINTMENT_STATUS` que define agenda.js en el mismo scope global).
const BACKUP_VALID_APPT_STATUS = { pending: 1, confirmed: 1, completed: 1, cancelled: 1 };

// Estados válidos en 2.0. Backups muy viejos (v2) traían 'scheduled'.
const BACKUP_LEGACY_APPT_STATUS = {
  scheduled: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  pending: 'pending'
};

function normalizeAppointment(a, warnings) {
  const out = { ...a };
  // La 1.0 guardaba 'reason'; la 2.0 usa 'type' + 'status'.
  if (!out.type && out.reason) out.type = out.reason;
  if (!out.reason && out.type) out.reason = out.type;   // mantener simetría
  if (!out.status) out.status = 'pending';
  // Mapear estados legacy a los de 2.0 (ej. 'scheduled' de los backups v2).
  if (!BACKUP_VALID_APPT_STATUS[out.status]) {
    const mapped = BACKUP_LEGACY_APPT_STATUS[out.status];
    if (mapped && mapped !== out.status) {
      warnings.push(`Turno ${out.id || ''}: estado "${out.status}" migrado a "${mapped}".`);
      out.status = mapped;
    } else {
      out.status = 'pending';
    }
  }
  if (!out.date) { out.date = out.createdAt || getToday(); }
  if (!out.id) { warnings.push('Turno sin id: se generó uno nuevo.'); out.id = generateId('TUR'); }
  return out;
}

function normalizeVaccination(v, warnings) {
  const out = { ...v };
  if (!out.dateApplied) out.dateApplied = out.createdAt || getToday();
  if (!out.id) { warnings.push('Vacuna sin id: se generó uno nueva.'); out.id = generateId('VAC'); }
  return out;
}

function normalizePrescription(rx, warnings) {
  const out = { ...rx };
  if (!Array.isArray(out.medications)) out.medications = [];
  if (!out.date) out.date = out.createdAt || getToday();
  if (!out.id) { warnings.push('Receta sin id: se generó una nueva.'); out.id = generateId('REC'); }
  return out;
}

function normalizeProduct(p, warnings) {
  const out = { ...p };
  // El form de la 1.0 no guardaba category/description; los backups viejos sí.
  if (out.category === undefined) out.category = '';
  if (out.description === undefined) out.description = '';
  if (out.stock === undefined || out.stock === null) out.stock = 0;
  if (out.minStock === undefined || out.minStock === null) out.minStock = 0;
  if (out.price === undefined || out.price === null) out.price = 0;
  if (!out.createdAt) out.createdAt = out.updatedAt || getToday();
  if (!out.id) { warnings.push('Producto sin id: se generó uno nuevo.'); out.id = generateId('PRD'); }
  return out;
}

function normalizeProcedure(pp, warnings) {
  const out = { ...pp };
  if (!out.date) out.date = out.createdAt || getToday();
  if (!out.id) { warnings.push('Procedimiento sin id: se generó uno nuevo.'); out.id = generateId('PP'); }
  return out;
}

function normalizeSale(s, warnings) {
  const out = { ...s };
  if (!Array.isArray(out.items)) out.items = [];
  if (out.status === undefined) out.status = 'completed';
  if (out.discount === undefined) out.discount = 0;
  if (out.subtotal === undefined) out.subtotal = 0;
  if (out.total === undefined) {
    out.total = out.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0) - (Number(out.discount) || 0);
  }
  if (!out.date) out.date = out.createdAt || getToday();
  if (!out.id) { warnings.push('Venta sin id: se generó una nueva.'); out.id = generateId('VTA'); }
  return out;
}

// Orquestador: importa un backup (v2..v6) en la BD actual de 2.0.
// `dbRef` es el objeto DB (opcional; usa el global si no se pasa).
// Devuelve { imported, counts, warnings, version }.
async function importLegacyBackup(backup, dbRef) {
  const DBref = dbRef || DB;
  const warnings = [];
  const version = validateBackup(backup);
  const data = backup.data;

  const counts = { patients: 0, services: 0, appointments: 0, vaccinations: 0, prescriptions: 0, products: 0, patientProcedures: 0, sales: 0 };

  // Recorre cada clave del backup y la importa a su store.
  for (const [key, rawList] of Object.entries(data)) {
    if (key === 'settings') continue;             // settings se maneja aparte
    if (!Array.isArray(rawList)) continue;         // claves desconocidas no-array se ignoran
    const storeName = BACKUP_KEY_TO_STORE[key];
    if (!storeName) {
      warnings.push(`Se ignoró la sección desconocida "${key}".`);
      continue;
    }
    if (rawList.length === 0) continue;

    for (const raw of rawList) {
      if (!raw || typeof raw !== 'object') continue;
      let item;
      switch (storeName) {
        case 'patients': item = normalizePatient(raw, warnings); break;
        case 'services': item = normalizeService(raw, warnings); break;
        case 'appointments': item = normalizeAppointment(raw, warnings); break;
        case 'vaccinations': item = normalizeVaccination(raw, warnings); break;
        case 'prescriptions': item = normalizePrescription(raw, warnings); break;
        case 'inventory': item = normalizeProduct(raw, warnings); break;
        case 'patientProcedures': item = normalizeProcedure(raw, warnings); break;
        case 'sales': item = normalizeSale(raw, warnings); break;
        default: item = raw;
      }
      // Upsert por id (put) -> idempotente, no duplica.
      if (storeName === 'patients') await DBref.addPatient(item);
      else if (storeName === 'services') await DBref.addService(item);
      else if (storeName === 'appointments') await DBref.addAppointment(item);
      else if (storeName === 'vaccinations') await DBref.addVaccination(item);
      else if (storeName === 'prescriptions') await DBref.addPrescription(item);
      else if (storeName === 'inventory') await DBref.addProduct(item);
      else if (storeName === 'patientProcedures') await DBref.addPatientProcedure(item);
      else if (storeName === 'sales') await DBref.addSale(item);
      counts[storeName === 'inventory' ? 'products' : storeName] =
        (counts[storeName === 'inventory' ? 'products' : storeName] || 0) + 1;
    }
  }

  // Settings: importar sin pisar lastBackupDate (se recalcula).
  if (data.settings && typeof data.settings === 'object') {
    for (const [k, v] of Object.entries(data.settings)) {
      if (k === 'lastBackupDate') continue;
      await DBref.saveSetting(k, v);
    }
  }

  await DBref.setLastBackupDate(getToday());

  return { imported: true, version, counts, warnings };
}

// Exporta el backup y dispara la descarga (como la 1.0 pero en v6).
async function downloadBackup() {
  const backup = await DB.exportAllData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vetcare_backup_${getToday()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  await DB.setLastBackupDate(getToday());
  return backup;
}

// Lee un File/JSON y lo importa. Devuelve el resultado o lanza Error.
// Importa un archivo de backup.
// Con `opts.replace = true` borra TODOS los datos actuales antes de
// importar (reemplazo total, pensado para migrar de la 1.0 a la 2.0).
async function importBackupFromFile(file, opts = {}) {
  const text = await file.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('El archivo no es un JSON válido.');
  }
  // Validar el formato ANTES de borrar nada.
  validateBackup(json);

  if (opts.replace) {
    await DB.clearAll();
  }
  const result = await importLegacyBackup(json, DB);
  result.replaced = !!opts.replace;
  return result;
}
