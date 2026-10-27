// ============================================================
// VetCare Pro 2.0 — Generación de PDF (html2pdf.js)
// Ficha de paciente, receta médica, recibo de venta y reporte comparativo.
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

// ---------- Ficha de paciente ----------
async function generatePatientPDF(patientId) {
  const patient = await DB.getPatient(patientId);
  if (!patient) throw new Error('Paciente no encontrado');

  const settings = await DB.getClinicSettings();
  const [services, vaccinations, prescriptions] = await Promise.all([
    DB.getServicesByPatient(patientId),
    DB.getVaccinationsByPatient(patientId),
    DB.getPrescriptionsByPatient(patientId)
  ]);
  services.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
  vaccinations.sort((a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''));
  prescriptions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const container = document.getElementById('pdf-container');
  if (!container) return;

  const showLogo = settings.pdfShowLogo !== false;
  const showVat = settings.pdfShowVat !== false;
  const logoHtml = (settings.clinicLogo && showLogo)
    ? `<img src="${settings.clinicLogo}" alt="Logo" style="max-height:60px;max-width:60px;object-fit:contain;"/>`
    : '';

  const servicesRows = services.length > 0
    ? services.map(s => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${formatDateShort(s.date)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.serviceType || '')}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.performedBy || '')}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.notes || '')}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;text-align:center;font-size:11px;color:#888;">Sin servicios registrados</td></tr>';

  const vacRows = vaccinations.length > 0
    ? vaccinations.map(v => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${formatDateShort(v.dateApplied)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(v.vaccineName || '')}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(v.batch || '')}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${v.nextDoseDate ? formatDateShort(v.nextDoseDate) : '—'}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;text-align:center;font-size:11px;color:#888;">Sin vacunas registradas</td></tr>';

  const sexo = (patient.sex || '') + (patient.neutered ? ' (Esterilizado/Castrado)' : '');
  const edad = (patient.ageYears || 0) + ' años' + ((patient.ageMonths || 0) > 0 ? ' y ' + (patient.ageMonths || 0) + ' meses' : '');

  container.innerHTML = `
    <div style="font-family:Helvetica,Arial,sans-serif;padding:15px;color:#1a1a1a;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2f7df6;padding-bottom:12px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${logoHtml}
          <div>
            <h1 style="margin:0;font-size:18px;color:#2f7df6;font-weight:700;">${escapeHtml(settings.clinicName || 'VetCare Pro')}</h1>
            <p style="margin:3px 0 0;font-size:10px;color:#555;line-height:1.4;">
              ${escapeHtml(settings.clinicAddress || '')}<br/>
              ${escapeHtml(settings.clinicPhone || '')}${settings.clinicEmail ? ' | ' + escapeHtml(settings.clinicEmail) : ''}
              ${showVat && settings.clinicTaxId ? '<br/>ID Fiscal: ' + escapeHtml(settings.clinicTaxId) : ''}
            </p>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:#555;">
          <strong style="color:#2f7df6;">FICHA DE PACIENTE</strong><br/>
          ID: ${escapeHtml(patient.id)}<br/>
          Emitido: ${getTodayDisplay()}
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:16px;">
        ${patient.photo && patient.photo.startsWith('data:') ? `<div style="flex-shrink:0;">
          <img src="${escapeHtml(patient.photo)}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #ddd;"/>
        </div>` : ''}
        <div style="flex:1;">
          <h2 style="margin:0 0 8px;font-size:16px;color:#2f7df6;">${escapeHtml(patient.name || '')}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;width:100px;">Especie</td><td style="padding:4px 6px;">${escapeHtml(patient.species || '')}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Raza</td><td style="padding:4px 6px;">${escapeHtml(patient.breed || '')}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Sexo</td><td style="padding:4px 6px;">${escapeHtml(sexo)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Edad</td><td style="padding:4px 6px;">${escapeHtml(edad)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Color</td><td style="padding:4px 6px;">${escapeHtml(patient.color || '')}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Peso</td><td style="padding:4px 6px;">${escapeHtml(patient.weight || '')}${patient.weight ? ' kg' : ''}</td></tr>
            ${patient.microchip ? `<tr><td style="padding:4px 6px;font-weight:600;color:#555;">Microchip</td><td style="padding:4px 6px;">${escapeHtml(patient.microchip)}</td></tr>` : ''}
          </table>
        </div>
        <div style="flex:1;">
          <h3 style="margin:0 0 8px;font-size:13px;color:#2f7df6;">Datos del Propietario</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;width:110px;">Nombre</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerName || '')}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Teléfono</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerPhone || '')}</td></tr>
            ${patient.ownerEmail ? `<tr><td style="padding:4px 6px;font-weight:600;color:#555;">Email</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerEmail)}</td></tr>` : ''}
            ${patient.ownerAddress ? `<tr><td style="padding:4px 6px;font-weight:600;color:#555;">Dirección</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerAddress)}</td></tr>` : ''}
          </table>
        </div>
      </div>

      ${patient.alerts ? `
      <div style="background:#fff0f0;border:1px solid #ffcdd2;border-left:4px solid #d32f2f;padding:8px 12px;margin-bottom:16px;border-radius:4px;">
        <strong style="color:#d32f2f;font-size:11px;">⚠ ALERTAS MÉDICAS</strong>
        <p style="margin:4px 0 0;font-size:11px;color:#333;">${escapeHtml(patient.alerts)}</p>
      </div>` : ''}

      ${patient.notes ? `
      <div style="background:#f5f5f5;padding:8px 12px;margin-bottom:16px;border-radius:4px;">
        <strong style="font-size:11px;color:#555;">Notas:</strong>
        <p style="margin:4px 0 0;font-size:11px;">${escapeHtml(patient.notes)}</p>
      </div>` : ''}

      <h3 style="margin:0 0 8px;font-size:13px;color:#2f7df6;">Historial de Servicios</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#2f7df6;color:#fff;">
            <th style="padding:6px 8px;text-align:left;">Fecha</th>
            <th style="padding:6px 8px;text-align:left;">Servicio</th>
            <th style="padding:6px 8px;text-align:left;">Profesional</th>
            <th style="padding:6px 8px;text-align:left;">Observaciones</th>
          </tr>
        </thead>
        <tbody>${servicesRows}</tbody>
      </table>

      <h3 style="margin:16px 0 8px;font-size:13px;color:#2f7df6;">Vacunas</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#2f7df6;color:#fff;">
            <th style="padding:6px 8px;text-align:left;">Fecha</th>
            <th style="padding:6px 8px;text-align:left;">Vacuna</th>
            <th style="padding:6px 8px;text-align:left;">Lote</th>
            <th style="padding:6px 8px;text-align:left;">Próxima dosis</th>
          </tr>
        </thead>
        <tbody>${vacRows}</tbody>
      </table>

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#999;text-align:center;">
        Documento generado por ${escapeHtml(settings.clinicName || 'VetCare Pro')} — ${getTodayDisplay()}
      </div>
    </div>
  `;

  await _renderPdf(container.innerHTML, `Ficha_${(patient.name||'paciente').replace(/\s+/g, '_')}.pdf`, { jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } });
  return true;
}

// ---------- Receta médica ----------
async function generatePrescriptionPDF(rxId) {
  const rx = await DB.getPrescription(rxId);
  if (!rx) throw new Error('Receta no encontrada');

  const [patient, settings] = await Promise.all([
    DB.getPatient(rx.patientId),
    DB.getClinicSettings()
  ]);

  const container = document.getElementById('pdf-container');
  if (!container) return;

  const showLogo = settings.pdfShowLogo !== false;
  const showVat = settings.pdfShowVat !== false;
  const logoHtml = (settings.clinicLogo && showLogo)
    ? `<img src="${settings.clinicLogo}" style="max-height:50px;max-width:50px;object-fit:contain;"/>`
    : '';

  const meds = Array.isArray(rx.medications) ? rx.medications : [];
  const medRows = meds.length > 0
    ? meds.map((m, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #555;font-size:10px;text-align:center;">${i+1}</td>
        <td style="padding:6px 8px;border:1px solid #555;font-size:11px;font-weight:600;">${escapeHtml(m.name || '')}</td>
        <td style="padding:6px 8px;border:1px solid #555;font-size:10px;">${escapeHtml(m.dose || '')}</td>
        <td style="padding:6px 8px;border:1px solid #555;font-size:10px;">${escapeHtml(m.frequency || '')}</td>
        <td style="padding:6px 8px;border:1px solid #555;font-size:10px;">${escapeHtml(m.duration || '')}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:12px;text-align:center;font-size:11px;color:#888;">Sin medicamentos especificados</td></tr>';

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;padding:20px;color:#1a1a1a;max-width:190mm;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2f7df6;padding-bottom:12px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${logoHtml}
          <div>
            <h1 style="margin:0;font-size:16px;color:#2f7df6;font-weight:700;">${escapeHtml(settings.clinicName || 'VetCare Pro')}</h1>
            <p style="margin:3px 0 0;font-size:9px;color:#555;">
              ${escapeHtml(settings.clinicAddress || '')}<br/>
              ${escapeHtml(settings.clinicPhone || '')}${settings.clinicEmail ? ' | ' + escapeHtml(settings.clinicEmail) : ''}
              ${showVat && settings.clinicTaxId ? '<br/>ID Fiscal: ' + escapeHtml(settings.clinicTaxId) : ''}
            </p>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:#2f7df6;font-weight:700;">
          RECETA MÉDICA<br/>
          <span style="font-size:9px;color:#555;font-weight:400;">N° ${escapeHtml(rx.id)}</span>
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:11px;">
        <div style="flex:1;">
          <strong>Paciente:</strong> ${escapeHtml(patient ? patient.name : '')}<br/>
          <strong>Especie:</strong> ${escapeHtml(patient ? patient.species : '')} | <strong>Raza:</strong> ${escapeHtml(patient ? patient.breed : '')}
        </div>
        <div style="flex:1;text-align:right;">
          <strong>Fecha:</strong> ${formatDateShort(rx.date)}<br/>
          ${rx.veterinarian ? `<strong>Veterinario:</strong> ${escapeHtml(rx.veterinarian)}` : ''}
        </div>
      </div>

      <h3 style="font-size:13px;color:#2f7df6;margin-bottom:8px;">Medicación Prescrita</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#2f7df6;color:#fff;font-size:10px;">
            <th style="padding:6px 8px;border:1px solid #2f7df6;text-align:center;width:30px;">#</th>
            <th style="padding:6px 8px;border:1px solid #2f7df6;text-align:left;">Medicamento</th>
            <th style="padding:6px 8px;border:1px solid #2f7df6;text-align:left;">Dosis</th>
            <th style="padding:6px 8px;border:1px solid #2f7df6;text-align:left;">Frecuencia</th>
            <th style="padding:6px 8px;border:1px solid #2f7df6;text-align:left;">Duración</th>
          </tr>
        </thead>
        <tbody>${medRows}</tbody>
      </table>

      ${rx.indications ? `
      <div style="background:#fff8e1;border:1px solid #ffe082;border-left:4px solid #f57c00;padding:8px 12px;margin-bottom:16px;border-radius:4px;">
        <strong style="font-size:10px;color:#e65100;">Indicaciones:</strong>
        <p style="margin:4px 0 0;font-size:10px;color:#333;">${escapeHtml(rx.indications)}</p>
      </div>` : ''}

      ${rx.notes ? `
      <div style="margin-bottom:16px;">
        <strong style="font-size:10px;color:#555;">Observaciones:</strong>
        <p style="margin:4px 0 0;font-size:10px;">${escapeHtml(rx.notes)}</p>
      </div>` : ''}

      <div style="margin-top:32px;padding-top:16px;border-top:2px dashed #ccc;">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#888;">
          <div>
            <p style="margin:0 0 4px;"><strong>Firma del Veterinario</strong></p>
            <div style="width:150px;height:1px;background:#ccc;margin-top:30px;"></div>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 4px;"><strong>Firma del Propietario</strong></p>
            <div style="width:150px;height:1px;background:#ccc;margin-top:30px;"></div>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:8px;color:#999;text-align:center;">
        Documento generado por ${escapeHtml(settings.clinicName || 'VetCare Pro')} — ${getTodayDisplay()}<br/>
        Este documento tiene validez únicamente con firma original del profesional.
      </div>
    </div>
  `;

  await _renderPdf(html, `Receta_${(patient && patient.name ? patient.name.replace(/\s+/g, '_') : 'medica')}.pdf`, { jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } });
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
