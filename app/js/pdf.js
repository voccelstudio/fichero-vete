// ============================================================
// VetCare Pro 2.0 — Generación de PDF (html2pdf.js)
// Recibo de venta y reporte comparativo de Movimiento.
// Requiere html2pdf.js cargado en el HTML.
// ============================================================

// Helper interno: renderiza un HTML en #pdf-container y descarga el PDF.
async function _renderPdf(html, filename, opts = {}) {
  let container = document.getElementById('pdf-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pdf-container';
    document.body.appendChild(container);
  }
  container.innerHTML = html;

  const options = {
    margin: [10, 12, 10, 12],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    ...opts
  };

  try {
    await html2pdf().set(options).from(container).save();
  } finally {
    // Limpiar el contenedor para no dejar contenido en el DOM.
    setTimeout(() => { container.innerHTML = ''; }, 400);
  }
}

// Estilos compartidos embebidos en el PDF (fuera del CSS de la app).
function _pdfStyles() {
  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1a1f36; margin: 0; }
      .p-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2f7df6; padding-bottom:12px; margin-bottom:16px; }
      .p-brand { font-size:20px; font-weight:800; color:#2f7df6; }
      .p-sub { font-size:11px; color:#6b7280; }
      .p-title { font-size:16px; font-weight:700; margin:0 0 4px; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th { text-align:left; padding:8px 6px; background:#f1f4f9; border-bottom:1px solid #d7dce5; font-size:11px; text-transform:uppercase; color:#6b7280; }
      td { padding:8px 6px; border-bottom:1px solid #eceff4; }
      .r { text-align:right; }
      .total-row td { border-top:2px solid #1a1f36; font-weight:800; font-size:14px; }
      .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; background:#e5edff; color:#2f7df6; }
      .muted { color:#6b7280; }
      .grid2 { display:flex; gap:16px; }
      .box { flex:1; border:1px solid #e3e8f0; border-radius:8px; padding:12px; }
      .kpi { font-size:22px; font-weight:800; }
      .kpi-l { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.03em; }
      .up { color:#16a34a; } .down { color:#dc2626; }
      .footer { margin-top:20px; font-size:10px; color:#9aa2b1; text-align:center; border-top:1px solid #eceff4; padding-top:10px; }
    </style>`;
}

// ---------- Recibo de venta ----------
async function generateSaleReceiptPDF(sale, settings) {
  const clinic = settings || {};
  const items = (sale.items || []).map(it => `
    <tr>
      <td>${it.type === 'product' ? 'Producto' : 'Servicio'}</td>
      <td>${escapeHtml(it.name)}</td>
      <td class="r">${it.qty}</td>
      <td class="r">${formatMoney(it.unitPrice)}</td>
      <td class="r">${formatMoney(it.subtotal)}</td>
    </tr>`).join('');

  const html = `
  <div>${_pdfStyles()}
    <div class="p-head">
      <div>
        <div class="p-brand">${escapeHtml(clinic.clinicName || 'VetCare Pro')}</div>
        <div class="p-sub">${escapeHtml(clinic.clinicAddress || '')}</div>
        <div class="p-sub">${escapeHtml(clinic.clinicPhone || '')}</div>
      </div>
      <div style="text-align:right">
        <div class="p-title">Comprobante de pago</div>
        <div class="p-sub">Nº ${escapeHtml(sale.number || sale.id)}</div>
        <div class="p-sub">${formatDate(sale.date)} ${escapeHtml(sale.time || '')}</div>
      </div>
    </div>

    <div style="margin-bottom:12px">
      <div><strong>Cliente:</strong> ${escapeHtml(sale.customerName || '—')}</div>
      <div><strong>Método de pago:</strong> ${escapeHtml(sale.paymentMethod || '—')}</div>
    </div>

    <table>
      <thead><tr><th>Tipo</th><th>Descripción</th><th class="r">Cant.</th><th class="r">P. unit.</th><th class="r">Subtotal</th></tr></thead>
      <tbody>${items}</tbody>
    </table>

    <table style="margin-top:14px;width:55%;margin-left:auto">
      <tr><td>Subtotal</td><td class="r">${formatMoney(sale.subtotal || 0)}</td></tr>
      ${sale.discount ? `<tr><td>Descuento</td><td class="r">-${formatMoney(sale.discount)}</td></tr>` : ''}
      <tr class="total-row"><td>TOTAL</td><td class="r">${formatMoney(sale.total || 0)}</td></tr>
    </table>

    ${sale.notes ? `<div style="margin-top:14px" class="muted">Nota: ${escapeHtml(sale.notes)}</div>` : ''}

    <div class="footer">Gracias por su visita · ${escapeHtml(clinic.clinicName || 'VetCare Pro')} ${clinic.clinicTaxId ? '· ' + escapeHtml(clinic.clinicTaxId) : ''}</div>
  </div>`;

  await _renderPdf(html, `comprobante_${sale.number || sale.id}.pdf`);
  return true;
}

// ---------- Reporte comparativo de Movimiento ----------
async function generateMovementPDF(labelA, labelB, data) {
  const a = data.a, b = data.b;

  // KPIs de pacientes.
  function cmpRow(label, va, vb, fmt) {
    const f = fmt || (v => v);
    const pa = Number(va) || 0, pb = Number(vb) || 0;
    let pct = 0, cls = '';
    if (pb > 0) { pct = ((pa - pb) / pb) * 100; cls = pct >= 0 ? 'up' : 'down'; }
    else if (pa > 0) { pct = 100; cls = 'up'; }
    const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '•';
    return `<tr>
      <td>${label}</td>
      <td class="r">${f(pa)}</td>
      <td class="r">${f(pb)}</td>
      <td class="r ${cls}">${arrow} ${Math.abs(pct).toFixed(1)}%</td>
    </tr>`;
  }

  const html = `
  <div>${_pdfStyles()}
    <div class="p-head">
      <div>
        <div class="p-brand">Reporte de Movimiento</div>
        <div class="p-sub">Comparativo entre dos periodos</div>
      </div>
      <div style="text-align:right">
        <div class="p-sub">Generado: ${formatDate(getToday())}</div>
      </div>
    </div>

    <div class="grid2" style="margin-bottom:16px">
      <div class="box">
        <div class="kpi-l">Periodo A</div>
        <div style="font-weight:700">${labelA}</div>
      </div>
      <div class="box">
        <div class="kpi-l">Periodo B (referencia)</div>
        <div style="font-weight:700">${labelB}</div>
      </div>
    </div>

    <div class="p-title">Pacientes y actividad</div>
    <table>
      <thead><tr><th>Métrica</th><th class="r">Periodo A</th><th class="r">Periodo B</th><th class="r">Variación</th></tr></thead>
      <tbody>
        ${cmpRow('Pacientes atendidos', a.patients.uniqueTreated, b.patients.uniqueTreated)}
        ${cmpRow('Servicios realizados', a.patients.totalTreated, b.patients.totalTreated)}
        ${cmpRow('Pacientes nuevos', a.patients.newPatients, b.patients.newPatients)}
        ${cmpRow('Vacunas aplicadas', a.patients.vaccinations, b.patients.vaccinations)}
        ${cmpRow('Turnos generados', a.patients.appointments, b.patients.appointments)}
        ${cmpRow('Turnos atendidos', a.patients.appointmentsCompleted, b.patients.appointmentsCompleted)}
      </tbody>
    </table>

    <div class="p-title" style="margin-top:18px">Ventas</div>
    <table>
      <thead><tr><th>Métrica</th><th class="r">Periodo A</th><th class="r">Periodo B</th><th class="r">Variación</th></tr></thead>
      <tbody>
        ${cmpRow('Facturación total', a.sales.total, b.sales.total, v => formatMoney(v))}
        ${cmpRow('Ventas registradas', a.sales.count, b.sales.count)}
        ${cmpRow('Ticket promedio', Math.round(a.sales.ticket), Math.round(b.sales.ticket), v => formatMoney(v))}
        ${cmpRow('Ingresos por servicios', a.sales.servicesRevenue, b.sales.servicesRevenue, v => formatMoney(v))}
        ${cmpRow('Ingresos por productos', a.sales.productsRevenue, b.sales.productsRevenue, v => formatMoney(v))}
      </tbody>
    </table>

    ${a.sales.topServices && a.sales.topServices.length ? `
      <div class="p-title" style="margin-top:18px">Top servicios (Periodo A)</div>
      <table><tbody>
        ${a.sales.topServices.map((s, i) => `<tr><td>${i + 1}. ${escapeHtml(s.name)}</td><td class="r">${s.count}</td></tr>`).join('')}
      </tbody></table>` : ''}

    ${a.sales.topProducts && a.sales.topProducts.length ? `
      <div class="p-title" style="margin-top:18px">Top productos (Periodo A)</div>
      <table><tbody>
        ${a.sales.topProducts.map((p, i) => `<tr><td>${i + 1}. ${escapeHtml(p.name)}</td><td class="r">${p.qty} uds</td></tr>`).join('')}
      </tbody></table>` : ''}

    <div class="footer">Reporte generado automáticamente por VetCare Pro 2.0</div>
  </div>`;

  await _renderPdf(html, `reporte_movimiento_${getToday()}.pdf`, { jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } });
  return true;
}
