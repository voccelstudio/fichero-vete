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

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatDateInput(monday),
    end: formatDateInput(sunday)
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end)
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
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
