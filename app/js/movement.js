// ============================================================
// VetCare Pro 2.0 — Módulo Movimiento
// Comparativo de movimiento A vs B, semanal y mensual, con
// gráficas de pacientes y ventas.
// ============================================================

const Movement = {
  // Estado del comparativo.
  mode: 'week',          // 'week' | 'month' | 'custom'
  rangeA: null,
  rangeB: null,
  _charts: {},
  _data: null,

  // Paleta para Chart.js coherente con el theme glass.
  palette: {
    a: '#7c8cff',       // periodo A (violeta-azul)
    b: '#2dd4bf',       // periodo B (teal)
    sales: '#f472b6',   // ventas (rosa)
    services: '#60a5fa',
    patients: '#a78bfa',
    grid: 'rgba(255,255,255,0.10)',
    tick: 'rgba(255,255,255,0.65)'
  },

  init() {
    // Establece los rangos por defecto: semana actual vs anterior.
    this.setMode('week');
    this.bindControls();
  },

  bindControls() {
    document.querySelectorAll('[data-movement-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-movement-mode');
        this.setMode(mode);
        // Refrescar estado visual del segmented control.
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

  // Calcula los rangos A y B según el modo seleccionado.
  setMode(mode) {
    this.mode = mode;
    if (mode === 'week') {
      this.rangeA = getWeekRange();       // A = semana actual
      this.rangeB = getPrevWeekRange();   // B = semana anterior
    } else if (mode === 'month') {
      this.rangeA = getMonthRange();      // A = mes actual
      this.rangeB = getPrevMonthRange();  // B = mes anterior
    }
    // 'custom' deja los rangos como estén (los setea el usuario).
    if (mode !== 'custom') this.refresh();
  },

  // Permite fijar rangos personalizados desde los date pickers.
  setCustomRange(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) return;
    this.mode = 'custom';
    this.rangeA = { start: startA, end: endA };
    this.rangeB = { start: startB, end: endB };
    this.refresh();
  },

  async refresh() {
    const cmp = await DB.getMovementComparison(this.rangeA, this.rangeB);
    this._data = cmp;
    this.renderControls();
    this.renderKPIs(cmp);
    this.renderCharts(cmp);
    this.renderTopLists(cmp);
  },

  // Muestra en los date pickers los rangos activos.
  renderControls() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('mv-start-a', this.rangeA.start);
    set('mv-end-a', this.rangeA.end);
    set('mv-start-b', this.rangeB.start);
    set('mv-end-b', this.rangeB.end);
    const label = document.getElementById('mv-range-label');
    if (label) {
      label.textContent = `${formatDateShort(this.rangeA.start)} → ${formatDateShort(this.rangeA.end)}` +
        `  vs  ${formatDateShort(this.rangeB.start)} → ${formatDateShort(this.rangeB.end)}`;
    }
  },

  // Un KPI con valor de A, valor de B y delta porcentual.
  _kpi(label, icon, valA, valB, formatter) {
    const fmt = formatter || (v => v);
    const { pct, dir } = pctChange(valB, valA);  // B es la base, A el actual
    const arrow = dir === 'up' ? 'trending_up' : dir === 'down' ? 'trending_down' : 'flat';
    return `
      <div class="card kpi">
        <div class="kpi-label"><span class="material-symbols-outlined">${icon}</span>${label}</div>
        <div class="kpi-value">${fmt(valA)}</div>
        <div class="muted" style="font-size:0.76rem;margin-top:6px">
          Anterior: <span class="mono">${fmt(valB)}</span>
        </div>
        <div class="kpi-delta ${dir}">
          <span class="material-symbols-outlined" style="font-size:15px">${arrow}</span>
          ${dir === 'flat' ? 'sin cambio' : (pct > 0 ? '+' : '') + pct + '%'}
        </div>
      </div>`;
  },

  renderKPIs(cmp) {
    const host = document.getElementById('mv-kpis');
    if (!host) return;
    const pA = cmp.a.patients, pB = cmp.b.patients;
    const sA = cmp.a.sales, sB = cmp.b.sales;

    host.innerHTML =
      // --- Pacientes ---
      this._kpi('Pacientes atendidos', 'pets', pA.uniqueTreated, pB.uniqueTreated, v => v) +
      this._kpi('Servicios realizados', 'medical_services', pA.totalTreated, pB.totalTreated, v => v) +
      this._kpi('Pacientes nuevos', 'person_add', pA.newPatients, pB.newPatients, v => v) +
      this._kpi('Vacunas aplicadas', 'vaccines', pA.vaccinations, pB.vaccinations, v => v) +
      // --- Ventas ---
      this._kpi('Facturación total', 'payments', sA.total, sB.total, v => formatMoneyCompact(v)) +
      this._kpi('Ventas registradas', 'receipt_long', sA.count, sB.count, v => v) +
      this._kpi('Ticket promedio', 'point_of_sale', Math.round(sA.ticket), Math.round(sB.ticket), v => formatMoneyCompact(v)) +
      this._kpi('Turnos generados', 'event', pA.appointments, pB.appointments, v => v);
  },

  // Determina si el fondo actual es claro (skin plano en modo claro) para
  // elegir texto de eje oscuro; si no, texto claro (glass o modo oscuro).
  _isLightBg() {
    const skin = document.documentElement.getAttribute('data-skin');
    const theme = document.documentElement.getAttribute('data-theme');
    const flat = skin === 'classic' || skin === 'soft';
    return flat && theme !== 'dark';
  },

  // Colores de eje/rejilla según el tema activo.
  _axisColors() {
    return this._isLightBg()
      ? { tick: '#64748b', grid: 'rgba(15,23,42,0.08)' }
      : { tick: this.palette.tick, grid: this.palette.grid };
  },

  // Config común de Chart.js para el look glass.
  _baseOpts() {
    const axis = this._axisColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: axis.tick, font: { family: 'Plus Jakarta Sans', weight: '600' }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(20,24,50,0.92)',
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.9)',
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: {
        x: { ticks: { color: axis.tick }, grid: { color: axis.grid } },
        y: { ticks: { color: axis.tick }, grid: { color: axis.grid }, beginAtZero: true }
      }
    };
  },

  _destroyChart(key) {
    if (this._charts[key]) {
      this._charts[key].destroy();
      delete this._charts[key];
    }
  },

  renderCharts(cmp) {
    this._renderBarComparison(cmp);
    this._renderSalesTrend(cmp);
    this._renderPatientsTrend(cmp);
  },

  // 1) Barras A vs B con los KPIs principales normalizados.
  _renderBarComparison(cmp) {
    const canvas = document.getElementById('chart-bar-compare');
    if (!canvas) return;
    this._destroyChart('bar');

    const cats = ['Atendidos', 'Servicios', 'Nuevos', 'Vacunas', 'Ventas', 'Turnos'];
    const dataA = [
      cmp.a.patients.uniqueTreated, cmp.a.patients.totalTreated, cmp.a.patients.newPatients,
      cmp.a.patients.vaccinations, cmp.a.sales.count, cmp.a.patients.appointments
    ];
    const dataB = [
      cmp.b.patients.uniqueTreated, cmp.b.patients.totalTreated, cmp.b.patients.newPatients,
      cmp.b.patients.vaccinations, cmp.b.sales.count, cmp.b.patients.appointments
    ];

    const opts = this._baseOpts();
    opts.plugins.tooltip.callbacks = { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` };

    this._charts.bar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: cats,
        datasets: [
          { label: 'Periodo A', data: dataA, backgroundColor: this.palette.a + 'cc', borderRadius: 8, borderSkipped: false },
          { label: 'Periodo B', data: dataB, backgroundColor: this.palette.b + 'cc', borderRadius: 8, borderSkipped: false }
        ]
      },
      options: opts
    });
  },

  // 2) Línea: tendencia de ventas (Gs.) por día/semana, A superpuesto a B.
  _renderSalesTrend(cmp) {
    const canvas = document.getElementById('chart-sales-trend');
    if (!canvas) return;
    this._destroyChart('sales');

    // Usa la serie del periodo A como eje X; alinea B por índice.
    const seriesA = buildPeriodSeries(cmp.a.range);
    const labels = seriesA.labels;
    const salesA = cmp.a.series.sales;
    // Para B recalcula sus propias etiquetas y re-muestrea al mismo largo si coincide.
    const salesB = this._resample(cmp.b.series.sales, labels.length);

    const opts = this._baseOpts();
    opts.scales.y.ticks.callback = v => formatMoneyCompact(v);
    opts.plugins.tooltip.callbacks = { label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}` };
    opts.interaction = { mode: 'index', intersect: false };

    this._charts.sales = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas A', data: salesA, borderColor: this.palette.sales,
            backgroundColor: this._grad(canvas, this.palette.sales), fill: true,
            tension: 0.38, pointRadius: 3, pointBackgroundColor: this.palette.sales, borderWidth: 2.5
          },
          {
            label: 'Ventas B', data: salesB, borderColor: this.palette.b,
            backgroundColor: 'transparent', fill: false, borderDash: [6, 5],
            tension: 0.38, pointRadius: 0, borderWidth: 2
          }
        ]
      },
      options: opts
    });
  },

  // 3) Línea: tendencia de pacientes atendidos por día/semana.
  _renderPatientsTrend(cmp) {
    const canvas = document.getElementById('chart-patients-trend');
    if (!canvas) return;
    this._destroyChart('patients');

    const seriesA = buildPeriodSeries(cmp.a.range);
    const labels = seriesA.labels;
    const patA = cmp.a.series.services;       // servicios como proxy de atención
    const patB = this._resample(cmp.b.series.services, labels.length);

    const opts = this._baseOpts();
    opts.interaction = { mode: 'index', intersect: false };

    this._charts.patients = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Atenciones A', data: patA, borderColor: this.palette.patients,
            backgroundColor: this._grad(canvas, this.palette.patients), fill: true,
            tension: 0.38, pointRadius: 3, pointBackgroundColor: this.palette.patients, borderWidth: 2.5
          },
          {
            label: 'Atenciones B', data: patB, borderColor: this.palette.services,
            backgroundColor: 'transparent', fill: false, borderDash: [6, 5],
            tension: 0.38, pointRadius: 0, borderWidth: 2
          }
        ]
      },
      options: opts
    });
  },

  // Ajusta un array de datos al largo de `n` (rellena con 0 o trunca) para
  // poder superponer A y B aunque tengan distinta cantidad de buckets.
  _resample(arr, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[i] !== undefined ? arr[i] : 0);
    return out;
  },

  // Gradiente de relleno para las líneas.
  _grad(canvas, color) {
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 260);
    g.addColorStop(0, color + '55');
    g.addColorStop(1, color + '05');
    return g;
  },

  // Top lists: servicios y productos más vendidos del periodo A.
  renderTopLists(cmp) {
    const svcHost = document.getElementById('mv-top-services');
    const prodHost = document.getElementById('mv-top-products');

    if (svcHost) {
      const top = cmp.a.sales.topServices;
      svcHost.innerHTML = top.length
        ? top.map((s, i) => `
            <div class="row between" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
              <div class="row">
                <span class="badge badge-info">${i + 1}</span>
                <span>${escapeHtml(s.name)}</span>
              </div>
              <span class="mono muted">${s.count}x</span>
            </div>`).join('')
        : `<div class="empty-state"><span class="material-symbols-outlined">bar_chart</span><div>Sin servicios en el periodo A</div></div>`;
    }

    if (prodHost) {
      const top = cmp.a.sales.topProducts;
      prodHost.innerHTML = top.length
        ? top.map((p, i) => `
            <div class="row between" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
              <div class="row">
                <span class="badge badge-success">${i + 1}</span>
                <span>${escapeHtml(p.name)}</span>
              </div>
              <span class="mono muted">${p.qty} uds</span>
            </div>`).join('')
        : `<div class="empty-state"><span class="material-symbols-outlined">inventory_2</span><div>Sin productos vendidos en el periodo A</div></div>`;
    }
  },

  // Desglose de ingresos: servicios vs productos (barra apilada sencilla).
  async exportPDF() {
    if (!this._data) return;
    if (typeof generateMovementPDF === 'function') {
      const labelA = `${this.rangeA.start} → ${this.rangeA.end}`;
      const labelB = `${this.rangeB.start} → ${this.rangeB.end}`;
      await generateMovementPDF(labelA, labelB, this._data);
    } else {
      toast('El PDF del comparativo aún no está disponible.', 'info');
    }
  }
};
