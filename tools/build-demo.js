// Genera app/js/demo-data.js a partir de datos_ejemplo.json,
// ampliándolo a v6 con productos (Inventario) y ventas (Ventas/Caja).
const fs = require('fs');
const path = require('path');

const root = 'D:/Recursos/Work/VOCCEL/fichero-vete';
const base = JSON.parse(fs.readFileSync(path.join(root, 'datos_ejemplo.json'), 'utf8'));

base.version = 6;
base.exportedAt = new Date('2026-05-20T12:00:00.000Z').toISOString();

// ---------- Productos / insumos (Inventario) ----------
const products = [
  { id: 'PRD-0001', name: 'Alimento Premium Perro Adulto 15 kg', category: 'Alimento', barcode: '7591234560011', stock: 24, minStock: 5, price: 45000, description: 'Balanceado completo para perro adulto.', createdAt: '2025-11-02', updatedAt: '2026-05-12' },
  { id: 'PRD-0002', name: 'Alimento Gato Esterilizado 10 kg', category: 'Alimento', barcode: '7591234560028', stock: 18, minStock: 5, price: 52000, description: 'Fórmula para gatos esterilizados, control urinario.', createdAt: '2025-11-02', updatedAt: '2026-05-10' },
  { id: 'PRD-0003', name: 'Antipulgas Spot-On (pipeta)', category: 'Farmacia', barcode: '7591234560035', stock: 30, minStock: 10, price: 12000, description: 'Antiparasitario externo de amplio espectro.', createdAt: '2025-12-15', updatedAt: '2026-05-15' },
  { id: 'PRD-0004', name: 'Vacuna Antirrábica (dosis)', category: 'Vacunas', barcode: '7591234560042', stock: 40, minStock: 15, price: 8000, description: 'Dosis individual, cadena de frío.', createdAt: '2026-01-08', updatedAt: '2026-05-08' },
  { id: 'PRD-0005', name: 'Vacuna Quíntuple (dosis)', category: 'Vacunas', barcode: '7591234560059', stock: 35, minStock: 15, price: 9500, description: 'Refuerzo anual polivalente.', createdAt: '2026-01-08', updatedAt: '2026-05-08' },
  { id: 'PRD-0006', name: 'Antiparasitario Oral (comprimidos)', category: 'Farmacia', barcode: '7591234560066', stock: 22, minStock: 8, price: 7500, description: 'Desparasitante interno, por peso.', createdAt: '2026-02-01', updatedAt: '2026-05-05' },
  { id: 'PRD-0007', name: 'Shampoo Medicado Clorhexidina 250 ml', category: 'Higiene', barcode: '7591234560073', stock: 15, minStock: 5, price: 14000, description: 'Para dermatitis y afecciones dérmicas.', createdAt: '2026-02-20', updatedAt: '2026-04-28' },
  { id: 'PRD-0008', name: 'Arena Sanitaria Aglomerante 10 kg', category: 'Higiene', barcode: '7591234560080', stock: 12, minStock: 6, price: 18000, description: 'Alta absorción, control de olores.', createdAt: '2026-03-05', updatedAt: '2026-05-02' },
  { id: 'PRD-0009', name: 'Suplemento Articular Condroitina', category: 'Farmacia', barcode: '7591234560097', stock: 9, minStock: 4, price: 32000, description: 'Soporte para displasia y articulaciones.', createdAt: '2026-03-18', updatedAt: '2026-05-11' },
  { id: 'PRD-0010', name: 'Collar Isabelino Talla M', category: 'Accesorios', barcode: '7591234560103', stock: 20, minStock: 5, price: 6500, description: 'Protección post-quirúrgica.', createdAt: '2026-03-25', updatedAt: '2026-04-30' }
];
base.data.products = products;

// ---------- Ventas (Ventas / Caja) ----------
function sale(id, number, date, time, patientId, customerName, items, discount, paymentMethod) {
  const norm = items.map(it => ({
    type: it.type,
    refId: it.refId || null,
    name: it.name,
    qty: it.qty,
    unitPrice: it.unitPrice,
    subtotal: Math.round(it.qty * it.unitPrice)
  }));
  const subtotal = norm.reduce((s, it) => s + it.subtotal, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  return {
    id, number, date, time, status: 'completed', patientId, customerName,
    items: norm, subtotal, discount: discount || 0, total, paymentMethod,
    notes: '', createdAt: date, updatedAt: date
  };
}

base.data.sales = [
  sale('VTA-0001', 'VTA-0001', '2026-05-19', '09:45', 'PAC-A1B2-C3D4', 'Luna',
    [
      { type: 'service', name: 'Consulta General', qty: 1, unitPrice: 12000 },
      { type: 'product', refId: 'PRD-0003', name: 'Antipulgas Spot-On (pipeta)', qty: 2, unitPrice: 12000 }
    ], 0, 'Efectivo'),
  sale('VTA-0002', 'VTA-0002', '2026-05-18', '11:20', 'PAC-U1V2-W3X4', 'Thor',
    [
      { type: 'service', name: 'Consulta General', qty: 1, unitPrice: 12000 },
      { type: 'product', refId: 'PRD-0009', name: 'Suplemento Articular Condroitina', qty: 1, unitPrice: 32000 }
    ], 0, 'Tarjeta de crédito'),
  sale('VTA-0003', 'VTA-0003', '2026-05-17', '16:10', 'PAC-Y5Z6-A7B8', 'Milo',
    [
      { type: 'service', name: 'Análisis de Laboratorio', qty: 1, unitPrice: 18000 },
      { type: 'product', refId: 'PRD-0002', name: 'Alimento Gato Esterilizado 10 kg', qty: 1, unitPrice: 52000 }
    ], 2000, 'Transferencia'),
  sale('VTA-0004', 'VTA-0004', '2026-05-15', '10:05', 'PAC-Q7R8-S9T0', 'Pelusa',
    [
      { type: 'service', name: 'Consulta General', qty: 1, unitPrice: 12000 },
      { type: 'service', name: 'Corte de Uñas', qty: 1, unitPrice: 5000 }
    ], 0, 'Efectivo'),
  sale('VTA-0005', 'VTA-0005', '2026-05-12', '17:30', 'PAC-K7L8-M9N0', 'Kiwi',
    [{ type: 'service', name: 'Consulta General', qty: 1, unitPrice: 12000 }], 0, 'Efectivo'),
  sale('VTA-0006', 'VTA-0006', '2026-05-10', '09:15', 'PAC-I9J0-K1L2', 'Rocky',
    [
      { type: 'service', name: 'Consulta General', qty: 1, unitPrice: 12000 },
      { type: 'product', refId: 'PRD-0006', name: 'Antiparasitario Oral (comprimidos)', qty: 1, unitPrice: 7500 }
    ], 0, 'Tarjeta de débito'),
  sale('VTA-0007', 'VTA-0007', '2026-05-05', '11:40', 'PAC-G3H4-I5J6', 'Manchitas',
    [
      { type: 'service', name: 'Baño Medicado', qty: 1, unitPrice: 9000 },
      { type: 'product', refId: 'PRD-0007', name: 'Shampoo Medicado Clorhexidina 250 ml', qty: 1, unitPrice: 14000 }
    ], 0, 'Transferencia'),
  sale('VTA-0008', 'VTA-0008', '2026-05-03', '15:20', 'PAC-E5F6-G7H8', 'Simba',
    [
      { type: 'service', name: 'Vacunación', qty: 1, unitPrice: 8000 },
      { type: 'product', refId: 'PRD-0004', name: 'Vacuna Antirrábica (dosis)', qty: 1, unitPrice: 8000 }
    ], 0, 'Efectivo')
];

const out = '// Datos de ejemplo para el MODO DEMO (generado a partir de datos_ejemplo.json).\n' +
  '// No editar a mano: se regenera con tools/build-demo.js\n' +
  'window.DEMO_DATA = ' + JSON.stringify(base, null, 2) + ';\n';

fs.writeFileSync(path.join(root, 'app', 'js', 'demo-data.js'), out, 'utf8');
console.log('OK demo-data.js ->', out.length, 'bytes');
console.log('patients:', base.data.patients.length, 'services:', base.data.services.length,
  'appointments:', base.data.appointments.length, 'products:', products.length, 'sales:', base.data.sales.length);
