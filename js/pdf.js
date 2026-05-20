async function generatePatientPDF(patientId) {
  const patient = await DB.getPatient(patientId);
  if (!patient) throw new Error('Paciente no encontrado');

  const settings = await DB.getClinicSettings();
  const services = await DB.getServicesByPatient(patientId);
  services.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const container = document.getElementById('pdf-container');
  container.innerHTML = buildPDFHtml(patient, settings, services);
  container.style.display = 'block';

  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     `Ficha_${patient.name.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

function buildPDFHtml(patient, settings, services) {
  const logoHtml = (settings.clinicLogo && settings.pdfShowLogo)
    ? `<img src="${settings.clinicLogo}" alt="Logo" style="max-height:60px;max-width:60px;object-fit:contain;"/>`
    : '';

  const servicesRows = services.length > 0
    ? services.map(s => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${formatDateShort(s.date)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.serviceType)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.performedBy || '')}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:10px;">${escapeHtml(s.notes || '')}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;text-align:center;font-size:11px;color:#888;">Sin servicios registrados</td></tr>';

  const sexo = patient.sex + (patient.neutered ? ' (Esterilizado/Castrado)' : '');
  const edad = patient.ageYears + ' años' + (patient.ageMonths > 0 ? ' y ' + patient.ageMonths + ' meses' : '');

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;padding:15px;color:#1a1a1a;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00366b;padding-bottom:12px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${logoHtml}
          <div>
            <h1 style="margin:0;font-size:18px;color:#00366b;font-weight:700;">${escapeHtml(settings.clinicName)}</h1>
            <p style="margin:3px 0 0;font-size:10px;color:#555;line-height:1.4;">
              ${escapeHtml(settings.clinicAddress)}<br/>
              ${escapeHtml(settings.clinicPhone)}${settings.clinicEmail ? ' | ' + escapeHtml(settings.clinicEmail) : ''}
              ${settings.pdfShowVat && settings.clinicTaxId ? '<br/>VAT: ' + escapeHtml(settings.clinicTaxId) : ''}
            </p>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:#555;">
          <strong style="color:#00366b;">FICHA DE PACIENTE</strong><br/>
          ID: ${escapeHtml(patient.id)}<br/>
          Emitido: ${getTodayDisplay()}
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:16px;">
        ${patient.photo ? `<div style="flex-shrink:0;">
          <img src="${escapeHtml(patient.photo)}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #ddd;"/>
        </div>` : ''}
        <div style="flex:1;">
          <h2 style="margin:0 0 8px;font-size:16px;color:#00366b;">${escapeHtml(patient.name)}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;width:100px;">Especie</td><td style="padding:4px 6px;">${escapeHtml(patient.species)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Raza</td><td style="padding:4px 6px;">${escapeHtml(patient.breed)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Sexo</td><td style="padding:4px 6px;">${escapeHtml(sexo)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Edad</td><td style="padding:4px 6px;">${escapeHtml(edad)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Color</td><td style="padding:4px 6px;">${escapeHtml(patient.color || '')}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Peso</td><td style="padding:4px 6px;">${escapeHtml(patient.weight || '')} kg</td></tr>
            ${patient.microchip ? `<tr><td style="padding:4px 6px;font-weight:600;color:#555;">Microchip</td><td style="padding:4px 6px;">${escapeHtml(patient.microchip)}</td></tr>` : ''}
          </table>
        </div>
        <div style="flex:1;">
          <h3 style="margin:0 0 8px;font-size:13px;color:#00366b;">Datos del Propietario</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;width:110px;">Nombre</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerName)}</td></tr>
            <tr><td style="padding:4px 6px;font-weight:600;color:#555;">Teléfono</td><td style="padding:4px 6px;">${escapeHtml(patient.ownerPhone)}</td></tr>
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

      <h3 style="margin:0 0 8px;font-size:13px;color:#00366b;">Historial de Servicios</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#00366b;color:#fff;">
            <th style="padding:6px 8px;text-align:left;">Fecha</th>
            <th style="padding:6px 8px;text-align:left;">Servicio</th>
            <th style="padding:6px 8px;text-align:left;">Profesional</th>
            <th style="padding:6px 8px;text-align:left;">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${servicesRows}
        </tbody>
      </table>

      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#999;text-align:center;">
        Documento generado por VetCare Pro — ${getTodayDisplay()}
      </div>
    </div>
  `;
}
