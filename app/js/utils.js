// ============================================================
// VetCare Pro 2.0 — Utilidades
// Compatibles con la 1.0 (mismas firmas) + helpers de periodo
// para el módulo Movimiento (comparativo semanal/mensual).
// ============================================================

function generateId(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + result;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateInput(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDateInput(new Date());
}

function getTodayDisplay() {
  const d = new Date();
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1 + 'T12:00:00');
  const d2 = new Date(date2 + 'T12:00:00');
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr) {
  return daysBetween(dateStr, getToday());
}

// Rango de la semana actual (lunes a domingo), como en la 1.0.
function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDateInput(monday), end: formatDateInput(sunday) };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

function getMonthRangeFor(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

// --- Helpers de periodo para el comparativo Movimiento ---

// Rango de la semana inmediatamente ANTERIOR a la actual.
function getPrevWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff - 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDateInput(monday), end: formatDateInput(sunday) };
}

// Rango del mes ANTERIOR al actual.
function getPrevMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

// Convierte un rango {start,end} en etiquetas diarias para la gráfica de
// tendencia. Si el rango dura <= 31 días usa días; si no, agrupa por semana.
function buildPeriodSeries(range) {
  const start = new Date(range.start + 'T12:00:00');
  const end = new Date(range.end + 'T12:00:00');
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const labels = [];
  const keys = [];

  if (days <= 31) {
    // Serie diaria.
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(formatDateInput(d));
      labels.push(d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
    }
  } else {
    // Serie semanal (acumula por semana del rango).
    const cursor = new Date(start);
    let weekIdx = 1;
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(cursor.getDate() + 6);
      if (weekEnd > end) weekEnd.setTime(end.getTime());
      keys.push({
        start: formatDateInput(weekStart),
        end: formatDateInput(weekEnd > end ? end : weekEnd)
      });
      labels.push('Sem ' + weekIdx++);
      cursor.setDate(weekEnd.getDate() + 1);
    }
  }
  return { keys, labels, granularity: days <= 31 ? 'day' : 'week' };
}

// Devuelve true si dateStr cae dentro de {start,end} (comparación lexicográfica
// segura porque las fechas están en formato YYYY-MM-DD).
function inRange(dateStr, range) {
  if (!dateStr) return false;
  return dateStr >= range.start && dateStr <= range.end;
}

// Conteo de ocurrencias de `key` agrupadas por los "buckets" de buildPeriodSeries.
function bucketize(records, range, dateField, valueFn) {
  const { keys, granularity } = buildPeriodSeries(range);
  const buckets = keys.map(k => 0);
  for (const r of records) {
    const ds = r[dateField];
    if (!ds) continue;
    if (granularity === 'day') {
      const idx = keys.indexOf(ds);
      if (idx !== -1) buckets[idx] += valueFn ? valueFn(r) : 1;
    } else {
      for (let i = 0; i < keys.length; i++) {
        if (ds >= keys[i].start && ds <= keys[i].end) {
          buckets[i] += valueFn ? valueFn(r) : 1;
          break;
        }
      }
    }
  }
  return buckets;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Formato monetario en guaraníes (sin decimales, como la 1.0).
function formatMoney(amount) {
  const n = Number(amount) || 0;
  return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
}

function formatMoneyCompact(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 1000000) return 'Gs. ' + (n / 1000000).toFixed(1).replace('.0', '') + ' M';
  if (Math.abs(n) >= 1000) return 'Gs. ' + Math.round(n / 1000) + ' k';
  return formatMoney(n);
}

// Variación porcentual entre dos valores. Devuelve { pct, dir } donde
// dir es 'up' | 'down' | 'flat'. Para métricas donde "más es peor" (ej.
// stock bajo) pasar invert=true.
function pctChange(prev, current) {
  const p = Number(prev) || 0;
  const c = Number(current) || 0;
  if (p === 0) {
    if (c === 0) return { pct: 0, dir: 'flat' };
    return { pct: 100, dir: 'up' };
  }
  const pct = ((c - p) / Math.abs(p)) * 100;
  const dir = Math.abs(pct) < 0.05 ? 'flat' : (pct > 0 ? 'up' : 'down');
  return { pct: Math.round(pct * 10) / 10, dir };
}

function getSpeciesIcon(species) {
  const icons = {
    'Perro': 'pets',
    'Gato': 'pets',
    'Ave': 'flutter_dash',
    'Conejo': 'cruelty_free',
    'Hamster': 'cruelty_free',
    'Reptil': 'lizard',
    'Caballo': 'horse',
    'Otro': 'pets'
  };
  return icons[species] || 'pets';
}

const SERVICE_TYPES = [
  'Consulta General',
  'Vacunación',
  'Baño',
  'Peluquería',
  'Baño Medicado',
  'Corte de Uñas',
  'Limpieza de Oídos',
  'Cirugía',
  'Limpieza Dental',
  'Análisis de Laboratorio',
  'Radiografía',
  'Ecografía',
  'Hospitalización',
  'Control de Peso',
  'Emergencia',
  'Otro'
];

const SPECIES = ['Perro', 'Gato', 'Ave', 'Conejo', 'Hamster', 'Reptil', 'Caballo', 'Otro'];

const BREEDS_BY_SPECIES = {
  'Perro': ['Labrador Retriever', 'Golden Retriever', 'Pastor Alemán', 'Bulldog Francés', 'Bulldog Inglés', 'Caniche', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Husky Siberiano', 'Boxer', 'Cocker Spaniel', 'Shih Tzu', 'Pomerania', 'Chihuahua', 'Mestizo', 'Otro'],
  'Gato': ['Siamés', 'Persa', 'Maine Coon', 'Bengala', 'Sphynx', 'Ragdoll', 'British Shorthair', 'Scottish Fold', 'Común Europeo', 'Mestizo', 'Otro'],
  'Ave': ['Periquito', 'Canario', 'Cacatúa', 'Loro', 'Agapornis', 'Otro'],
  'Conejo': ['Holandés', 'Mini Lop', 'Rex', 'Angora', 'Belier', 'Otro'],
  'Hamster': ['Sirio', 'Ruso', 'Roborovski', 'Chino', 'Otro'],
  'Reptil': ['Tortuga', 'Gecko', 'Iguana', 'Serpiente', 'Lagarto', 'Otro'],
  'Caballo': ['Pura Sangre', 'Cuarto de Milla', 'Árabe', 'Poni', 'Appaloosa', 'Otro'],
  'Otro': ['Otro']
};
