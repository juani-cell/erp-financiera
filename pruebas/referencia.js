// Andamiaje mínimo para evaluar el prototipo fuera del navegador.
// No reimplementa NADA de la lógica: solo provee lo que el código toca al definirse.
class DCLogicStub {
  constructor(p) { this.props = p || {}; }
  setState(o) { this.state = Object.assign({}, this.state, typeof o === 'function' ? o(this.state) : o); }
  forceUpdate() {}
}
globalThis.DCLogic = DCLogicStub;
globalThis.React = { Component: DCLogicStub, createElement: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis;
globalThis.document = { addEventListener(){}, removeEventListener(){}, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style:{}, setAttribute(){}, appendChild(){} }), head:{appendChild(){}}, body:{appendChild(){}} };
globalThis.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){}, removeEventListener(){}, removeListener(){} });
globalThis.navigator = { language: 'es-AR' };
globalThis.fetch = () => Promise.reject(new Error('sin red en el arnés'));
const KEY = 'erpfinanciera.fase1.v2';
const SESSION_KEY = 'erpfinanciera.sesion.v1';
const USUARIOS = [
  { usuario: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'admin', rolLabel: 'Administrador' },
  { usuario: 'operador', password: 'operador123', nombre: 'Operador', rol: 'operador', rolLabel: 'Operador' }
];
const NAV_OCULTO_OPERADOR = ['tablero', 'cierre', 'patrimonio', 'audit', 'usuarios', 'importador'];
// tabla de roles, no un enum: cada rol declara qué pantallas oculta y si tiene Gastos limitado a alta.
// si se agrega un tercer rol, se agrega una fila acá y el resto del sistema (nav, formulario, matriz) se actualiza solo.
const ROLES = [
  { id: 'admin', nombre: 'Administrador', pantallasOcultas: [], gastosLimitado: false,
    desc: 'Acceso completo a todas las pantallas y acciones, incluida esta.' },
  { id: 'operador', nombre: 'Operador', pantallasOcultas: NAV_OCULTO_OPERADOR, gastosLimitado: true,
    desc: 'Uso diario: cambio, cripto, cables, tesorería, clientes y cuentas corrientes. En Gastos solo puede dar de alta.' }
];
const PASS_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const MON_IMPORT = ['ARS', 'USD', 'USD cara chica', 'EUR', 'BRL', 'LBR', 'USDT'];
const NUEVO_CLI = '+ Nuevo cliente…';
const SIN_COMISIONISTA = '— Sin operador —';
const NUEVO_COM = '+ Nuevo operador…';
const TIPOS_COMISIONISTA = ['Mayorista', 'Comisionista'];
const NUEVO_MAY = '+ Nuevo mayorista…';
const LIQ = [{ v: 'efectivo', l: 'Efectivo' }, { v: 'transferencia', l: 'Transferencia' }, { v: 'depósito', l: 'Depósito' }, { v: 'tarjeta de crédito', l: 'Tarjeta de Crédito' }, { v: 'cuenta corriente', l: 'Cuenta corriente' }];
const REQ = {
  op: ['cliente', 'cantidad', 'tc'], cripto: ['cliente', 'cantidad', 'tc'],
  mayorista: ['comisionista', 'cantidad', 'tc'],
  cable: ['cliente', 'comisionista', 'monto'], ctacte: ['cliente', 'monto'],
  gasto: ['motivo', 'monto'], cotiz: [], aporte: ['socio', 'monto'], cliente: ['nombre'], comisionista: ['nombre'],
  usuario: ['nombre', 'usuario', 'rol']
};
const NUM_REQ = ['cantidad', 'tc', 'monto'];
// pares de mercado que carga la financiera
// motivos de gasto predefinidos
const GASTO_MOTIVOS = ['Alquiler oficina', 'Sueldos', 'Flete y traslados',
  'Servicios e internet', 'Impuestos y tasas', 'Seguridad', 'Mantenimiento', 'Insumos', 'Otros'];
const GASTO_COLS = [
  { k: 'fecha', label: 'Fecha del gasto' },
  { k: 'motivo', label: 'Motivo' },
  { k: 'socio', label: 'Pagado por' },
  { k: 'monto', label: 'Monto', right: true },
  { k: 'obs', label: 'Observaciones' }
];
const PARES = [
  { id: 'USD', par: 'USD/ARS', kc: 'dc', kv: 'dv', dec: 2, pre: 'ARS ' },
  { id: 'EUR', par: 'EUR/USD', kc: 'ec', kv: 'ev', dec: 4, pre: '' },
  { id: 'BRL', par: 'USD/BRL', kc: 'rc', kv: 'rv', dec: 4, pre: '' },
  { id: 'LBR', par: 'GBP/USD', kc: 'lc', kv: 'lv', dec: 4, pre: '' }
];
const ENT_LABEL = { ops: 'operación de cambio', cripto: 'operación cripto', cables: 'cable', mayoristaOps: 'operación con mayorista',
  ctacte: 'movimiento de cta. cte.', gastos: 'gasto', cotiz: 'cotización', aportes: 'aporte', clientes: 'cliente', comisionistas: 'comisionista', usuarios: 'usuario' };
const COLL_DE = { op: 'ops', cripto: 'cripto', cable: 'cables', mayorista: 'mayoristaOps', ctacte: 'ctacte', gasto: 'gastos', cotiz: 'cotiz', aporte: 'aportes', cliente: 'clientes', comisionista: 'comisionistas', usuario: 'usuarios' };
const PREFIJO_OP = { ops: 'CD', cripto: 'CR', cables: 'CB', mayoristaOps: 'MY' };
const stamp = (iso) => { const t = new Date(iso); const p = (n) => String(n).padStart(2, '0');
  return p(t.getDate()) + '/' + p(t.getMonth() + 1) + '/' + t.getFullYear() + ' ' + p(t.getHours()) + ':' + p(t.getMinutes()); };
const ENTREGADO = 'Completado';
const estadoCableLabel = (estado) => estado === 'ejecutado' ? 'Completado' : cap(estado || 'pendiente');
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
// Google Maps — Juani: pegar acá la API key (Places API habilitada, facturación activa, key restringida por
// dominio/HTTP referrer). Vacía = las direcciones funcionan como texto libre, sin validar (estado actual).
// Con la key cargada, el autocompletado de Google se activa solo en la ficha de clientes/mayoristas y las
// direcciones nuevas deben elegirse de una sugerencia de Google antes de poder guardarse.
const GOOGLE_MAPS_API_KEY = '';
let _gmapsPromise = null;
function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.resolve(false);
  if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve(true);
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise((resolve) => {
    window.__onGoogleMapsLoaded = () => resolve(true);
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GOOGLE_MAPS_API_KEY) + '&libraries=places&callback=__onGoogleMapsLoaded';
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return _gmapsPromise;
}
const NUEVO_DOM_FIELDS = ['nuevoDomicilio', 'nuevoDomicilioPago', 'nuevoDomicilioDivisa', 'nuevoDomicilioMayorista', 'nuevoDomicilioCliente'];
const badgeStyle = (cancelado, activo) => 'font-size:12px;white-space:nowrap;' + (cancelado ? 'background:var(--color-neutral-300);color:var(--color-neutral-700);border-color:var(--color-neutral-400)' : (activo ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent'));
const OP_LABELS = {
  domicilio: 'Domicilio del cliente', domicilioPago: 'Domicilio para el ARS', domicilioDivisa: 'Domicilio para la divisa',
  nuevoDomicilio: 'Nueva dirección', nuevoDomicilioAlias: 'Alias del domicilio',
  nuevoDomicilioPago: 'Nueva dirección (ARS)', nuevoDomicilioPagoAlias: 'Alias del domicilio (ARS)',
  nuevoDomicilioDivisa: 'Nueva dirección (divisa)', nuevoDomicilioDivisaAlias: 'Alias del domicilio (divisa)',
  partesPago: 'Partes — ARS', partesDivisa: 'Partes — Divisa',
  monedaPago: 'Moneda de la primera parte', monedaPagoOtra: '¿Qué moneda pagamos/cobramos?'
};

// migración: 'calidad' dejó de existir; cara chica es una moneda propia
const migrar = (d) => {
  d.ctacte = d.ctacte || [];
  d.cripto = d.cripto || [];
  d.cables = d.cables || [];
  d.audit = d.audit || [];
  d.comisionistas = d.comisionistas || [];
  d.operador = d.operador || 'Mesa';
  // la tabla de usuarios recién se crea en esta versión: se siembra con los dos usuarios que ya existían como constante,
  // así el que ya tenía la sesión iniciada sigue entrando igual con el mismo usuario y contraseña.
  if (!d.usuarios || !d.usuarios.length) {
    d.usuarios = USUARIOS.map((u, i) => ({ id: uid(), numero: i + 1, nombre: u.nombre, usuario: u.usuario, password: u.password,
      rol: u.rol, estado: 'activo', ultimoAcceso: null, debeCambiarPassword: false }));
  }
  ['ops', 'cripto', 'cables', 'mayoristaOps'].forEach(coll => { (d[coll] || []).forEach((o, i) => { if (!o.numero) o.numero = i + 1; }); });
  // el margen por operación ya no existe: se calculaba con la unidad equivocada y no aportaba nada que el balance no diera ya
  (d.ops || []).forEach(o => { delete o.margen; delete o.margenBruto; });
  (d.cripto || []).forEach(o => { delete o.margen; delete o.margenBruto; });
  d.clientes.forEach((c, i) => { if (!c.numero) c.numero = i + 1; });
  (d.comisionistas || []).forEach((c, i) => { if (!c.numero) c.numero = i + 1; });
  if ((d.clientes || []).some(c => c.tipo === 'contraparte')) {
    const viejas = d.clientes.filter(c => c.tipo === 'contraparte');
    d.comisionistas = d.comisionistas || [];
    const mapa = {};
    viejas.forEach(c => {
      let cm = d.comisionistas.find(x => (x.nombre || '').toLowerCase() === (c.nombre || '').toLowerCase());
      if (!cm) { cm = { id: uid(), numero: d.comisionistas.length + 1, nombre: c.nombre, tipo: 'Mayorista', comisionPct: null }; d.comisionistas.push(cm); }
      mapa[c.id] = cm.id;
    });
    (d.cables || []).forEach(cb => { if (cb.contraparteId && mapa[cb.contraparteId]) { cb.comisionistaId = mapa[cb.contraparteId]; delete cb.contraparteId; } });
    d.clientes = d.clientes.filter(c => c.tipo !== 'contraparte');
  }
  (d.cables || []).forEach(cb => { if (!cb.tipo) cb.tipo = 'Bajada'; if (cb.contraparteId !== undefined) delete cb.contraparteId; });
  (d.ctacte || []).forEach(m => { if (m.moneda === 'pesos') m.moneda = 'ARS'; });
  (d.aportes || []).forEach(a => { if (a.moneda === 'pesos') a.moneda = 'ARS'; });
  (d.ops || []).forEach(o => { if (o.ok === 'OK' || !o.ok) o.ok = o.ok ? ENTREGADO : 'pendiente'; else if (o.ok === 'Entregado/Retirado') o.ok = ENTREGADO; });
  // las patas pasaron a ser efectivo / transferencia / cuenta corriente, con el lugar aparte
  (d.ops || []).forEach(o => {
    if (o.formaRetiro === 'domicilio' || o.formaRetiro === 'retiro') { o.lugar = o.formaRetiro; o.formaRetiro = 'efectivo'; }
    if (!o.lugar && (o.formaPago === 'efectivo' || o.formaRetiro === 'efectivo')) o.lugar = 'retiro';
    if (o.lugar === 'domicilio' && !o.entrega) {
      const c = (d.clientes || []).find(x => x.id === o.clienteId);
      const dir = (((c && c.direcciones) || []).find(x => !/retira/i.test(x.calle)) || {}).calle;
      if (dir) o.entrega = dir; else o.lugar = 'retiro';
    }
  });
  // el lugar en efectivo pasó a ser por pata (pesos / divisa), antes era uno solo compartido
  (d.ops || []).forEach(o => {
    if (o.lugarPago === undefined) {
      o.lugarPago = o.formaPago === 'efectivo' ? (o.lugar || 'retiro') : '';
      o.entregaPago = o.lugarPago === 'domicilio' ? (o.entrega || 'domicilio') : (o.lugarPago || '—');
      o.lugarDivisa = o.formaRetiro === 'efectivo' ? (o.lugar || 'retiro') : '';
      o.entregaDivisa = o.lugarDivisa === 'domicilio' ? (o.entrega || 'domicilio') : (o.lugarDivisa || '—');
      delete o.lugar; delete o.entrega;
    }
  });
  // las patas de cambio dejaron de girar según tipo compra/venta: la 1ra pata (antes "pesos") siempre es
  // la que vendemos/entregamos, la 2da (antes "divisa") siempre la que compramos/recibimos
  // reparar datos ya migrados con una versión vieja y buggy de este mismo paso: el swap de venta
  // intercambiaba monedaPago/moneda tal cual, y un monedaPago sin cargar (undefined) quedaba pisando
  // moneda en vez de resolverse a ARS — eso rompía el tipo de cambio del día (revalúa ARS como si fueran USD)
  (d.ops || []).forEach(o => {
    if (o._patasFijas && o.moneda === undefined) {
      o.moneda = 'ARS';
      const monP = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      o.tipo = monP === 'ARS' ? 'compra' : 'venta';
    }
  });
  (d.ops || []).forEach(o => {
    if (o._patasFijas) return;
    // resolver a valores concretos antes de invertir: si no, un monedaPago sin cargar (default implícito ARS)
    // se intercambiaba tal cual (undefined) y terminaba defaulteando mal del otro lado (a USD)
    o.monedaPago = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
    o.moneda = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
    if (o.tipo === 'venta') {
      const swap = (a, b) => { const t = o[a]; o[a] = o[b]; o[b] = t; };
      swap('monedaPago', 'moneda'); swap('monedaPagoOtra', 'monedaOtra');
      swap('formaPago', 'formaRetiro'); swap('lugarPago', 'lugarDivisa');
      swap('domicilioPago', 'domicilioDivisa'); swap('nuevoDomicilioPago', 'nuevoDomicilioDivisa');
      swap('nuevoDomicilioPagoAlias', 'nuevoDomicilioDivisaAlias');
      swap('partesPago', 'partesDivisa'); swap('entregaPago', 'entregaDivisa');
      const q = Number(o.cantidad) || 0, tcViejo = Number(o.tc) || 0;
      o.cantidad = q * tcViejo; o.tc = tcViejo ? 1 / tcViejo : 0;
    }
    const monP = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
    const monD = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
    o.tipo = monP === 'ARS' ? 'compra' : (monD === 'ARS' ? 'venta' : 'compra');
    o._patasFijas = true;
  });
  (d.cripto || []).forEach(o => {
    if (o._alineado) return;
    const contravalor = (o.contra === 'USD billete' || o.contra === 'USD') ? 'USD' : 'ARS';
    const tipo = o.tipo === 'venta' ? 'venta' : 'compra';
    const tcOld = Number(o.tc) || 0;
    const cantidadUsdt = Number(o.cantidad) || 0;
    o.monedaPago = tipo === 'venta' ? 'USDT' : contravalor; o.monedaPagoOtra = '';
    o.moneda = tipo === 'venta' ? contravalor : 'USDT'; o.monedaOtra = '';
    o.tc = tipo === 'venta' ? (tcOld ? 1 / tcOld : 0) : tcOld;
    o.cantidad = tipo === 'venta' ? cantidadUsdt * tcOld : cantidadUsdt;
    o.formaPago = o.formaPago || 'efectivo';
    o.lugarPago = o.formaPago === 'efectivo' ? (o.lugar === 'domicilio' ? 'domicilio' : 'retiro') : '';
    o.entregaPago = o.lugarPago === 'domicilio' ? (o.entrega || '') : (o.lugarPago || '—');
    o.formaRetiro = o.formaEntrega === 'cuenta corriente' ? 'cuenta corriente' : 'transferencia';
    o.lugarDivisa = ''; o.entregaDivisa = '—';
    o.partesPago = null; o.partesDivisa = null;
    o.tipo = tipo;
    delete o.contra; delete o.lugar; delete o.domicilio; delete o.entrega; delete o.formaEntrega;
    o._alineado = true;
  });
  (d.cripto || []).forEach(o => { if (o.ok === 'OK' || !o.ok) o.ok = o.ok ? ENTREGADO : 'pendiente'; else if (o.ok === 'Entregado/Retirado') o.ok = ENTREGADO; });
  (d.clientes || []).forEach(c => {
    c.tipo = c.tipo || 'cliente';
    delete c.alias;
    (c.direcciones || []).forEach((dir, i) => {
      if (!dir.alias) dir.alias = /retira/i.test(dir.calle || '') ? 'Retira en mesa' : (dir.tipo || (i === 0 ? 'Principal' : 'Domicilio ' + (i + 1)));
      delete dir.tipo;
    });
  });
  if (d.params) {
    // el USDT pasó de precio fijo en pesos a un % sobre el dólar de la financiera (1:1 contra el dólar)
    if (d.params.margenUsdt === undefined) {
      const j = Number(d.params.baseVenta) || 1495;
      const fijo = Number(d.params.usdtVenta);
      d.params.margenUsdt = fijo && j ? Math.round(Math.abs(fijo / j - 1) * 1000) / 10 : 1.5;
    }
    delete d.params.usdtCompra; delete d.params.usdtVenta;
    // el real se cotiza USD/BRL (reales por dólar)
    const normBrl = (p) => { ['crossBrlC', 'crossBrlV'].forEach(k => { const v = Number(p[k]); if (v && v < 1) p[k] = Math.round((1 / v) * 10000) / 10000; }); };
    normBrl(d.params);
    Object.keys(d.cierres || {}).forEach(k => {
      const cp = d.cierres[k] && d.cierres[k].params;
      if (cp) { if (cp.margenUsdt === undefined) cp.margenUsdt = d.params.margenUsdt; delete cp.usdtCompra; delete cp.usdtVenta; normBrl(cp); }
    });
    // el euro de mercado se cargaba en pesos: ahora es el cruce EUR/USD. El real y la libra se suman como cruce
    (d.cotiz || []).forEach(q => {
      if (Number(q.ec) > 20 && Number(q.dc)) q.ec = Math.round((Number(q.ec) / Number(q.dc)) * 10000) / 10000;
      if (Number(q.ev) > 20 && Number(q.dv)) q.ev = Math.round((Number(q.ev) / Number(q.dv)) * 10000) / 10000;
      if (Number(q.rc) && Number(q.rc) < 1) q.rc = Math.round((1 / Number(q.rc)) * 10000) / 10000;
      if (Number(q.rv) && Number(q.rv) < 1) q.rv = Math.round((1 / Number(q.rv)) * 10000) / 10000;
      if (q.rc === undefined) q.rc = d.params.crossBrlC;
      if (q.rv === undefined) q.rv = d.params.crossBrlV;
      if (q.lc === undefined) q.lc = d.params.crossGbpC;
      if (q.lv === undefined) q.lv = d.params.crossGbpV;
    });
  }
  if (d.params) {
    delete d.params.margenSucios;
    // el cruce pasó a tener punta compradora y vendedora
    [['crossEur', 'crossEurC', 'crossEurV'], ['crossBrl', 'crossBrlC', 'crossBrlV'], ['crossGbp', 'crossGbpC', 'crossGbpV']].forEach(x => {
      const [viejo, c, v] = x;
      if (d.params[viejo] !== undefined) {
        if (d.params[c] === undefined) d.params[c] = d.params[viejo];
        if (d.params[v] === undefined) d.params[v] = d.params[viejo];
        delete d.params[viejo];
      }
    });
    Object.keys(d.cierres || {}).forEach(k => {
      const cp = d.cierres[k] && d.cierres[k].params;
      if (cp) [['crossEur', 'crossEurC', 'crossEurV'], ['crossBrl', 'crossBrlC', 'crossBrlV'], ['crossGbp', 'crossGbpC', 'crossGbpV']].forEach(x => {
        const [viejo, c, v] = x;
        if (cp[viejo] !== undefined) { if (cp[c] === undefined) cp[c] = cp[viejo]; if (cp[v] === undefined) cp[v] = cp[viejo]; delete cp[viejo]; }
      });
    });
  }
  Object.keys(d.cierres || {}).forEach(k => {
    const c = d.cierres[k];
    if (c && c.cerrado && !c.params) c.params = JSON.parse(JSON.stringify(d.params));
  });
  (d.ops || []).forEach(o => {
    if (o.calidad === 'cara chica' || o.calidad === 'sucios' || o.calidad === 'sucio' || o.moneda === 'USD CC') o.moneda = 'USD cara chica';
    delete o.calidad;
  });
  (d.ops || []).forEach(o => { if (o.cancelado === undefined) o.cancelado = o.ok === 'cancelado'; });
  (d.cripto || []).forEach(o => { if (o.cancelado === undefined) o.cancelado = o.ok === 'cancelado'; });
  // checklist de patas por operación: se inicializa una sola vez a partir del estado global que tenía antes
  (d.ops || []).forEach(o => {
    if (o.patasHechas) return;
    const yaListo = o.ok && o.ok !== 'pendiente';
    o.patasHechas = {};
    clavesAccionables('ops', o).forEach(k => { o.patasHechas[k] = yaListo; });
  });
  (d.cripto || []).forEach(o => {
    if (o.patasHechas) return;
    const yaListo = o.ok && o.ok !== 'pendiente';
    o.patasHechas = {};
    clavesAccionables('cripto', o).forEach(k => { o.patasHechas[k] = yaListo; });
  });
  d.mayoristaOps = d.mayoristaOps || [];
  d.mayoristaOps.forEach(o => {
    if (o.patasHechas) return;
    const yaListo = o.ok && o.ok !== 'pendiente';
    o.patasHechas = {};
    clavesAccionables('mayoristaOps', o).forEach(k => { o.patasHechas[k] = yaListo; });
  });
  (d.cables || []).forEach(c => {
    if (c.cancelado === undefined) c.cancelado = c.estado === 'cancelado';
    if (c.patasHechas) return;
    const yaListo = c.estado === 'ejecutado';
    c.patasHechas = {};
    clavesAccionables('cables', c).forEach(k => { c.patasHechas[k] = yaListo; });
  });
  return d;
};

const NAV = [
  { id: 'cotiz', label: 'Cotizaciones', sub: 'Primer paso del día: mercado, precios de la financiera y márgenes', group: 'Operación diaria',
    icon: 'M3 17 9 10 13 14 21 5', icon2: 'M15 5 21 5 21 11' },
  { id: 'tablero', label: 'Tablero', sub: 'Caja, cotización operativa y resultado del día', group: 'Operación diaria',
    icon: 'M4 4 H11 V11 H4 Z M13 4 H20 V8 H13 Z M13 10 H20 V20 H13 Z M4 13 H11 V20 H4 Z', icon2: '' },
  { id: 'ops', label: 'Operaciones', sub: 'Cambio de divisas, cripto y cables', group: 'Operación diaria',
    icon: 'M4 7 H17 M13 3 17 7 13 11', icon2: 'M20 17 H7 M11 13 7 17 11 21' },
  { id: 'cierre', label: 'Cierre diario', sub: 'Una fila por fecha, con resultado del día', group: 'Operación diaria',
    icon: 'M4 5 H20 V21 H4 Z M4 9 H20 M8 3 V7 M16 3 V7', icon2: 'M8 14 11 17 17 11' },
  { id: 'clientes', label: 'Clientes', sub: 'Clientes y domicilios', group: 'Contactos y saldos',
    icon: 'M9 11 a3 3 0 1 0 0-6 a3 3 0 0 0 0 6 Z M3 21 c0-4 3-6 6-6 s6 2 6 6', icon2: 'M16 8 a2.5 2.5 0 1 0 0-5 M17 21 c0-3-1.5-5-3-6' },
  { id: 'comisionistas', label: 'Operadores', sub: 'Terceros que cobran comisión por operación', group: 'Contactos y saldos',
    icon: 'M6 3 H18 V21 H6 Z', icon2: 'M9 8 a3 3 0 1 0 6 0 a3 3 0 0 0-6 0 Z M8 17 c0-2 2-3 4-3 s4 1 4 3' },
  { id: 'ctacte', label: 'Cuentas corrientes', sub: 'Saldos por cliente, movimientos y antigüedad', group: 'Contactos y saldos',
    icon: 'M12 3 V21 M5 7 H19', icon2: 'M5 7 2 13 a3 3 0 0 0 6 0 Z M19 7 16 13 a3 3 0 0 0 6 0 Z' },
  { id: 'gastos', label: 'Gastos', sub: 'Alta y listado por fecha', group: 'Administración',
    icon: 'M6 2 H18 V22 15 20 12 22 9 20 6 22 Z', icon2: 'M9 8 H15 M9 12 H15 M9 16 H13' },
  { id: 'patrimonio', label: 'Patrimonio', sub: 'Aportes de los socios y patrimonio neto', group: 'Administración',
    icon: 'M4 21 V9 12 3 20 9 V21 Z', icon2: 'M9 21 V14 H15 V21' },
  { id: 'audit', label: 'Auditoría', sub: 'Quién cargó, editó o borró cada registro', group: 'Administración',
    icon: 'M12 3 20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z', icon2: 'M9 12 11 14 15 9' },
  { id: 'usuarios', label: 'Usuarios', sub: 'Quién puede entrar al sistema y con qué rol', group: 'Administración',
    icon: 'M9 11 a3 3 0 1 0 0-6 a3 3 0 0 0 0 6 Z M3 20 c0-4 3-6 6-6 s6 2 6 6', icon2: 'M17 20 c0-3-1.5-5-3.2-5.7 M15 6 a2.6 2.6 0 1 1 0 5.2' },
  { id: 'importador', label: 'Importar datos', sub: 'Carga inicial: clientes, saldos y márgenes de apertura', group: 'Administración',
    icon: 'M12 3 V15 M7 10 12 15 17 10', icon2: 'M4 17 V20 H20 V17' }
];

const CC_TIPOS = [
  { label: 'Recibimos efectivo del cliente', signo: -1, efectivo: true },
  { label: 'Entregamos efectivo al cliente', signo: 1, efectivo: true },
  { label: 'Ajuste a favor de la cueva', signo: 1, efectivo: false },
  { label: 'Ajuste a favor del cliente', signo: -1, efectivo: false }
];

const ENTIDADES = [
  { nombre: 'Operación de cambio', campos: [
    { n: 'tipo', t: 'compra / venta' }, { n: 'fecha', t: 'fecha' }, { n: 'cliente', t: 'ref cliente' },
    { n: 'moneda', t: 'USD / USD cara chica / EUR / BRL / LBR / otra' }, { n: 'cantidad', t: 'número' }, { n: 'tc', t: 'ƒ sugerido: mercado ± margen de Cotizaciones' },
    { n: 'ARS', t: 'ƒ cantidad × TC' },
    { n: 'comisionista', t: 'ref operador, opcional' }, { n: 'comision', t: 'ƒ sugerida si el operador tiene %, sobre el USD operado' },
    { n: 'forma_pago', t: 'parte ARS: efectivo / transferencia / cuenta corriente' }, { n: 'forma_retiro', t: 'parte divisa: efectivo / transferencia / cuenta corriente' }, { n: 'lugar', t: 'si hay efectivo: retiro / domicilio' }, { n: 'domicilio', t: 'ref domicilio del cliente' }, { n: 'estado', t: 'pendiente / OK' } ] },
  { nombre: 'Operación cripto (USDT)', campos: [
    { n: 'tipo', t: 'compra / venta (una parte siempre USDT)' }, { n: 'fecha', t: 'fecha' }, { n: 'cliente', t: 'ref cliente' },
    { n: 'moneda / monedaPago', t: 'USDT / ARS / USD, la que vendemos y la que compramos' }, { n: 'cantidad', t: 'número' },
    { n: 'tc', t: 'ƒ sugerido: precio USDT del día ± margen de Cotizaciones' },
    { n: 'costo', t: 'costo de transferencia en USDT' }, { n: 'costoA', t: 'cueva / cliente' },
    { n: 'comisionista', t: 'ref operador, opcional' }, { n: 'comision', t: 'ƒ sugerida si el operador tiene %, sobre el USD operado' },
    { n: 'forma_pago', t: 'parte que vendemos: efectivo / transferencia / cuenta corriente' }, { n: 'forma_retiro', t: 'parte que compramos: efectivo / transferencia / cuenta corriente' },
    { n: 'lugar', t: 'si hay efectivo: retiro / domicilio' } ] },
  { nombre: 'Cable (bajada / subida)', campos: [
    { n: 'tipo', t: 'bajada: dólares del exterior bajan al cliente vía mayorista · subida: el cliente entrega USD local para que el mayorista transfiera al exterior' },
    { n: 'fecha', t: 'fecha de carga' }, { n: 'cliente', t: 'ref cliente' }, { n: 'comisionista', t: 'ref operador, tipo mayorista' },
    { n: 'monto', t: 'bajada: USD que envía el cliente · subida: USD netos a transferir al exterior' }, { n: 'costo_mayorista_pct', t: '%, + cobra / − nos paga' },
    { n: 'comision_cliente_pct', t: '%, + se le cobra al cliente (aumenta el resultado) / − se le paga al cliente (lo reduce)' },
    { n: 'estado', t: 'pendiente / ejecutado / cancelado — subida arranca en ejecutado por default' }, { n: 'fecha_ejecucion', t: 'se fija al marcar ejecutado; imputa el resultado ese día, no el de carga' },
    { n: 'mayorista', t: 'bajada: ƒ monto × (1 − costo%), nos lo debe · subida: ƒ monto × (1 + costo%), se lo damos' },
    { n: 'cliente', t: 'bajada: ƒ monto × (1 − comisión%), se lo debemos · subida: ƒ monto × (1 + comisión%), nos lo da' },
    { n: 'ganancia', t: 'diferencia entre ambos, según tipo' },
    { n: 'nota', t: 'no mueve caja ni cuenta corriente hasta ejecutarse' } ] },
  { nombre: 'Gasto', campos: [ { n: 'fecha', t: 'fecha' }, { n: 'motivo', t: 'texto' }, { n: 'monto', t: 'número' }, { n: 'pagado_por', t: 'ref socio' }, { n: 'nota', t: 'no impacta el día: se resta del patrimonio de hoy' } ] },
  { nombre: 'Cliente', campos: [
    { n: 'nombre', t: 'texto' }, { n: 'contacto', t: 'texto' },
    { n: 'fecha_alta', t: 'fecha' }, { n: 'observaciones', t: 'texto' },
    { n: 'domicilios', t: 'lista de domicilios, cada uno con alias' }, { n: 'operaciones', t: 'ƒ ops del cliente' },
    { n: 'saldo_cta_cte', t: 'ƒ por moneda, desde los movimientos' } ] },
  { nombre: 'Operador', campos: [
    { n: 'nombre', t: 'texto' }, { n: 'tipo', t: 'Mayorista / Comisionista' }, { n: 'comision_pct', t: '%, opcional — sugiere el monto de la comisión en cada operación' } ] },
  { nombre: 'Domicilio', campos: [
    { n: 'cliente', t: 'ref cliente' }, { n: 'calle', t: 'texto' }, { n: 'tipo', t: 'principal / alternativo' } ] },
  { nombre: 'Movimiento de cuenta corriente', campos: [
    { n: 'cliente', t: 'ref cliente' }, { n: 'fecha', t: 'fecha' },
    { n: 'moneda', t: 'ARS / USD / USD cara chica / EUR / USDT' },
    { n: 'monto', t: '± número (+ = el cliente nos debe)' }, { n: 'motivo', t: 'texto' },
    { n: 'origen', t: 'ref operación (automático) / carga manual' },
    { n: 'mueve_caja', t: 'flag: entregas y cobros de efectivo sí, ajustes no' },
    { n: 'antiguedad', t: 'ƒ FIFO: fecha del saldo más viejo sin cubrir' } ] },
  { nombre: 'Cotización diaria de mercado', campos: [
    { n: 'fecha', t: 'fecha' }, { n: 'momento', t: 'apertura / cierre' },
    { n: 'usd_ars / eur_usd / usd_brl / gbp_usd', t: 'compra y venta por par' } ] },
  { nombre: 'Socio y aporte de capital', campos: [
    { n: 'socio', t: 'texto' }, { n: 'fecha', t: 'fecha' }, { n: 'moneda', t: 'USD / ARS / USDT / EUR' },
    { n: 'monto', t: 'número' }, { n: 'concepto', t: 'texto' }, { n: 'participacion', t: 'ƒ sobre el total aportado' } ] },
  { nombre: 'Márgenes (en Cotizaciones)', campos: [
    { n: 'usd_limpio_compra', t: 'ARS fijos (−)' }, { n: 'usd_limpio_venta', t: 'ARS fijos (+)' },
    { n: 'margen_usd_cara_chica', t: '%' }, { n: 'margen_usdt', t: '% sobre el dólar (1:1)' },
    { n: 'margen_euro', t: '% sobre el euro de mercado' },
    { n: 'margen_real', t: '%' }, { n: 'margen_libra', t: '%' },
    { n: 'dolar_referencia', t: 'compra / venta' } ] },
  { nombre: 'Cierre diario', campos: [
    { n: 'fecha', t: 'fecha' }, { n: 'tc_cierre', t: 'ƒ vendedor de Cotizaciones del día, o el último cargado si no hay uno' },
    { n: 'cerrado', t: 'flag' }, { n: 'ganancia_dia / mes / acumulada', t: 'ƒ calculado' },
    { n: 'desglose', t: 'ƒ por tipo de operación (cambio / cripto / cables): mov. ARS, mov. USD y volumen operado en USD de cada uno' } ] }
];

function seed() {
  return {
    comisionistas: [],
    clientes: [],
    ops: [],
    cripto: [],
    mayoristaOps: [],
    cables: [],
    ctacte: [],
    gastos: [],
    cotiz: [],
    aportes: [],
    params: { baseCompra: 1475, baseVenta: 1495, usdLimpioCompra: 10, usdLimpioVenta: 5, margenUsdt: 1.5, margenCaraChica: 1, margenEuro: 2, margenReal: 3, margenLibra: 2.5, crossEurC: 1.09, crossEurV: 1.11, crossBrlC: 5.52, crossBrlV: 5.32, crossGbpC: 1.28, crossGbpV: 1.31 },
    cierres: {},
    usuarios: []
  };
}

const MARGEN_DEFS = [
  { k: 'usdLimpioCompra', label: 'Dólar · compra menos', dec: 2, pre: 'ARS ' },
  { k: 'usdLimpioVenta', label: 'Dólar · venta más', dec: 2, pre: 'ARS ' },
  { k: 'margenCaraChica', label: 'Dólar cara chica', dec: 2, post: '%' },
  { k: 'margenUsdt', label: 'USDT', dec: 2, post: '%' },
  { k: 'margenEuro', label: 'Euro', dec: 2, post: '%' },
  { k: 'margenReal', label: 'Real', dec: 2, post: '%' },
  { k: 'margenLibra', label: 'Libra', dec: 2, post: '%' }
];

// carga inicial, no función recurrente: clientes con sus domicilios, saldos iniciales de cuenta corriente
// por cliente y por moneda, saldos iniciales de caja por moneda y márgenes vigentes — en ese orden porque
// ctacte necesita que el cliente ya exista (por nombre exacto).
const ENTIDADES_IMPORT = [
  { id: 'clientes', label: 'Clientes y domicilios', nota: 'Un cliente por fila. Si el nombre ya existe, se ignora esa fila (no se duplica).',
    campos: [
      { k: 'nombre', label: 'Nombre', req: true },
      { k: 'contacto', label: 'Contacto' },
      { k: 'domicilio', label: 'Domicilio (calle y número)' },
      { k: 'obs', label: 'Observaciones' }
    ] },
  { id: 'ctacte', label: 'Saldos iniciales de cuenta corriente', nota: 'Por cliente y por moneda. El cliente tiene que existir con ese nombre exacto — importá primero la planilla de clientes si hace falta.',
    campos: [
      { k: 'cliente', label: 'Cliente (nombre exacto)', req: true },
      { k: 'moneda', label: 'Moneda', req: true, opciones: MON_IMPORT },
      { k: 'monto', label: 'Monto (+ nos debe / − le debemos)', req: true, num: true }
    ] },
  { id: 'caja', label: 'Saldos iniciales de caja', nota: 'Uno por moneda. Se registra como un aporte de capital con fecha de hoy, para que quede sujeto a variación de TC igual que cualquier saldo.',
    campos: [
      { k: 'moneda', label: 'Moneda', req: true, opciones: MON_IMPORT },
      { k: 'monto', label: 'Monto', req: true, num: true }
    ] },
  { id: 'margenes', label: 'Márgenes vigentes', nota: 'El nombre del parámetro tiene que ser uno de los que ya existen en Cotizaciones (ver la lista al mapear).',
    campos: [
      { k: 'parametro', label: 'Parámetro', req: true, opciones: MARGEN_DEFS.map(m => m.label) },
      { k: 'valor', label: 'Valor', req: true, num: true }
    ] }
];

const nf = (n, d) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d }).format(isFinite(n) ? n : 0);
// valor para editar: coma decimal, sin puntos de miles
const numEd = (n, d) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d, useGrouping: false }).format(isFinite(n) ? n : 0);
const soloComa = (v) => { const s = String(v === undefined || v === null ? '' : v).trim().replace(/^[-−]/, ''); return s === '' || /^\d{1,3}(\.\d{3})*(,\d*)?$/.test(s) || /^\d+(,\d*)?$/.test(s); };
// campos numéricos: se formatean mientras se escriben (miles con punto, decimales con coma)
const NUM_FIELDS = ['cantidad', 'tc', 'monto', 'montoPago', 'margen', 'comision', 'comisionPct', 'costoPct', 'margenPct', 'dc', 'dv', 'ec', 'ev', 'rc', 'rv', 'lc', 'lv'];
const fmtNum = (raw) => {
  let s = String(raw === undefined || raw === null ? '' : raw);
  if (s === '') return '';
  const neg = /^[-−]/.test(s) ? '-' : '';
  s = s.replace(/^[-−]/, '');
  if (!/^[\d.,]*$/.test(s)) return neg + s;
  // un solo punto que no arma un grupo de miles de 3 dígitos es un decimal tipeado con punto: se traduce a coma
  if (s.indexOf(',') < 0) {
    const dotCount = (s.match(/\./g) || []).length;
    const afterLen = dotCount === 1 ? s.slice(s.indexOf('.') + 1).length : -1;
    if (afterLen === 0 || afterLen === 1 || afterLen === 2) s = s.replace('.', ',');
  }
  const i = s.indexOf(',');
  const entRaw = i < 0 ? s : s.slice(0, i);
  const dec = i < 0 ? null : s.slice(i + 1).replace(/,/g, '');
  if (dec !== null && !/^\d*$/.test(dec)) return neg + s;
  // un punto solo vale como separador de miles: grupos de 3 dígitos (el último puede tener más si se está tipeando)
  const grupos = entRaw.split('.');
  for (let g = 1; g < grupos.length; g++) {
    const largo = grupos[g].length;
    if (largo < 3 || (largo > 3 && g < grupos.length - 1)) return neg + s;
  }
  const ent = grupos.join('');
  if (!/^\d*$/.test(ent)) return neg + s;
  const base = (i >= 0 && ent === '') ? '0' : ent;
  const entFmt = base === '' ? '' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(base));
  return neg + (dec === null ? entFmt : entFmt + ',' + dec);
};
const money = (n, cur, d) => (n < 0 ? '−' : '') + cur + ' ' + nf(Math.abs(n), d);
// arma el texto de un domicilio con piso/depto y observaciones, si los tiene
const formatDireccionTxt = (calle, piso, obs) => {
  let s = calle || '';
  if ((piso || '').trim()) s += ' — ' + piso.trim();
  if ((obs || '').trim()) s += ' (' + obs.trim() + ')';
  return s;
};
const pesos = (n) => money(n, 'ARS', 0);
const usd = (n) => money(n, 'USD', 0);
const monedaLabel = (m, otra) => m === 'Otra' ? ((otra || '').trim() || 'Otra') : (m || 'ARS');
// 'pesos' es la clave interna de cta. cte. para ARS; en pantalla siempre se lee "ARS", nunca las dos formas mezcladas
const monedaTexto = (k) => k === 'pesos' ? 'ARS' : k;
const monedaSimbolo = (m, otra) => { if (!m || m === 'ARS') return 'ARS'; if (m === 'EUR') return '€'; return monedaLabel(m, otra); };
const plural = (n, uno, muchos) => n + ' ' + (n === 1 ? uno : muchos);
const parseNum = (v) => {
  if (typeof v === 'number') return v;
  let s = String(v || '').replace(/[^\d,.\-−]/g, '').replace('−', '-');
  if (s.indexOf(',') < 0) {
    const dotCount = (s.match(/\./g) || []).length;
    const afterLen = dotCount === 1 ? s.slice(s.indexOf('.') + 1).length : -1;
    if (afterLen === 0 || afterLen === 1 || afterLen === 2) s = s.replace('.', ',');
  }
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
const dmy = (iso) => { const p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => 'x' + Math.random().toString(36).slice(2, 9);

// qué patas de una operación implican una acción física (entregar/recibir efectivo, hacer una transferencia).
// cuenta corriente no cuenta: queda diferida, no hay nada que hacer ahora.
// promedio operado (ARS, ops de cambio) y tier relativo A/B/C por tercios entre los clientes con operaciones
function tierMapDe(d) {
  const stats = (d.clientes || []).map(c => {
    const ops = (d.ops || []).filter(o => o.clienteId === c.id && !o.cancelado);
    const total = ops.reduce((a, o) => a + (Number(o.cantidad) || 0) * (Number(o.tc) || 0), 0);
    return { id: c.id, prom: ops.length ? total / ops.length : 0, n: ops.length };
  });
  const ranked = stats.filter(s => s.n > 0).slice().sort((a, b) => b.prom - a.prom);
  const map = {};
  ranked.forEach((s, i) => {
    const pct = i / ranked.length;
    map[s.id] = { prom: s.prom, tier: pct < 1 / 3 ? 'A' : pct < 2 / 3 ? 'B' : 'C' };
  });
  return map;
}

// true si esa pata específica (o la pata única) está marcada Completada; sin marca explícita,
// cta. cte. arranca completada y efectivo/transferencia arranca pendiente.
function pataLista(patasHechas, key, esCCDefault) {
  const hechas = patasHechas || {};
  return hechas.hasOwnProperty(key) ? !!hechas[key] : esCCDefault;
}

// porción en efectivo/transferencia (nunca cta. cte.) ya marcada Completada: es la única que impacta caja hasta entonces.
function cajaCompletadaDe(partes, formaUnica, keyBase, patasHechas, total) {
  if (Array.isArray(partes) && partes.length) {
    return partes.reduce((a, p, i) => {
      if (p.forma === 'cuenta corriente') return a;
      return a + (pataLista(patasHechas, keyBase + '-' + i, false) ? (Number(p.monto) || 0) : 0);
    }, 0);
  }
  if (formaUnica === 'cuenta corriente') return 0;
  return pataLista(patasHechas, keyBase, false) ? total : 0;
}

function clavesAccionables(tipo, r) {
  const keys = [];
  if (tipo === 'ops' || tipo === 'cripto' || tipo === 'mayoristaOps') {
    if (Array.isArray(r.partesPago) && r.partesPago.length) r.partesPago.forEach((p, i) => { if (p.forma !== 'cuenta corriente') keys.push('pago-' + i); });
    else if (r.formaPago !== 'cuenta corriente') keys.push('pago');
    if (Array.isArray(r.partesDivisa) && r.partesDivisa.length) r.partesDivisa.forEach((p, i) => { if (p.forma !== 'cuenta corriente') keys.push('divisa-' + i); });
    else if (r.formaRetiro !== 'cuenta corriente') keys.push('divisa');
  } else {
    if (Array.isArray(r.partesMayorista) && r.partesMayorista.length) r.partesMayorista.forEach((p, i) => { if (p.forma !== 'cuenta corriente') keys.push('mayorista-' + i); });
    else if (r.formaMayorista !== 'cuenta corriente') keys.push('mayorista');
    if (Array.isArray(r.partesCliente) && r.partesCliente.length) r.partesCliente.forEach((p, i) => { if (p.forma !== 'cuenta corriente') keys.push('cliente-' + i); });
    else if (r.formaCliente !== 'cuenta corriente') keys.push('cliente');
  }
  return keys;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    let data = null;
    try { const raw = localStorage.getItem(KEY); if (raw) data = migrar(JSON.parse(raw)); } catch (e) { data = null; }
    let authUser = null;
    try { const rawSes = localStorage.getItem(SESSION_KEY); if (rawSes) authUser = JSON.parse(rawSes); } catch (e) { authUser = null; }
    const screenInicial = authUser && authUser.rol === 'operador' ? 'ops' : 'tablero';
    this.state = { authUser, online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true, loginUsuario: '', loginPassword: '', loginError: '', screen: screenInicial, opTab: 'cambio', opVista: 'todos', vista: 'lista', cliente: 'c1', query: '', modal: null, form: {}, data: data || migrar(seed()), isMobile: false, navOpen: false, toast: null, navStack: [] };
  }

  navPush() {
    const s = this.state;
    const snap = { screen: s.screen, vista: s.vista, cliente: s.cliente, comisionistaSel: s.comisionistaSel,
      opDetalle: s.opDetalle, criptoOpDetalle: s.criptoOpDetalle, cableDetalle: s.cableDetalle, mayoristaOpDetalle: s.mayoristaOpDetalle,
      opTab: s.opTab, opVista: s.opVista, opFoco: s.opFoco, criptoFoco: s.criptoFoco, cableFoco: s.cableFoco, mayoristaFoco: s.mayoristaFoco };
    this.setState(prev => ({ navStack: (prev.navStack || []).concat([snap]) }));
  }

  volver(fallback) {
    const stack = this.state.navStack || [];
    if (stack.length) {
      const prev = stack[stack.length - 1];
      this.setState(Object.assign({}, prev, { navStack: stack.slice(0, -1) }));
    } else {
      this.setState(Object.assign({ navStack: [] }, fallback || { screen: 'tablero', vista: 'lista' }));
    }
  }

  closeModalNow() { if (this.state.guardando) return; this.setState({ modal: null, form: {}, editId: null, errors: [], modalErr: '', soloPar: null }); }

  // simula la latencia real de guardar contra un servidor: deshabilita Guardar, no deja cerrar el modal
  // (ni con Escape ni con el backdrop) mientras está en curso. Portar reemplazando el setTimeout por el await del POST/PATCH real.
  guardarConEstado() {
    if (this.state.guardando) return;
    this.setState({ guardando: true });
    setTimeout(() => {
      this.save();
      this.setState({ guardando: false });
    }, 450);
  }

  onLoginSubmit(e) {
    e.preventDefault();
    const u = (this.state.loginUsuario || '').trim();
    const p = this.state.loginPassword || '';
    const usuarios = (this.state.data.usuarios && this.state.data.usuarios.length) ? this.state.data.usuarios : USUARIOS;
    const found = usuarios.find(x => x.usuario.toLowerCase() === u.toLowerCase() && x.password === p);
    if (!found) { this.setState({ loginError: 'Usuario o contraseña incorrectos.' }); return; }
    if (found.estado === 'desactivado') { this.setState({ loginError: 'Este usuario está desactivado. Consultá a un administrador.' }); return; }
    const rolObj = ROLES.find(r => r.id === found.rol) || ROLES[1];
    const sesion = { usuario: found.usuario, nombre: found.nombre, rol: found.rol, rolLabel: rolObj.nombre };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(sesion)); } catch (e2) {}
    if (found.id) {
      const d = JSON.parse(JSON.stringify(this.state.data));
      const uReg = (d.usuarios || []).find(x => x.id === found.id);
      if (uReg) { uReg.ultimoAcceso = new Date().toISOString(); this.persist(d); }
    }
    this.setState({ authUser: sesion, loginUsuario: '', loginPassword: '', loginError: '', screen: sesion.rol === 'operador' ? 'ops' : 'tablero' });
  }

  generarPasswordTemp() {
    let out = '';
    for (let i = 0; i < 10; i++) out += PASS_CHARS[Math.floor(Math.random() * PASS_CHARS.length)];
    return out;
  }

  resetPasswordUsuario(id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const u = (d.usuarios || []).find(x => x.id === id);
    if (!u) return;
    const nueva = this.generarPasswordTemp();
    u.password = nueva; u.debeCambiarPassword = true;
    this.auditar(d, 'edición', 'usuario', id, u.nombre + ' (' + u.usuario + ') · contraseña restablecida');
    this.persist(d);
    this.setState({ passwordAMostrar: { usuario: u.usuario, password: nueva } });
  }

  toggleEstadoUsuario(id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const u = (d.usuarios || []).find(x => x.id === id);
    if (!u) return;
    if (this.state.authUser && this.state.authUser.usuario === u.usuario) { window.alert('No podés desactivar tu propio usuario mientras estás conectado con él.'); return; }
    u.estado = u.estado === 'activo' ? 'desactivado' : 'activo';
    this.auditar(d, 'edición', 'usuario', id, u.nombre + ' (' + u.usuario + ') → ' + u.estado);
    this.persist(d);
  }

  logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    this.setState({ authUser: null, loginUsuario: '', loginPassword: '', loginError: '' });
  }

  componentDidUpdate() {
    const s = this.state;
    if (s.authUser && s.authUser.rol === 'operador' && NAV_OCULTO_OPERADOR.indexOf(s.screen) >= 0) {
      this.setState({ screen: 'ops', vista: 'lista' });
    }
  }

  componentDidMount() {
    this._onKeyDown = (e) => { if (e.key === 'Escape' && this.state.modal) this.closeModalNow(); };
    document.addEventListener('keydown', this._onKeyDown);
    this._mq = window.matchMedia('(max-width:840px)');
    const upd = () => this.setState({ isMobile: this._mq.matches });
    upd();
    this._mq.addEventListener ? this._mq.addEventListener('change', upd) : this._mq.addListener(upd);
    this._mqUpd = upd;
    // sin conexión: lo que se cargue mientras no hay red no llega al servidor — se avisa apenas se corta.
    this._onOffline = () => this.setState({ online: false });
    this._onOnline = () => this.setState({ online: true });
    window.addEventListener('offline', this._onOffline);
    window.addEventListener('online', this._onOnline);
  }

  componentWillUnmount() {
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._mq && this._mqUpd) {
      this._mq.removeEventListener ? this._mq.removeEventListener('change', this._mqUpd) : this._mq.removeListener(this._mqUpd);
    }
    window.removeEventListener('offline', this._onOffline);
    window.removeEventListener('online', this._onOnline);
  }

  persist(data) {
    this.setState({ data });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  // ── cálculos ────────────────────────────────────────────────────────────
  capital(d) {
    const cap = { pesos: 0, usd: 0, usdt: 0, eur: 0 };
    d.aportes.forEach(a => {
      const k = a.moneda === 'ARS' ? 'pesos' : a.moneda === 'USD' ? 'usd' : a.moneda === 'USDT' ? 'usdt' : 'eur';
      cap[k] += Number(a.monto) || 0;
    });
    return cap;
  }

  tcDeFecha(d, fecha, prev) {
    const delDia = (d.cotiz || []).filter(q => q.fecha === fecha && Number(q.dv));
    const cierreDia = delDia.find(q => q.momento === 'cierre') || delDia[delDia.length - 1];
    if (cierreDia) return Number(cierreDia.dv);
    const anteriores = (d.cotiz || []).filter(q => q.fecha <= fecha && Number(q.dv)).sort((a, b) => (a.fecha + a.momento).localeCompare(b.fecha + b.momento));
    if (anteriores.length) return Number(anteriores[anteriores.length - 1].dv);
    if (prev) return prev;
    return d.params.baseVenta;
  }

  serie(d) {
    const cap = this.capital(d);
    const allCC = this.movimientosCC(d);
    const gastosPorFecha = {};
    (d.gastos || []).forEach(g => { (gastosPorFecha[g.fecha] = gastosPorFecha[g.fecha] || []).push(g); });
    const fechas = Array.from(new Set([].concat(
      d.ops.map(o => o.fecha), (d.ctacte || []).map(m => m.fecha),
      (d.cripto || []).map(o => o.fecha), (d.mayoristaOps || []).map(o => o.fecha), (d.cables || []).map(c => c.fecha), (d.cables || []).filter(c => c.fechaEjecucion).map(c => c.fechaEjecucion), Object.keys(d.cierres),
      Object.keys(gastosPorFecha), (d.aportes || []).map(a => a.fecha)
    ))).sort();
    const valuar = (sal, p) => {
      return Object.keys(sal).reduce((acc, k) => {
        const v = sal[k] || 0;
        if (k === 'USD' || k === 'USDT' || k === 'USD cara chica') return acc + v;
        if (k === 'EUR') return acc + v * (p.crossEurC || 1);
        if (k === 'BRL') return acc + v / (p.crossBrlC || 5.5);
        if (k === 'LBR') return acc + v * (p.crossGbpC || 1);
        return acc;
      }, 0);
    };
    // aportes de capital agrupados por su fecha real: entran a la caja el día que ocurren (no todos al día 0)
    // y desde ahí quedan sujetos a variación de TC como cualquier saldo, pero no cuentan como resultado operativo del día
    const aportesPorFecha = {};
    (d.aportes || []).forEach(a => {
      const mon = a.moneda || 'ARS';
      const bucket = aportesPorFecha[a.fecha] = aportesPorFecha[a.fecha] || {};
      bucket[mon] = (bucket[mon] || 0) + (Number(a.monto) || 0);
    });
    const sDiv = {};
    let sPesos = 0, prevTc = 0, prevFecha = null, mesTotal = 0, mesOperativa = 0, mesVarTC = 0, mesGastos = 0, mesKey = '', prevPnBruto = null, prevPatValuado = null, patReal = null;
    const rows = fechas.map(f => {
      const ops = d.ops.filter(o => o.fecha === f && !o.cancelado);
      const criptoDia = (d.cripto || []).filter(o => o.fecha === f && !o.cancelado);
      const cablesDia = (d.cables || []).filter(c => c.fecha === f && !c.cancelado);
      // volumen: si alguna pata ya es USD/USDT, ese es el monto real operado en USD — no hay que reconvertirlo
      // vía el TC de mercado (que puede diferir un poco del TC pactado). Solo se convierte cuando ninguna pata es USD/USDT.
      const volumenUsd = (q, tc, monA, monB, tipo) => {
        const esUsdLike = (m) => m === 'USD' || m === 'USDT' || m === 'USD cara chica';
        if (esUsdLike(monB)) return q;
        if (esUsdLike(monA)) return q * tc;
        return this.aUsd(d, q * tc, tipo);
      };
      const conf = d.cierres[f] || {};
      let movPesos = 0;
      const movDiv = {};
      const p0 = movPesos, u0 = movDiv.USD || 0;
      const divDiff = (before, after) => { const out = {}; Object.keys(after).forEach(k => { const dv = (after[k] || 0) - (before[k] || 0); if (Math.abs(dv) > 0.005) out[k] = dv; }); return out; };
      const divSnap0 = Object.assign({}, movDiv);
      let volCambioUsd = 0;
      ops.forEach(o => {
        const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0;
        const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
        const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
        // solo la porción en efectivo/transferencia ya marcada Completada mueve caja; cta. cte. nunca mueve caja acá, y pendiente tampoco.
        const pesosCaja = cajaCompletadaDe(o.partesPago, o.formaPago, 'pago', o.patasHechas, q * tc);
        const divisaCaja = cajaCompletadaDe(o.partesDivisa, o.formaRetiro, 'divisa', o.patasHechas, q);
        if (mon === 'ARS') movPesos += divisaCaja; else movDiv[mon] = (movDiv[mon] || 0) + divisaCaja;
        if (monA === 'ARS') movPesos += -pesosCaja;
        else { movDiv[monA] = (movDiv[monA] || 0) - pesosCaja; }
        if (o.ok === ENTREGADO) volCambioUsd += volumenUsd(q, tc, monA, mon, o.tipo);
      });
      const movPesosCambio = movPesos - p0, movUsdCambio = (movDiv.USD || 0) - u0;
      const divDeltaCambio = Object.assign(divDiff(divSnap0, movDiv), Math.abs(movPesosCambio) > 0.005 ? { ARS: movPesosCambio } : {});
      // cripto: mismo esquema que cambio (vendemos/compramos + TC), el USDT tiene su propia caja
      const p1 = movPesos, u1 = movDiv.USD || 0;
      const divSnap1 = Object.assign({}, movDiv);
      let volCriptoUsd = 0;
      criptoDia.forEach(o => {
        const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0, costo = Number(o.costo) || 0;
        const mon = o.moneda || 'USDT', monA = o.monedaPago || 'ARS';
        const pesosCaja = cajaCompletadaDe(o.partesPago, o.formaPago, 'pago', o.patasHechas, q * tc);
        const divisaCaja = cajaCompletadaDe(o.partesDivisa, o.formaRetiro, 'divisa', o.patasHechas, q);
        if (mon === 'ARS') movPesos += divisaCaja; else movDiv[mon] = (movDiv[mon] || 0) + divisaCaja;
        if (monA === 'ARS') movPesos += -pesosCaja;
        else { movDiv[monA] = (movDiv[monA] || 0) - pesosCaja; }
        if (o.costoA === 'cueva' && costo) movDiv.USDT = (movDiv.USDT || 0) - costo;
        if (o.ok === ENTREGADO) volCriptoUsd += volumenUsd(q, tc, monA, mon, o.tipo);
      });
      const movPesosCripto = movPesos - p1, movUsdCripto = (movDiv.USD || 0) - u1;
      const divDeltaCripto = Object.assign(divDiff(divSnap1, movDiv), Math.abs(movPesosCripto) > 0.005 ? { ARS: movPesosCripto } : {});
      // tesorería contra mayorista: la financiera opera su propia caja, mismo esquema que cambio
      const mayoristaOpsDia = (d.mayoristaOps || []).filter(o => o.fecha === f && !o.cancelado);
      const p1b = movPesos, u1b = movDiv.USD || 0;
      const divSnap1b = Object.assign({}, movDiv);
      let volMayoristaUsd = 0;
      mayoristaOpsDia.forEach(o => {
        const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0;
        const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
        const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
        const pesosCaja = cajaCompletadaDe(o.partesPago, o.formaPago, 'pago', o.patasHechas, q * tc);
        const divisaCaja = cajaCompletadaDe(o.partesDivisa, o.formaRetiro, 'divisa', o.patasHechas, q);
        if (mon === 'ARS') movPesos += divisaCaja; else movDiv[mon] = (movDiv[mon] || 0) + divisaCaja;
        if (monA === 'ARS') movPesos += -pesosCaja;
        else { movDiv[monA] = (movDiv[monA] || 0) - pesosCaja; }
        if (o.ok === ENTREGADO) volMayoristaUsd += volumenUsd(q, tc, monA, mon, 'compra');
      });
      const movPesosMayorista = movPesos - p1b, movUsdMayorista = (movDiv.USD || 0) - u1b;
      const divDeltaMayorista = Object.assign(divDiff(divSnap1b, movDiv), Math.abs(movPesosMayorista) > 0.005 ? { ARS: movPesosMayorista } : {});
      // cables ejecutados ese día: solo la porción no liquidada en cuenta corriente mueve caja (USD)
      const u2 = movDiv.USD || 0;
      const divSnap2 = Object.assign({}, movDiv);
      let volCableUsd = 0;
      cablesDia.forEach(c => {
        const esSubida = c.tipo === 'Subida';
        const calc = this.cableCalc(c);
        const cajaMayorista = cajaCompletadaDe(c.partesMayorista, c.formaMayorista, 'mayorista', c.patasHechas, calc.montoMayorista);
        const cajaCliente = cajaCompletadaDe(c.partesCliente, c.formaCliente, 'cliente', c.patasHechas, calc.montoCliente);
        movDiv.USD = (movDiv.USD || 0) + (esSubida ? (cajaCliente - cajaMayorista) : (cajaMayorista - cajaCliente));
        if (c.estado === 'ejecutado') volCableUsd += Number(c.monto) || 0;
      });
      const movUsdCable = (movDiv.USD || 0) - u2;
      const divDeltaCable = divDiff(divSnap2, movDiv);
      // entregas y cobros de efectivo de cuenta corriente: mueven caja al revés del saldo (no son una operación de cambio/cripto/cable)
      const p3 = movPesos, u3 = movDiv.USD || 0;
      const ctacteDia = (d.ctacte || []).filter(m => m.fecha === f && m.efectivo);
      ctacteDia.forEach(m => {
        const amt = -(Number(m.monto) || 0);
        if (m.moneda === 'ARS') movPesos += amt; else movDiv[m.moneda] = (movDiv[m.moneda] || 0) + amt;
      });
      const movPesosCtacte = movPesos - p3, movUsdCtacte = (movDiv.USD || 0) - u3;
      // gastos del día: mueven caja de verdad, en la moneda en que se pagaron (ARS o USD).
      const p4 = movPesos, u4 = movDiv.USD || 0;
      const gastosDia = gastosPorFecha[f] || [];
      gastosDia.forEach(g => {
        const monG = g.moneda === 'USD' ? 'USD' : 'ARS';
        const montoOrigG = monG === 'USD' ? (g.montoOriginal !== undefined ? g.montoOriginal : g.monto) : (g.monto || 0);
        if (monG === 'ARS') movPesos -= montoOrigG; else movDiv[monG] = (movDiv[monG] || 0) - montoOrigG;
      });
      const movPesosGastos = movPesos - p4, movUsdGastos = (movDiv.USD || 0) - u4;
      const netoPesos = movPesos, netoUsd = (movDiv.USD || 0);
      const movDivDia = Object.assign({}, movDiv);
      const aportesHoy = aportesPorFecha[f] || {};
      const aportesHoyPesos = aportesHoy.ARS || 0;
      Object.keys(aportesHoy).forEach(k => { if (k !== 'ARS' && aportesHoy[k]) movDivDia[k] = (movDivDia[k] || 0) + aportesHoy[k]; });
      const movPesosTotalDia = netoPesos + aportesHoyPesos;
      // posición mantenida desde ayer (antes de aplicar los movimientos de hoy) — se revalúa a los TC de hoy
      // para separar cuánto del cambio patrimonial es variación de tipo de cambio y cuánto es operativo.
      const stockAntesPesos = sPesos, stockAntesDiv = Object.assign({}, sDiv);
      sPesos += netoPesos + aportesHoyPesos;
      Object.keys(movDiv).forEach(k => { sDiv[k] = (sDiv[k] || 0) + movDiv[k]; });
      Object.keys(aportesHoy).forEach(k => { if (k !== 'ARS' && aportesHoy[k]) sDiv[k] = (sDiv[k] || 0) + aportesHoy[k]; });
      const tc = this.tcDeFecha(d, f, prevTc); prevTc = tc;
      let ccPesos = 0; const ccDiv = {};
      allCC.filter(m => m.fecha <= f).forEach(m => {
        const v = Number(m.monto) || 0;
        if (m.moneda === 'ARS') ccPesos += v; else ccDiv[m.moneda] = (ccDiv[m.moneda] || 0) + v;
      });
      let ccPesosAntes = 0; const ccDivAntes = {};
      allCC.filter(m => m.fecha < f).forEach(m => {
        const v = Number(m.monto) || 0;
        if (m.moneda === 'ARS') ccPesosAntes += v; else ccDivAntes[m.moneda] = (ccDivAntes[m.moneda] || 0) + v;
      });
      const pf = (conf.cerrado && conf.params) || d.params;
      // gastos de hoy valuados a USD al TC de hoy, en la moneda real en que se pagaron: se sacan de la caja
      // (ya está reflejado arriba en el stock) pero no cuentan como resultado operativo, van en su propia línea.
      const gastosHoy = gastosDia.reduce((a, g) => {
        const monG = g.moneda === 'USD' ? 'USD' : 'ARS';
        const montoOrigG = monG === 'USD' ? (g.montoOriginal !== undefined ? g.montoOriginal : g.monto) : (g.monto || 0);
        return a + (monG === 'ARS' ? montoOrigG / tc : montoOrigG);
      }, 0);
      // patrimonio valuado en USD: toda la posición de hoy (ya neta de gastos pagados) MÁS lo pendiente de cobrar/pagar
      // a esta fecha (valuado a los TC de hoy) — una pata ya entregada pero cuya contraparte todavía no llegó
      // no puede hacer "desaparecer" patrimonio: el crédito pendiente es tan patrimonio como la caja.
      const pendHoy = this.pendientePorMoneda(d, f);
      const pendAyer = prevFecha ? this.pendientePorMoneda(d, prevFecha) : {};
      const pnBruto = sPesos / tc + valuar(sDiv, pf) + ccPesos / tc + valuar(ccDiv, pf) + (pendHoy.ARS || 0) / tc + valuar(pendHoy, pf);
      // la misma posición de AYER (stock + pendiente de ese momento), pero revaluada con los TC de HOY: aísla la variación por tipo de cambio
      const revalAnterior = stockAntesPesos / tc + valuar(stockAntesDiv, pf) + ccPesosAntes / tc + valuar(ccDivAntes, pf) + (pendAyer.ARS || 0) / tc + valuar(pendAyer, pf);
      prevFecha = f;
      // aportes de hoy, valuados a los TC de hoy: entran al patrimonio pero no son resultado operativo
      const aportesHoyUsd = aportesHoyPesos / tc + valuar(aportesHoy, pf);
      // los gastos ya redujeron el stock (y por lo tanto pnBruto) arriba; se suman de nuevo aquí para que
      // "operativo" siga siendo el margen de trading puro — los gastos se muestran en su propia línea.
      const ganOperativa = pnBruto - revalAnterior - aportesHoyUsd + gastosHoy;
      const varTC = prevPnBruto === null ? 0 : revalAnterior - prevPnBruto;
      prevPnBruto = pnBruto;
      const resultadoTotal = ganOperativa + varTC - gastosHoy;
      const patValuado = pnBruto;
      const patValuadoVar = prevPatValuado === null ? patValuado : patValuado - prevPatValuado;
      prevPatValuado = patValuado;
      patReal = (patReal === null ? revalAnterior : patReal) + ganOperativa - gastosHoy;
      const mk = f.slice(0, 7);
      if (mk !== mesKey) { mesKey = mk; mesTotal = 0; mesOperativa = 0; mesVarTC = 0; mesGastos = 0; }
      mesTotal += resultadoTotal; mesOperativa += ganOperativa; mesVarTC += varTC; mesGastos += gastosHoy;
      return { fecha: f, movPesos: netoPesos, movUsd: netoUsd, movPesosTotalDia, movDivDia, tc, congelado: !!(conf.cerrado && conf.params),
        sPesos, sUsd: sDiv.USD || 0, saldos: Object.assign({}, sDiv), cerrado: !!conf.cerrado,
        ayerPesos: stockAntesPesos, ayerSaldos: stockAntesDiv,
        ganOperativa, varTC, gastosHoy, resultadoTotal, mesTotal, mesOperativa, mesVarTC, mesGastos, patValuado, patValuadoVar, patReal,
        ccUsd: ccPesos / tc + valuar(ccDiv, pf), ccPesos: ccPesos, ccDiv: Object.assign({}, ccDiv),
        desglose: [
          { tipo: 'cambio', label: 'Cambio de divisas', movPesos: movPesosCambio, movUsd: movUsdCambio, cant: ops.length, volUsd: volCambioUsd, divs: divDeltaCambio },
          { tipo: 'cripto', label: 'Cripto (USDT)', movPesos: movPesosCripto, movUsd: movUsdCripto, cant: criptoDia.length, volUsd: volCriptoUsd, divs: divDeltaCripto },
          { tipo: 'mayorista', label: 'Tesorería', movPesos: movPesosMayorista, movUsd: movUsdMayorista, cant: mayoristaOpsDia.length, volUsd: volMayoristaUsd, divs: divDeltaMayorista },
          { tipo: 'cable', label: 'Cables', movPesos: 0, movUsd: movUsdCable, cant: cablesDia.length, volUsd: volCableUsd, divs: divDeltaCable },
          { tipo: 'ctacte', label: 'Movimientos de caja (cta. cte.)', movPesos: movPesosCtacte, movUsd: movUsdCtacte, cant: ctacteDia.length, volUsd: 0, divs: {} }
        ] };
    });
    return { rows, cap, ultimo: rows[rows.length - 1] || null };
  }

  // costo mayorista: + cobra (reduce el resultado) / − paga (aumenta el resultado).
  // comisión al cliente: + se le cobra (aumenta el resultado) / − se le paga (reduce el resultado).
  // bajada: ambos montos son independientes, cada uno % del monto base. subida: espejo con signo invertido.
  cableCalc(c) {
    const m = parseNum(c.monto) || 0, costoPct = parseNum(c.costoPct) || 0, comisionPct = parseNum(c.margenPct) || 0;
    if (c.tipo === 'Subida') {
      // el costo del mayorista, cuando cobra (positivo), se traslada también al cliente además de nuestra comisión;
      // cuando el mayorista paga (negativo) queda como ganancia propia y no se traslada.
      const costoTrasladado = Math.max(costoPct, 0);
      const montoMayorista = m * (1 + costoPct / 100);
      const montoCliente = m * (1 + comisionPct / 100 + costoTrasladado / 100);
      return { montoMayorista: montoMayorista, montoCliente: montoCliente, ganancia: montoCliente - montoMayorista };
    }
    // el costo del mayorista, cuando cobra (positivo), se traslada también al cliente además de nuestra comisión;
    // cuando el mayorista paga (negativo) queda como ganancia propia y no se traslada.
    const costoTrasladado = Math.max(costoPct, 0);
    const montoMayorista = m * (1 - costoPct / 100);
    const montoCliente = m * (1 - comisionPct / 100 - costoTrasladado / 100);
    return { montoMayorista: montoMayorista, montoCliente: montoCliente, ganancia: montoMayorista - montoCliente };
  }

  // ── cuentas corrientes ──────────────────────────────────────────────────
  movimientosCC(d) {
    const out = [];
    (d.ops || []).forEach(o => {
      const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0;
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const monAKey = monA;
      const monKey = mon;
      const ref = 'Cambio de ' + nf(q, 0) + ' ' + monedaSimbolo(mon, o.monedaOtra) + ' por ' + nf(q * tc, 0) + ' ' + monedaSimbolo(monA, o.monedaPagoOtra) + '.';
      // el TC ya trae el margen adentro (es el precio negociado): el monto en cuenta es cantidad × TC,
      // sin sumar el margen aparte — sumarlo duplicaría el margen. El margen es solo informativo.
      if (Array.isArray(o.partesPago) && o.partesPago.length) {
        o.partesPago.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'pago-' + i, true)) out.push({
          id: o.id + '·p' + i, clienteId: o.clienteId, fecha: o.fecha, moneda: monAKey,
          monto: -(Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'ops', auto: true, efectivo: false }); });
      } else if (o.formaPago === 'cuenta corriente' && pataLista(o.patasHechas, 'pago', true)) {
        out.push({ id: o.id + '·p', clienteId: o.clienteId, fecha: o.fecha, moneda: monAKey,
          monto: -q * tc, motivo: ref, opId: o.id, coll: 'ops', auto: true, efectivo: false });
      }
      if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) {
        o.partesDivisa.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa-' + i, true)) out.push({
          id: o.id + '·d' + i, clienteId: o.clienteId, fecha: o.fecha, moneda: monKey,
          monto: (Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'ops', auto: true, efectivo: false }); });
      } else if (o.formaRetiro === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa', true)) out.push({
        id: o.id + '·d', clienteId: o.clienteId, fecha: o.fecha, moneda: monKey,
        monto: q, motivo: ref, opId: o.id, coll: 'ops', auto: true, efectivo: false });
      if (!o.cancelado && o.comisionistaId && (Number(o.comision) || 0)) out.push({
        id: o.id + '·com', comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: o.comisionMoneda || 'USD',
        monto: -(Number(o.comision) || 0), motivo: 'Comisión por ' + ref, opId: o.id, coll: 'ops', auto: true, efectivo: false });
    });
    (d.cripto || []).forEach(o => {
      const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0;
      const mon = o.moneda || 'USDT', monA = o.monedaPago || 'ARS';
      const ref = 'Cripto: ' + nf(q, 0) + ' ' + monedaSimbolo(mon) + ' por ' + nf(q * tc, 0) + ' ' + monedaSimbolo(monA) + '.';
      if (Array.isArray(o.partesPago) && o.partesPago.length) {
        o.partesPago.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'pago-' + i, true)) out.push({
          id: o.id + '·p' + i, clienteId: o.clienteId, fecha: o.fecha, moneda: monA,
          monto: -(Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'cripto', auto: true, efectivo: false }); });
      } else if (o.formaPago === 'cuenta corriente' && pataLista(o.patasHechas, 'pago', true)) {
        out.push({ id: o.id + '·p', clienteId: o.clienteId, fecha: o.fecha, moneda: monA,
          monto: -q * tc, motivo: ref, opId: o.id, coll: 'cripto', auto: true, efectivo: false });
      }
      if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) {
        o.partesDivisa.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa-' + i, true)) out.push({
          id: o.id + '·d' + i, clienteId: o.clienteId, fecha: o.fecha, moneda: mon,
          monto: (Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'cripto', auto: true, efectivo: false }); });
      } else if (o.formaRetiro === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa', true)) out.push({
        id: o.id + '·d', clienteId: o.clienteId, fecha: o.fecha, moneda: mon,
        monto: q, motivo: ref, opId: o.id, coll: 'cripto', auto: true, efectivo: false });
      if (!o.cancelado && o.comisionistaId && (Number(o.comision) || 0)) out.push({
        id: o.id + '·com', comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: o.comisionMoneda || 'USD',
        monto: -(Number(o.comision) || 0), motivo: 'Comisión por ' + ref, opId: o.id, coll: 'cripto', auto: true, efectivo: false });
    });
    // operaciones de tesorería (financiera contra mayorista): la contraparte es el operador, no un cliente
    (d.mayoristaOps || []).filter(o => !o.cancelado).forEach(o => {
      const q = Number(o.cantidad) || 0, tc = Number(o.tc) || 0;
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const ref = 'Tesorería: ' + nf(q, 0) + ' ' + monedaSimbolo(mon) + ' por ' + nf(q * tc, 0) + ' ' + monedaSimbolo(monA) + '.';
      if (Array.isArray(o.partesPago) && o.partesPago.length) {
        o.partesPago.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'pago-' + i, true)) out.push({
          id: o.id + '·p' + i, comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: monA,
          monto: -(Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'mayoristaOps', auto: true, efectivo: false }); });
      } else if (o.formaPago === 'cuenta corriente' && pataLista(o.patasHechas, 'pago', true)) out.push({
        id: o.id + '·p', comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: monA,
        monto: -q * tc, motivo: ref, opId: o.id, coll: 'mayoristaOps', auto: true, efectivo: false });
      if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) {
        o.partesDivisa.forEach((p, i) => { if (p.forma === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa-' + i, true)) out.push({
          id: o.id + '·d' + i, comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: mon,
          monto: (Number(p.monto) || 0), motivo: ref, opId: o.id, coll: 'mayoristaOps', auto: true, efectivo: false }); });
      } else if (o.formaRetiro === 'cuenta corriente' && pataLista(o.patasHechas, 'divisa', true)) out.push({
        id: o.id + '·d', comisionistaId: o.comisionistaId, fecha: o.fecha, moneda: mon,
        monto: q, motivo: ref, opId: o.id, coll: 'mayoristaOps', auto: true, efectivo: false });
    });
    // cada pata de un cable acredita cta. cte. en cuanto ESA pata se marca completada, igual que cambio/cripto
    (d.cables || []).filter(c => !c.cancelado).forEach(c => {
      const m = Number(c.monto) || 0;
      const esSubida = c.tipo === 'Subida';
      const calc = this.cableCalc(c);
      const gatedSumaCC = (partes, keyBase, total, formaUnica) => Array.isArray(partes) && partes.length
        ? partes.reduce((a, p, i) => a + (p.forma === 'cuenta corriente' && pataLista(c.patasHechas, keyBase + '-' + i, true) ? (Number(p.monto) || 0) : 0), 0)
        : (formaUnica === 'cuenta corriente' && pataLista(c.patasHechas, keyBase, true) ? total : 0);
      const mayCC = gatedSumaCC(c.partesMayorista, 'mayorista', calc.montoMayorista, c.formaMayorista);
      const cliCC = gatedSumaCC(c.partesCliente, 'cliente', calc.montoCliente, c.formaCliente);
      const etiqueta = (esSubida ? 'Subida de ' : 'Bajada de ') + usd(m);
      if (mayCC) out.push({ id: c.id + '·may', comisionistaId: c.comisionistaId, fecha: c.fecha, moneda: 'USD',
        monto: esSubida ? -mayCC : mayCC, motivo: etiqueta + (esSubida ? ' transferida' : ' recibida'), opId: c.id, coll: 'cables', auto: true, efectivo: false });
      if (cliCC) out.push({ id: c.id + '·cli', clienteId: c.clienteId, fecha: c.fecha, moneda: 'USD',
        monto: esSubida ? cliCC : -cliCC, motivo: etiqueta + (esSubida ? ' recibida' : ' acreditada'), opId: c.id, coll: 'cables', auto: true, efectivo: false });
    });
    (d.ctacte || []).forEach(m => out.push(Object.assign({ auto: false }, m)));
    return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  ccUsd(d, mon, v, tc) {
    const p = d.params;
    if (mon === 'ARS') return tc ? v / tc : 0;
    if (mon === 'EUR') return v * (p.crossEurC || 1);
    if (mon === 'BRL') return v / (p.crossBrlC || 5.5);
    if (mon === 'LBR') return v * (p.crossGbpC || 1);
    return v;
  }

  // FIFO: fecha del saldo más viejo todavía sin cubrir
  antiguedad(movs) {
    const cola = [];
    movs.forEach(m => {
      let v = Number(m.monto) || 0;
      while (v && cola.length && (cola[0].v > 0) !== (v > 0)) {
        const take = Math.min(Math.abs(v), Math.abs(cola[0].v)) * (v > 0 ? 1 : -1);
        cola[0].v += take; v -= take;
        if (Math.abs(cola[0].v) < 0.005) cola.shift();
      }
      if (Math.abs(v) > 0.005) cola.push({ v: v, fecha: m.fecha });
    });
    return cola.length ? cola[0].fecha : null;
  }

  cuentas(d, tc) {
    const movs = this.movimientosCC(d);
    const build = (titular, tipo, mc) => {
      const porMon = {};
      mc.forEach(m => { porMon[m.moneda] = (porMon[m.moneda] || 0) + (Number(m.monto) || 0); });
      const monedas = Object.keys(porMon).filter(k => Math.abs(porMon[k]) > 0.005);
      const usdTotal = monedas.reduce((a, k) => a + this.ccUsd(d, k, porMon[k], tc), 0);
      let vieja = null;
      monedas.forEach(k => {
        const fx = this.antiguedad(mc.filter(m => m.moneda === k));
        if (fx && (!vieja || fx < vieja)) vieja = fx;
      });
      return { cliente: titular, tipo: tipo, codigo: tipo === 'comisionista' ? this.codigoComisionista(titular.numero) : this.codigoCliente(titular.numero),
        movs: mc, porMon: porMon, monedas: monedas, usd: usdTotal, desde: vieja };
    };
    return d.clientes.map(c => build(c, 'cliente', movs.filter(m => m.clienteId === c.id)))
      .concat((d.comisionistas || []).map(c => build(c, 'comisionista', movs.filter(m => m.comisionistaId === c.id || m.clienteId === c.id))));
  }

  // qué le falta a una operación para quedar completa: una fila por cada pata que implica una acción
  // física (efectivo, transferencia); cuenta corriente no aparece porque no hay nada que hacer ahora.
  accionablesDe(tipo, r, toggleOverride) {
    const hechas = r.patasHechas || {};
    const subidaDefault = tipo === 'cables' && r.tipo === 'Subida';
    const items = [];
    const locTxt = (dir, lugar, entrega) => {
      if (lugar === 'domicilio') return (dir === 'entrega' ? 'se lleva a domicilio' : 'se retira a domicilio') + (entrega ? ' (' + entrega + ')' : '');
      return dir === 'entrega' ? 'se entrega en la oficina' : 'se recibe en la oficina';
    };
    const add = (key, label, esCC) => {
      const done = Object.prototype.hasOwnProperty.call(hechas, key) ? !!hechas[key] : (esCC ? true : subidaDefault);
      items.push({ key: key, label: label, esCC: !!esCC, done: done,
        labelStyle: done ? 'text-decoration:line-through;color:var(--color-neutral-500)' : '',
        btnLabel: done ? 'Completado' : 'Pendiente', btnStyle: badgeStyle(false, done),
        puedeMarcar: !done, puedeReabrir: done,
        toggle: toggleOverride ? () => toggleOverride(key) : () => this.togglePata(tipo, r.id, key) });
    };
    if (tipo === 'ops' || tipo === 'cripto' || tipo === 'mayoristaOps') {
      const monP = r.monedaPago || 'ARS', monD = r.moneda || 'USD';
      const q = parseNum(r.cantidad) || 0, tc = parseNum(r.tc) || 0;
      const montoPago = r.montoPago !== undefined ? (parseNum(r.montoPago) || 0) : (q * tc);
      if (Array.isArray(r.partesPago) && r.partesPago.length) {
        r.partesPago.forEach((p, i) => { const m = parseNum(p.monto) || 0, cc = p.forma === 'cuenta corriente';
          add('pago-' + i, cc ? ('Acreditar ' + money(m, monedaSimbolo(monP)) + ' — en cuenta corriente') : ('Entregar ' + money(m, monedaSimbolo(monP)) + ' — ' + p.forma + (p.forma === 'efectivo' ? ', ' + locTxt('entrega', p.lugar, p.entrega) : '')), cc); });
      } else if (r.formaPago === 'cuenta corriente') {
        add('pago', 'Acreditar ' + money(montoPago, monedaSimbolo(monP)) + ' — en cuenta corriente', true);
      } else {
        add('pago', 'Entregar ' + money(montoPago, monedaSimbolo(monP)) + ' — ' + (r.formaPago || 'efectivo') + ((r.formaPago || 'efectivo') === 'efectivo' ? ', ' + locTxt('entrega', r.lugarPago, r.entregaPago) : ''));
      }
      if (Array.isArray(r.partesDivisa) && r.partesDivisa.length) {
        r.partesDivisa.forEach((p, i) => { const m = parseNum(p.monto) || 0, cc = p.forma === 'cuenta corriente';
          add('divisa-' + i, cc ? ('Acreditar ' + money(m, monedaSimbolo(monD)) + ' — en cuenta corriente') : ('Recibir ' + money(m, monedaSimbolo(monD)) + ' — ' + p.forma + (p.forma === 'efectivo' ? ', ' + locTxt('recibe', p.lugar, p.entrega) : '')), cc); });
      } else if (r.formaRetiro === 'cuenta corriente') {
        add('divisa', 'Acreditar ' + money(q, monedaSimbolo(monD)) + ' — en cuenta corriente', true);
      } else {
        add('divisa', 'Recibir ' + money(q, monedaSimbolo(monD)) + ' — ' + (r.formaRetiro || 'efectivo') + ((r.formaRetiro || 'efectivo') === 'efectivo' ? ', ' + locTxt('recibe', r.lugarDivisa, r.entregaDivisa) : ''));
      }
    } else {
      const calc = this.cableCalc(r);
      const dirMayorista = subidaDefault ? 'entrega' : 'recibe';
      const dirCliente = subidaDefault ? 'recibe' : 'entrega';
      if (Array.isArray(r.partesMayorista) && r.partesMayorista.length) {
        r.partesMayorista.forEach((p, i) => { const m = parseNum(p.monto) || 0, cc = p.forma === 'cuenta corriente';
          add('mayorista-' + i, cc ? ('Acreditar ' + usd(m) + ' — en cuenta corriente') : ('Mayorista — ' + usd(m) + ' — ' + p.forma + (p.forma === 'efectivo' ? ', ' + locTxt(dirMayorista, p.lugar, p.entrega) : '')), cc); });
      } else if (r.formaMayorista === 'cuenta corriente') {
        add('mayorista', 'Acreditar ' + usd(calc.montoMayorista) + ' — en cuenta corriente', true);
      } else {
        add('mayorista', 'Mayorista — ' + usd(calc.montoMayorista) + ' — ' + (r.formaMayorista || 'efectivo') + ((r.formaMayorista || 'efectivo') === 'efectivo' ? ', ' + locTxt(dirMayorista, r.lugarMayorista, r.entregaMayorista) : ''));
      }
      if (Array.isArray(r.partesCliente) && r.partesCliente.length) {
        r.partesCliente.forEach((p, i) => { const m = parseNum(p.monto) || 0, cc = p.forma === 'cuenta corriente';
          add('cliente-' + i, cc ? ('Acreditar ' + usd(m) + ' — en cuenta corriente') : ('Cliente — ' + usd(m) + ' — ' + p.forma + (p.forma === 'efectivo' ? ', ' + locTxt(dirCliente, p.lugar, p.entrega) : '')), cc); });
      } else if (r.formaCliente === 'cuenta corriente') {
        add('cliente', 'Acreditar ' + usd(calc.montoCliente) + ' — en cuenta corriente', true);
      } else {
        add('cliente', 'Cliente — ' + usd(calc.montoCliente) + ' — ' + (r.formaCliente || 'efectivo') + ((r.formaCliente || 'efectivo') === 'efectivo' ? ', ' + locTxt(dirCliente, r.lugarCliente, r.entregaCliente) : ''));
      }
    }
    const itemsDone = items.every(function (it) { return it.done; });
    const patasAll = Object.keys(hechas).every(function (k) { return !!hechas[k]; });
    return { items: items, todoCompleto: itemsDone && patasAll };
  }

  // recalcula ok (ops/cripto) o estado (cables) a partir de las patas marcadas — es la única fuente de verdad
  recomputeEstado(coll, r) {
    const todoCompleto = this.accionablesDe(coll, r).todoCompleto;
    if (coll === 'cables') {
      if (r.cancelado) { r.estado = 'cancelado'; return; }
      const eraEjecutado = r.estado === 'ejecutado';
      r.estado = todoCompleto ? 'ejecutado' : 'pendiente';
      r.fechaEjecucion = todoCompleto ? ((eraEjecutado && r.fechaEjecucion) ? r.fechaEjecucion : today()) : null;
    } else {
      if (r.cancelado) { r.ok = 'cancelado'; return; }
      r.ok = todoCompleto ? ENTREGADO : 'pendiente';
    }
  }

  togglePata(coll, id, key) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (!r) return;
    if (r.fecha && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'cambiar el estado');
    r.patasHechas = Object.assign({}, r.patasHechas);
    r.patasHechas[key] = !r.patasHechas[key];
    this.recomputeEstado(coll, r);
    this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d) + ' → ' + (coll === 'cables' ? r.estado : r.ok));
    this.persist(d);
  }

  marcarTodoCompleto(coll, id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (!r) return;
    if (r.fecha && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'cambiar el estado');
    const items = this.accionablesDe(coll, r).items;
    r.patasHechas = Object.assign({}, r.patasHechas);
    items.forEach(function (it) { r.patasHechas[it.key] = true; });
    this.recomputeEstado(coll, r);
    this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d) + ' → completa');
    this.persist(d);
  }

  reabrirTodo(coll, id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (!r) return;
    if (r.fecha && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'cambiar el estado');
    const items = this.accionablesDe(coll, r).items;
    r.patasHechas = Object.assign({}, r.patasHechas);
    items.forEach(function (it) { r.patasHechas[it.key] = false; });
    this.recomputeEstado(coll, r);
    this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d) + ' → reabierta');
    this.persist(d);
  }

  cicloCable(id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const c = d.cables.find(x => x.id === id);
    if (!c) return this.persist(d);
    if (c.fecha && this.diaCerrado(d, c.fecha)) return this.avisarCerrado(c.fecha, 'cambiar el estado');
    if (c.cancelado) return;
    const completo = !this.accionablesDe('cables', c).todoCompleto;
    if (completo && !window.confirm('¿Marcar este cable como completado? Se darán por entregadas/recibidas todas las partes.')) return;
    const items = this.accionablesDe('cables', c).items;
    c.patasHechas = {};
    items.forEach(function (it) { c.patasHechas[it.key] = completo; });
    this.recomputeEstado('cables', c);
    this.auditar(d, 'estado', 'cable', id, this.resumenReg('cables', c, d));
    this.persist(d);
  }

  irAClienteOComisionista(id) {
    this.navPush();
    const d = this.state.data;
    const esCom = (d.comisionistas || []).some(c => c.id === id);
    this.setState(esCom ? { screen: 'clientes', vista: 'fichaComisionista', comisionistaSel: id } : { screen: 'clientes', vista: 'ficha', cliente: id });
  }

  cancelarOperacion(coll, id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (!r) return;
    if (r.fecha && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'cambiar el estado');
    r.cancelado = !r.cancelado;
    if (r.cancelado) {
      const items = this.accionablesDe(coll, r).items;
      r.patasHechas = {};
      items.forEach(it => { r.patasHechas[it.key] = false; });
    }
    this.recomputeEstado(coll, r);
    this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d));
    this.persist(d);
  }

  // --- importador de la planilla de apertura: carga inicial, no función recurrente ---
  parseCSV(text) {
    const lineas = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
    if (!lineas.length) return { headers: [], rows: [] };
    const sep = lineas[0].indexOf(';') > lineas[0].indexOf(',') ? ';' : ',';
    const partir = (l) => l.split(sep).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
    const headers = partir(lineas[0]);
    const rows = lineas.slice(1).map(partir);
    return { headers, rows };
  }

  impSugerirMapeo(headers, campos) {
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const map = {};
    campos.forEach(c => {
      const target = norm(c.label) + '|' + norm(c.k);
      let idx = headers.findIndex(h => target.indexOf(norm(h)) >= 0 && norm(h).length > 1);
      if (idx < 0) idx = headers.findIndex(h => norm(h).indexOf(norm(c.k)) >= 0);
      map[c.k] = idx >= 0 ? idx : -1;
    });
    return map;
  }

  impOnFileInput(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) this.impProcesarArchivo(file);
  }

  impProcesarArchivo(file) {
    const ent = ENTIDADES_IMPORT[this.state.impEntidadIdx || 0];
    if (!/\.csv$/i.test(file.name)) {
      this.setState({ impDatos: Object.assign({}, this.state.impDatos, { [ent.id]: { error: 'Formato no soportado: subí un archivo .csv (exportá tu planilla de Excel como CSV).' } }) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = this.parseCSV(String(reader.result || ''));
      if (!rows.length) {
        this.setState({ impDatos: Object.assign({}, this.state.impDatos, { [ent.id]: { error: 'El archivo no tiene filas de datos.' } }) });
        return;
      }
      const mapeo = this.impSugerirMapeo(headers, ent.campos);
      const datos = Object.assign({}, this.state.impDatos, { [ent.id]: { archivo: file.name, headers, rows, mapeo, lista: false } });
      this.setState({ impDatos: datos, impPaso: 'mapeo' });
    };
    reader.readAsText(file);
  }

  impSetMapeo(entId, campoK, idx) {
    const datos = JSON.parse(JSON.stringify(this.state.impDatos));
    datos[entId].mapeo[campoK] = idx;
    this.setState({ impDatos: datos });
  }

  impFilasValidadas(ent) {
    const dat = (this.state.impDatos || {})[ent.id];
    if (!dat || !dat.rows) return [];
    return dat.rows.map((row, i) => {
      const valores = {};
      ent.campos.forEach(c => { const idx = dat.mapeo[c.k]; valores[c.k] = (dat.editado && dat.editado[i] && dat.editado[i][c.k] !== undefined) ? dat.editado[i][c.k] : (idx >= 0 && idx < row.length ? row[idx] : ''); });
      const errores = [];
      ent.campos.forEach(c => {
        const v = (valores[c.k] || '').toString().trim();
        if (c.req && !v) errores.push(c.label + ': falta');
        else if (c.num && v && !soloComa(v)) errores.push(c.label + ': no es un número válido');
        else if (c.opciones && v && c.opciones.indexOf(v) < 0) errores.push(c.label + ': "' + v + '" no coincide con ninguna opción válida');
      });
      // los valores faltantes o mal escritos se corrigen en la tabla; una opción que no matchea (moneda o parámetro
      // desconocido) es bloqueante porque no se puede inventar cuál era la intención — hay que corregir la planilla.
      const bloqueante = ent.campos.some(c => c.opciones && ((valores[c.k] || '').toString().trim()) && c.opciones.indexOf((valores[c.k] || '').toString().trim()) < 0);
      return { i, valores, errores, bloqueante, ok: errores.length === 0 };
    });
  }

  impEditarValor(entId, rowIdx, campoK, valor) {
    const datos = JSON.parse(JSON.stringify(this.state.impDatos));
    if (!datos[entId].editado) datos[entId].editado = {};
    if (!datos[entId].editado[rowIdx]) datos[entId].editado[rowIdx] = {};
    datos[entId].editado[rowIdx][campoK] = valor;
    this.setState({ impDatos: datos });
  }

  impConfirmarEntidad(entId) {
    const datos = JSON.parse(JSON.stringify(this.state.impDatos));
    datos[entId].lista = true;
    const idx = ENTIDADES_IMPORT.findIndex(e => e.id === entId);
    const hayMas = idx < ENTIDADES_IMPORT.length - 1;
    this.setState({ impDatos: datos, impEntidadIdx: hayMas ? idx + 1 : idx, impPaso: hayMas ? 'subida' : 'confirmar' });
  }

  impOmitirEntidad(entId) {
    const idx = ENTIDADES_IMPORT.findIndex(e => e.id === entId);
    const hayMas = idx < ENTIDADES_IMPORT.length - 1;
    this.setState({ impEntidadIdx: hayMas ? idx + 1 : idx, impPaso: hayMas ? 'subida' : 'confirmar' });
  }

  impIrEntidad(idx) {
    const ent = ENTIDADES_IMPORT[idx];
    const tieneDatos = this.state.impDatos && this.state.impDatos[ent.id] && this.state.impDatos[ent.id].rows;
    this.setState({ impEntidadIdx: idx, impPaso: tieneDatos ? 'preview' : 'subida' });
  }

  impReiniciar() {
    this.setState({ impDatos: {}, impEntidadIdx: 0, impPaso: 'subida', impReimportarTexto: '', impResultado: null });
  }

  impConfirmarImportacion() {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const datos = this.state.impDatos || {};
    const fecha = today();
    const resumen = {};
    // clientes primero: ctacte necesita que ya existan
    const entClientes = ENTIDADES_IMPORT[0];
    if (datos.clientes && datos.clientes.lista) {
      let creados = 0, repetidos = 0;
      this.impFilasValidadas(entClientes).forEach(f => {
        if (!f.ok) return;
        const nombre = (f.valores.nombre || '').trim();
        if (!nombre) return;
        if ((d.clientes || []).some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) { repetidos++; return; }
        const dom = (f.valores.domicilio || '').trim();
        d.clientes.push({ id: uid(), numero: d.clientes.length + 1, nombre, contacto: (f.valores.contacto || '').trim(),
          obs: (f.valores.obs || '').trim() || '—', alta: fecha,
          direcciones: dom ? [{ alias: 'Principal', calle: dom, geo: null, piso: '', obs: '' }] : [] });
        creados++;
      });
      resumen.clientes = { creados, repetidos };
    }
    const entCtacte = ENTIDADES_IMPORT[1];
    if (datos.ctacte && datos.ctacte.lista) {
      let creados = 0, sinCliente = 0;
      this.impFilasValidadas(entCtacte).forEach(f => {
        if (!f.ok) return;
        const nombre = (f.valores.cliente || '').trim();
        const cli = (d.clientes || []).find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
        if (!cli) { sinCliente++; return; }
        d.ctacte.push({ id: uid(), clienteId: cli.id, fecha, moneda: f.valores.moneda, monto: parseNum(f.valores.monto),
          tipoMov: 'Saldo de apertura', motivo: 'Importado — saldo de apertura', efectivo: false, lugar: '', entrega: '' });
        creados++;
      });
      resumen.ctacte = { creados, sinCliente };
    }
    const entCaja = ENTIDADES_IMPORT[2];
    if (datos.caja && datos.caja.lista) {
      let creados = 0;
      this.impFilasValidadas(entCaja).forEach(f => {
        if (!f.ok) return;
        d.aportes.push({ id: uid(), socio: 'Apertura', fecha, moneda: f.valores.moneda, monto: parseNum(f.valores.monto), concepto: 'Saldo de apertura (importador)' });
        creados++;
      });
      resumen.caja = { creados };
    }
    const entMargenes = ENTIDADES_IMPORT[3];
    if (datos.margenes && datos.margenes.lista) {
      let aplicados = 0;
      this.impFilasValidadas(entMargenes).forEach(f => {
        if (!f.ok) return;
        const def = MARGEN_DEFS.find(m => m.label === (f.valores.parametro || '').trim());
        if (!def) return;
        d.params[def.k] = parseNum(f.valores.valor);
        aplicados++;
      });
      resumen.margenes = { aplicados };
    }
    d.importAperturaHecha = { fecha, resumen };
    this.auditar(d, 'alta', 'importación de apertura', 'importador', JSON.stringify(resumen));
    this.persist(d);
    this.setState({ impPaso: 'resultado', impResultado: resumen });
  }

  descargarCSV(nombre, filas) {
    const nl = String.fromCharCode(10);
    const csv = filas.map(r => r.map(v => '"' + String(v).split('"').join('""') + '"').join(';')).join(nl);
    const blob = new Blob([String.fromCharCode(65279) + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  cajaActual(d, serie) {
    const cap = serie.cap, u = serie.ultimo;
    const sal = u ? u.saldos : { USD: cap.usd, EUR: cap.eur, USDT: cap.usdt };
    return { pesos: u ? u.sPesos : cap.pesos, usd: sal.USD || 0, eur: sal.EUR || 0, usdt: sal.USDT || 0, saldos: sal, cap: cap };
  }

  // fondos que siguen físicamente en caja pero ya están comprometidos: la pata que le debemos entregar al
  // cliente (monedaPago vía formaPago/partesPago) todavía no se marcó Completada en el checklist de patas.
  // signo: negativo = lo debemos (pata "pago"/mayorista según tipo, saldrá de la caja al completarse),
  // positivo = nos lo deben (pata "divisa"/cliente según tipo, entrará a la caja al completarse).
  pendientePorMoneda(d, hastaFecha) {
    const out = {};
    const add = (mon, v) => { if (v) out[mon] = (out[mon] || 0) + v; };
    ['ops', 'cripto', 'mayoristaOps'].forEach(coll => {
      (d[coll] || []).filter(o => !o.cancelado && (!hastaFecha || o.fecha <= hastaFecha)).forEach(o => {
        const monPago = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
        const monDiv = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || (coll === 'cripto' ? 'USDT' : 'USD'));
        const total = (Number(o.cantidad) || 0) * (Number(o.tc) || 0);
        const q = Number(o.cantidad) || 0;
        // pata "pago" (lo que vendemos/entregamos) pendiente: lo debemos → negativo
        if (Array.isArray(o.partesPago) && o.partesPago.length) {
          o.partesPago.forEach((p, i) => {
            if (p.forma === 'cuenta corriente') return;
            if (!pataLista(o.patasHechas, 'pago-' + i, false)) add(monPago, -(Number(p.monto) || 0));
          });
        } else if (o.formaPago && o.formaPago !== 'cuenta corriente' && !pataLista(o.patasHechas, 'pago', false)) {
          add(monPago, -total);
        }
        // pata "divisa" (lo que compramos/recibimos) pendiente: nos la deben → positivo
        if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) {
          o.partesDivisa.forEach((p, i) => {
            if (p.forma === 'cuenta corriente') return;
            if (!pataLista(o.patasHechas, 'divisa-' + i, false)) add(monDiv, Number(p.monto) || 0);
          });
        } else if (o.formaRetiro && o.formaRetiro !== 'cuenta corriente' && !pataLista(o.patasHechas, 'divisa', false)) {
          add(monDiv, q);
        }
      });
    });
    (d.cables || []).filter(c => !c.cancelado && (!hastaFecha || c.fecha <= hastaFecha)).forEach(c => {
      const calc = this.cableCalc(c);
      const esSubida = c.tipo === 'Subida';
      // mismo signo que el efecto en caja al completarse (ver movDiv.USD en serie()): Bajada → mayorista suma, cliente resta; Subida → al revés.
      const signoMay = esSubida ? -1 : 1, signoCli = esSubida ? 1 : -1;
      if (Array.isArray(c.partesMayorista) && c.partesMayorista.length) {
        c.partesMayorista.forEach((p, i) => { if (p.forma !== 'cuenta corriente' && !pataLista(c.patasHechas, 'mayorista-' + i, false)) add('USD', signoMay * (Number(p.monto) || 0)); });
      } else if (c.formaMayorista && c.formaMayorista !== 'cuenta corriente' && !pataLista(c.patasHechas, 'mayorista', false)) {
        add('USD', signoMay * calc.montoMayorista);
      }
      if (Array.isArray(c.partesCliente) && c.partesCliente.length) {
        c.partesCliente.forEach((p, i) => { if (p.forma !== 'cuenta corriente' && !pataLista(c.patasHechas, 'cliente-' + i, false)) add('USD', signoCli * (Number(p.monto) || 0)); });
      } else if (c.formaCliente && c.formaCliente !== 'cuenta corriente' && !pataLista(c.patasHechas, 'cliente', false)) {
        add('USD', signoCli * calc.montoCliente);
      }
    });
    return out;
  }

  // convierte un monto de cualquier moneda a USD, al tipo de cambio de mercado actual (aproximado, para agregados de volumen)
  monedaAUsd(d, moneda, monto, tipo) {
    const t = tipo || 'compra';
    if (moneda === 'ARS') return this.aUsd(d, monto, t);
    if (moneda === 'USD' || moneda === 'USDT' || moneda === 'USD cara chica') return monto;
    const u = this.mercadoUsd(d, t), ref = this.refMercado(d, t, moneda);
    return (u && ref) ? monto * ref / u : monto;
  }

  // valuación a USD de un saldo extranjero (mismo criterio que "valuar" en serie(): cruces de compra), para el patrimonio de hoy
  currencyToUsd(d, moneda, monto) {
    if (moneda === 'USD' || moneda === 'USDT' || moneda === 'USD cara chica') return monto;
    const p = d.params;
    if (moneda === 'EUR') return monto * (p.crossEurC || 1);
    if (moneda === 'BRL') return monto / (p.crossBrlC || 5.5);
    if (moneda === 'LBR') return monto * (p.crossGbpC || 1);
    return this.monedaAUsd(d, moneda, monto, 'compra');
  }

  // breakdown del patrimonio actual (saldos de caja al último cierre) valuado a USD, moneda por moneda
  patrimonioBreakdown(d, caja) {
    const pend = this.pendientePorMoneda(d);
    const val = (mon, v) => mon === 'ARS' ? this.aUsd(d, v, 'compra') : this.currencyToUsd(d, mon, v);
    const usdNativo = (caja.saldos.USD || 0) + (caja.saldos['USD cara chica'] || 0) + (pend.USD || 0) + (pend['USD cara chica'] || 0);
    const fijas = ['ARS', 'USD', 'USDT', 'EUR', 'LBR'];
    const montoDe = (mon) => mon === 'ARS' ? caja.pesos + (pend.ARS || 0) : mon === 'USD' ? usdNativo : (caja.saldos[mon] || 0) + (pend[mon] || 0);
    const excl = fijas.concat(['USD cara chica']);
    const extra = Object.keys(caja.saldos).filter(k => excl.indexOf(k) < 0 && Math.abs(caja.saldos[k] || 0) > 0.005);
    const filas = fijas.concat(extra).map(mon => { const monto = montoDe(mon); return { moneda: mon, monto, usd: val(mon, monto) }; });
    return { filas, totalUsd: filas.reduce((a, f) => a + f.usd, 0) };
  }

  // barras de una sola serie (sin apilar), con total arriba y tooltip flotante — usadas para la evolución del patrimonio
  barrasSimple(rows, getter, formatter) {
    const vals = rows.map(getter);
    const max = Math.max(1, ...vals.map(v => Math.abs(v)));
    return rows.map((r, i) => {
      const v = vals[i], texto = formatter(v);
      return { label: dmy(r.fecha), totalTexto: texto,
        altura: (Math.abs(v) / max * 86) + '%',
        onEnter: (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: dmy(r.fecha), value: texto } }),
        onLeave: () => this.setState({ chartTip: null }) };
    });
  }

  inicioSemana(fecha) {
    const t = new Date(fecha + 'T00:00:00');
    t.setDate(t.getDate() - (t.getDay() + 6) % 7);
    return t.toISOString().slice(0, 10);
  }

  mesLabelCorto(k) {
    const p = k.split('-');
    return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(p[1]) - 1] + ' \u2019' + p[0].slice(2);
  }

  // arma slices SVG (para tooltip nativo por porción) + leyenda a partir de [{label,value,color}]
  armarTorta(items) {
    // el % de cada porción es sobre la suma de las porciones positivas (lo que se dibuja),
    // no sobre el neto total — si hay posiciones negativas que compensan, el neto puede ser
    // chico o negativo y no sirve como denominador de un gráfico que solo dibuja positivos.
    const total = items.filter(i => i.value > 0).reduce((a, i) => a + (i.value || 0), 0);
    if (!total) return { slices: [], legend: [], sinDatos: true };
    const cx = 65, cy = 65, r = 60;
    let angle = -90;
    const slices = items.filter(i => i.value > 0).map(i => {
      const frac = i.value / total, sweep = frac * 360;
      const a0 = angle * Math.PI / 180, a1 = (angle + sweep) * Math.PI / 180;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = sweep > 180 ? 1 : 0;
      const d = sweep >= 359.9 ? ('M' + cx + ',' + (cy - r) + ' A' + r + ',' + r + ' 0 1 1 ' + (cx - 0.01) + ',' + (cy - r) + ' Z')
        : ('M' + cx + ',' + cy + ' L' + x0.toFixed(2) + ',' + y0.toFixed(2) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ',' + y1.toFixed(2) + ' Z');
      angle += sweep;
      const label = i.label, valor = usd(i.value);
      return { d, color: i.color, titulo: label + ': ' + Math.round(frac * 100) + '% (' + valor + ')',
        onEnter: (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: label, value: valor } }),
        onLeave: () => this.setState({ chartTip: null }) };
    });
    return { slices, sinDatos: false,
      legend: items.filter(i => i.value > 0).map(i => ({ label: i.label, color: i.color, pct: Math.round(i.value / total * 100) + '%' })) };
  }

  // series de líneas normalizadas (cada una a su propio rango) para comparar formas en un mismo gráfico chico
  lineaSeries(rows, defs) {
    const W = 480, H = 150, pad = 6;
    const n = rows.length;
    const series = defs.map(s => {
      const vals = rows.map(s.get);
      const min = Math.min(0, ...vals), max = Math.max(0, ...vals), span = (max - min) || 1;
      const pts = vals.map((v, i) => {
        const x = n <= 1 ? W / 2 : (i / (n - 1)) * W;
        const y = H - pad - ((v - min) / span) * (H - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      return { points: pts, color: s.color, ultimo: vals.length ? vals[vals.length - 1] : 0 };
    });
    return { series, viewBox: '0 0 ' + W + ' ' + H, sinDatos: n === 0 };
  }

  // Sección Volúmenes del Tablero: barras apiladas por tipo de operación (USD y cantidad), tortas por par y por tipo
  volumenesData(d, desde, hasta, agrupar) {
    const TIPOS = [
      { k: 'cambio', label: 'Cambio', color: 'var(--color-accent-300)' },
      { k: 'cripto', label: 'Cripto', color: 'var(--color-accent-600)' },
      { k: 'cable', label: 'Cables', color: 'var(--color-accent-900)' },
      { k: 'mayorista', label: 'Tesorería', color: 'var(--color-neutral-700)' }
    ];
    const items = [];
    const esUsdLikeVol = (m) => m === 'USD' || m === 'USDT' || m === 'USD cara chica';
    const volUsdDe = (q, tc, monA, monB, tipo) => esUsdLikeVol(monB) ? q : (esUsdLikeVol(monA) ? q * tc : this.monedaAUsd(d, monA, q * tc, tipo));
    (d.ops || []).filter(o => o.ok === ENTREGADO && o.fecha >= desde && o.fecha <= hasta).forEach(o => {
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      items.push({ fecha: o.fecha, tipo: 'cambio', usd: volUsdDe(Number(o.cantidad) || 0, Number(o.tc) || 0, monA, mon, o.tipo), par: monA + ' / ' + mon });
    });
    (d.cripto || []).filter(o => o.ok === ENTREGADO && o.fecha >= desde && o.fecha <= hasta).forEach(o => {
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const mon = o.moneda || 'USDT';
      items.push({ fecha: o.fecha, tipo: 'cripto', usd: volUsdDe(Number(o.cantidad) || 0, Number(o.tc) || 0, monA, mon, o.tipo), par: monA + ' / ' + mon });
    });
    (d.cables || []).filter(c => c.estado === 'ejecutado' && c.fecha >= desde && c.fecha <= hasta).forEach(c => {
      items.push({ fecha: c.fecha, tipo: 'cable', usd: Number(c.monto) || 0, par: 'Cable USD' });
    });
    (d.mayoristaOps || []).filter(o => o.ok === ENTREGADO && o.fecha >= desde && o.fecha <= hasta).forEach(o => {
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      items.push({ fecha: o.fecha, tipo: 'mayorista', usd: volUsdDe(Number(o.cantidad) || 0, Number(o.tc) || 0, monA, mon, 'compra'), par: monA + ' / ' + mon });
    });
    const bucketOf = (f) => agrupar === 'mes' ? f.slice(0, 7) : agrupar === 'semana' ? this.inicioSemana(f) : f;
    const labelOf = (k) => agrupar === 'mes' ? this.mesLabelCorto(k) : agrupar === 'semana' ? 'sem ' + dmy(k) : dmy(k);
    const buckets = {};
    items.forEach(it => {
      const k = bucketOf(it.fecha);
      if (!buckets[k]) buckets[k] = { cambio: 0, cripto: 0, cable: 0, mayorista: 0, nCambio: 0, nCripto: 0, nCable: 0, nMayorista: 0 };
      buckets[k][it.tipo] += it.usd;
      buckets[k]['n' + it.tipo[0].toUpperCase() + it.tipo.slice(1)] += 1;
    });
    const keys = Object.keys(buckets).sort();
    const maxUsd = Math.max(1, ...keys.map(k => buckets[k].cambio + buckets[k].cripto + buckets[k].cable + buckets[k].mayorista));
    const maxCant = Math.max(1, ...keys.map(k => buckets[k].nCambio + buckets[k].nCripto + buckets[k].nCable + buckets[k].nMayorista));
    const barrasUsd = keys.map(k => {
      const b = buckets[k];
      const tCambio = 'Cambio: ' + usd(b.cambio), tCripto = 'Cripto: ' + usd(b.cripto), tCable = 'Cables: ' + usd(b.cable), tMayorista = 'Tesorería: ' + usd(b.mayorista);
      const tip = (nombre, valor) => (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: nombre, value: valor } });
      return { label: labelOf(k), titulo: labelOf(k) + ': ' + usd(b.cambio + b.cripto + b.cable + b.mayorista),
        totalTexto: usd(b.cambio + b.cripto + b.cable + b.mayorista),
        onEnter: (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: labelOf(k), value: tCambio + ' · ' + tCripto + ' · ' + tCable + ' · ' + tMayorista } }),
        onEnterCambio: tip('Cambio', usd(b.cambio)), onEnterCripto: tip('Cripto', usd(b.cripto)), onEnterCable: tip('Cables', usd(b.cable)), onEnterMayorista: tip('Tesorería', usd(b.mayorista)),
        onLeave: () => this.setState({ chartTip: null }),
        alturaCable: (b.cable / maxUsd * 86) + '%', alturaCripto: (b.cripto / maxUsd * 86) + '%', alturaCambio: (b.cambio / maxUsd * 86) + '%', alturaMayorista: (b.mayorista / maxUsd * 86) + '%' };
    });
    const barrasCant = keys.map(k => {
      const b = buckets[k], tot = b.nCambio + b.nCripto + b.nCable + b.nMayorista;
      const tCambio = 'Cambio: ' + b.nCambio, tCripto = 'Cripto: ' + b.nCripto, tCable = 'Cables: ' + b.nCable, tMayorista = 'Tesorería: ' + b.nMayorista;
      const tip = (nombre, valor) => (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: nombre, value: valor } });
      const opTxt = (n) => n + (n === 1 ? ' operación' : ' operaciones');
      const tCambioN = 'Cambio: ' + b.nCambio, tCriptoN = 'Cripto: ' + b.nCripto, tCableN = 'Cables: ' + b.nCable, tMayoristaN = 'Tesorería: ' + b.nMayorista;
      return { label: labelOf(k), titulo: labelOf(k) + ': ' + tot + ' operaci' + (tot === 1 ? 'ón' : 'ones'),
        onEnter: (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: labelOf(k), value: tCambioN + ' · ' + tCriptoN + ' · ' + tCableN + ' · ' + tMayoristaN } }),
        totalTexto: String(tot),
        onEnterCambio: tip('Cambio', opTxt(b.nCambio)), onEnterCripto: tip('Cripto', opTxt(b.nCripto)), onEnterCable: tip('Cables', opTxt(b.nCable)), onEnterMayorista: tip('Tesorería', opTxt(b.nMayorista)),
        onLeave: () => this.setState({ chartTip: null }),
        alturaCable: (b.nCable / maxCant * 86) + '%', alturaCripto: (b.nCripto / maxCant * 86) + '%', alturaCambio: (b.nCambio / maxCant * 86) + '%', alturaMayorista: (b.nMayorista / maxCant * 86) + '%' };
    });
    const porTipo = TIPOS.map(t => ({ label: t.label, color: t.color, value: items.filter(i => i.tipo === t.k).reduce((a, i) => a + i.usd, 0) }));
    const porPar = {};
    items.forEach(i => { porPar[i.par] = (porPar[i.par] || 0) + i.usd; });
    const paresOrd = Object.keys(porPar).map(k => ({ label: k, value: porPar[k] })).sort((a, b) => b.value - a.value);
    const coloresPie = ['var(--color-accent-300)', 'var(--color-accent-500)', 'var(--color-accent-700)', 'var(--color-accent-900)', 'var(--color-neutral-500)'];
    const resto = paresOrd.slice(5).reduce((a, p) => a + p.value, 0);
    const porPares = paresOrd.slice(0, 5).concat(resto > 0 ? [{ label: 'Otros', value: resto }] : []).map((p, i) => ({ label: p.label, value: p.value, color: coloresPie[i] || coloresPie[coloresPie.length - 1] }));
    return {
      tipos: TIPOS, barrasUsd, barrasCant, sinBarras: keys.length === 0,
      totalUsd: items.reduce((a, i) => a + i.usd, 0), totalCant: items.length,
      tortaPares: this.armarTorta(porPares), tortaTipos: this.armarTorta(porTipo)
    };
  }

  pct(d, k, def) { const v = d.params[k]; return (v === undefined ? def : (Number(v) || 0)) / 100; }
  fijo(d, k, def) { const v = d.params[k]; return v === undefined ? def : (Number(v) || 0); }

  mercadoUsd(d, tipo, fecha) {
    const q = this.ultimaCotiz(d, fecha), p = d.params;
    return tipo === 'venta' ? (Number(q.dv) || p.baseVenta) : (Number(q.dc) || p.baseCompra);
  }

  cross(d, moneda, tipo, fecha) {
    const kk = this.crossKeys(moneda), q = this.ultimaCotizPar(d, moneda, fecha);
    if (q) {
      const x = tipo === 'venta' ? (Number(q[kk[1]]) || Number(q[kk[0]])) : (Number(q[kk[0]]) || Number(q[kk[1]]));
      if (x) return x;
    }
    const p = d.params[kk[2] + (tipo === 'venta' ? 'V' : 'C')];
    return p === undefined ? 1 : Number(p) || 1;
  }

  // claves del par en la cotización de mercado + prefijo del parámetro de respaldo
  crossKeys(moneda) {
    return moneda === 'EUR' ? ['ec', 'ev', 'crossEur']
      : moneda === 'BRL' ? ['rc', 'rv', 'crossBrl'] : ['lc', 'lv', 'crossGbp'];
  }

  ultimaCotizPar(d, moneda, fecha) {
    const kk = this.crossKeys(moneda);
    const con = (d.cotiz || []).filter(q => (Number(q[kk[0]]) || Number(q[kk[1]])) && (!fecha || q.fecha <= fecha))
      .sort((a, b) => (a.fecha + a.momento).localeCompare(b.fecha + b.momento));
    return con[con.length - 1] || null;
  }

  refMercado(d, tipo, moneda, fecha) {
    const u = this.mercadoUsd(d, tipo, fecha);
    if (moneda === 'BRL') { const x = this.cross(d, 'BRL', tipo, fecha); return x ? u / x : 0; }
    if (moneda === 'EUR' || moneda === 'LBR') return u * this.cross(d, moneda, tipo, fecha);
    return u;
  }

  // referencia de mercado entre dos monedas cualesquiera del sistema, en unidades de monA (lo que vendemos) por unidad de monB (lo que compramos).
  // solo cuando alguna de las dos patas es ARS o USD, que son las que tenemos cotizadas; el resto se tipea a mano.
  precioEnPesos(d, tipo, m, fecha) { return m === 'ARS' ? 1 : this.precio(d, tipo, m, fecha); }

  refParEntre(d, monA, monB, tipo, fecha) {
    if (!monA || !monB || monA === monB) return 0;
    if (monA !== 'ARS' && monA !== 'USD' && monB !== 'ARS' && monB !== 'USD') return 0;
    const pa = this.precioEnPesos(d, tipo, monA, fecha), pb = this.precioEnPesos(d, tipo, monB, fecha);
    if (!pa || !pb) return 0;
    return pb / pa;
  }

  // igual que refParEntre pero contra el mercado puro (sin margen de la financiera), para mostrar de referencia
  refMercadoEntre(d, monA, monB, tipo, fecha) {
    if (!monA || !monB || monA === monB) return 0;
    if (monA !== 'ARS' && monA !== 'USD' && monB !== 'ARS' && monB !== 'USD') return 0;
    const pa = monA === 'ARS' ? 1 : this.refMercado(d, tipo, monA, fecha), pb = monB === 'ARS' ? 1 : this.refMercado(d, tipo, monB, fecha);
    if (!pa || !pb) return 0;
    return pb / pa;
  }

  // el TC se guarda siempre como monA (vendemos) por unidad de monB (compramos); pero se muestra en la cotización
  // habitual: ARS por unidad de la otra moneda si hay ARS en juego, sino USD por unidad de la otra si hay USD.
  // Si la moneda de referencia (ARS o USD) es la que vendemos, ya es la cotización natural; si es la que
  // compramos, se muestra invertida. Operación autoinversa (aplicarla dos veces devuelve el valor original).
  tcVista(monA, monB, valor) {
    const v = Number(valor) || 0;
    const ref = (monA === 'ARS' || monB === 'ARS') ? 'ARS' : ((monA === 'USD' || monB === 'USD') ? 'USD' : null);
    if (!ref || monA === ref) return v;
    return v ? 1 / v : 0;
  }

  // compra = estamos comprando la moneda que no es la de referencia (ARS, o si no hay ARS, USD); venta = la estamos vendiendo
  tipoDerivado(monA, monB) {
    const ref = (monA === 'ARS' || monB === 'ARS') ? 'ARS' : ((monA === 'USD' || monB === 'USD') ? 'USD' : null);
    if (!ref) return 'compra';
    return monA === ref ? 'compra' : 'venta';
  }

  // 2 decimales cuando ARS está en juego (como el resto de la financiera); 4 para cruces entre extranjeras (USD/EUR, USD/LBR, etc.)
  tcDecimales(monA, monB) { return (monA === 'ARS' || monB === 'ARS') ? 2 : 4; }

  codigoOp(coll, numero) { return (PREFIJO_OP[coll] || '') + String(numero || 0).padStart(2, '0'); }
  codigoCliente(numero) { return 'CL' + String(numero || 0).padStart(2, '0'); }
  codigoComisionista(numero) { return 'CO' + String(numero || 0).padStart(2, '0'); }

  // dólar de la financiera: mercado ± los pesos fijos. Es la base de todas las demás monedas.
  dolarFinanciera(d, tipo, fecha) {
    const u = this.mercadoUsd(d, tipo, fecha);
    return tipo === 'venta' ? u + this.fijo(d, 'usdLimpioVenta', 5) : u - this.fijo(d, 'usdLimpioCompra', 10);
  }

  precio(d, tipo, moneda, fecha) {
    if (moneda === 'Otra') return 0;
    const venta = tipo === 'venta', j = this.dolarFinanciera(d, tipo, fecha);
    // USDT: 1:1 contra el dólar de la financiera, con su % encima
    if (moneda === 'USDT') { const m = this.pct(d, 'margenUsdt', 1.5); return venta ? j * (1 + m) : j * (1 - m); }
    if ((moneda || 'USD') === 'USD') return j;
    if (moneda === 'USD cara chica') { const m = this.pct(d, 'margenCaraChica', 1); return venta ? j * (1 + m) : j * (1 - m); }
    // euro, real y libra: cross de mercado contra el dólar ± margen, llevado a pesos por el dólar de la financiera
    const m = moneda === 'EUR' ? this.pct(d, 'margenEuro', 2)
      : moneda === 'BRL' ? this.pct(d, 'margenReal', 3) : this.pct(d, 'margenLibra', 2.5);
    const x = this.cross(d, moneda, tipo, fecha);
    // USD/BRL viene en reales por dólar: se invierte para saber cuántos dólares vale un real
    const enUsd = moneda === 'BRL' ? (x ? 1 / x : 0) : x;
    return (venta ? enUsd * (1 + m) : enUsd * (1 - m)) * j;
  }

  aUsd(d, monto, tipo) { const u = this.mercadoUsd(d, tipo || 'compra'); return u ? monto / u : 0; }

  financiera(d) {
    const jc = this.dolarFinanciera(d, 'compra'), jv = this.dolarFinanciera(d, 'venta');
    const row = (label, moneda, calc) => {
      const pc = this.precio(d, 'compra', moneda), pv = this.precio(d, 'venta', moneda);
      return {
        moneda: label, compra: 'ARS ' + nf(pc, 2), venta: 'ARS ' + nf(pv, 2),
        compraUsd: jc ? 'US$' + nf(pc / jc, 4) : '—', ventaUsd: jv ? 'US$' + nf(pv / jv, 4) : '—',
        calc: calc
      };
    };
    return [
      row('Dólar billete', 'USD', 'mercado − $' + nf(this.fijo(d, 'usdLimpioCompra', 10), 2) + ' / mercado + $' + nf(this.fijo(d, 'usdLimpioVenta', 5), 2)),
      row('USDT', 'USDT', 'dólar de la financiera 1:1 ∓ ' + nf(this.pct(d, 'margenUsdt', 1.5) * 100, 2) + '%'),
      row('Dólar cara chica', 'USD cara chica', 'dólar de la financiera ∓ ' + nf(this.pct(d, 'margenCaraChica', 1) * 100, 2) + '%'),
      row('Euro', 'EUR', 'EUR/USD ' + nf(this.cross(d, 'EUR', 'compra'), 4) + ' / ' + nf(this.cross(d, 'EUR', 'venta'), 4) + ' ∓ ' + nf(this.pct(d, 'margenEuro', 2) * 100, 2) + '% × dólar de la financiera'),
      row('Real', 'BRL', 'USD/BRL ' + nf(this.cross(d, 'BRL', 'compra'), 4) + ' / ' + nf(this.cross(d, 'BRL', 'venta'), 4) + ' ∓ ' + nf(this.pct(d, 'margenReal', 3) * 100, 2) + '% × dólar de la financiera'),
      row('Libra', 'LBR', 'GBP/USD ' + nf(this.cross(d, 'LBR', 'compra'), 4) + ' / ' + nf(this.cross(d, 'LBR', 'venta'), 4) + ' ∓ ' + nf(this.pct(d, 'margenLibra', 2.5) * 100, 2) + '% × dólar de la financiera')
    ];
  }

  ultimaCotiz(d, fecha) {
    const base = fecha ? d.cotiz.filter(q => q.fecha <= fecha) : d.cotiz;
    const sorted = base.slice().sort((a, b) => (a.fecha + a.momento).localeCompare(b.fecha + b.momento));
    return sorted[sorted.length - 1] || { dc: d.params.baseCompra, dv: d.params.baseVenta };
  }

  // ── formularios ─────────────────────────────────────────────────────────
  socios(d) {
    const set = [];
    d.aportes.forEach(a => { if (a.socio && set.indexOf(a.socio) < 0) set.push(a.socio); });
    d.gastos.forEach(g => { if (g.socio && set.indexOf(g.socio) < 0) set.push(g.socio); });
    return set.length ? set : ['Socio 1', 'Socio 2'];
  }

  formDefs(kind, d) {
    const clientes = d.clientes.map(c => c.nombre).concat((d.comisionistas || []).map(c => c.nombre)).concat([NUEVO_CLI]);
    const q = this.ultimaCotiz(d);
    if (kind === 'op') {
      const fm = this.state.form || {};
      const mon = fm.moneda || 'USD', monPago = fm.monedaPago || 'ARS';
      const tipoDer = this.tipoDerivado(monPago, mon);
      const esPesosPar = monPago === 'ARS' || mon === 'ARS';
      const refPar = this.refParEntre(d, monPago, mon, tipoDer, fm.fecha);
      const refParMercado = this.refMercadoEntre(d, monPago, mon, tipoDer, fm.fecha);
      const fields = [
        { k: 'fecha', label: 'Fecha', type: 'date' },
        { k: 'cliente', label: 'Cliente', select: clientes },
      ];
      if (fm.cliente === NUEVO_CLI) fields.push({ k: 'nuevoCliente', label: 'Nombre del nuevo cliente', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 });
      fields.push({ k: 'monedaPago', label: 'Moneda que vendemos', select: ['ARS', 'USD', 'USD cara chica', 'EUR', 'BRL', 'LBR', 'Otra'], br: true, span: 3 });
      fields.push({ k: 'moneda', label: 'Moneda que compramos', select: ['ARS', 'USD', 'USD cara chica', 'EUR', 'BRL', 'LBR', 'Otra'], span: 3 });
      if (monPago === 'Otra') fields.push({ k: 'monedaPagoOtra', label: '¿Qué moneda vendemos?', ph: 'ej. CHF', br: true, span: 3 });
      if (mon === 'Otra') fields.push({ k: 'monedaOtra', label: '¿Qué moneda compramos?', ph: 'ej. CHF', span: 3, br: monPago !== 'Otra' });
      fields.push({ k: 'montoPago', label: 'Monto que vendemos', ph: '0', pre: monedaSimbolo(monPago, fm.monedaPagoOtra), soloNum: true, br: true, span: 3 });
      fields.push({ k: 'cantidad', label: 'Monto que compramos', ph: '0', pre: monedaSimbolo(mon, fm.monedaOtra), soloNum: true, span: 3 });
      fields.push({ k: 'tc', label: 'Tipo de cambio', ph: '0', pre: monedaSimbolo(monPago, fm.monedaPagoOtra), soloNum: true, br: true, span: 3,
        hint: !refPar ? 'sin cotización derivada' : ('Mercado: ' + (refParMercado ? nf(this.tcVista(monPago, mon, refParMercado), this.tcDecimales(monPago, mon)) : '—') + '\nFinanciera: ' + nf(this.tcVista(monPago, mon, refPar), this.tcDecimales(monPago, mon))) });
      const comisionN = parseNum(fm.comision);
      fields.push({ k: 'comisionista', label: 'Operador', select: [SIN_COMISIONISTA].concat(d.comisionistas.map(c => c.nombre)).concat([NUEVO_COM]), br: true, span: 3 });
      if (fm.comisionista === NUEVO_COM) fields.push({ k: 'nuevoComisionista', label: 'Nombre del nuevo operador', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 3 });
      if (fm.comisionista && fm.comisionista !== SIN_COMISIONISTA) {
        fields.push({ k: 'comisionMoneda', label: 'Moneda de la comisión', select: ['USD', 'ARS', 'USDT', 'EUR'], span: 2 });
        fields.push({ k: 'comision', label: 'Comisión', ph: '0', pre: monedaSimbolo(fm.comisionMoneda || 'USD'), soloNum: true, neg: comisionN < 0, span: 4,
          hint: 'se acredita en cuenta corriente del operador · no afecta el margen de la operación' });
      }
      return { title: 'Nueva operación de cambio',
        note: 'Cada operación tiene dos patas, cada una en su propia moneda: lo que vendemos y lo que compramos. Cada una se liquida en efectivo, por transferencia o queda en cuenta corriente. Se puede tipear el monto de cualquiera de las dos patas — la otra se completa según el TC.',
        fields: fields };
    }
    if (kind === 'cripto') {
      const fm = this.state.form || {};
      const mon = fm.moneda || 'USDT', monPago = fm.monedaPago || 'ARS';
      const tipoDer = this.tipoDerivado(monPago, mon);
      const refPar = this.refParEntre(d, monPago, mon, tipoDer, fm.fecha);
      const refParMercado = this.refMercadoEntre(d, monPago, mon, tipoDer, fm.fecha);
      const fields = [
        { k: 'fecha', label: 'Fecha', type: 'date' },
        { k: 'cliente', label: 'Cliente', select: clientes },
      ];
      if (fm.cliente === NUEVO_CLI) fields.push({ k: 'nuevoCliente', label: 'Nombre del nuevo cliente', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 });
      fields.push({ k: 'monedaPago', label: 'Moneda que vendemos', select: ['USDT', 'ARS', 'USD'], br: true, span: 3 });
      fields.push({ k: 'moneda', label: 'Moneda que compramos', select: ['USDT', 'ARS', 'USD'], span: 3 });
      fields.push({ k: 'montoPago', label: 'Monto que vendemos', ph: '0', pre: monedaSimbolo(monPago), soloNum: true, br: true, span: 3 });
      fields.push({ k: 'cantidad', label: 'Monto que compramos', ph: '0', pre: monedaSimbolo(mon), soloNum: true, span: 3 });
      fields.push({ k: 'tc', label: 'Tipo de cambio', ph: '0', pre: monedaSimbolo(monPago), soloNum: true, br: true, span: 3,
        hint: !refPar ? 'sin cotización derivada' : ('Mercado: ' + (refParMercado ? nf(this.tcVista(monPago, mon, refParMercado), this.tcDecimales(monPago, mon)) : '—') + '\nFinanciera: ' + nf(this.tcVista(monPago, mon, refPar), this.tcDecimales(monPago, mon))) });
      fields.push({ k: 'costo', label: 'Costo de transferencia (USDT)', ph: '0', br: true, span: 3 });
      fields.push({ k: 'costoA', label: 'Costo a cargo de', select: ['cueva', 'cliente'], span: 3 });
      const comisionN = parseNum(fm.comision);
      fields.push({ k: 'comisionista', label: 'Operador', select: [SIN_COMISIONISTA].concat(d.comisionistas.map(c => c.nombre)).concat([NUEVO_COM]), br: true, span: 3 });
      if (fm.comisionista === NUEVO_COM) fields.push({ k: 'nuevoComisionista', label: 'Nombre del nuevo operador', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 3 });
      if (fm.comisionista && fm.comisionista !== SIN_COMISIONISTA) {
        fields.push({ k: 'comisionMoneda', label: 'Moneda de la comisión', select: ['USD', 'ARS', 'USDT', 'EUR'], span: 2 });
        fields.push({ k: 'comision', label: 'Comisión', ph: '0', pre: monedaSimbolo(fm.comisionMoneda || 'USD'), soloNum: true, neg: comisionN < 0, span: 4,
          hint: 'se acredita en cuenta corriente del operador · no afecta el margen de la operación' });
      }
      return { title: 'Nueva operación cripto (USDT)',
        note: 'Igual que el cambio: cada operación tiene dos patas, cada una en su propia moneda (USDT contra ARS o USD). Cada pata se liquida en efectivo, por transferencia o queda en cuenta corriente. Se puede tipear el monto de cualquiera de las dos patas — la otra se completa según el precio.',
        fields: fields };
    }
    if (kind === 'mayorista') {
      const fm = this.state.form || {};
      const esCable = fm.tipo === 'Cable';
      const monedasTes = ['ARS', 'USD', 'USDT', 'USD cara chica', 'EUR', 'BRL', 'LBR', 'Otra'];
      const mon = fm.moneda || 'USD', monPago = fm.monedaPago || 'ARS';
      const tipoDer = this.tipoDerivado(monPago, mon);
      const refPar = this.refParEntre(d, monPago, mon, tipoDer, fm.fecha);
      const refParMercado = this.refMercadoEntre(d, monPago, mon, tipoDer, fm.fecha);
      const mayoristas = d.comisionistas.map(c => c.nombre).concat([NUEVO_MAY]);
      const fields = [
        { k: 'fecha', label: 'Fecha', type: 'date' },
        { k: 'comisionista', label: 'Mayorista', select: mayoristas },
      ];
      if (fm.comisionista === NUEVO_MAY) fields.push({ k: 'nuevoComisionista', label: 'Nombre del nuevo mayorista', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 });
      fields.push({ k: 'tipo', label: 'Tipo', select: ['Cambio', 'Cable'], br: true, span: 3,
        hint: esCable ? 'transferencia de USD contra el mayorista, sin cambio de moneda' : undefined });
      fields.push({ k: 'monedaPago', label: 'Moneda que vendemos', select: esCable ? ['USD'] : monedasTes, br: true, span: 3 });
      fields.push({ k: 'moneda', label: 'Moneda que compramos', select: esCable ? ['USD'] : monedasTes, span: 3 });
      if (monPago === 'Otra') fields.push({ k: 'monedaPagoOtra', label: '¿Qué moneda vendemos?', ph: 'ej. CHF', br: true, span: 3 });
      if (mon === 'Otra') fields.push({ k: 'monedaOtra', label: '¿Qué moneda compramos?', ph: 'ej. CHF', span: 3, br: monPago !== 'Otra' });
      fields.push({ k: 'montoPago', label: 'Monto que vendemos', ph: '0', pre: monedaSimbolo(monPago, fm.monedaPagoOtra), soloNum: true, br: true, span: 3 });
      fields.push({ k: 'cantidad', label: 'Monto que compramos', ph: '0', pre: monedaSimbolo(mon, fm.monedaOtra), soloNum: true, span: 3 });
      if (!esCable) fields.push({ k: 'tc', label: 'Tipo de cambio', ph: '0', pre: monedaSimbolo(monPago, fm.monedaPagoOtra), soloNum: true, br: true, span: 3,
        hint: !refPar ? 'sin cotización derivada' : ('Mercado: ' + (refParMercado ? nf(this.tcVista(monPago, mon, refParMercado), this.tcDecimales(monPago, mon)) : '—') + '\nFinanciera: ' + nf(this.tcVista(monPago, mon, refPar), this.tcDecimales(monPago, mon))) });
      return { title: 'Operación de tesorería',
        note: 'La financiera opera su propia caja contra un mayorista, fuera de cualquier operación de cliente. Mismo mecanismo que Cambio: partes, formas de liquidación y domicilios.',
        fields: fields };
    }
    if (kind === 'cable') { const fm = this.state.form || {};
      const esSubida = (fm.tipo || 'Bajada') === 'Subida';
      const comisionistasCable = d.comisionistas.map(c => c.nombre).concat([NUEVO_MAY]);
      const costoPctV = parseNum(fm.costoPct), margenPctV = parseNum(fm.margenPct);
      return { title: esSubida ? 'Nueva subida' : 'Nueva bajada',
      note: esSubida
        ? 'Subida: el cliente entrega USD localmente para que el mayorista transfiera fondos a una cuenta en el exterior. Se marca ejecutada por default: se considera cumplida cuando el cliente entrega los fondos y nosotros instruimos el pago al mayorista.'
        : 'Bajada: el cliente transfiere USD a la cuenta del mayorista en el exterior. Mientras esté pendiente no impacta caja, cuenta corriente ni ganancia — recién al marcarla ejecutada se acredita el saldo con el mayorista, la obligación con el cliente y el margen, con fecha de ese día.',
      fields: [
        { k: 'fecha', label: 'Fecha', type: 'date', span: 2 },
        { k: 'cliente', label: 'Cliente', select: clientes, span: 2 },
        { k: 'tipo', label: 'Tipo', select: ['Bajada', 'Subida'], span: 2 },
        ...(fm.cliente === NUEVO_CLI ? [{ k: 'nuevoCliente', label: 'Nombre del nuevo cliente', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 }] : []),
        { k: 'comisionista', label: 'Mayorista', select: comisionistasCable, br: true, span: 3,
          hint: 'para uno nuevo elegí “+ Nuevo mayorista…”' },
        ...(fm.comisionista === NUEVO_MAY ? [{ k: 'nuevoComisionista', label: 'Nombre del nuevo mayorista', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 }] : []),
        { k: 'monto', label: esSubida ? 'Monto a transferir' : 'Monto enviado por el cliente', ph: '0', pre: 'USD', br: true, soloNum: true, span: 6,
          hint: esSubida ? 'lo que el cliente va a recibir transferido en la cuenta del exterior' : undefined },
        { k: 'costoPct', label: 'Comisión del mayorista', ph: '0', post: '%', soloNum: true, br: true, span: 3,
          hint: costoPctV < 0 ? 'negativo: el mayorista paga — aumenta el resultado' : 'positivo: el mayorista cobra — reduce el resultado' },
        { k: 'margenPct', label: 'Comisión cobrada al cliente', ph: '0', post: '%', soloNum: true, span: 3,
          hint: margenPctV < 0 ? 'negativo: se le paga al cliente — reduce el resultado' : 'positivo: se le cobra al cliente — aumenta el resultado' }
      ] }; }
    if (kind === 'ctacte') {
      const fm = this.state.form || {};
      const t = CC_TIPOS.find(x => x.label === fm.movimiento);
      const clC = d.clientes.find(c => c.nombre === fm.cliente) || (d.comisionistas || []).find(c => c.nombre === fm.cliente);
      const dirsC = ((clC && clC.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x)).concat(['Nueva dirección…']);
      return { title: 'Movimiento de cuenta corriente',
      note: 'Saldo positivo = el cliente nos debe. Las entregas y cobros de efectivo mueven la caja; los ajustes no. Los movimientos que nacen de una operación se generan solos y no se cargan acá.',
      fields: [
        { k: 'cliente', label: 'Cliente', select: clientes, span: 4 },
        ...((this.state.form || {}).cliente === NUEVO_CLI ? [{ k: 'nuevoCliente', label: 'Nombre del nuevo cliente', ph: 'texto', hint: 'se da de alta al guardar', br: true, span: 6 }] : []),
        { k: 'fecha', label: 'Fecha', type: 'date', br: true },
        { k: 'movimiento', label: 'Movimiento', select: CC_TIPOS.map(t => t.label), span: 4 },
        { k: 'moneda', label: 'Moneda', select: ['ARS', 'USD', 'USD cara chica', 'EUR', 'BRL', 'LBR', 'USDT'], br: true, span: 3 },
        { k: 'monto', label: 'Monto', ph: '0', pre: monedaSimbolo(fm.moneda), soloNum: true, span: 3, hint: 'siempre en positivo; el signo lo pone el tipo de movimiento' },
        ...(t && t.efectivo ? [{ k: 'lugar', label: 'El efectivo se', select: ['retiro', 'domicilio'], optLabels: { retiro: 'Retira por Oficina', domicilio: 'Envia a Domicilio' }, br: true, span: 2 }] : []),
        ...(t && t.efectivo && fm.lugar === 'domicilio' ? [{ k: 'domicilio', label: 'Domicilio del cliente', select: dirsC, span: 4 }] : []),
        ...(t && t.efectivo && fm.lugar === 'domicilio' && fm.domicilio === 'Nueva dirección…' ? [
          { k: 'nuevoDomicilioAlias', label: 'Alias', ph: 'ej. Depósito', br: true, span: 2 },
          { k: 'nuevoDomicilio', label: 'Nueva dirección', ph: 'calle y número', hint: 'se agrega a la ficha del cliente', span: 4 },
          { k: 'nuevoDomicilioPiso', label: 'Piso / depto', ph: 'ej. 3° A', span: 3 },
          { k: 'nuevoDomicilioObs', label: 'Observaciones', ph: 'ej. dejar en recepción', span: 3 }
        ] : []),
        { k: 'motivo', label: 'Motivo', br: true, span: 6 }
      ] };
    }
    if (kind === 'gasto') { const fmG = this.state.form || {}; return { title: 'Nuevo gasto', note: 'El gasto no se imputa al día ni a la ganancia diaria: se resta del patrimonio de hoy. Queda registrado quién lo pagó. En USD se convierte a ARS al tipo de cambio del día para la evolución. Solo números con coma decimal.', fields: [
      { k: 'fecha', label: 'Fecha del gasto', type: 'date', span: 3 },
      { k: 'motivo', label: 'Motivo', select: GASTO_MOTIVOS, span: 3 },
      { k: 'moneda', label: 'Moneda', select: ['ARS', 'USD'], span: 3 },
      { k: 'monto', label: 'Monto', ph: '0', br: true, span: 3, pre: fmG.moneda === 'USD' ? 'USD' : 'ARS', soloNum: true },
      { k: 'socio', label: 'Pagado por', select: this.socios(d), span: 3 },
      { k: 'obs', label: 'Observaciones', br: true, span: 6 } ] }; }
    if (kind === 'cotiz') return { title: 'Cotización de mercado', note: 'Todo es opcional: cada par que dejes vacío toma la última cotización cargada. Solo números con coma decimal.', fields: [
      { k: 'fecha', label: 'Fecha', type: 'date', span: 3 }, { k: 'momento', label: 'Momento', select: ['apertura', 'cierre'], span: 3 },
      { k: 'dc', label: 'Dólar comprador (ARS)', ph: '0', br: true, span: 3 }, { k: 'dv', label: 'Dólar vendedor (ARS)', ph: '0', span: 3 },
      { k: 'ec', label: 'EUR/USD compra', ph: '0', br: true, span: 3, hint: 'los pares vacíos toman la última cotización cargada' },
      { k: 'ev', label: 'EUR/USD venta', ph: '0', span: 3 },
      { k: 'rc', label: 'USD/BRL compra', ph: '0', br: true, span: 3 }, { k: 'rv', label: 'USD/BRL venta', ph: '0', span: 3 },
      { k: 'lc', label: 'GBP/USD compra', ph: '0', br: true, span: 3 }, { k: 'lv', label: 'GBP/USD venta', ph: '0', span: 3 } ] };
    if (kind === 'aporte') return { title: 'Nuevo aporte de capital', note: 'El patrimonio neto y la participación de cada socio se calculan desde los aportes.', fields: [
      { k: 'socio', label: 'Socio', ph: 'nombre', span: 3 }, { k: 'fecha', label: 'Fecha', type: 'date', span: 3 },
      { k: 'moneda', label: 'Moneda', select: ['USD', 'ARS', 'USDT', 'EUR'], br: true, span: 3 }, { k: 'monto', label: 'Monto', ph: '0', span: 3 },
      { k: 'concepto', label: 'Concepto', ph: 'capital inicial, aporte posterior…', br: true, span: 6 } ] };
    if (kind === 'usuario') return { title: 'Nuevo usuario',
      note: this.state.editId ? 'El rol define qué pantallas y acciones puede usar (ver la tabla de roles, abajo). La contraseña no se edita acá — usá "Restablecer contraseña" desde la lista si la perdió.' : 'Se crea con una contraseña temporal de un solo uso, que se muestra después de guardar: hay que comunicarla de forma segura, no vuelve a mostrarse.',
      fields: [
        { k: 'nombre', label: 'Nombre completo', ph: 'texto', span: 3 },
        { k: 'usuario', label: 'Usuario', ph: 'para iniciar sesión', span: 3 },
        { k: 'rol', label: 'Rol', select: ROLES.map(r => r.nombre), br: true, span: 3 }
      ] };
    if (kind === 'comisionista') return { title: 'Nuevo operador', note: 'Queda disponible para asignar en operaciones de cambio y cripto, y para elegir como cliente en una operación. Con un % cargado, el monto de la comisión se sugiere solo — siempre se puede editar.', fields: [
      { k: 'nombre', label: 'Nombre', ph: 'texto', span: 4 }, { k: 'tipo', label: 'Tipo', select: TIPOS_COMISIONISTA, span: 2 },
      { k: 'comisionPct', label: 'Comisión (%)', ph: '0', span: 3, hint: 'opcional' }, { k: 'contacto', label: 'Contacto', ph: 'tel / email', br: true, span: 3 },
      { k: 'obs', label: 'Observaciones', ph: 'texto', span: 3 }
    ] };
    return { title: 'Nuevo cliente', note: 'Queda disponible para elegir al cargar operaciones.', fields: [
      { k: 'nombre', label: 'Nombre / razón social', ph: 'texto', span: 4 },
      { k: 'contacto', label: 'Contacto', ph: 'teléfono o mail', br: true, span: 3 },
      { k: 'obs', label: 'Observaciones', br: true, span: 6 } ] };
  }

  // un día cerrado no admite altas, ediciones ni bajas hasta reabrirlo
  diaCerrado(d, fecha) { const c = (d.cierres || {})[fecha]; return !!(c && c.cerrado); }

  avisarCerrado(fecha, accion) {
    if (this._tBloqueo) clearTimeout(this._tBloqueo);
    this.setState({ bloqueo: 'El ' + dmy(fecha) + ' está cerrado. Para ' + accion + ' hay que reabrir el día en Cierre diario.' });
    this._tBloqueo = setTimeout(() => this.setState({ bloqueo: null }), 6000);
  }

  openModal(kind, rec) {
    const d = this.state.data, q = this.ultimaCotiz(d);
    if (kind === 'cotiz') this.setState({ soloPar: null, modalErr: '' });
    if (rec && rec.fecha && kind !== 'gasto' && this.diaCerrado(d, rec.fecha)) return this.avisarCerrado(rec.fecha, 'modificar este registro');
    if (rec) return this.setState({ modal: kind, editId: rec.id, errors: [], form: this.formDeRegistro(kind, rec, d) });
    const base = {
      op: { fecha: today(), cliente: d.clientes[0] ? d.clientes[0].nombre : NUEVO_CLI, monedaPago: 'ARS', monedaPagoOtra: '', moneda: 'USD', monedaOtra: '', cantidad: '', montoPago: '', tc: nf(this.precio(d, 'compra', 'USD'), 2), margen: '0', margenBruto: '0', comisionista: SIN_COMISIONISTA, nuevoComisionista: '', comision: '0', comisionAuto: true, comisionMoneda: 'USD', formaPago: 'efectivo', formaRetiro: 'efectivo', lugarPago: 'retiro', lugarDivisa: 'retiro', domiciliosDistintos: false, domicilio: '', nuevoDomicilio: '', nuevoDomicilioAlias: '', domicilioPago: '', domicilioDivisa: '', nuevoDomicilioPago: '', nuevoDomicilioPagoAlias: '', nuevoDomicilioDivisa: '', nuevoDomicilioDivisaAlias: '', dividirPartes: false, partesPago: [], partesDivisa: [], ok: 'pendiente' },
      gasto: { fecha: today(), motivo: GASTO_MOTIVOS[0], moneda: 'ARS', monto: '', socio: this.socios(d)[0], obs: '' },
      cotiz: { fecha: today(), momento: 'cierre', dc: '', dv: '', ec: '', ev: '', rc: '', rv: '', lc: '', lv: '' },
      aporte: { socio: '', fecha: today(), moneda: 'USD', monto: '', concepto: '' },
      mayorista: { fecha: today(), comisionista: d.comisionistas[0] ? d.comisionistas[0].nombre : NUEVO_MAY, nuevoComisionista: '',
        tipo: 'Cambio', monedaPago: 'ARS', monedaPagoOtra: '', moneda: 'USD', monedaOtra: '', cantidad: '', montoPago: '',
        tc: (() => { const refM = this.refMercadoEntre(d, 'ARS', 'USD', 'compra'); return refM ? nf(this.tcVista('ARS', 'USD', refM), 2) : nf(this.precio(d, 'compra', 'USD'), 2); })(),
        formaPago: 'transferencia', formaRetiro: 'transferencia', obs: '' },
      cliente: { nombre: '', contacto: '', obs: '', domicilios: [{ alias: '', calle: '' }] },
      comisionista: { nombre: '', tipo: TIPOS_COMISIONISTA[0], comisionPct: '', contacto: '', obs: '', domicilios: [{ alias: '', calle: '' }] },
      cripto: { fecha: today(), cliente: d.clientes[0] ? d.clientes[0].nombre : NUEVO_CLI,
        monedaPago: 'ARS', monedaPagoOtra: '', moneda: 'USDT', monedaOtra: '', cantidad: '', montoPago: '',
        tc: nf(this.precio(d, 'compra', 'USDT'), 2), comisionista: SIN_COMISIONISTA, nuevoComisionista: '', comision: '0', comisionAuto: true, comisionMoneda: 'USD',
        formaPago: 'efectivo', formaRetiro: 'transferencia', lugarPago: 'retiro', lugarDivisa: 'retiro',
        domiciliosDistintos: false, domicilio: '', nuevoDomicilio: '', nuevoDomicilioAlias: '',
        domicilioPago: '', domicilioDivisa: '', nuevoDomicilioPago: '', nuevoDomicilioPagoAlias: '',
        nuevoDomicilioDivisa: '', nuevoDomicilioDivisaAlias: '', dividirPartes: false, partesPago: [], partesDivisa: [],
        costo: '', costoA: 'cueva', ok: 'pendiente' },
      cable: { fecha: today(), cliente: d.clientes[0] ? d.clientes[0].nombre : NUEVO_CLI, tipo: 'Bajada',
        comisionista: d.comisionistas[0] ? d.comisionistas[0].nombre : NUEVO_MAY, nuevoComisionista: '',
        formaMayorista: 'cuenta corriente', formaCliente: 'cuenta corriente', lugarCliente: 'retiro',
        domicilioCliente: '', nuevoDomicilioCliente: '', nuevoDomicilioClienteAlias: '',
        dividirPartesCable: false, partesMayorista: [], partesCliente: [],
        monto: '', costoPct: '', margenPct: '', estado: 'pendiente', obs: '' },
      usuario: { nombre: '', usuario: '', rol: ROLES[1].nombre },
      ctacte: { cliente: (() => {
        if (this.state.vista === 'fichaComisionista') { const cm = (d.comisionistas || []).find(c => c.id === this.state.comisionistaSel); if (cm) return cm.nombre; }
        return (d.clientes.find(c => c.id === this.state.cliente) || d.clientes[0] || {}).nombre || NUEVO_CLI;
      })(),
        fecha: today(), movimiento: CC_TIPOS[0].label, moneda: 'ARS', monto: '', motivo: '', lugar: 'retiro', domicilio: '', nuevoDomicilio: '', nuevoDomicilioAlias: '' }
    }[kind];
    this.setState({ modal: kind, form: base, editId: null, errors: [] });
  }

  formDeRegistro(kind, r, d) {
    const nom = (id) => { const c = d.clientes.find(x => x.id === id); return c ? c.nombre : ''; };
    const dom = (r.lugar === 'domicilio' && r.entrega) ? r.entrega : '';
    if (kind === 'mayorista') {
      const dividirPartesMy = Array.isArray(r.partesPago) || Array.isArray(r.partesDivisa);
      const distintosMy = !dividirPartesMy && r.lugarPago === 'domicilio' && r.lugarDivisa === 'domicilio' && r.entregaPago !== r.entregaDivisa;
      const parteAFormMy = (p) => ({ monto: nf(p.monto, 0), forma: p.forma || 'efectivo', lugar: p.lugar || 'retiro',
        domicilio: p.lugar === 'domicilio' ? (p.entrega || '') : '', nuevoDomicilio: '', nuevoDomicilioAlias: '' });
      return { fecha: r.fecha, comisionista: this.nombreComisionista(d, r.comisionistaId), nuevoComisionista: '',
        tipo: r.esCable ? 'Cable' : 'Cambio',
        monedaPago: r.monedaPago || 'ARS', monedaPagoOtra: r.monedaPagoOtra || '',
        moneda: r.moneda, monedaOtra: r.monedaOtra || '', cantidad: nf(r.cantidad, 0),
        tc: nf(this.tcVista(r.monedaPago || 'ARS', r.moneda || 'USD', Number(r.tc) || 0), this.tcDecimales(r.monedaPago || 'ARS', r.moneda || 'USD')),
        montoPago: nf((Number(r.cantidad) || 0) * (Number(r.tc) || 0), 0),
        formaPago: r.formaPago, formaRetiro: r.formaRetiro,
        lugarPago: dividirPartesMy ? '' : (r.lugarPago || ''), lugarDivisa: dividirPartesMy ? '' : (r.lugarDivisa || ''),
        domiciliosDistintos: distintosMy,
        domicilio: (!distintosMy && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : (!distintosMy && r.lugarDivisa === 'domicilio' ? (r.entregaDivisa || '') : ''),
        domicilioPago: (distintosMy && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : '',
        domicilioDivisa: (distintosMy && r.lugarDivisa === 'domicilio') ? (r.entregaDivisa || '') : '',
        nuevoDomicilio: '', nuevoDomicilioAlias: '', nuevoDomicilioPago: '', nuevoDomicilioPagoAlias: '',
        nuevoDomicilioDivisa: '', nuevoDomicilioDivisaAlias: '',
        dividirPartes: dividirPartesMy,
        partesPago: dividirPartesMy ? this.normalizarPartes((r.partesPago || []).map(parteAFormMy)) : [],
        partesDivisa: dividirPartesMy ? this.normalizarPartes((r.partesDivisa || []).map(parteAFormMy)) : [],
        obs: r.obs === '—' ? '' : (r.obs || ''), ok: r.ok, patasHechas: r.patasHechas || {} };
    }
    if (kind === 'op') {
      const dividirPartes = Array.isArray(r.partesPago) || Array.isArray(r.partesDivisa);
      const distintosR = !dividirPartes && r.lugarPago === 'domicilio' && r.lugarDivisa === 'domicilio' && r.entregaPago !== r.entregaDivisa;
      const parteAForm = (p) => ({ monto: nf(p.monto, 0), forma: p.forma || 'efectivo', lugar: p.lugar || 'retiro',
        domicilio: p.lugar === 'domicilio' ? (p.entrega || '') : '', nuevoDomicilio: '', nuevoDomicilioAlias: '' });
      return { fecha: r.fecha, cliente: nom(r.clienteId), nuevoCliente: '',
        monedaPago: r.monedaPago || 'ARS', monedaPagoOtra: r.monedaPagoOtra || '',
        moneda: r.moneda, monedaOtra: r.monedaOtra || '', cantidad: nf(r.cantidad, 0), tc: nf(this.tcVista(r.monedaPago || 'ARS', r.moneda || 'USD', Number(r.tc) || 0), this.tcDecimales(r.monedaPago || 'ARS', r.moneda || 'USD')),
        montoPago: nf((Number(r.cantidad) || 0) * (Number(r.tc) || 0), 0),
        comisionista: this.nombreComisionista(d, r.comisionistaId) || SIN_COMISIONISTA, nuevoComisionista: '', comision: r.comision ? nf(r.comision, 0) : '0', comisionMoneda: r.comisionMoneda || 'USD', comisionAuto: false, formaPago: r.formaPago, formaRetiro: r.formaRetiro,
        lugarPago: dividirPartes ? '' : (r.lugarPago || ''), lugarDivisa: dividirPartes ? '' : (r.lugarDivisa || ''),
        domiciliosDistintos: distintosR,
        domicilio: (!distintosR && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : (!distintosR && r.lugarDivisa === 'domicilio' ? (r.entregaDivisa || '') : ''),
        domicilioPago: (distintosR && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : '',
        domicilioDivisa: (distintosR && r.lugarDivisa === 'domicilio') ? (r.entregaDivisa || '') : '',
        nuevoDomicilio: '', nuevoDomicilioAlias: '', nuevoDomicilioPago: '', nuevoDomicilioPagoAlias: '',
        nuevoDomicilioDivisa: '', nuevoDomicilioDivisaAlias: '',
        dividirPartes: dividirPartes,
        partesPago: dividirPartes ? this.normalizarPartes((r.partesPago || []).map(parteAForm)) : [],
        partesDivisa: dividirPartes ? this.normalizarPartes((r.partesDivisa || []).map(parteAForm)) : [],
        ok: r.ok, patasHechas: r.patasHechas || {} };
    }
    if (kind === 'cripto') {
      const dividirPartes = Array.isArray(r.partesPago) || Array.isArray(r.partesDivisa);
      const distintosR = !dividirPartes && r.lugarPago === 'domicilio' && r.lugarDivisa === 'domicilio' && r.entregaPago !== r.entregaDivisa;
      const parteAForm = (p) => ({ monto: nf(p.monto, 0), forma: p.forma || 'efectivo', lugar: p.lugar || 'retiro',
        domicilio: p.lugar === 'domicilio' ? (p.entrega || '') : '', nuevoDomicilio: '', nuevoDomicilioAlias: '' });
      return { fecha: r.fecha, cliente: nom(r.clienteId), nuevoCliente: '',
        monedaPago: r.monedaPago || 'ARS', monedaPagoOtra: '',
        moneda: r.moneda || 'USDT', monedaOtra: '', cantidad: nf(r.cantidad, 0),
        tc: nf(this.tcVista(r.monedaPago || 'ARS', r.moneda || 'USDT', Number(r.tc) || 0), this.tcDecimales(r.monedaPago || 'ARS', r.moneda || 'USDT')),
        montoPago: nf((Number(r.cantidad) || 0) * (Number(r.tc) || 0), 0),
        comisionista: this.nombreComisionista(d, r.comisionistaId) || SIN_COMISIONISTA, nuevoComisionista: '', comision: r.comision ? nf(r.comision, 0) : '0', comisionMoneda: r.comisionMoneda || 'USD', comisionAuto: false, formaPago: r.formaPago, formaRetiro: r.formaRetiro,
        lugarPago: dividirPartes ? '' : (r.lugarPago || ''), lugarDivisa: dividirPartes ? '' : (r.lugarDivisa || ''),
        domiciliosDistintos: distintosR,
        domicilio: (!distintosR && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : (!distintosR && r.lugarDivisa === 'domicilio' ? (r.entregaDivisa || '') : ''),
        domicilioPago: (distintosR && r.lugarPago === 'domicilio') ? (r.entregaPago || '') : '',
        domicilioDivisa: (distintosR && r.lugarDivisa === 'domicilio') ? (r.entregaDivisa || '') : '',
        nuevoDomicilio: '', nuevoDomicilioAlias: '', nuevoDomicilioPago: '', nuevoDomicilioPagoAlias: '',
        nuevoDomicilioDivisa: '', nuevoDomicilioDivisaAlias: '',
        dividirPartes: dividirPartes,
        partesPago: dividirPartes ? this.normalizarPartes((r.partesPago || []).map(parteAForm)) : [],
        partesDivisa: dividirPartes ? this.normalizarPartes((r.partesDivisa || []).map(parteAForm)) : [],
        costo: r.costo ? nf(r.costo, 2) : '', costoA: r.costoA || 'cueva',
        ok: r.ok, patasHechas: r.patasHechas || {} };
    }
    if (kind === 'cable') {
      const dividirPartesCable = Array.isArray(r.partesMayorista) || Array.isArray(r.partesCliente);
      const parteAForm = (p) => ({ monto: nf(p.monto, 0), forma: p.forma || 'cuenta corriente', lugar: p.lugar || 'retiro',
        domicilio: p.lugar === 'domicilio' ? (p.entrega || '') : '', nuevoDomicilio: '', nuevoDomicilioAlias: '' });
      return { fecha: r.fecha, tipo: r.tipo || 'Bajada', cliente: nom(r.clienteId), nuevoCliente: '',
      comisionista: this.nombreComisionista(d, r.comisionistaId) || '', nuevoComisionista: '', monto: nf(r.monto, 0),
      costoPct: nf(r.costoPct, 2), margenPct: nf(r.margenPct, 2),
      formaMayorista: dividirPartesCable ? '' : (r.formaMayorista || 'cuenta corriente'),
      formaCliente: dividirPartesCable ? '' : (r.formaCliente || 'cuenta corriente'),
      lugarCliente: dividirPartesCable ? '' : (r.lugarCliente || ''),
      domicilioCliente: (!dividirPartesCable && r.lugarCliente === 'domicilio') ? (r.entregaCliente || '') : '',
      nuevoDomicilioCliente: '', nuevoDomicilioClienteAlias: '',
      dividirPartesCable: dividirPartesCable,
      partesMayorista: dividirPartesCable ? this.normalizarPartes((r.partesMayorista || []).map(parteAForm), 'cuenta corriente') : [],
      partesCliente: dividirPartesCable ? this.normalizarPartes((r.partesCliente || []).map(parteAForm), 'cuenta corriente') : [],
      estado: r.estado, obs: r.obs === '—' ? '' : (r.obs || ''), patasHechas: r.patasHechas || {} };
    }
    if (kind === 'ctacte') return { cliente: nom(r.clienteId), nuevoCliente: '', fecha: r.fecha,
      movimiento: r.tipoMov || (CC_TIPOS.find(t => t.efectivo === !!r.efectivo && t.signo === ((Number(r.monto) || 0) >= 0 ? 1 : -1)) || CC_TIPOS[0]).label,
      moneda: r.moneda, monto: nf(Math.abs(Number(r.monto) || 0), 2), motivo: r.motivo || '',
      lugar: r.lugar || '', domicilio: dom, nuevoDomicilio: '' };
    if (kind === 'gasto') return { fecha: r.fecha, motivo: r.motivo, moneda: r.moneda || 'ARS',
      monto: nf(r.moneda === 'USD' ? (r.montoOriginal !== undefined ? r.montoOriginal : r.monto) : r.monto, r.moneda === 'USD' ? 2 : 0),
      socio: r.socio, obs: r.obs === '—' ? '' : (r.obs || '') };
    if (kind === 'cotiz') return { fecha: r.fecha, momento: r.momento, dc: nf(r.dc, 2), dv: nf(r.dv, 2),
      ec: r.ec ? nf(r.ec, 4) : '', ev: r.ev ? nf(r.ev, 4) : '', rc: r.rc ? nf(r.rc, 4) : '', rv: r.rv ? nf(r.rv, 4) : '',
      lc: r.lc ? nf(r.lc, 4) : '', lv: r.lv ? nf(r.lv, 4) : '' };
    if (kind === 'aporte') return { socio: r.socio, fecha: r.fecha, moneda: r.moneda, monto: nf(r.monto, 0), concepto: r.concepto || '' };
    if (kind === 'comisionista') return { nombre: r.nombre, tipo: r.tipo || TIPOS_COMISIONISTA[0], comisionPct: r.comisionPct ? nf(r.comisionPct, 2) : '',
      contacto: r.contacto || '', obs: r.obs && r.obs !== '—' ? r.obs : '',
      domicilios: this.domiciliosConBlank((r.direcciones || []).map(x => ({ alias: x.alias || '', calle: x.calle || '' }))) };
    if (kind === 'usuario') return { nombre: r.nombre, usuario: r.usuario, rol: (ROLES.find(x => x.id === r.rol) || ROLES[1]).nombre };
    return { nombre: r.nombre, contacto: r.contacto || '',
      domicilios: this.domiciliosConBlank((r.direcciones || []).map(x => ({ alias: x.alias || '', calle: x.calle || '' }))),
      obs: r.obs === '—' ? '' : (r.obs || '') };
  }

  domiciliosConBlank(list) {
    const doms = (list || []).map(x => Object.assign({}, x));
    const last = doms[doms.length - 1];
    if (!doms.length || (last && ((last.alias || '').trim() || (last.calle || '').trim()))) doms.push({ alias: '', calle: '' });
    return doms;
  }

  setDomicilio(i, key, v) {
    const doms = (this.state.form.domicilios || []).map(x => Object.assign({}, x));
    doms[i] = Object.assign({}, doms[i], { [key]: v });
    this.setState({ form: Object.assign({}, this.state.form, { domicilios: this.domiciliosConBlank(doms) }) });
  }

  // igual que setDomicilio('calle', v) pero además invalida la geo: al retipear a mano, la dirección deja de
  // estar "validada por Google" hasta que se vuelva a elegir una sugerencia.
  setDomicilioTexto(i, v) {
    const doms = (this.state.form.domicilios || []).map(x => Object.assign({}, x));
    doms[i] = Object.assign({}, doms[i], { calle: v, geo: null });
    this.setState({ form: Object.assign({}, this.state.form, { domicilios: this.domiciliosConBlank(doms) }) });
  }

  setDomicilioPlace(i, place) {
    const doms = (this.state.form.domicilios || []).map(x => Object.assign({}, x));
    doms[i] = Object.assign({}, doms[i], { calle: place.formatted, geo: { lat: place.lat, lng: place.lng, placeId: place.placeId } });
    this.setState({ form: Object.assign({}, this.state.form, { domicilios: this.domiciliosConBlank(doms) }) });
  }

  mapsActivo() { return !!GOOGLE_MAPS_API_KEY; }

  setFieldPlace(key, place) {
    const form = Object.assign({}, this.state.form, { [key]: place.formatted, [key + 'Geo']: { lat: place.lat, lng: place.lng, placeId: place.placeId } });
    this.setState({ form: form, errors: (this.state.errors || []).filter(x => x !== key) });
  }

  // valida (cuando hay API key) que toda "nueva dirección" cargada en el form haya sido elegida de una
  // sugerencia de Google, no solo tipeada — cubre los campos únicos y los de cada parte dividida.
  direccionesFaltanValidar(f) {
    if (!this.mapsActivo()) return false;
    const falta = (txt, geo) => !!(txt || '').trim() && !geo;
    const singles = [
      [f.nuevoDomicilio, f.nuevoDomicilioGeo], [f.nuevoDomicilioPago, f.nuevoDomicilioPagoGeo],
      [f.nuevoDomicilioDivisa, f.nuevoDomicilioDivisaGeo], [f.nuevoDomicilioMayorista, f.nuevoDomicilioMayoristaGeo],
      [f.nuevoDomicilioCliente, f.nuevoDomicilioClienteGeo]
    ];
    if (singles.some(([t, g]) => falta(t, g))) return true;
    return ['partesPago', 'partesDivisa', 'partesMayorista', 'partesCliente'].some(campo =>
      (f[campo] || []).some(p => falta(p.nuevoDomicilio, p.nuevoDomicilioGeo)));
  }

  // ref para un <input> de dirección: si hay API key, engancha el autocompletado de Google y avisa la
  // selección por onPlace({formatted, lat, lng, placeId}); sin key, no hace nada (input de texto libre).
  addressRef(onPlace) {
    return (el) => {
      if (!el || el.dataset.gmapsBound) return;
      loadGoogleMaps().then((ok) => {
        if (!ok || !window.google || el.dataset.gmapsBound) return;
        el.dataset.gmapsBound = '1';
        const ac = new window.google.maps.places.Autocomplete(el, { types: ['address'], componentRestrictions: { country: 'ar' } });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place || !place.geometry) return;
          onPlace({ formatted: place.formatted_address || el.value, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), placeId: place.place_id });
        });
      });
    };
  }

  quitarDomicilio(i) {
    const doms = (this.state.form.domicilios || []).filter((_, idx) => idx !== i);
    this.setState({ form: Object.assign({}, this.state.form, { domicilios: this.domiciliosConBlank(doms) }) });
  }

  parteVacia(defaultForma) { return { monto: '', forma: defaultForma || 'efectivo', lugar: 'retiro', domicilio: '', nuevoDomicilio: '', nuevoDomicilioAlias: '' }; }

  totalDe(campo, form) {
    const cant = parseNum(form.cantidad), tc = parseNum(form.tc);
    return campo === 'partesPago' ? cant * tc : cant;
  }

  // USDT nunca es efectivo: la parte nueva de esa pata arranca en transferencia
  formaDefaultDe(campo, form) {
    if (campo === 'partesMayorista' || campo === 'partesCliente') return 'cuenta corriente';
    const mon = campo === 'partesPago' ? form.monedaPago : form.moneda;
    return mon === 'USDT' ? 'transferencia' : 'efectivo';
  }

  normalizarPartes(list, defaultForma) {
    const arr = (list || []).map(x => Object.assign({}, x));
    return arr.length ? arr : [this.parteVacia(defaultForma)];
  }

  agregarParte(campo) {
    const form = this.state.form;
    const partes = (form[campo] || []).concat([this.parteVacia(this.formaDefaultDe(campo, form))]);
    this.setState({ form: Object.assign({}, form, { [campo]: partes }) });
  }

  setParte(campo, i, key, v) {
    if (key === 'monto') v = fmtNum(v);
    const partes = (this.state.form[campo] || []).map(x => Object.assign({}, x));
    if (!partes[i]) return;
    partes[i] = Object.assign({}, partes[i], { [key]: v });
    if (key === 'nuevoDomicilio') partes[i].nuevoDomicilioGeo = null;
    if (key === 'lugar' && v !== 'domicilio') { partes[i].domicilio = ''; partes[i].nuevoDomicilio = ''; partes[i].nuevoDomicilioAlias = ''; partes[i].nuevoDomicilioGeo = null; }
    if (key === 'lugar' && v === 'domicilio' && !partes[i].domicilio) {
      const clP = this.state.data.clientes.find(x => x.nombre === this.state.form.cliente);
      const dirP = ((clP && clP.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0];
      partes[i].domicilio = dirP || 'Nueva dirección…';
    }
    if (key === 'forma' && v !== 'efectivo') { partes[i].lugar = 'retiro'; partes[i].domicilio = ''; partes[i].nuevoDomicilio = ''; partes[i].nuevoDomicilioAlias = ''; partes[i].nuevoDomicilioGeo = null; }
    if (key === 'domicilio' && v !== 'Nueva dirección…') { partes[i].nuevoDomicilio = ''; partes[i].nuevoDomicilioAlias = ''; partes[i].nuevoDomicilioGeo = null; }
    this.setState({ form: Object.assign({}, this.state.form, { [campo]: partes }) });
  }

  setPartePlace(campo, i, place) {
    const partes = (this.state.form[campo] || []).map(x => Object.assign({}, x));
    if (!partes[i]) return;
    partes[i].nuevoDomicilio = place.formatted;
    partes[i].nuevoDomicilioGeo = { lat: place.lat, lng: place.lng, placeId: place.placeId };
    this.setState({ form: Object.assign({}, this.state.form, { [campo]: partes }) });
  }

  quitarParte(campo, i) {
    const partes = (this.state.form[campo] || []).filter((_, idx) => idx !== i);
    this.setState({ form: Object.assign({}, this.state.form, { [campo]: partes.length ? partes : [this.parteVacia(this.formaDefaultDe(campo, this.state.form))] }) });
  }

  setParteAmbos(i, key, v) {
    const pagoPartes = (this.state.form.partesPago || []).map(x => Object.assign({}, x));
    const divPartes = (this.state.form.partesDivisa || []).map(x => Object.assign({}, x));
    if (pagoPartes[i]) pagoPartes[i] = Object.assign({}, pagoPartes[i], { [key]: v });
    if (divPartes[i]) divPartes[i] = Object.assign({}, divPartes[i], { [key]: v });
    if (key === 'nuevoDomicilio') {
      if (pagoPartes[i]) pagoPartes[i].nuevoDomicilioGeo = null;
      if (divPartes[i]) divPartes[i].nuevoDomicilioGeo = null;
    }
    if (key === 'domicilio' && v !== 'Nueva dirección…') {
      if (pagoPartes[i]) { pagoPartes[i].nuevoDomicilio = ''; pagoPartes[i].nuevoDomicilioAlias = ''; pagoPartes[i].nuevoDomicilioGeo = null; }
      if (divPartes[i]) { divPartes[i].nuevoDomicilio = ''; divPartes[i].nuevoDomicilioAlias = ''; divPartes[i].nuevoDomicilioGeo = null; }
    }
    this.setState({ form: Object.assign({}, this.state.form, { partesPago: pagoPartes, partesDivisa: divPartes }) });
  }

  setParteAmbosPlace(i, place) {
    const pagoPartes = (this.state.form.partesPago || []).map(x => Object.assign({}, x));
    const divPartes = (this.state.form.partesDivisa || []).map(x => Object.assign({}, x));
    const geo = { lat: place.lat, lng: place.lng, placeId: place.placeId };
    if (pagoPartes[i]) { pagoPartes[i].nuevoDomicilio = place.formatted; pagoPartes[i].nuevoDomicilioGeo = geo; }
    if (divPartes[i]) { divPartes[i].nuevoDomicilio = place.formatted; divPartes[i].nuevoDomicilioGeo = geo; }
    this.setState({ form: Object.assign({}, this.state.form, { partesPago: pagoPartes, partesDivisa: divPartes }) });
  }

  togglePartDomDistintos(i, checked) {
    const form = Object.assign({}, this.state.form);
    const arr = (form.partesDomDistintos || []).slice();
    arr[i] = checked;
    form.partesDomDistintos = arr;
    const pagoPartes = (form.partesPago || []).map(x => Object.assign({}, x));
    const divPartes = (form.partesDivisa || []).map(x => Object.assign({}, x));
    if (!checked && pagoPartes[i] && divPartes[i]) {
      const val = pagoPartes[i].domicilio || divPartes[i].domicilio || '';
      pagoPartes[i].domicilio = val; divPartes[i].domicilio = val;
      const nd = pagoPartes[i].nuevoDomicilio || divPartes[i].nuevoDomicilio || '';
      const na = pagoPartes[i].nuevoDomicilioAlias || divPartes[i].nuevoDomicilioAlias || '';
      pagoPartes[i].nuevoDomicilio = val === 'Nueva dirección…' ? nd : '';
      divPartes[i].nuevoDomicilio = val === 'Nueva dirección…' ? nd : '';
      pagoPartes[i].nuevoDomicilioAlias = val === 'Nueva dirección…' ? na : '';
      divPartes[i].nuevoDomicilioAlias = val === 'Nueva dirección…' ? na : '';
    }
    form.partesPago = pagoPartes; form.partesDivisa = divPartes;
    this.setState({ form });
  }

  // un select cuyo valor no está entre sus opciones muestra la primera: el form tiene que decir lo mismo
  formVisible(kind, d) {
    const mf = this.formDefs(kind, d);
    const f = Object.assign({}, this.state.form);
    mf.fields.forEach(x => {
      if (x.select && x.select.length && x.select.indexOf(f[x.k]) < 0) f[x.k] = x.select[0];
    });
    return { mf: mf, f: f };
  }

  faltantes(kind, f) {
    const out = (REQ[kind] || []).filter(k => {
      const v = f[k];
      if (NUM_REQ.indexOf(k) >= 0) return !parseNum(v);
      return !(v || '').toString().trim();
    });
    if (f.cliente === NUEVO_CLI && !(f.nuevoCliente || '').trim()) out.push('nuevoCliente');
    if (f.lugar === 'domicilio') {
      if (!(f.domicilio || '').trim()) out.push('domicilio');
      else if (f.domicilio === 'Nueva dirección…') {
        if (!(f.nuevoDomicilio || '').trim()) out.push('nuevoDomicilio');
        if (!(f.nuevoDomicilioAlias || '').trim()) out.push('nuevoDomicilioAlias');
      }
    }
    if (f.lugarPago === 'domicilio' || f.lugarDivisa === 'domicilio') {
      const distintos = f.lugarPago === 'domicilio' && f.lugarDivisa === 'domicilio' && !!f.domiciliosDistintos;
      const checkDom = (domK, nuevoK, aliasK) => {
        if (!(f[domK] || '').trim()) out.push(domK);
        else if (f[domK] === 'Nueva dirección…') {
          if (!(f[nuevoK] || '').trim()) out.push(nuevoK);
          if (!(f[aliasK] || '').trim()) out.push(aliasK);
        }
      };
      if (distintos) {
        if (f.lugarPago === 'domicilio') checkDom('domicilioPago', 'nuevoDomicilioPago', 'nuevoDomicilioPagoAlias');
        if (f.lugarDivisa === 'domicilio') checkDom('domicilioDivisa', 'nuevoDomicilioDivisa', 'nuevoDomicilioDivisaAlias');
      } else {
        checkDom('domicilio', 'nuevoDomicilio', 'nuevoDomicilioAlias');
      }
    }
    const checkPartes = (partes, total, eps, key) => {
      let bad = Math.abs((partes || []).reduce((a, p) => a + (parseNum(p.monto) || 0), 0) - total) >= eps;
      (partes || []).forEach(p => {
        if (!(p.monto || '').toString().trim()) return;
        if ((p.forma || 'efectivo') === 'efectivo' && p.lugar === 'domicilio') {
          if (!(p.domicilio || '').trim()) bad = true;
          else if (p.domicilio === 'Nueva dirección…' && (!(p.nuevoDomicilio || '').trim() || !(p.nuevoDomicilioAlias || '').trim())) bad = true;
        }
      });
      if (bad) out.push(key);
    };
    if (f.dividirPartes) {
      checkPartes(f.partesPago, parseNum(f.cantidad) * parseNum(f.tc), 0.5, 'partesPago');
      checkPartes(f.partesDivisa, parseNum(f.cantidad), 0.01, 'partesDivisa');
    }
    if (kind === 'op') {
      if (f.monedaPago === 'Otra' && !(f.monedaPagoOtra || '').trim()) out.push('monedaPagoOtra');
      if (f.moneda === 'Otra' && !(f.monedaOtra || '').trim()) out.push('monedaOtra');
      const nomA = f.monedaPago === 'Otra' ? (f.monedaPagoOtra || '').trim().toLowerCase() : (f.monedaPago || 'ARS').toLowerCase();
      const nomB = f.moneda === 'Otra' ? (f.monedaOtra || '').trim().toLowerCase() : (f.moneda || 'USD').toLowerCase();
      if (nomA && nomB && nomA === nomB) out.push('monedaPago');
    }
    return out;
  }

  auditar(d, accion, entidad, refId, detalle) {
    d.audit = (d.audit || []).concat([{ id: uid(), ts: new Date().toISOString(),
      operador: (this.state.authUser && this.state.authUser.nombre) || d.operador || 'Mesa', accion: accion, entidad: entidad, refId: refId, detalle: detalle }]);
  }

  nombreComisionista(d, id) { const c = (d.comisionistas || []).find(x => x.id === id); return c ? c.nombre : ''; }

  resumenReg(coll, r, d) {
    const nom = (id) => { const c = (d.clientes || []).find(x => x.id === id); return c ? c.nombre : '—'; };
    if (coll === 'usuarios') return r.nombre + ' (' + r.usuario + ') · ' + (ROLES.find(x => x.id === r.rol) || {}).nombre;
    if (coll === 'ops') return r.tipo + ' ' + nf(r.cantidad, 0) + ' ' + (r.moneda || '') + ' a ' + nf(r.tc, 2) + ' · ' + nom(r.clienteId);
    if (coll === 'cripto') return r.tipo + ' ' + nf(r.cantidad, 0) + ' ' + (r.moneda || '') + ' a ' + nf(r.tc, 2) + ' · ' + nom(r.clienteId);
    if (coll === 'mayoristaOps') return nf(r.cantidad, 0) + ' ' + (r.moneda || '') + ' a ' + nf(r.tc, 2) + ' · ' + this.nombreComisionista(d, r.comisionistaId);
    if (coll === 'cables') return (r.tipo === 'Subida' ? 'subida ' : 'bajada ') + usd(r.monto) + ' · ' + nom(r.clienteId) + ' / ' + this.nombreComisionista(d, r.comisionistaId) + ' · ' + r.estado;
    if (coll === 'ctacte') return (r.motivo || '') + ' · ' + nf(r.monto, 2) + ' ' + r.moneda + ' · ' + nom(r.clienteId);
    if (coll === 'gastos') return (r.motivo || '') + ' · ' + pesos(r.monto) + ' · ' + (r.socio || '') + (r.obs && r.obs !== '—' ? ' · ' + r.obs : '');
    if (coll === 'cotiz') return dmy(r.fecha) + ' ' + (r.momento || '') + ' · USD/ARS ' + nf(r.dc, 2) + '/' + nf(r.dv, 2) + ' · EUR/USD ' + nf(r.ec, 4) + '/' + nf(r.ev, 4) + ' · USD/BRL ' + nf(r.rc, 4) + '/' + nf(r.rv, 4) + ' · GBP/USD ' + nf(r.lc, 4) + '/' + nf(r.lv, 4);
    if (coll === 'aportes') return (r.socio || '') + ' · ' + nf(r.monto, 0) + ' ' + r.moneda;
    return r.nombre || '';
  }

  setField(k, v) {
    const d = this.state.data;
    if (NUM_FIELDS.indexOf(k) >= 0) v = fmtNum(v);
    const form = Object.assign({}, this.state.form, { [k]: v });
    if (NUEVO_DOM_FIELDS.indexOf(k) >= 0) form[k + 'Geo'] = null;
    const errs = (this.state.errors || []).filter(x => x !== k);
    if (k === 'cliente' && v !== NUEVO_CLI) form.nuevoCliente = '';
    if (k === 'comisionista' && v !== NUEVO_COM && v !== NUEVO_MAY) form.nuevoComisionista = '';
    if (k === 'lugar' && v !== 'domicilio') { form.domicilio = ''; form.nuevoDomicilio = ''; }
    if (k === 'lugar' && v === 'domicilio' && !form.domicilio) {
      const c = d.clientes.find(x => x.nombre === form.cliente);
      const dir = ((c && c.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0];
      form.domicilio = dir || 'Nueva dirección…';
    }
    if (k === 'formaPago' || k === 'formaRetiro' || k === 'movimiento') {
      const cc = CC_TIPOS.find(x => x.label === form.movimiento);
      const efec = form.formaPago === 'efectivo' || form.formaRetiro === 'efectivo' || (this.state.modal === 'ctacte' && cc && cc.efectivo);
      if (!efec) { form.lugar = ''; form.domicilio = ''; form.nuevoDomicilio = ''; }
      else if (!form.lugar) form.lugar = 'retiro';
    }
    if (this.state.modal === 'op' || this.state.modal === 'cripto') {
      if (k === 'moneda' || k === 'monedaPago') {
        if (this.state.modal === 'cripto') {
          if (k === 'monedaPago') {
            if (form.monedaPago === 'USDT' && form.moneda === 'USDT') form.moneda = 'ARS';
            else if (form.monedaPago !== 'USDT' && form.moneda !== 'USDT') form.moneda = 'USDT';
          }
          if (k === 'moneda') {
            if (form.moneda === 'USDT' && form.monedaPago === 'USDT') form.monedaPago = 'ARS';
            else if (form.moneda !== 'USDT' && form.monedaPago !== 'USDT') form.monedaPago = 'USDT';
          }
          form.formaPago = form.monedaPago === 'USDT' ? 'transferencia' : 'efectivo';
          form.formaRetiro = form.moneda === 'USDT' ? 'transferencia' : 'efectivo';
          form.lugarPago = form.formaPago === 'efectivo' ? 'retiro' : '';
          form.lugarDivisa = form.formaRetiro === 'efectivo' ? 'retiro' : '';
        }
        const tipoDer0 = this.tipoDerivado(form.monedaPago || 'ARS', form.moneda || 'USD');
        const refPar0 = this.refParEntre(d, form.monedaPago || 'ARS', form.moneda || 'USD', tipoDer0);
        form.tc = refPar0 ? nf(this.tcVista(form.monedaPago || 'ARS', form.moneda || 'USD', refPar0), this.tcDecimales(form.monedaPago || 'ARS', form.moneda || 'USD')) : '0';
        form.cantidad = ''; form.montoPago = ''; form.margen = '0';
        form.margenAuto = true;
        form.comision = '0'; form.comisionAuto = true;
      }
      if (k === 'fecha') {
        const monDef = this.state.modal === 'cripto' ? 'USDT' : 'USD';
        const tipoDerF = this.tipoDerivado(form.monedaPago || 'ARS', form.moneda || monDef);
        const refParF = this.refParEntre(d, form.monedaPago || 'ARS', form.moneda || monDef, tipoDerF, v);
        if (refParF) form.tc = nf(this.tcVista(form.monedaPago || 'ARS', form.moneda || monDef, refParF), this.tcDecimales(form.monedaPago || 'ARS', form.moneda || monDef));
      }
    }
    if ((this.state.modal === 'op' || this.state.modal === 'cripto' || this.state.modal === 'mayorista') && (k === 'formaPago' || k === 'formaRetiro' || k === 'lugarPago' || k === 'lugarDivisa' || k === 'domiciliosDistintos' || k === 'dividirPartes')) {
      if (k === 'formaPago') form.lugarPago = v === 'efectivo' ? (form.lugarPago || 'retiro') : '';
      if (k === 'formaRetiro') form.lugarDivisa = v === 'efectivo' ? (form.lugarDivisa || 'retiro') : '';
      if (k === 'dividirPartes') {
        form.partesPago = v ? [this.parteVacia(this.formaDefaultDe('partesPago', form))] : [];
        form.partesDivisa = v ? [this.parteVacia(this.formaDefaultDe('partesDivisa', form))] : [];
      }
      const lugarPagoEff = form.dividirPartes ? '' : form.lugarPago;
      const lugarDivisaEff = form.dividirPartes ? '' : form.lugarDivisa;
      const ambosDom = lugarPagoEff === 'domicilio' && lugarDivisaEff === 'domicilio';
      if (!ambosDom) form.domiciliosDistintos = false;
      const distintos = ambosDom && form.domiciliosDistintos;
      if (lugarPagoEff !== 'domicilio' && lugarDivisaEff !== 'domicilio') {
        form.domicilio = ''; form.nuevoDomicilio = ''; form.nuevoDomicilioAlias = '';
        form.domicilioPago = ''; form.nuevoDomicilioPago = ''; form.nuevoDomicilioPagoAlias = '';
        form.domicilioDivisa = ''; form.nuevoDomicilioDivisa = ''; form.nuevoDomicilioDivisaAlias = '';
      } else {
        const c0 = this.state.modal === 'mayorista' ? (d.comisionistas || []).find(x => x.nombre === form.comisionista) : d.clientes.find(x => x.nombre === form.cliente);
        const primerDir = ((c0 && c0.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0] || 'Nueva dirección…';
        if (distintos) {
          form.domicilio = ''; form.nuevoDomicilio = ''; form.nuevoDomicilioAlias = '';
          if (lugarPagoEff === 'domicilio') { if (!form.domicilioPago) form.domicilioPago = primerDir; }
          else { form.domicilioPago = ''; form.nuevoDomicilioPago = ''; form.nuevoDomicilioPagoAlias = ''; }
          if (lugarDivisaEff === 'domicilio') { if (!form.domicilioDivisa) form.domicilioDivisa = primerDir; }
          else { form.domicilioDivisa = ''; form.nuevoDomicilioDivisa = ''; form.nuevoDomicilioDivisaAlias = ''; }
        } else {
          form.domicilioPago = ''; form.nuevoDomicilioPago = ''; form.nuevoDomicilioPagoAlias = '';
          form.domicilioDivisa = ''; form.nuevoDomicilioDivisa = ''; form.nuevoDomicilioDivisaAlias = '';
          if (!form.domicilio) form.domicilio = primerDir;
        }
      }
    }
    if (this.state.modal === 'op' || this.state.modal === 'cripto') {
      if (k === 'cliente') {
        form.domicilioPago = ''; form.domicilioDivisa = '';
        form.nuevoDomicilioPago = ''; form.nuevoDomicilioPagoAlias = '';
        form.nuevoDomicilioDivisa = ''; form.nuevoDomicilioDivisaAlias = '';
        const c0 = d.clientes.find(x => x.nombre === v);
        form.domicilio = ((c0 && c0.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0] || 'Nueva dirección…';
        form.nuevoDomicilio = ''; form.nuevoDomicilioAlias = '';
      }
      const monA = form.monedaPago || 'ARS', monB = form.moneda || 'USD';
      if (k === 'montoPago') {
        const tcInt = this.tcVista(monA, monB, parseNum(form.tc));
        if (tcInt) form.cantidad = nf(parseNum(v) / tcInt, 0);
      } else if (k === 'cantidad') {
        form.montoPago = nf(parseNum(form.cantidad) * this.tcVista(monA, monB, parseNum(form.tc)), 0);
      }
      const tipoDer = this.tipoDerivado(monA, monB);
      if (k === 'comision') form.comisionAuto = false;
      if (k === 'comisionista') form.comisionAuto = true;
      if ((k === 'comisionista' || k === 'cantidad' || k === 'tc' || k === 'montoPago') && form.comisionAuto !== false) {
        const cm = (d.comisionistas || []).find(c => c.nombre === form.comisionista);
        let usdOperado;
        if (monB === 'USD' || monB === 'USDT') usdOperado = parseNum(form.cantidad);
        else if (monA === 'USD' || monA === 'USDT') usdOperado = parseNum(form.montoPago);
        else usdOperado = this.aUsd(d, parseNum(form.cantidad) * this.tcVista(monA, monB, parseNum(form.tc)), tipoDer);
        form.comision = (cm && cm.comisionPct) ? nf(Math.abs(usdOperado) * (Number(cm.comisionPct) || 0) / 100, 2) : '0';
        if (!form.comisionMoneda) form.comisionMoneda = 'USD';
      }
    }
    if (this.state.modal === 'mayorista') {
      if (k === 'tipo' && v === 'Cable') { form.monedaPago = 'USD'; form.moneda = 'USD'; }
      const tcMercadoMayorista = () => {
        const monPago = form.monedaPago || 'ARS', mon = form.moneda || 'USD';
        const tipoDerM = this.tipoDerivado(monPago, mon);
        const refM = this.refMercadoEntre(d, monPago, mon, tipoDerM, form.fecha);
        return refM ? nf(this.tcVista(monPago, mon, refM), this.tcDecimales(monPago, mon)) : (form.tc || '0');
      };
      if (k === 'moneda' || k === 'monedaPago' || k === 'tipo') {
        form.tc = tcMercadoMayorista();
        form.cantidad = ''; form.montoPago = '';
      }
      const monA = form.monedaPago || 'ARS', monB = form.moneda || 'USD';
      const rate = this.tcVista(monA, monB, parseNum(form.tc)); // monA (vendemos) por unidad de monB (compramos)
      if (k === 'montoPago') {
        if (rate) form.cantidad = nf(parseNum(v) / rate, 0);
      } else if (k === 'cantidad') {
        form.montoPago = nf(parseNum(v) * rate, 0);
      } else if (k === 'tc') {
        if (parseNum(form.cantidad)) form.montoPago = nf(parseNum(form.cantidad) * rate, 0);
        else if (parseNum(form.montoPago) && rate) form.cantidad = nf(parseNum(form.montoPago) / rate, 0);
      }
    }
    if (this.state.modal === 'cable') {

      if (k === 'formaCliente') form.lugarCliente = v === 'efectivo' ? (form.lugarCliente || 'retiro') : '';
      if (k === 'lugarCliente' && v === 'domicilio' && !form.domicilioCliente) {
        const c0 = d.clientes.find(x => x.nombre === form.cliente);
        const dir = ((c0 && c0.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0];
        form.domicilioCliente = dir || 'Nueva dirección…';
      }
      if (k === 'lugarCliente' && v !== 'domicilio') { form.domicilioCliente = ''; form.nuevoDomicilioCliente = ''; form.nuevoDomicilioClienteAlias = ''; }
      if (k === 'formaMayorista') form.lugarMayorista = v === 'efectivo' ? (form.lugarMayorista || 'retiro') : '';
      if (k === 'lugarMayorista' && v === 'domicilio' && !form.domicilioMayorista) {
        const cm0 = (d.comisionistas || []).find(x => x.nombre === form.comisionista);
        const dir = ((cm0 && cm0.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x))[0];
        form.domicilioMayorista = dir || 'Nueva dirección…';
      }
      if (k === 'lugarMayorista' && v !== 'domicilio') { form.domicilioMayorista = ''; form.nuevoDomicilioMayorista = ''; form.nuevoDomicilioMayoristaAlias = ''; }
      if (k === 'dividirPartesCable') {
        form.partesMayorista = v ? [this.parteVacia(this.formaDefaultDe('partesMayorista', form))] : [];
        form.partesCliente = v ? [this.parteVacia(this.formaDefaultDe('partesCliente', form))] : [];
      }
      if (k === 'cliente') { form.domicilioCliente = ''; form.nuevoDomicilioCliente = ''; form.nuevoDomicilioClienteAlias = ''; }
    }
    this.setState({ form: form, errors: errs });
  }

  toggleFormPata(key) {
    const patasHechas = Object.assign({}, this.state.form.patasHechas);
    patasHechas[key] = !patasHechas[key];
    this.setState({ form: Object.assign({}, this.state.form, { patasHechas }) });
  }

  setFormPata(key, val) {
    const patasHechas = Object.assign({}, this.state.form.patasHechas);
    patasHechas[key] = val;
    this.setState({ form: Object.assign({}, this.state.form, { patasHechas }) });
  }

  save() {
    const s = this.state, d = JSON.parse(JSON.stringify(s.data));
    const f = this.formVisible(s.modal, s.data).f;
    const faltan = this.faltantes(s.modal, f);
    if (faltan.length) return this.setState({ errors: faltan });
    if (this.direccionesFaltanValidar(f)) return this.setState({ modalErr: 'Elegí una sugerencia de Google Maps para cada dirección nueva cargada.' });
    const altaCliente = (sel, nuevo, tipo) => {
      if (sel !== NUEVO_CLI) return d.clientes.find(c => c.nombre === sel) || (d.comisionistas || []).find(c => c.nombre === sel);
      const nom = (nuevo || '').trim();
      if (!nom) return null;
      const ya = d.clientes.find(c => (c.nombre || '').toLowerCase() === nom.toLowerCase());
      if (ya) return ya;
      const nc = { id: uid(), numero: d.clientes.length + 1, nombre: nom, tipo: tipo, contacto: '', alta: today(), obs: '—', direcciones: [] };
      d.clientes.push(nc);
      return nc;
    };
    const resolverDomCampo = (ent, domK, nuevoK, aliasK, coll) => {
      coll = coll || d.clientes;
      const esNueva = f[domK] === 'Nueva dirección…';
      let dom = esNueva ? (f[nuevoK] || '') : (f[domK] || '');
      if (esNueva && dom && ent) {
        const t = coll.find(c => c.id === ent.id);
        const piso = (f[nuevoK + 'Piso'] || '').trim(), obsD = (f[nuevoK + 'Obs'] || '').trim();
        t.direcciones = (t.direcciones || []).concat([{ alias: (f[aliasK] || '').trim() || dom, calle: dom, geo: f[nuevoK + 'Geo'] || null, piso: piso, obs: obsD }]);
        dom = formatDireccionTxt(dom, piso, obsD);
      } else if (dom && ent) {
        const t = coll.find(c => c.id === ent.id);
        const match = (t && t.direcciones || []).find(x => (x.calle || '').trim() === dom.trim());
        if (match) dom = formatDireccionTxt(dom, match.piso, match.obs);
      }
      return dom;
    };
    const resolverDom = (cl) => resolverDomCampo(cl, 'domicilio', 'nuevoDomicilio', 'nuevoDomicilioAlias');
    const altaComisionista = (sel, nuevo, tipoDefault) => {
      if (sel !== NUEVO_COM && sel !== NUEVO_MAY) return (d.comisionistas || []).find(c => c.nombre === sel);
      const nom = (nuevo || '').trim();
      if (!nom) return null;
      const ya = (d.comisionistas || []).find(c => (c.nombre || '').toLowerCase() === nom.toLowerCase());
      if (ya) return ya;
      const nc = { id: uid(), numero: (d.comisionistas || []).length + 1, nombre: nom, tipo: tipoDefault || TIPOS_COMISIONISTA[0], comisionPct: null };
      d.comisionistas = (d.comisionistas || []).concat([nc]);
      return nc;
    };
    const resolverComisionista = (sel, nuevo, tipoDefault) => {
      if (!sel || sel === SIN_COMISIONISTA) return { id: null };
      const cm = altaComisionista(sel, nuevo, tipoDefault);
      return cm || null;
    };
    const resolverPartes = (partes, ent, coll) => (partes || []).filter(p => (p.monto || '').toString().trim()).map(p => {
      coll = coll || d.clientes;
      const forma = p.forma || 'efectivo';
      let lugar = '', entrega = '';
      if (forma === 'efectivo') {
        lugar = p.lugar || 'retiro';
        if (lugar === 'domicilio') {
          let dom = p.domicilio === 'Nueva dirección…' ? (p.nuevoDomicilio || '') : (p.domicilio || '');
          if (p.domicilio === 'Nueva dirección…' && dom) {
            const t = coll.find(c => c.id === ent.id);
            const yaExiste = (t.direcciones || []).some(x => (x.calle || '').trim().toLowerCase() === dom.trim().toLowerCase());
            const piso = (p.nuevoDomicilioPiso || '').trim(), obsD = (p.nuevoDomicilioObs || '').trim();
            if (!yaExiste) t.direcciones = (t.direcciones || []).concat([{ alias: (p.nuevoDomicilioAlias || '').trim() || dom, calle: dom, geo: p.nuevoDomicilioGeo || null, piso: piso, obs: obsD }]);
            dom = formatDireccionTxt(dom, piso, obsD);
          } else if (dom) {
            const t = coll.find(c => c.id === ent.id);
            const match = (t && t.direcciones || []).find(x => (x.calle || '').trim() === dom.trim());
            if (match) dom = formatDireccionTxt(dom, match.piso, match.obs);
          }
          entrega = dom;
        }
      }
      return { monto: parseNum(p.monto), forma: forma, lugar: lugar, entrega: lugar === 'domicilio' ? entrega : (lugar || '—') };
    });
    let rec = null;
    if (s.modal === 'mayorista') {
      const may = resolverComisionista(f.comisionista, f.nuevoComisionista, 'Mayorista');
      if (!may || !may.id) return this.setState({ errors: ['nuevoComisionista'] });
      const lugarPagoRawMy = f.dividirPartes ? '' : (f.formaPago === 'efectivo' ? (f.lugarPago || 'retiro') : '');
      const lugarDivisaRawMy = f.dividirPartes ? '' : (f.formaRetiro === 'efectivo' ? (f.lugarDivisa || 'retiro') : '');
      const distintosMy = lugarPagoRawMy === 'domicilio' && lugarDivisaRawMy === 'domicilio' && !!f.domiciliosDistintos;
      const resolverDomMay = () => resolverDomCampo(may, 'domicilio', 'nuevoDomicilio', 'nuevoDomicilioAlias', d.comisionistas);
      const entregaCompartidaMy = (lugarPagoRawMy === 'domicilio' || lugarDivisaRawMy === 'domicilio') && !distintosMy ? resolverDomMay() : '';
      const entregaPagoMy = lugarPagoRawMy === 'domicilio' ? (distintosMy ? resolverDomCampo(may, 'domicilioPago', 'nuevoDomicilioPago', 'nuevoDomicilioPagoAlias', d.comisionistas) : entregaCompartidaMy) : '';
      const entregaDivisaMy = lugarDivisaRawMy === 'domicilio' ? (distintosMy ? resolverDomCampo(may, 'domicilioDivisa', 'nuevoDomicilioDivisa', 'nuevoDomicilioDivisaAlias', d.comisionistas) : entregaCompartidaMy) : '';
      rec = { fecha: f.fecha, comisionistaId: may.id, esCable: f.tipo === 'Cable',
        monedaPago: f.monedaPago || 'ARS', monedaPagoOtra: f.monedaPago === 'Otra' ? (f.monedaPagoOtra || 'Otra') : '',
        moneda: f.moneda || 'USD', monedaOtra: f.moneda === 'Otra' ? (f.monedaOtra || 'Otra') : '',
        cantidad: parseNum(f.cantidad), tc: this.tcVista(f.monedaPago || 'ARS', f.moneda || 'USD', parseNum(f.tc)),
        formaPago: f.dividirPartes ? '' : f.formaPago, formaRetiro: f.dividirPartes ? '' : f.formaRetiro,
        lugarPago: lugarPagoRawMy, entregaPago: lugarPagoRawMy === 'domicilio' ? entregaPagoMy : (lugarPagoRawMy || '—'),
        lugarDivisa: lugarDivisaRawMy, entregaDivisa: lugarDivisaRawMy === 'domicilio' ? entregaDivisaMy : (lugarDivisaRawMy || '—'),
        partesPago: f.dividirPartes ? resolverPartes(f.partesPago, may, d.comisionistas) : null,
        partesDivisa: f.dividirPartes ? resolverPartes(f.partesDivisa, may, d.comisionistas) : null,
        ok: 'pendiente' };
    } else if (s.modal === 'op') {
      const cl = altaCliente(f.cliente, f.nuevoCliente, 'cliente');
      if (!cl) return this.setState({ errors: ['nuevoCliente'] });
      const comisionista = resolverComisionista(f.comisionista, f.nuevoComisionista);
      if (!comisionista) return this.setState({ errors: ['nuevoComisionista'] });
      const lugarPagoRaw = f.dividirPartes ? '' : (f.formaPago === 'efectivo' ? (f.lugarPago || 'retiro') : '');
      const lugarDivisaRaw = f.dividirPartes ? '' : (f.formaRetiro === 'efectivo' ? (f.lugarDivisa || 'retiro') : '');
      const distintosOp = lugarPagoRaw === 'domicilio' && lugarDivisaRaw === 'domicilio' && !!f.domiciliosDistintos;
      const entregaCompartida = (lugarPagoRaw === 'domicilio' || lugarDivisaRaw === 'domicilio') && !distintosOp ? resolverDom(cl) : '';
      const entregaPago = lugarPagoRaw === 'domicilio' ? (distintosOp ? resolverDomCampo(cl, 'domicilioPago', 'nuevoDomicilioPago', 'nuevoDomicilioPagoAlias') : entregaCompartida) : '';
      const entregaDivisa = lugarDivisaRaw === 'domicilio' ? (distintosOp ? resolverDomCampo(cl, 'domicilioDivisa', 'nuevoDomicilioDivisa', 'nuevoDomicilioDivisaAlias') : entregaCompartida) : '';
      rec = { tipo: (f.monedaPago || 'ARS') === 'ARS' ? 'compra' : (f.moneda === 'ARS' ? 'venta' : 'compra'), fecha: f.fecha, clienteId: cl.id,
        monedaPago: f.monedaPago || 'ARS', monedaPagoOtra: f.monedaPago === 'Otra' ? (f.monedaPagoOtra || 'Otra') : '',
        moneda: f.moneda || 'USD', monedaOtra: f.moneda === 'Otra' ? (f.monedaOtra || 'Otra') : '',
        cantidad: parseNum(f.cantidad), tc: this.tcVista(f.monedaPago || 'ARS', f.moneda || 'USD', parseNum(f.tc)),
        comisionistaId: comisionista.id, comision: parseNum(f.comision), comisionMoneda: f.comisionMoneda || 'USD',
        formaPago: f.formaPago, formaRetiro: f.formaRetiro,
        lugarPago: lugarPagoRaw, entregaPago: lugarPagoRaw === 'domicilio' ? entregaPago : (lugarPagoRaw || '—'),
        lugarDivisa: lugarDivisaRaw, entregaDivisa: lugarDivisaRaw === 'domicilio' ? entregaDivisa : (lugarDivisaRaw || '—'),
        partesPago: f.dividirPartes ? resolverPartes(f.partesPago, cl) : null,
        partesDivisa: f.dividirPartes ? resolverPartes(f.partesDivisa, cl) : null };
    } else if (s.modal === 'cripto') {
      const cl = altaCliente(f.cliente, f.nuevoCliente, 'cliente');
      if (!cl) return this.setState({ errors: ['nuevoCliente'] });
      const comisionista = resolverComisionista(f.comisionista, f.nuevoComisionista);
      if (!comisionista) return this.setState({ errors: ['nuevoComisionista'] });
      const lugarPagoRaw = f.dividirPartes ? '' : (f.formaPago === 'efectivo' ? (f.lugarPago || 'retiro') : '');
      const lugarDivisaRaw = f.dividirPartes ? '' : (f.formaRetiro === 'efectivo' ? (f.lugarDivisa || 'retiro') : '');
      const distintosCr = lugarPagoRaw === 'domicilio' && lugarDivisaRaw === 'domicilio' && !!f.domiciliosDistintos;
      const entregaCompartidaCr = (lugarPagoRaw === 'domicilio' || lugarDivisaRaw === 'domicilio') && !distintosCr ? resolverDom(cl) : '';
      const entregaPagoCr = lugarPagoRaw === 'domicilio' ? (distintosCr ? resolverDomCampo(cl, 'domicilioPago', 'nuevoDomicilioPago', 'nuevoDomicilioPagoAlias') : entregaCompartidaCr) : '';
      const entregaDivisaCr = lugarDivisaRaw === 'domicilio' ? (distintosCr ? resolverDomCampo(cl, 'domicilioDivisa', 'nuevoDomicilioDivisa', 'nuevoDomicilioDivisaAlias') : entregaCompartidaCr) : '';
      rec = { tipo: (f.monedaPago || 'ARS') === 'USDT' ? 'venta' : 'compra', fecha: f.fecha, clienteId: cl.id,
        monedaPago: f.monedaPago || 'ARS', monedaPagoOtra: '',
        moneda: f.moneda || 'USDT', monedaOtra: '',
        cantidad: parseNum(f.cantidad), tc: this.tcVista(f.monedaPago || 'ARS', f.moneda || 'USDT', parseNum(f.tc)),
        comisionistaId: comisionista.id, comision: parseNum(f.comision), comisionMoneda: f.comisionMoneda || 'USD',
        formaPago: f.formaPago, formaRetiro: f.formaRetiro,
        lugarPago: lugarPagoRaw, entregaPago: lugarPagoRaw === 'domicilio' ? entregaPagoCr : (lugarPagoRaw || '—'),
        lugarDivisa: lugarDivisaRaw, entregaDivisa: lugarDivisaRaw === 'domicilio' ? entregaDivisaCr : (lugarDivisaRaw || '—'),
        partesPago: f.dividirPartes ? resolverPartes(f.partesPago, cl) : null,
        partesDivisa: f.dividirPartes ? resolverPartes(f.partesDivisa, cl) : null,
        costo: parseNum(f.costo), costoA: f.costoA || 'cueva' };
    } else if (s.modal === 'cable') {
      const cl = altaCliente(f.cliente, f.nuevoCliente, 'cliente');
      if (!cl) return this.setState({ errors: ['nuevoCliente'] });
      const comisionistaCb = resolverComisionista(f.comisionista, f.nuevoComisionista, 'Mayorista');
      if (!comisionistaCb || !comisionistaCb.id) return this.setState({ errors: ['nuevoComisionista'] });
      const lugarClienteRaw = f.dividirPartesCable ? '' : (f.formaCliente === 'efectivo' ? (f.lugarCliente || 'retiro') : '');
      const entregaCliente = lugarClienteRaw === 'domicilio' ? resolverDomCampo(cl, 'domicilioCliente', 'nuevoDomicilioCliente', 'nuevoDomicilioClienteAlias') : '';
      const lugarMayoristaRaw = f.dividirPartesCable ? '' : (f.formaMayorista === 'efectivo' ? (f.lugarMayorista || 'retiro') : '');
      const entregaMayorista = lugarMayoristaRaw === 'domicilio' ? resolverDomCampo(comisionistaCb, 'domicilioMayorista', 'nuevoDomicilioMayorista', 'nuevoDomicilioMayoristaAlias', d.comisionistas) : '';
      rec = { tipo: f.tipo || 'Bajada', fecha: f.fecha, clienteId: cl.id, comisionistaId: comisionistaCb.id,
        monto: parseNum(f.monto), costoPct: parseNum(f.costoPct), margenPct: parseNum(f.margenPct),
        formaMayorista: f.dividirPartesCable ? '' : (f.formaMayorista || 'cuenta corriente'),
        formaCliente: f.dividirPartesCable ? '' : (f.formaCliente || 'cuenta corriente'),
        lugarMayorista: lugarMayoristaRaw, entregaMayorista: lugarMayoristaRaw === 'domicilio' ? entregaMayorista : (lugarMayoristaRaw || '—'),
        lugarCliente: lugarClienteRaw, entregaCliente: lugarClienteRaw === 'domicilio' ? entregaCliente : (lugarClienteRaw || '—'),
        partesMayorista: f.dividirPartesCable ? resolverPartes(f.partesMayorista, comisionistaCb, d.comisionistas) : null,
        partesCliente: f.dividirPartesCable ? resolverPartes(f.partesCliente, cl) : null,
        obs: f.obs || '—' };
    } else if (s.modal === 'ctacte') {
      const cl = altaCliente(f.cliente, f.nuevoCliente, 'cliente');
      if (!cl) return this.setState({ errors: ['nuevoCliente'] });
      const t = CC_TIPOS.find(x => x.label === f.movimiento) || CC_TIPOS[0];
      const lugar = t.efectivo ? (f.lugar || 'retiro') : '';
      const dom = lugar === 'domicilio' ? resolverDom(cl) : '';
      rec = { clienteId: cl.id, fecha: f.fecha, moneda: f.moneda, lugar: lugar, tipoMov: t.label,
        entrega: lugar === 'domicilio' ? dom : (lugar || ''),
        monto: Math.abs(parseNum(f.monto)) * t.signo, motivo: f.motivo || t.label, efectivo: t.efectivo };
    } else if (s.modal === 'gasto') {
      if (!soloComa(f.monto)) return this.setState({ modalErr: 'Solo números con coma decimal (ej. 110000,50).' });
      const monedaG = f.moneda === 'USD' ? 'USD' : 'ARS';
      const montoOriginalG = parseNum(f.monto);
      const tcG = monedaG === 'USD' ? this.precio(d, 'venta', 'USD', f.fecha) : 1;
      rec = { fecha: f.fecha, motivo: f.motivo, moneda: monedaG, montoOriginal: montoOriginalG, monto: monedaG === 'USD' ? montoOriginalG * tcG : montoOriginalG, socio: f.socio || 'Sin asignar', obs: f.obs || '—' };
    } else if (s.modal === 'cotiz') {
      const malo = PARES.some(p => !soloComa(f[p.kc]) || !soloComa(f[p.kv]));
      if (malo) return this.setState({ modalErr: 'Solo números con coma decimal (ej. 1475,50).' });
      const ult = this.ultimaCotiz(d);
      rec = { fecha: f.fecha, momento: f.momento,
        dc: parseNum(f.dc) || Number(ult.dc) || 0, dv: parseNum(f.dv) || Number(ult.dv) || 0 };
      ['EUR', 'BRL', 'LBR'].forEach(mon => {
        const kk = this.crossKeys(mon), prev = this.ultimaCotizPar(d, mon);
        rec[kk[0]] = parseNum(f[kk[0]]) || (prev ? Number(prev[kk[0]]) || 0 : 0);
        rec[kk[1]] = parseNum(f[kk[1]]) || (prev ? Number(prev[kk[1]]) || 0 : 0);
      });
    } else if (s.modal === 'aporte') {
      rec = { socio: f.socio, fecha: f.fecha, moneda: f.moneda, monto: parseNum(f.monto), concepto: f.concepto };
    } else if (s.modal === 'cliente') {
      if (this.mapsActivo() && (f.domicilios || []).some(x => (x.calle || '').trim() && !x.geo)) return this.setState({ modalErr: 'Elegí una sugerencia de Google Maps para cada dirección cargada.' });
      const doms = (f.domicilios || []).map(x => ({ alias: (x.alias || '').trim(), calle: (x.calle || '').trim(), geo: x.geo || null, piso: (x.piso || '').trim(), obs: (x.obs || '').trim() })).filter(x => x.alias && x.calle);
      rec = { nombre: f.nombre, contacto: f.contacto, obs: f.obs || '—', direcciones: doms };
    } else if (s.modal === 'comisionista') {
      const tipoCm = f.tipo || TIPOS_COMISIONISTA[0];
      if (tipoCm === 'Mayorista' && this.mapsActivo() && (f.domicilios || []).some(x => (x.calle || '').trim() && !x.geo)) return this.setState({ modalErr: 'Elegí una sugerencia de Google Maps para cada dirección cargada.' });
      const domsCm = tipoCm === 'Mayorista' ? (f.domicilios || []).map(x => ({ alias: (x.alias || '').trim(), calle: (x.calle || '').trim(), geo: x.geo || null, piso: (x.piso || '').trim(), obs: (x.obs || '').trim() })).filter(x => x.alias && x.calle) : [];
      rec = { nombre: f.nombre, tipo: tipoCm, comisionPct: f.comisionPct ? parseNum(f.comisionPct) : null, contacto: f.contacto || '', obs: f.obs || '—', direcciones: domsCm };
    } else if (s.modal === 'usuario') {
      const rolObj = ROLES.find(x => x.nombre === f.rol) || ROLES[1];
      const usuarioNorm = (f.usuario || '').trim().toLowerCase();
      const dup = (d.usuarios || []).some(u => u.usuario.toLowerCase() === usuarioNorm && u.id !== s.editId);
      if (dup) return this.setState({ modalErr: 'Ya existe un usuario con ese nombre de usuario.' });
      rec = { nombre: (f.nombre || '').trim(), usuario: (f.usuario || '').trim(), rol: rolObj.id };
    }
    const coll = COLL_DE[s.modal];
    let nuevoUsuarioTemp = null;
    if (coll === 'cotiz' && !s.editId && rec) {
      // si ya existe una cotización para esta fecha y momento, la última cargada es la fuente de verdad: se actualiza en vez de duplicar.
      const dup = (d.cotiz || []).find(x => x.fecha === rec.fecha && x.momento === rec.momento);
      if (dup) {
        const antes = this.resumenReg('cotiz', dup, d);
        Object.assign(dup, rec);
        this.auditar(d, 'edición', ENT_LABEL.cotiz, dup.id || dup.fecha, antes + '  →  ' + this.resumenReg('cotiz', dup, d));
        rec = null;
      }
    }
    if (rec && (coll === 'ops' || coll === 'cripto' || coll === 'cables' || coll === 'mayoristaOps')) rec.patasHechas = f.patasHechas || {};
    if (rec && rec.fecha && s.modal !== 'gasto' && this.diaCerrado(d, rec.fecha)) return this.avisarCerrado(rec.fecha, 'cargar o modificar registros de ese día');
    if (rec && coll) {
      if (s.editId) {
        const i = d[coll].findIndex(x => x.id === s.editId);
        if (i >= 0) {
          const antes = this.resumenReg(coll, d[coll][i], d);
          d[coll][i] = Object.assign({}, d[coll][i], rec);
          if (coll === 'ops' || coll === 'cripto' || coll === 'cables' || coll === 'mayoristaOps') this.recomputeEstado(coll, d[coll][i]);
          this.auditar(d, 'edición', ENT_LABEL[coll], s.editId, antes + '  →  ' + this.resumenReg(coll, d[coll][i], d));
        }
      } else {
        if (coll === 'clientes') {
          rec.alta = today();
        }
        const nuevo = Object.assign({ id: uid() }, rec);
        if (PREFIJO_OP[coll] || coll === 'clientes' || coll === 'comisionistas' || coll === 'usuarios') nuevo.numero = d[coll].length + 1;
        if (coll === 'ops' || coll === 'cripto' || coll === 'mayoristaOps') {
          nuevo.cancelado = false;
          this.recomputeEstado(coll, nuevo);
        } else if (coll === 'cables') {
          nuevo.cancelado = false;
          this.recomputeEstado('cables', nuevo);
        } else if (coll === 'usuarios') {
          nuevo.estado = 'activo'; nuevo.ultimoAcceso = null; nuevo.password = this.generarPasswordTemp(); nuevo.debeCambiarPassword = true;
          nuevoUsuarioTemp = nuevo;
        }
        d[coll].push(nuevo);
        this.auditar(d, 'alta', ENT_LABEL[coll], nuevo.id, this.resumenReg(coll, nuevo, d));
      }
    }
    this.setState(Object.assign({ modal: null, form: {}, editId: null, errors: [], modalErr: '', soloPar: null },
      nuevoUsuarioTemp ? { passwordAMostrar: { usuario: nuevoUsuarioTemp.usuario, password: nuevoUsuarioTemp.password } } : {}));
    this.persist(d);
  }

  del(coll, id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = d[coll].find(x => x.id === id);
    if (r && r.fecha && coll !== 'gastos' && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'borrar este registro');
    if (r) this.auditar(d, 'baja', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d));
    d[coll] = d[coll].filter(x => x.id !== id);
    this.persist(d);
  }

  setCierre(fecha, patch) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    // al cerrar un día se congelan sus márgenes y cruces: cambiarlos después no altera lo ya cerrado
    if (patch.cerrado) patch = Object.assign({ params: JSON.parse(JSON.stringify(d.params)) }, patch);
    else if (patch.cerrado === false) patch = Object.assign({}, patch, { params: null });
    d.cierres[fecha] = Object.assign({}, d.cierres[fecha] || {}, patch);
    if (patch.cerrado !== undefined) this.auditar(d, patch.cerrado ? 'cierre' : 'reapertura', 'día', fecha, dmy(fecha));
    this.persist(d);
  }

  toggleOk(coll, id) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (!r) return;
    if (r.fecha && this.diaCerrado(d, r.fecha)) return this.avisarCerrado(r.fecha, 'cambiar el estado');
    if (r.cancelado) return;
    const prevPatas = JSON.parse(JSON.stringify(r.patasHechas || {}));
    const prevOk = r.ok;
    const completo = !this.accionablesDe(coll, r).todoCompleto;
    if (completo && !window.confirm('¿Marcar esta operación como completada? Se darán por entregadas/recibidas todas las partes.')) return;
    const items = this.accionablesDe(coll, r).items;
    r.patasHechas = {};
    items.forEach(it => { r.patasHechas[it.key] = completo; });
    this.recomputeEstado(coll, r);
    this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d) + ' → ' + r.ok);
    this.persist(d);
    if (completo && this.state.opVista === 'pendientes') this.mostrarToastCompletado(coll, id, prevPatas, prevOk);
  }

  mostrarToastCompletado(coll, id, prevPatas, prevOk) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    const tid = uid();
    this.setState({ toast: { id: tid, mensaje: 'Operación marcada como completada.',
      deshacer: () => this.deshacerCompletado(coll, id, prevPatas, prevOk) } });
    this._toastTimer = setTimeout(() => {
      this.setState(s => (s.toast && s.toast.id === tid) ? { toast: null } : null);
    }, 10000);
  }

  deshacerCompletado(coll, id, prevPatas, prevOk) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    const d = JSON.parse(JSON.stringify(this.state.data));
    const r = (d[coll] || []).find(x => x.id === id);
    if (r) {
      r.patasHechas = prevPatas;
      r.ok = prevOk;
      this.auditar(d, 'estado', ENT_LABEL[coll] || coll, id, this.resumenReg(coll, r, d) + ' → ' + r.ok + ' (deshecho)');
      this.persist(d);
    }
    this.setState({ toast: null });
  }

  cerrarToast() {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.setState({ toast: null });
  }

  setParams(obj) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    Object.keys(obj).forEach(k => {
      const antes = d.params[k], v = parseNum(obj[k]);
      if (antes !== v) { d.params[k] = v; this.auditar(d, 'edición', 'margen', k, k + ': ' + nf(antes, 4) + ' → ' + nf(v, 4)); }
    });
    this.persist(d);
  }

  setParam(k, v) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    const antes = d.params[k];
    d.params[k] = parseNum(v);
    if (antes !== d.params[k]) this.auditar(d, 'edición', 'margen', k, k + ': ' + nf(antes, 4) + ' → ' + nf(d.params[k], 4));
    this.persist(d);
  }

  setOperador(v) {
    const d = JSON.parse(JSON.stringify(this.state.data));
    d.operador = v;
    this.persist(d);
  }

  irAOperacion(id) {
    this.navPush();
    const d = this.state.data;
    if ((d.ops || []).some(o => o.id === id)) this.setState({ screen: 'ops', opTab: 'cambio', opFoco: id, criptoFoco: null, cableFoco: null, query: '' });
    else if ((d.cripto || []).some(o => o.id === id)) this.setState({ screen: 'ops', opTab: 'cripto', opFoco: null, criptoFoco: id, cableFoco: null });
    else this.setState({ screen: 'ops', opTab: 'cable', opFoco: null, criptoFoco: null, cableFoco: id });
  }

  renderVals() {
    const s = this.state, d = s.data;
    const nav = NAV.find(n => n.id === s.screen) || NAV[0];
    const serie = this.serie(d), caja = this.cajaActual(d, serie), u = serie.ultimo;
    const cli = d.clientes.find(c => c.id === s.cliente) || d.clientes[0] || { nombre: '—', direcciones: [] };
    const nombreDe = (id) => { const c = d.clientes.find(x => x.id === id) || (d.comisionistas || []).find(x => x.id === id); return c ? c.nombre : '—'; };
    const tierMap = tierMapDe(d);
    const parteTxt = (p) => p.forma + (p.forma === 'efectivo' ? (p.lugar === 'domicilio' ? ' - entrega en ' + (p.entrega || 'domicilio') : ' - retira por oficina') : '');
    const entregaOpTxt = (o) => {
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const piezas = [];
      if (Array.isArray(o.partesPago) && o.partesPago.length) piezas.push(monA + ': ' + o.partesPago.map(p => parteTxt(p) + ' ' + money(Number(p.monto) || 0, monedaSimbolo(o.monedaPago, o.monedaPagoOtra), 0)).join(' + '));
      else if (o.formaPago) piezas.push(monA + ': ' + o.formaPago + (o.formaPago === 'efectivo' ? (o.lugarPago === 'domicilio' ? ' - entrega en ' + (o.entregaPago || 'domicilio') : ' - retira por oficina') : ''));
      if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) piezas.push(mon + ': ' + o.partesDivisa.map(p => parteTxt(p) + ' ' + nf(Number(p.monto) || 0, 0) + ' ' + mon).join(' + '));
      else if (o.formaRetiro) piezas.push(mon + ': ' + o.formaRetiro + (o.formaRetiro === 'efectivo' ? (o.lugarDivisa === 'domicilio' ? ' - entrega en ' + (o.entregaDivisa || 'domicilio') : ' - retira por oficina') : ''));
      return piezas.join(' · ') || '—';
    };
    const entregaOpBullets = (o) => {
      const mon = o.moneda === 'Otra' ? (o.monedaOtra || 'Otra') : (o.moneda || 'USD');
      const monA = o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS');
      const piezas = [];
      if (Array.isArray(o.partesPago) && o.partesPago.length) piezas.push(monA + ': ' + o.partesPago.map(p => parteTxt(p) + ' ' + money(Number(p.monto) || 0, monedaSimbolo(o.monedaPago, o.monedaPagoOtra), 0)).join(' + '));
      else if (o.formaPago) piezas.push(monA + ': ' + o.formaPago + (o.formaPago === 'efectivo' ? (o.lugarPago === 'domicilio' ? ' - entrega en ' + (o.entregaPago || 'domicilio') : ' - retira por oficina') : ''));
      if (Array.isArray(o.partesDivisa) && o.partesDivisa.length) piezas.push(mon + ': ' + o.partesDivisa.map(p => parteTxt(p) + ' ' + nf(Number(p.monto) || 0, 0) + ' ' + mon).join(' + '));
      else if (o.formaRetiro) piezas.push(mon + ': ' + o.formaRetiro + (o.formaRetiro === 'efectivo' ? (o.lugarDivisa === 'domicilio' ? ' - entrega en ' + (o.entregaDivisa || 'domicilio') : ' - retira por oficina') : ''));
      return piezas.length ? piezas : ['—'];
    };
    const entregaCableTxt = (c) => {
      const piezas = [];
      if (Array.isArray(c.partesMayorista) && c.partesMayorista.length) piezas.push('Mayorista: ' + c.partesMayorista.map(p => parteTxt(p) + ' ' + usd(Number(p.monto) || 0)).join(' + '));
      else if (c.formaMayorista) piezas.push('Mayorista: ' + c.formaMayorista + (c.formaMayorista === 'efectivo' ? (c.lugarMayorista === 'domicilio' ? ' - entrega en ' + (c.entregaMayorista || 'domicilio') : ' - retira por oficina') : ''));
      if (Array.isArray(c.partesCliente) && c.partesCliente.length) piezas.push('Cliente: ' + c.partesCliente.map(p => parteTxt(p) + ' ' + usd(Number(p.monto) || 0)).join(' + '));
      else if (c.formaCliente) piezas.push('Cliente: ' + c.formaCliente + (c.formaCliente === 'efectivo' ? (c.lugarCliente === 'domicilio' ? ' - entrega en ' + (c.entregaCliente || 'domicilio') : ' - retira por oficina') : ''));
      return piezas.join(' · ') || '—';
    };
    const entregaCableBullets = (c) => {
      const piezas = [];
      if (Array.isArray(c.partesMayorista) && c.partesMayorista.length) piezas.push('Mayorista: ' + c.partesMayorista.map(p => parteTxt(p) + ' ' + usd(Number(p.monto) || 0)).join(' + '));
      else if (c.formaMayorista) piezas.push('Mayorista: ' + c.formaMayorista + (c.formaMayorista === 'efectivo' ? (c.lugarMayorista === 'domicilio' ? ' - entrega en ' + (c.entregaMayorista || 'domicilio') : ' - retira por oficina') : ''));
      if (Array.isArray(c.partesCliente) && c.partesCliente.length) piezas.push('Cliente: ' + c.partesCliente.map(p => parteTxt(p) + ' ' + usd(Number(p.monto) || 0)).join(' + '));
      else if (c.formaCliente) piezas.push('Cliente: ' + c.formaCliente + (c.formaCliente === 'efectivo' ? (c.lugarCliente === 'domicilio' ? ' - entrega en ' + (c.entregaCliente || 'domicilio') : ' - retira por oficina') : ''));
      return piezas.length ? piezas : ['—'];
    };
    const q = (s.query || '').toLowerCase();

    // dólar vs dólar cara chica (monedas distintas)
    const calid = { limpios: caja.usd, 'cara chica': caja.saldos['USD cara chica'] || 0 };
    const pend = this.pendientePorMoneda(d);
    const irPend = (monedas) => () => { this.navPush(); this.setState({ screen: 'ops', vista: 'lista', opTab: 'cambio', opVista: 'pendientes', opMonedaPend: monedas, opFoco: null, criptoFoco: null, cableFoco: null, navOpen: false }); };

    // ── Cierre diario: cajas de arriba (posición de hoy + variación vs. ayer) ──
    // "hoy" es siempre la fecha calendario real. Si todavía no hay movimientos cargados hoy,
    // el saldo se arrastra del último cierre (u) y la variación vs. ayer es 0 — no se le atribuye
    // a "hoy" la variación del día en que sí hubo movimientos (p.ej. un aporte de ayer).
    const hoyEsFechaReal = !!u && u.fecha === today();
    const ayerRow = hoyEsFechaReal ? (serie.rows.length > 1 ? serie.rows[serie.rows.length - 2] : null) : (u || null);
    const fechaCierreHoy = dmy(today());
    const variacion = (hoy, ayer, fmt) => {
      const monto = hoy - (ayer || 0);
      const pct = ayer ? (monto / Math.abs(ayer) * 100) : null;
      const f = fmt || ((v) => nf(v, 0));
      return { monto, pct, texto: (monto >= 0 ? '+' : '') + f(monto), pctTexto: pct === null ? '—' : (pct >= 0 ? '+' : '') + nf(pct, 1) + '%', style: monto < 0 ? 'color:#b3261e' : (monto > 0 ? 'color:#1e7d3a' : '') };
    };
    const saldoCard = (label, mon, hoyVal, ayerVal, fmt) => {
      const v = variacion(hoyVal, ayerVal, fmt);
      const p = pend[mon] || 0;
      const pStyle = p > 0.005 ? 'color:#1e7d3a' : (p < -0.005 ? 'color:#b3261e' : '');
      return { label, valor: fmt(hoyVal + p), totalTexto: fmt(hoyVal), variacionTexto: v.texto, variacionPctTexto: v.pctTexto, variacionStyle: v.style,
        tienePendiente: !!p, pendienteTexto: (p > 0 ? '+' : '') + fmt(p), pendienteStyle: pStyle, disponibleTexto: fmt(hoyVal), irPendiente: irPend([mon]) };
    };
    const usdNativoHoy = calid.limpios + calid['cara chica'];
    const usdNativoAyer = ayerRow ? (ayerRow.saldos.USD || 0) + (ayerRow.saldos['USD cara chica'] || 0) : 0;
    const otrasKeys = Object.keys(caja.saldos).filter(k => ['USD', 'USD cara chica', 'EUR', 'USDT'].indexOf(k) < 0 && Math.abs(caja.saldos[k] || 0) > 0.005);
    const saldoCardsCierre = [
      saldoCard('ARS', 'ARS', caja.pesos, ayerRow ? ayerRow.sPesos : 0, (v) => pesos(v)),
      saldoCard('USD', 'USD', usdNativoHoy, usdNativoAyer, (v) => usd(v)),
      saldoCard('USDT', 'USDT', caja.usdt, ayerRow ? (ayerRow.saldos.USDT || 0) : 0, (v) => money(v, 'USDT', 0))
    ];
    const OTRAS_DIVISAS_FIJAS = ['EUR', 'BRL', 'LBR'];
    const otrasDivisasKeysCierre = OTRAS_DIVISAS_FIJAS.concat(otrasKeys.filter(k => OTRAS_DIVISAS_FIJAS.indexOf(k) < 0));
    const otrasDivisasCierre = otrasDivisasKeysCierre.map(k => {
      const hoyVal = k === 'EUR' ? caja.eur : (caja.saldos[k] || 0);
      const ayerVal = ayerRow ? (k === 'EUR' ? (ayerRow.saldos.EUR || 0) : (ayerRow.saldos[k] || 0)) : 0;
      const fmt = (v) => money(v, k, 0);
      const v = variacion(hoyVal, ayerVal, fmt);
      const p = pend[k] || 0;
      const pStyle = p > 0.005 ? 'color:#1e7d3a' : (p < -0.005 ? 'color:#b3261e' : '');
      return { moneda: k, valor: fmt(hoyVal + p), totalTexto: fmt(hoyVal), variacionTexto: v.texto, variacionPctTexto: v.pctTexto, variacionStyle: v.style,
        pendienteTexto: (p > 0 ? '+' : '') + fmt(p), pendienteStyle: pStyle, irPendiente: irPend([k]) };
    });
    const patVarCierre = variacion(u ? u.patValuado : 0, ayerRow ? ayerRow.patValuado : 0, usd);
    const FMT_MON = { ARS: (v) => pesos(v), USD: (v) => usd(v) };
    const fmtMon = (mon, v) => (FMT_MON[mon] || ((x) => money(x, mon, 0)))(v);
    const COLOR_TIPO = { cambio: 'var(--color-accent-900)', cripto: 'var(--color-accent-600)', cable: 'var(--color-accent-300)', mayorista: 'var(--color-neutral-700)' };
    const volSlices = (u ? u.desglose.filter(g => g.tipo !== 'ctacte') : []).map(g => ({ tipo: g.tipo, label: g.label, vol: Math.abs(g.volUsd || 0) }));
    const volTotalHoy = volSlices.reduce((a, x) => a + x.vol, 0);
    let volAcc = 0;
    const volSegs = volSlices.map(s => {
      const pct = volTotalHoy ? s.vol / volTotalHoy * 100 : 0;
      const from = volAcc; volAcc += pct;
      return { tipo: s.tipo, label: s.label, montoTexto: usd(s.vol), pctTexto: nf(pct, 0) + '%', fromDeg: from * 3.6, toDeg: volAcc * 3.6 };
    });
    const pieGradient = volTotalHoy ? ('conic-gradient(' + volSegs.map(s => (COLOR_TIPO[s.tipo] || 'var(--color-accent)') + ' ' + (s.fromDeg / 3.6).toFixed(2) + '% ' + (s.toDeg / 3.6).toFixed(2) + '%').join(',') + ')') : 'var(--color-divider)';
    const volLeyenda = volSegs.map(s => ({
      label: s.label, montoTexto: s.montoTexto, pctTexto: s.pctTexto,
      colorStyle: 'background:' + (COLOR_TIPO[s.tipo] || 'var(--color-accent)'),
      onEnter: (e) => this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: s.label, value: s.montoTexto + ' (' + s.pctTexto + ')' } }),
      onLeave: () => this.setState({ chartTip: null })
    }));
    const onPieMove = (e) => {
      if (!volTotalHoy) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      let ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360;
      const seg = volSegs.find(s => ang >= s.fromDeg && ang < s.toDeg) || volSegs[volSegs.length - 1];
      if (seg) this.setState({ chartTip: { x: e.clientX, y: e.clientY, title: seg.label, value: seg.montoTexto + ' (' + seg.pctTexto + ')' } });
    };
    const onPieLeave = () => this.setState({ chartTip: null });
    const sinVolumenHoy = volTotalHoy < 0.005;
    const gastosHoyLista = (d.gastos || []).filter(g => g.fecha === today());
    const irGastosHoy = () => { this.navPush(); this.setState({ screen: 'gastos', gasBarra: { tipo: 'dia', k: today() }, navOpen: false }); };

    // ── Cierre diario: caja de cuenta corriente, abierta en Nos deben / Debemos, con variación por moneda ──
    const ccHoyPorMon = Object.assign({ ARS: u ? u.ccPesos : 0 }, u ? u.ccDiv : {});
    const ccAyerPorMon = Object.assign({ ARS: ayerRow ? ayerRow.ccPesos : 0 }, ayerRow ? ayerRow.ccDiv : {});
    const ccMonKeysCierre = Array.from(new Set(Object.keys(ccHoyPorMon).concat(Object.keys(ccAyerPorMon))))
      .filter(k => Math.abs(ccHoyPorMon[k] || 0) > 0.005 || Math.abs(ccAyerPorMon[k] || 0) > 0.005);
    const ccFilasCierre = ccMonKeysCierre.map(k => {
      const hoyV = ccHoyPorMon[k] || 0, ayerV = ccAyerPorMon[k] || 0;
      const v = variacion(hoyV, ayerV, (x) => fmtMon(k, x));
      return { moneda: k, monto: fmtMon(k, Math.abs(hoyV)), esPositivo: hoyV >= 0, variacionTexto: v.texto, variacionPctTexto: v.pctTexto, variacionStyle: v.style };
    });
    const ccNosDebenCierre = ccFilasCierre.filter(f => f.esPositivo);
    const ccDebemosCierre = ccFilasCierre.filter(f => !f.esPositivo);
    const ccNetoVar = variacion(u ? u.ccUsd : 0, ayerRow ? ayerRow.ccUsd : 0, usd);
    const ccNetoStyle = (u ? u.ccUsd : 0) > 0.005 ? 'color:#1e7d3a' : ((u ? u.ccUsd : 0) < -0.005 ? 'color:#b3261e' : '');
    const irCtacte = () => { this.navPush(); this.setState({ screen: 'ctacte', navOpen: false }); };

    // ── Cierre diario: desglose del resultado del día como barras simples ──
    const resDesglose = [
      { label: 'Operativo', valor: u ? u.ganOperativa : 0 },
      { label: 'Var. TC', valor: u ? u.varTC : 0 },
      { label: 'Gastos', valor: u ? -u.gastosHoy : 0 }
    ];
    const maxAbsRes = Math.max(1, ...resDesglose.map(x => Math.abs(x.valor)));
    const COLOR_RES = { Operativo: 'var(--color-accent-900)', 'Var. TC': 'var(--color-accent-600)', Gastos: 'var(--color-accent-300)' };
    const resultadoBarras = resDesglose.map(x => ({
      label: x.label, valorTexto: usd(x.valor), valorStyle: x.valor < 0 ? 'color:#b3261e' : '',
      barraStyle: 'height:6px;background:' + COLOR_RES[x.label] + ';width:' + (Math.abs(x.valor) / maxAbsRes * 100).toFixed(1) + '%'
    }));
    const patDesglose = [
      { moneda: 'ARS', monto: pesos(u ? u.sPesos : 0) },
      { moneda: 'USD', monto: usd(caja.usd) },
      { moneda: 'USD cara chica', monto: usd(caja.saldos['USD cara chica'] || 0) },
      { moneda: 'USDT', monto: money(caja.usdt, 'USDT', 0) },
      { moneda: 'EUR', monto: money(caja.eur, 'EUR', 0) }
    ].concat(Object.keys(caja.saldos).filter(k => ['USD', 'USD cara chica', 'EUR', 'USDT'].indexOf(k) < 0).map(k => ({ moneda: k, monto: money(caja.saldos[k] || 0, k, 0) })));

    const opsConIdx = d.ops.map((o, i) => ({ o, i }));
    const tierMapOps = tierMapDe(d);
    opsConIdx.sort((a, b) => b.o.fecha.localeCompare(a.o.fecha) || b.i - a.i);
    const filaOp = (o, irDesdeOtroScreen) => ({
        fecha: dmy(o.fecha), cliente: nombreDe(o.clienteId), tier: (tierMapOps[o.clienteId] || {}).tier || '—', tipo: o.tipo, codigo: this.codigoOp('ops', o.numero),
        moneda: monedaLabel(o.monedaPago, o.monedaPagoOtra) + ' / ' + monedaLabel(o.moneda, o.monedaOtra),
        vendido: money((Number(o.cantidad) || 0) * (Number(o.tc) || 0), monedaSimbolo(o.monedaPago, o.monedaPagoOtra), 0),
        comprado: money(Number(o.cantidad) || 0, monedaSimbolo(o.moneda, o.monedaOtra), 0),
        tc: nf(this.tcVista(o.monedaPago || 'ARS', o.moneda || 'USD', Number(o.tc) || 0), this.tcDecimales(o.monedaPago || 'ARS', o.moneda || 'USD')),
        entrega: entregaOpTxt(o),
        ok: o.ok === 'OK' ? ENTREGADO : cap(o.ok || 'pendiente'),
        okStyle: badgeStyle(o.ok === 'cancelado', o.ok && o.ok !== 'pendiente'),
        okToggle: (e) => { e.stopPropagation(); this.toggleOk('ops', o.id); },
        goCliente: (e) => { e.preventDefault(); e.stopPropagation(); this.irAClienteOComisionista(o.clienteId); },
        abrir: () => this.setState(irDesdeOtroScreen ? { screen: 'ops', opTab: 'cambio', opFoco: null, criptoFoco: null, cableFoco: null, opDetalle: o.id } : { opDetalle: o.id }),
        editar: (e) => { e.stopPropagation(); this.openModal('op', o); },
        del: (e) => { e.stopPropagation(); this.del('ops', o.id); }
      });
    const opsRows = opsConIdx.map(x => x.o)
      .filter(o => !s.opFoco || o.id === s.opFoco)
      .filter(o => s.opFoco || s.opVista === 'todos' || !s.opVista || (s.opVista === 'pendientes' ? ((o.ok === 'pendiente' || !o.ok) && (!s.opMonedaPend || s.opMonedaPend.indexOf(o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS')) >= 0)) : s.opVista === 'fecha' ? o.fecha === s.opFechaFiltro : o.fecha === today()))
      .filter(o => !q || nombreDe(o.clienteId).toLowerCase().includes(q))
      .map(o => filaOp(o, false));
    const opVerDetalle = d.ops.find(o => o.id === s.opDetalle);
    const opDetalle = opVerDetalle ? {
      codigo: this.codigoOp('ops', opVerDetalle.numero),
      fecha: dmy(opVerDetalle.fecha), cliente: nombreDe(opVerDetalle.clienteId),
      goCliente: (e) => { e.preventDefault(); this.irAClienteOComisionista(opVerDetalle.clienteId); },
      par: monedaLabel(opVerDetalle.monedaPago, opVerDetalle.monedaPagoOtra) + ' / ' + monedaLabel(opVerDetalle.moneda, opVerDetalle.monedaOtra),
      vendido: money((Number(opVerDetalle.cantidad) || 0) * (Number(opVerDetalle.tc) || 0), monedaSimbolo(opVerDetalle.monedaPago, opVerDetalle.monedaPagoOtra), 0),
      comprado: money(Number(opVerDetalle.cantidad) || 0, monedaSimbolo(opVerDetalle.moneda, opVerDetalle.monedaOtra), 0),
      tc: nf(this.tcVista(opVerDetalle.monedaPago || 'ARS', opVerDetalle.moneda || 'USD', Number(opVerDetalle.tc) || 0), this.tcDecimales(opVerDetalle.monedaPago || 'ARS', opVerDetalle.moneda || 'USD')),
      comisionista: this.nombreComisionista(d, opVerDetalle.comisionistaId) || '—',
      comisionMonto: money(Number(opVerDetalle.comision) || 0, monedaSimbolo(opVerDetalle.comisionMoneda || 'USD')),
      comisionStyle: '',
      liquidacion: entregaOpBullets(opVerDetalle),
      ok: opVerDetalle.ok === 'OK' ? ENTREGADO : cap(opVerDetalle.ok || 'pendiente'),
      okStyle: badgeStyle(opVerDetalle.ok === 'cancelado', opVerDetalle.ok && opVerDetalle.ok !== 'pendiente'),
      puedeMarcarEstado: (opVerDetalle.ok || 'pendiente') === 'pendiente',
      okToggle: () => this.toggleOk('ops', opVerDetalle.id),
      accionables: this.accionablesDe('ops', opVerDetalle).items,
      hayAccionables: this.accionablesDe('ops', opVerDetalle).items.length > 0,
      sinAccionables: this.accionablesDe('ops', opVerDetalle).items.length === 0,
      marcarTodoLabel: this.accionablesDe('ops', opVerDetalle).todoCompleto ? 'Re-abrir operación' : 'Marcar todo como completo',
      marcarTodo: this.accionablesDe('ops', opVerDetalle).todoCompleto ? (() => this.reabrirTodo('ops', opVerDetalle.id)) : (() => this.marcarTodoCompleto('ops', opVerDetalle.id)),
      cancelado: !!opVerDetalle.cancelado,
      cancelarLabel: opVerDetalle.cancelado ? 'Reactivar operación' : 'Cancelar operación',
      cancelarStyle: 'font-size:12px;margin-top:8px' + (opVerDetalle.cancelado ? ';background:var(--color-accent-100);color:var(--color-accent-800);border-color:var(--color-accent-300)' : ';background:#b3261e;color:#fff;border-color:#b3261e'),
      cancelar: () => { if (window.confirm(opVerDetalle.cancelado ? '¿Reactivar esta operación?' : '¿Cancelar esta operación? Se revertirán todas sus partes y sus movimientos de caja, cuenta corriente y margen.')) this.cancelarOperacion('ops', opVerDetalle.id); },
      editar: () => this.openModal('op', opVerDetalle),
      del: () => { this.del('ops', opVerDetalle.id); this.setState({ opDetalle: null }); }
    } : null;

    const criptoOpVerDetalle = d.cripto.find(o => o.id === s.criptoOpDetalle);
    const criptoDetalle = criptoOpVerDetalle ? {
      codigo: this.codigoOp('cripto', criptoOpVerDetalle.numero),
      fecha: dmy(criptoOpVerDetalle.fecha), cliente: nombreDe(criptoOpVerDetalle.clienteId),
      goCliente: (e) => { e.preventDefault(); this.irAClienteOComisionista(criptoOpVerDetalle.clienteId); },
      par: monedaLabel(criptoOpVerDetalle.monedaPago) + ' / ' + monedaLabel(criptoOpVerDetalle.moneda),
      vendido: money((Number(criptoOpVerDetalle.cantidad) || 0) * (Number(criptoOpVerDetalle.tc) || 0), monedaSimbolo(criptoOpVerDetalle.monedaPago), 0),
      comprado: money(Number(criptoOpVerDetalle.cantidad) || 0, monedaSimbolo(criptoOpVerDetalle.moneda), 0),
      tc: nf(this.tcVista(criptoOpVerDetalle.monedaPago || 'ARS', criptoOpVerDetalle.moneda || 'USDT', Number(criptoOpVerDetalle.tc) || 0), this.tcDecimales(criptoOpVerDetalle.monedaPago || 'ARS', criptoOpVerDetalle.moneda || 'USDT')),
      comisionista: this.nombreComisionista(d, criptoOpVerDetalle.comisionistaId) || '—',
      comisionMonto: money(Number(criptoOpVerDetalle.comision) || 0, monedaSimbolo(criptoOpVerDetalle.comisionMoneda || 'USD')),
      comisionStyle: '',
      costo: (Number(criptoOpVerDetalle.costo) || 0) ? money(Number(criptoOpVerDetalle.costo), 'USDT', 2) + ' · a cargo de ' + (criptoOpVerDetalle.costoA || 'cueva') + (criptoOpVerDetalle.costoA === 'cliente' ? ' · cliente recibe neto ' + money(Math.max((Number(criptoOpVerDetalle.cantidad) || 0) - (Number(criptoOpVerDetalle.costo) || 0), 0), criptoOpVerDetalle.moneda || 'USDT', 2) : '') : '—',
      liquidacion: entregaOpBullets(criptoOpVerDetalle),
      ok: criptoOpVerDetalle.ok === 'OK' ? ENTREGADO : cap(criptoOpVerDetalle.ok || 'pendiente'),
      okStyle: badgeStyle(criptoOpVerDetalle.ok === 'cancelado', criptoOpVerDetalle.ok && criptoOpVerDetalle.ok !== 'pendiente'),
      puedeMarcarEstado: (criptoOpVerDetalle.ok || 'pendiente') === 'pendiente',
      okToggle: () => this.toggleOk('cripto', criptoOpVerDetalle.id),
      accionables: this.accionablesDe('cripto', criptoOpVerDetalle).items,
      hayAccionables: this.accionablesDe('cripto', criptoOpVerDetalle).items.length > 0,
      sinAccionables: this.accionablesDe('cripto', criptoOpVerDetalle).items.length === 0,
      marcarTodoLabel: this.accionablesDe('cripto', criptoOpVerDetalle).todoCompleto ? 'Re-abrir operación' : 'Marcar todo como completo',
      marcarTodo: this.accionablesDe('cripto', criptoOpVerDetalle).todoCompleto ? (() => this.reabrirTodo('cripto', criptoOpVerDetalle.id)) : (() => this.marcarTodoCompleto('cripto', criptoOpVerDetalle.id)),
      cancelado: !!criptoOpVerDetalle.cancelado,
      cancelarLabel: criptoOpVerDetalle.cancelado ? 'Reactivar operación' : 'Cancelar operación',
      cancelarStyle: 'font-size:12px;margin-top:8px' + (criptoOpVerDetalle.cancelado ? ';background:var(--color-accent-100);color:var(--color-accent-800);border-color:var(--color-accent-300)' : ';background:#b3261e;color:#fff;border-color:#b3261e'),
      cancelar: () => { if (window.confirm(criptoOpVerDetalle.cancelado ? '¿Reactivar esta operación?' : '¿Cancelar esta operación? Se revertirán todas sus partes y sus movimientos de caja, cuenta corriente y margen.')) this.cancelarOperacion('cripto', criptoOpVerDetalle.id); },
      editar: () => this.openModal('cripto', criptoOpVerDetalle),
      del: () => { this.del('cripto', criptoOpVerDetalle.id); this.setState({ criptoOpDetalle: null }); }
    } : null;
    const criptoEnDetalle = !!criptoDetalle, criptoEnLista = !criptoDetalle;
    const volverCripto = () => this.volver({ criptoOpDetalle: null });
    const criptoRows = d.cripto.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).filter(o => !s.criptoFoco || o.id === s.criptoFoco)
      .filter(o => s.criptoFoco || s.opVista === 'todos' || !s.opVista || (s.opVista === 'pendientes' ? ((o.ok === 'pendiente' || !o.ok) && (!s.opMonedaPend || s.opMonedaPend.indexOf(o.monedaPago === 'Otra' ? (o.monedaPagoOtra || 'Otra') : (o.monedaPago || 'ARS')) >= 0)) : s.opVista === 'fecha' ? o.fecha === s.opFechaFiltro : o.fecha === today())).map(o => {
      const mon = o.moneda || 'USDT', monA = o.monedaPago || 'ARS';
      return { fecha: dmy(o.fecha), cliente: nombreDe(o.clienteId), tier: (tierMapOps[o.clienteId] || {}).tier || '—', tipo: o.tipo, codigo: this.codigoOp('cripto', o.numero),
        moneda: monedaLabel(monA) + ' / ' + monedaLabel(mon),
        vendido: money((Number(o.cantidad) || 0) * (Number(o.tc) || 0), monedaSimbolo(monA), 0),
        comprado: money(Number(o.cantidad) || 0, monedaSimbolo(mon), 0),
        tc: nf(this.tcVista(monA, mon, Number(o.tc) || 0), this.tcDecimales(monA, mon)),
        costo: (Number(o.costo) || 0) ? money(Number(o.costo), 'USDT', 2) + ' · ' + o.costoA : '—',
        ok: o.ok === 'OK' ? ENTREGADO : cap(o.ok || 'pendiente'),
        okStyle: badgeStyle(o.ok === 'cancelado', o.ok && o.ok !== 'pendiente'),
        okToggle: () => this.toggleOk('cripto', o.id),
        goCliente: (e) => { e.preventDefault(); this.irAClienteOComisionista(o.clienteId); },
        abrir: () => this.setState({ criptoOpDetalle: o.id }),
        editar: () => this.openModal('cripto', o),
        del: () => this.del('cripto', o.id) };
    });

    const mayoristaOpVerDetalle = (d.mayoristaOps || []).find(o => o.id === s.mayoristaOpDetalle);
    const mayoristaDetalle = mayoristaOpVerDetalle ? {
      codigo: this.codigoOp('mayoristaOps', mayoristaOpVerDetalle.numero),
      fecha: dmy(mayoristaOpVerDetalle.fecha),
      comisionista: this.nombreComisionista(d, mayoristaOpVerDetalle.comisionistaId) || '—',
      goComisionista: (e) => { e.preventDefault(); this.irAClienteOComisionista(mayoristaOpVerDetalle.comisionistaId); },
      par: monedaLabel(mayoristaOpVerDetalle.monedaPago, mayoristaOpVerDetalle.monedaPagoOtra) + ' / ' + monedaLabel(mayoristaOpVerDetalle.moneda, mayoristaOpVerDetalle.monedaOtra),
      vendido: money((Number(mayoristaOpVerDetalle.cantidad) || 0) * (Number(mayoristaOpVerDetalle.tc) || 0), monedaSimbolo(mayoristaOpVerDetalle.monedaPago, mayoristaOpVerDetalle.monedaPagoOtra), 0),
      comprado: money(Number(mayoristaOpVerDetalle.cantidad) || 0, monedaSimbolo(mayoristaOpVerDetalle.moneda, mayoristaOpVerDetalle.monedaOtra), 0),
      tc: nf(this.tcVista(mayoristaOpVerDetalle.monedaPago || 'ARS', mayoristaOpVerDetalle.moneda || 'USD', Number(mayoristaOpVerDetalle.tc) || 0), this.tcDecimales(mayoristaOpVerDetalle.monedaPago || 'ARS', mayoristaOpVerDetalle.moneda || 'USD')),
      obs: mayoristaOpVerDetalle.obs === '—' ? '' : (mayoristaOpVerDetalle.obs || ''),
      tieneObs: !!(mayoristaOpVerDetalle.obs && mayoristaOpVerDetalle.obs !== '—'),
      liquidacion: entregaOpBullets(mayoristaOpVerDetalle),
      ok: mayoristaOpVerDetalle.ok === 'OK' ? ENTREGADO : cap(mayoristaOpVerDetalle.ok || 'pendiente'),
      okStyle: badgeStyle(mayoristaOpVerDetalle.ok === 'cancelado', mayoristaOpVerDetalle.ok && mayoristaOpVerDetalle.ok !== 'pendiente'),
      puedeMarcarEstado: (mayoristaOpVerDetalle.ok || 'pendiente') === 'pendiente',
      okToggle: () => this.toggleOk('mayoristaOps', mayoristaOpVerDetalle.id),
      accionables: this.accionablesDe('mayoristaOps', mayoristaOpVerDetalle).items,
      hayAccionables: this.accionablesDe('mayoristaOps', mayoristaOpVerDetalle).items.length > 0,
      marcarTodoLabel: this.accionablesDe('mayoristaOps', mayoristaOpVerDetalle).todoCompleto ? 'Re-abrir operación' : 'Marcar todo como completo',
      marcarTodo: this.accionablesDe('mayoristaOps', mayoristaOpVerDetalle).todoCompleto ? (() => this.reabrirTodo('mayoristaOps', mayoristaOpVerDetalle.id)) : (() => this.marcarTodoCompleto('mayoristaOps', mayoristaOpVerDetalle.id)),
      cancelado: !!mayoristaOpVerDetalle.cancelado,
      cancelarLabel: mayoristaOpVerDetalle.cancelado ? 'Reactivar operación' : 'Cancelar operación',
      cancelarStyle: 'font-size:12px;margin-top:8px' + (mayoristaOpVerDetalle.cancelado ? ';background:var(--color-accent-100);color:var(--color-accent-800);border-color:var(--color-accent-300)' : ';background:#b3261e;color:#fff;border-color:#b3261e'),
      cancelar: () => { if (window.confirm(mayoristaOpVerDetalle.cancelado ? '¿Reactivar esta operación?' : '¿Cancelar esta operación? Se revertirán todos sus movimientos de caja y cuenta corriente.')) this.cancelarOperacion('mayoristaOps', mayoristaOpVerDetalle.id); },
      editar: () => this.openModal('mayorista', mayoristaOpVerDetalle),
      del: () => { this.del('mayoristaOps', mayoristaOpVerDetalle.id); this.setState({ mayoristaOpDetalle: null }); }
    } : null;
    const mayoristaEnDetalle = !!mayoristaDetalle, mayoristaEnLista = !mayoristaDetalle;
    const volverMayorista = () => this.volver({ mayoristaOpDetalle: null });
    const mayoristaRows = (d.mayoristaOps || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).filter(o => !s.mayoristaFoco || o.id === s.mayoristaFoco)
      .filter(o => s.mayoristaFoco || s.opVista === 'todos' || !s.opVista || (s.opVista === 'pendientes' ? (o.ok === 'pendiente' || !o.ok) : s.opVista === 'fecha' ? o.fecha === s.opFechaFiltro : o.fecha === today())).map(o => {
      const mon = o.moneda || 'USD', monA = o.monedaPago || 'ARS';
      return { fecha: dmy(o.fecha), comisionista: this.nombreComisionista(d, o.comisionistaId) || '—', codigo: this.codigoOp('mayoristaOps', o.numero),
        moneda: monedaLabel(monA, o.monedaPagoOtra) + ' / ' + monedaLabel(mon, o.monedaOtra),
        vendido: money((Number(o.cantidad) || 0) * (Number(o.tc) || 0), monedaSimbolo(monA, o.monedaPagoOtra), 0),
        comprado: money(Number(o.cantidad) || 0, monedaSimbolo(mon, o.monedaOtra), 0),
        tc: nf(this.tcVista(monA, mon, Number(o.tc) || 0), this.tcDecimales(monA, mon)),
        ok: o.ok === 'OK' ? ENTREGADO : cap(o.ok || 'pendiente'),
        okStyle: badgeStyle(o.ok === 'cancelado', o.ok && o.ok !== 'pendiente'),
        okToggle: () => this.toggleOk('mayoristaOps', o.id),
        goComisionista: (e) => { e.preventDefault(); this.irAClienteOComisionista(o.comisionistaId); },
        abrir: () => this.setState({ mayoristaOpDetalle: o.id }),
        editar: () => this.openModal('mayorista', o),
        del: () => this.del('mayoristaOps', o.id) };
    });

    const cableVerDetalle = d.cables.find(c => c.id === s.cableDetalle);
    const cableDetalle = cableVerDetalle ? (() => {
      const calc = this.cableCalc(cableVerDetalle);
      const ejec = cableVerDetalle.estado === 'ejecutado';
      const esSubida = cableVerDetalle.tipo === 'Subida';
      return {
        codigo: this.codigoOp('cables', cableVerDetalle.numero),
        fecha: dmy(cableVerDetalle.fecha), tipo: esSubida ? 'Subida' : 'Bajada',
        cliente: nombreDe(cableVerDetalle.clienteId),
        goCliente: (e) => { e.preventDefault(); this.irAClienteOComisionista(cableVerDetalle.clienteId); },
        comisionista: this.nombreComisionista(d, cableVerDetalle.comisionistaId) || '—',
        goComisionista: (e) => { e.preventDefault(); this.navPush(); this.setState({ screen: 'clientes', vista: 'fichaComisionista', comisionistaSel: cableVerDetalle.comisionistaId }); },
        monto: usd(Number(cableVerDetalle.monto) || 0),
        costo: nf(cableVerDetalle.costoPct, 2) + '%', margenPct: nf(cableVerDetalle.margenPct, 2) + '%',
        labelMayorista: esSubida ? 'Le damos al mayorista' : 'Nos debe el mayorista',
        labelCliente: esSubida ? 'Nos da el cliente' : 'Le debemos al cliente',
        debeMayorista: usd(calc.montoMayorista), debemosCliente: usd(calc.montoCliente),
        ganancia: usd(calc.ganancia),
        ganStyle: 'font-weight:500' + (calc.ganancia < 0 ? ';color:#b3261e' : ''),
        liquidacion: entregaCableBullets(cableVerDetalle),
        obs: cableVerDetalle.obs || '—', tieneObs: !!cableVerDetalle.obs && cableVerDetalle.obs !== '—',
        estado: estadoCableLabel(cableVerDetalle.estado),
        estadoStyle: badgeStyle(cableVerDetalle.cancelado, ejec),
        puedeMarcarEstado: cableVerDetalle.estado === 'pendiente',
        ciclo: () => this.cicloCable(cableVerDetalle.id),
        cancelado: !!cableVerDetalle.cancelado,
        cancelarLabel: cableVerDetalle.cancelado ? 'Reactivar operación' : 'Cancelar operación',
        cancelarStyle: 'font-size:12px;margin-top:8px' + (cableVerDetalle.cancelado ? ';background:var(--color-accent-100);color:var(--color-accent-800);border-color:var(--color-accent-300)' : ';background:#b3261e;color:#fff;border-color:#b3261e'),
        cancelar: () => { if (window.confirm(cableVerDetalle.cancelado ? '¿Reactivar esta operación?' : '¿Cancelar esta operación? Se revertirán todas sus partes y sus movimientos de caja, cuenta corriente y margen.')) this.cancelarOperacion('cables', cableVerDetalle.id); },
        accionables: this.accionablesDe('cables', cableVerDetalle).items,
        hayAccionables: this.accionablesDe('cables', cableVerDetalle).items.length > 0,
        sinAccionables: this.accionablesDe('cables', cableVerDetalle).items.length === 0,
        marcarTodoLabel: this.accionablesDe('cables', cableVerDetalle).todoCompleto ? 'Re-abrir operación' : 'Marcar todo como completo',
        marcarTodo: this.accionablesDe('cables', cableVerDetalle).todoCompleto ? (() => this.reabrirTodo('cables', cableVerDetalle.id)) : (() => this.marcarTodoCompleto('cables', cableVerDetalle.id)),
        editar: () => this.openModal('cable', cableVerDetalle),
        del: () => { this.del('cables', cableVerDetalle.id); this.setState({ cableDetalle: null }); }
      };
    })() : null;
    const cableEnDetalle = !!cableDetalle, cableEnLista = !cableDetalle;
    const volverCable = () => this.volver({ cableDetalle: null });
    const cableRows = d.cables.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).filter(c => !s.cableFoco || c.id === s.cableFoco)
      .filter(c => s.cableFoco || s.opVista === 'todos' || !s.opVista || (s.opVista === 'pendientes' ? c.estado === 'pendiente' : s.opVista === 'fecha' ? c.fechaEjecucion === s.opFechaFiltro : c.fecha === today())).map(c => {
      const m = Number(c.monto) || 0;
      const calc = this.cableCalc(c);
      const ejec = c.estado === 'ejecutado';
      return { fecha: dmy(c.fecha), tipo: c.tipo === 'Subida' ? 'Subida' : 'Bajada', cliente: nombreDe(c.clienteId),
        comisionista: this.nombreComisionista(d, c.comisionistaId) || '—', codigo: this.codigoOp('cables', c.numero),
        monto: usd(m),
        margen: usd(calc.ganancia),
        margenStyle: 'text-align:right' + (calc.ganancia < 0 ? ';color:#b3261e;font-weight:500' : ''),
        estado: estadoCableLabel(c.estado),
        estadoStyle: badgeStyle(c.cancelado, ejec),
        ciclo: (e) => { e.stopPropagation(); this.cicloCable(c.id); },
        abrir: () => this.setState({ cableDetalle: c.id }),
        goCliente: (e) => { e.preventDefault(); e.stopPropagation(); this.irAClienteOComisionista(c.clienteId); },
        goComisionista: (e) => { e.preventDefault(); e.stopPropagation(); this.navPush(); this.setState({ screen: 'clientes', vista: 'fichaComisionista', comisionistaSel: c.comisionistaId }); },
        editar: (e) => { e.stopPropagation(); this.openModal('cable', c); },
        del: (e) => { e.stopPropagation(); this.del('cables', c.id); } };
    });

    const aportesUsd = (a) => {
      const p = d.params, tc = u ? u.tc : (p.baseCompra + p.baseVenta) / 2;
      const m = Number(a.monto) || 0;
      return a.moneda === 'USD' || a.moneda === 'USDT' ? m : a.moneda === 'ARS' ? m / tc : m * (p.crossEurC || 1);
    };
    const totalAportado = d.aportes.reduce((acc, a) => acc + aportesUsd(a), 0);
    const porSocio = {};
    d.aportes.forEach(a => { porSocio[a.socio] = (porSocio[a.socio] || 0) + aportesUsd(a); });

    const tcRef = u ? u.tc : (d.params.baseCompra + d.params.baseVenta) / 2;
    const pnIniUsd = serie.cap.pesos / tcRef + serie.cap.usd + serie.cap.usdt + serie.cap.eur * (d.params.crossEurC || 1);
    const pnHoyUsd = caja.pesos / tcRef + caja.usd + caja.usdt + caja.eur * (d.params.crossEurC || 1);
    // gastos: no tocan la ganancia diaria, se restan del patrimonio de hoy
    const gastosUsd = (d.gastos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0) / tcRef;

    // ── cuentas corrientes ──
    const ctas = this.cuentas(d, tcRef);
    const abiertas = ctas.filter(c => c.monedas.length);
    const ccNosDebenN = abiertas.filter(c => c.usd > 0).reduce((a, c) => a + c.usd, 0);
    const ccLesDebemosN = abiertas.filter(c => c.usd < 0).reduce((a, c) => a + c.usd, 0);
    const ccNetoN = ccNosDebenN + ccLesDebemosN;
    const hoyMs = new Date(today()).getTime();
    const dias = (fx) => fx ? Math.max(0, Math.round((hoyMs - new Date(fx).getTime()) / 86400000)) : null;
    const montoMon = (mon, v) => mon === 'ARS' ? money(v, 'ARS', 0) : money(v, mon, mon === 'EUR' || mon === 'USDT' ? 0 : 0);
    const detalleDe = (c) => c.monedas.map(k => montoMon(k, c.porMon[k])).join(' · ') || '—';
    const antigTxt = (c) => { const n = dias(c.desde); return n === null ? '—' : n + (n === 1 ? ' día' : ' días'); };
    const huerfanos = this.movimientosCC(d).filter(m => !(m.clienteId && (d.clientes.some(c => c.id === m.clienteId) || (d.comisionistas || []).some(c => c.id === m.clienteId))) && !(m.comisionistaId && (d.comisionistas || []).some(c => c.id === m.comisionistaId)));
    // totales por moneda sin mezclar: cada moneda se suma aparte, nunca convertida a otra
    const monTotales = {};
    abiertas.forEach(c => c.monedas.forEach(k => { monTotales[k] = (monTotales[k] || 0) + c.porMon[k]; }));
    const monTotalKeys = Object.keys(monTotales).filter(k => Math.abs(monTotales[k]) > 0.005);
    const filasPorMoneda = (pred, montoStyle) => monTotalKeys.filter(k => pred(monTotales[k]))
      .map(k => ({ moneda: monedaTexto(k), monto: montoMon(k, Math.abs(monTotales[k])), montoStyle: montoStyle }));
    const ccNosDebenFilas = filasPorMoneda(v => v > 0, 'font-family:var(--font-heading);font-size:24px;line-height:1.2;color:#1e8e3e');
    const ccLesDebemosFilas = filasPorMoneda(v => v < 0, 'font-family:var(--font-heading);font-size:24px;line-height:1.2;color:#b3261e');
    const saldosDeCta = (c) => c.monedas.map(k => ({ moneda: monedaTexto(k), monto: montoMon(k, Math.abs(c.porMon[k])),
      tag: c.porMon[k] > 0 ? 'Nos debe' : 'Le debemos', tagClass: c.porMon[k] > 0 ? 'tag tag-accent' : 'tag tag-outline',
      montoStyle: 'font-family:var(--font-heading);font-size:20px;' + (c.porMon[k] > 0 ? 'color:#1e8e3e' : 'color:#b3261e') }));
    const MON_COLS = [
      { key: 'ARS', label: 'ARS' }, { key: 'USD', label: 'USD' }, { key: 'EUR', label: '€' },
      { key: 'BRL', label: 'R$' }, { key: 'USDT', label: 'USDT' },
      { key: 'USD cara chica', label: 'USD cara chica' }, { key: 'LBR', label: 'LIBRA' }
    ];
    const celdaSaldo = (v) => ({ texto: nf(v, 0), style: v > 0.005 ? 'color:#1e8e3e;font-weight:500' : v < -0.005 ? 'color:#b3261e;font-weight:500' : 'color:var(--color-neutral-500)' });
    const ctaColsDef = [{ k: 'codigo', label: 'Cód.' }, { k: 'nombre', label: 'Cliente' }]
      .concat(MON_COLS.map(mc => ({ k: 'mon:' + mc.key, label: mc.label })))
      .concat([{ k: 'antiguedad', label: 'Antigüedad' }, { k: 'movimientos', label: 'Movimientos' }]);
    const ccOrd = s.ccOrd || { col: 'nombre', dir: 'asc' };
    const valorOrdenCC = (c, col) => {
      if (col === 'codigo') return c.cliente.numero || 0;
      if (col === 'nombre') return c.cliente.nombre.toLowerCase();
      if (col === 'antiguedad') { const n = dias(c.desde); return n === null ? -Infinity : n; }
      if (col === 'movimientos') return c.movs.length;
      if (col.indexOf('mon:') === 0) return c.porMon[col.slice(4)] || 0;
      return 0;
    };
    const ccBuscaTx = (s.ccBusca || '').trim().toLowerCase();
    const ctasOrdenadas = abiertas.filter(c => !ccBuscaTx || c.cliente.nombre.toLowerCase().includes(ccBuscaTx)).sort((a, b) => {
      const va = valorOrdenCC(a, ccOrd.col), vb = valorOrdenCC(b, ccOrd.col);
      const dir = ccOrd.dir === 'asc' ? 1 : -1;
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
    const ctaDe = (id) => ctas.find(c => c.cliente.id === id) || { movs: [], porMon: {}, monedas: [], usd: 0, desde: null };
    const codigoDeOrigen = (m) => {
      const coll = m.coll === 'cripto' ? d.cripto : m.coll === 'cables' ? d.cables : d.ops;
      const rec = (coll || []).find(x => x.id === m.opId);
      return rec ? this.codigoOp(m.coll || 'ops', rec.numero) : '';
    };
    const mergeCol = (rows, getTxt) => {
      const res = rows.map(() => ({ show: true, span: 1 }));
      let k = 0;
      while (k < rows.length) {
        let l = k; while (l + 1 < rows.length && getTxt(rows[l + 1]) === getTxt(rows[k])) l++;
        res[k] = { show: true, span: l - k + 1 };
        for (let x = k + 1; x <= l; x++) res[x] = { show: false, span: 1 };
        k = l + 1;
      }
      return res;
    };
    const filasResumen = (c) => {
      const acum = {};
      const base = c.movs.map(m => {
        const v = Number(m.monto) || 0;
        acum[m.moneda] = (acum[m.moneda] || 0) + v;
        return { _grupo: m.auto ? 'op:' + m.opId : 'm:' + m.id,
          fecha: dmy(m.fecha), motivo: m.motivo || '—',
          origen: m.auto ? codigoDeOrigen(m) : (m.efectivo ? 'efectivo · manual' : 'ajuste · manual'),
          esAuto: !!m.auto, esManual: !m.auto,
          irOrigen: (e) => { e.preventDefault(); this.irAOperacion(m.opId); },
          valores: MON_COLS.map(mc => celdaSaldo(mc.key === m.moneda ? v : 0)),
          borrable: !m.auto, editar: () => this.openModal('ctacte', m), del: () => { if (window.confirm('¿Borrar este movimiento? Esta acción no se puede deshacer.')) this.del('ctacte', m.id); } };
      }).reverse();
      const out = [];
      let i = 0;
      while (i < base.length) {
        let j = i; while (j + 1 < base.length && base[j + 1]._grupo === base[i]._grupo) j++;
        const grupo = base.slice(i, j + 1);
        const mOrigen = mergeCol(grupo, r => r.origen);
        grupo.forEach((r, ri) => {
          out.push({ fecha: r.fecha, motivo: r.motivo,
            origen: r.origen, origenShow: mOrigen[ri].show, origenSpan: mOrigen[ri].span,
            esAuto: r.esAuto, esManual: r.esManual, irOrigen: r.irOrigen,
            celdas: r.valores,
            borrable: r.borrable, editar: r.editar, del: r.del });
        });
        i = j + 1;
      }
      return out;
    };
    const cta = ctaDe(cli.id);
    const comSel = (d.comisionistas || []).find(cm => cm.id === s.comisionistaSel) || (d.comisionistas || [])[0] || { nombre: '—' };
    const ctaCom = ctaDe(comSel.id);

    const rowsG = serie.rows;
    const fIni = rowsG.length ? rowsG[0].fecha : today();
    const fFin = u ? u.fecha : today();
    const gDesde = s.ganDesde || fFin.slice(0, 8) + '01';
    const gHasta = s.ganHasta || fFin;
    const gSel = rowsG.filter(r => r.fecha >= gDesde && r.fecha <= gHasta);
    const volAgrupar = s.volAgrupar || 'semana';
    const volData = this.volumenesData(d, gDesde, gHasta, volAgrupar);
    const saldosLineasDefs = [
      { label: 'ARS', color: 'var(--color-accent-900)', get: r => r.sPesos, fmt: pesos },
      { label: 'USD', color: 'var(--color-accent-500)', get: r => r.saldos.USD || 0, fmt: usd },
      { label: 'USD cara chica', color: 'var(--color-accent-300)', get: r => r.saldos['USD cara chica'] || 0, fmt: usd },
      { label: 'USDT', color: 'var(--color-neutral-700)', get: r => r.saldos.USDT || 0, fmt: (v) => money(v, 'USDT', 0) },
      { label: 'EUR', color: 'var(--color-neutral-400)', get: r => r.saldos.EUR || 0, fmt: (v) => money(v, 'EUR', 0) }
    ];
    const saldosLineas = this.lineaSeries(gSel, saldosLineasDefs);
    saldosLineas.series.forEach((s2, i) => { s2.label = saldosLineasDefs[i].label; s2.valorTexto = saldosLineasDefs[i].fmt(s2.ultimo); s2.tituloHover = saldosLineasDefs[i].label + ': ' + s2.valorTexto + ' (último cierre)'; });
    const ccLineaRaw = this.lineaSeries(gSel, [{ get: r => r.ccUsd || 0, color: 'var(--color-accent-600)' }]);
    const MONEDA_LABEL = { ARS: 'ARS', USD: 'USD', USDT: 'USDT', EUR: 'EUR', LBR: 'Libra', BRL: 'Real' };
    const formatoMoneda = (mon, v) => mon === 'ARS' ? pesos(v) : mon === 'USD' ? usd(v) : money(v, mon, 0);
    const patBreak = this.patrimonioBreakdown(d, caja);
    const PALETA_PATRIMONIO = ['var(--color-accent-900)', 'var(--color-accent-600)', 'var(--color-accent-300)', 'var(--color-neutral-700)', 'var(--color-neutral-400)', 'var(--color-accent-700)', 'var(--color-neutral-500)'];
    const patTorta = this.armarTorta(patBreak.filas.filter(f => Math.abs(f.usd) > 0.005).map((f, i) => ({ label: MONEDA_LABEL[f.moneda] || f.moneda, value: f.usd, color: PALETA_PATRIMONIO[i % PALETA_PATRIMONIO.length] })));
    const patEvolBarras = this.barrasSimple(gSel, r => r.patValuado || 0, usd);
    const gTot = gSel.reduce((a, r) => a + (Number(r.resultadoTotal) || 0), 0);
    const menosDias = (f, n) => { const t = new Date(f + 'T00:00:00'); t.setDate(t.getDate() - n); return t.toISOString().slice(0, 10); };
    const gPresets = [
      { label: 'Hoy', a: fFin, b: fFin },
      { label: '7 días', a: menosDias(fFin, 6), b: fFin },
      { label: 'Este mes', a: fFin.slice(0, 8) + '01', b: fFin },
      { label: 'Todo', a: fIni, b: fFin }
    ].map(p => ({ label: p.label,
      style: 'font-size:11px;padding:4px 9px;' + (gDesde === p.a && gHasta === p.b ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent'),
      go: () => this.setState({ ganDesde: p.a, ganHasta: p.b }) }));

    const accionOps = s.opTab === 'cripto' ? ['+ Operación cripto', 'cripto'] : s.opTab === 'cable' ? ['+ Cable', 'cable'] : s.opTab === 'mayorista' ? ['+ Operación de tesorería', 'mayorista'] : ['+ Nueva operación', 'op'];
    const actions = { ops: accionOps, gastos: ['+ Gasto', 'gasto'],
      cotiz: ['+ Cotización del día', 'cotiz'], patrimonio: ['+ Aporte', 'aporte'], clientes: ['+ Cliente', 'cliente'], ctacte: ['+ Movimiento', 'ctacte'], comisionistas: ['+ Operador', 'comisionista'], usuarios: ['+ Usuario', 'usuario'] }[s.screen];

    // gastos: evolución diaria y mensual con selector de período, igual que la ganancia
    const gastosOrd = (d.gastos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
    // el gasto no depende de los cierres: el tope del período es hoy (o el último gasto si es posterior)
    const gFin = gastosOrd.length && gastosOrd[gastosOrd.length - 1].fecha > today() ? gastosOrd[gastosOrd.length - 1].fecha : today();
    const xIni = gastosOrd.length ? gastosOrd[0].fecha : gFin;
    const xDesde = s.gasDesde || gFin.slice(0, 8) + '01';
    const xHasta = s.gasHasta || gFin;
    const xSel = gastosOrd.filter(g => g.fecha >= xDesde && g.fecha <= xHasta);
    const acumular = (llave) => { const m = {}; xSel.forEach(g => { const k = llave(g.fecha); m[k] = (m[k] || 0) + (Number(g.monto) || 0); }); return m; };
    const porDia = acumular(f => f), porMes = acumular(f => f.slice(0, 7));
    const xTot = xSel.reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const promDia = Object.keys(porDia).length ? xTot / Object.keys(porDia).length : 0;
    const promMes = Object.keys(porMes).length ? xTot / Object.keys(porMes).length : 0;
    // desvío: barra en rojo cuando el gasto supera el promedio del período
    const filasGasto = (mapa, prom, fmt, fmtCorto, esMes) => {
      const max = Math.max.apply(null, Object.keys(mapa).map(x => mapa[x]).concat([1]));
      const hov = s.gasHover || '';
      return Object.keys(mapa).sort().map(k => {
        const v = mapa[k], alerta = prom > 0 && v > prom, id = (esMes ? 'mes:' : 'dia:') + k;
        return { label: fmt(k), corto: (fmtCorto || fmt)(k), monto: pesos(v), alerta: alerta,
          desvio: prom > 0 ? (v >= prom ? '+' : '−') + nf(Math.abs(v / prom - 1) * 100, 0) + '%' : '—',
          titulo: fmt(k) + ' · ' + pesos(v),
          montoStyle: 'font-size:10px;text-align:center;white-space:nowrap;color:var(--color-text);'
            + (hov === id ? '' : 'visibility:hidden'),
          onEnter: () => this.setState({ gasHover: id }),
          onLeave: () => { if (this.state.gasHover === id) this.setState({ gasHover: null }); },
          filtrar: () => this.setState({ gasBarra: { tipo: esMes ? 'mes' : 'dia', k: k }, gasFilAbierto: null }),
          barra: 'width:100%;height:' + ((v / max) * 100).toFixed(1) + '%;min-height:2px;background:' + (alerta ? '#b3261e' : 'var(--color-accent)'),
          etiqueta: 'font-size:11px;' + (alerta ? 'color:#b3261e;font-weight:500' : 'color:var(--color-neutral-700)') };
      });
    };
    const lineaProm = (mapa, prom) => {
      const max = Math.max.apply(null, Object.keys(mapa).map(x => mapa[x]).concat([1]));
      return 'position:absolute;left:0;right:0;bottom:' + Math.min((prom / max) * 100, 100).toFixed(1) + '%;border-top:1px dashed var(--color-neutral-600)';
    };
    const mesLabel = (k) => { const p = k.split('-'); return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(p[1]) - 1] + ' ' + p[0]; };
    const mesCorto = (k) => { const p = k.split('-'); return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(p[1]) - 1] + ' ' + p[0].slice(2); };
    const diaCorto = (k) => k.slice(8, 10) + '/' + k.slice(5, 7);
    const gasDiasRows = filasGasto(porDia, promDia, dmy, diaCorto, false), gasMesesRows = filasGasto(porMes, promMes, mesLabel, mesCorto, true);
    const gasPresets = [
      { label: 'Hoy', a: gFin, b: gFin },
      { label: '7 días', a: menosDias(gFin, 6), b: gFin },
      { label: 'Mes', a: gFin.slice(0, 8) + '01', b: gFin },
      { label: 'Todo', a: xIni, b: gFin }
    ].map(p => ({ label: p.label,
      style: 'font-size:11px;padding:4px 9px;' + (xDesde === p.a && xHasta === p.b ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent'),
      go: () => this.setState({ gasDesde: p.a, gasHasta: p.b }) }));

    // tabla de gastos generales: orden, filtros por columna y filtro por barra del gráfico
    const gOrd = s.gasOrd || { col: 'fecha', dir: 'desc' };
    const gExcl = s.gasFil || {};
    const gBarra = s.gasBarra || null;
    const valorCol = (g, k) => k === 'fecha' ? dmy(g.fecha) : k === 'monto' ? pesos(g.monto)
      : k === 'socio' ? (g.socio || '—') : k === 'obs' ? (g.obs || '—') : (g[k] || '—');
    const pasaFiltros = (g) => {
      if (gBarra && (gBarra.tipo === 'dia' ? g.fecha !== gBarra.k : g.fecha.slice(0, 7) !== gBarra.k)) return false;
      return GASTO_COLS.every(c => (gExcl[c.k] || []).indexOf(valorCol(g, c.k)) < 0);
    };
    const gastosVis = (d.gastos || []).filter(pasaFiltros).sort((a, b) => {
      const dir = gOrd.dir === 'asc' ? 1 : -1;
      if (gOrd.col === 'monto') return ((Number(a.monto) || 0) - (Number(b.monto) || 0)) * dir;
      if (gOrd.col === 'fecha') return a.fecha.localeCompare(b.fecha) * dir;
      return String(a[gOrd.col] || '').localeCompare(String(b[gOrd.col] || '')) * dir;
    });
    const toggleExcl = (col, val) => {
      const prev = (this.state.gasFil || {})[col] || [];
      const next = prev.indexOf(val) >= 0 ? prev.filter(x => x !== val) : prev.concat([val]);
      this.setState({ gasFil: Object.assign({}, this.state.gasFil, { [col]: next }) });
    };
    // opciones cruzadas: cada columna ofrece solo los valores presentes tras aplicar los otros filtros
    const pasaOtros = (g, salvo) => {
      if (gBarra && (gBarra.tipo === 'dia' ? g.fecha !== gBarra.k : g.fecha.slice(0, 7) !== gBarra.k)) return false;
      return GASTO_COLS.every(c => c.k === salvo || (gExcl[c.k] || []).indexOf(valorCol(g, c.k)) < 0);
    };
    const opcionesDe = (colK) => {
      const map = {};
      (d.gastos || []).forEach(g => {
        if (!pasaOtros(g, colK)) return;
        const label = valorCol(g, colK);
        if (map[label] === undefined) map[label] = colK === 'fecha' ? g.fecha : colK === 'monto' ? (Number(g.monto) || 0) : label;
      });
      const dir = (colK === gOrd.col && gOrd.dir === 'desc') ? -1 : 1;
      return Object.keys(map).sort((a, b) => {
        const ra = map[a], rb = map[b];
        return (typeof ra === 'number' ? ra - rb : String(ra).localeCompare(String(rb))) * dir;
      }).map(label => ({ label: label, marcado: (gExcl[colK] || []).indexOf(label) < 0, toggle: () => toggleExcl(colK, label) }));
    };
    const colAbierta = s.gasFilAbierto || null;
    const buscaFil = (s.gasFilBusca || '').toLowerCase();
    const posFil = s.gasFilPos || { x: 20, y: 120 };
    const abrirPanel = (colK) => (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      this.setState({ gasFilAbierto: colAbierta === colK ? null : colK, gasFilBusca: '',
        gasFilPos: { x: r.left, y: r.bottom + 4 } });
    };

    const vis = s.modal ? this.formVisible(s.modal, d) : null;
    const mf = vis ? vis.mf : null;
    const formVis = vis ? vis.f : {};
    const calcPesos = s.modal === 'op' ? parseNum(s.form.cantidad) * parseNum(s.form.tc) : 0;
    const opCl = s.modal === 'mayorista' ? (d.comisionistas || []).find(c => c.nombre === s.form.comisionista) : d.clientes.find(c => c.nombre === s.form.cliente);
    const opDirs = ((opCl && opCl.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x)).concat(['Nueva dirección…']);
    const cableCm = (d.comisionistas || []).find(c => c.nombre === s.form.comisionista);
    const comDirs = ((cableCm && cableCm.direcciones) || []).map(x => x.calle).filter(x => !/retira/i.test(x)).concat(['Nueva dirección…']);
    const errStyle = (k) => 'max-width:220px;' + ((s.errors || []).indexOf(k) >= 0 ? 'border-color:#b3261e;box-shadow:inset 0 0 0 1px #b3261e' : '');
    const pagoEfec = s.form.formaPago === 'efectivo' && !s.form.dividirPartes;
    const divisaEfec = s.form.formaRetiro === 'efectivo' && !s.form.dividirPartes;
    const opTotalPesos = parseNum(s.form.montoPago) || (parseNum(s.form.cantidad) * parseNum(s.form.tc));
    const opTotalDivisa = parseNum(s.form.cantidad);
    const opMonDivisa = s.form.moneda === 'Otra' ? (s.form.monedaOtra || 'Otra') : (s.form.moneda || 'USD');
    const opMonPago = monedaLabel(s.form.monedaPago, s.form.monedaPagoOtra);
    const opSimboloPago = monedaSimbolo(s.form.monedaPago, s.form.monedaPagoOtra);
    const moneyPago = (n) => money(n, opSimboloPago, 0);
    const monedaDeCampoParte = { partesPago: opSimboloPago, partesDivisa: opMonDivisa, partesMayorista: 'USD', partesCliente: 'USD' };
    const KEY_PREFIJO_PARTE = { partesPago: 'pago', partesDivisa: 'divisa', partesMayorista: 'mayorista', partesCliente: 'cliente' };
    const construirParte = (campo, i, p) => {
      if (!p) return null;
      const forma = p.forma || 'efectivo';
      const parteInvalida = !soloComa(p.monto);
      const patasHechasParte = s.form.patasHechas || {};
      const keyParte = (KEY_PREFIJO_PARTE[campo] || campo) + '-' + i;
      return {
        pre: monedaDeCampoParte[campo] || 'USD',
        monto: p.monto || '', onMonto: (e) => this.setParte(campo, i, 'monto', e.target.value),
        cajaStyle: 'display:flex;align-items:center;gap:2px;border:1px solid ' + (parteInvalida ? '#b3261e' : 'var(--color-divider)') + ';padding:6px 8px;max-width:220px' + (parteInvalida ? ';color:#b3261e' : ''),
        forma: forma, onForma: (e) => this.setParte(campo, i, 'forma', e.target.value),
        formaStyle: 'max-width:220px',
        esEfectivo: forma === 'efectivo',
        lugar: p.lugar || 'retiro', onLugar: (e) => this.setParte(campo, i, 'lugar', e.target.value),
        lugarStyle: 'max-width:220px',
        esDomicilio: forma === 'efectivo' && p.lugar === 'domicilio',
        domicilio: p.domicilio || '', onDomicilio: (e) => this.setParte(campo, i, 'domicilio', e.target.value),
        domicilioStyle: 'max-width:220px' + ((p.lugar === 'domicilio' && !p.domicilio) ? ';border-color:#b3261e' : ''),
        esNueva: forma === 'efectivo' && p.lugar === 'domicilio' && p.domicilio === 'Nueva dirección…',
        alias: p.nuevoDomicilioAlias || '', onAlias: (e) => this.setParte(campo, i, 'nuevoDomicilioAlias', e.target.value),
        aliasStyle: 'max-width:220px' + ((p.domicilio === 'Nueva dirección…' && !(p.nuevoDomicilioAlias || '').trim()) ? ';border-color:#b3261e' : ''),
        nuevo: p.nuevoDomicilio || '', onNuevo: (e) => this.setParte(campo, i, 'nuevoDomicilio', e.target.value),
        nuevoRef: this.addressRef((place) => this.setPartePlace(campo, i, place)),
        validado: !!p.nuevoDomicilioGeo, sinValidar: this.mapsActivo() && !!(p.nuevoDomicilio || '').trim() && !p.nuevoDomicilioGeo,
        piso: p.nuevoDomicilioPiso || '', onPiso: (e) => this.setParte(campo, i, 'nuevoDomicilioPiso', e.target.value),
        obs: p.nuevoDomicilioObs || '', onObs: (e) => this.setParte(campo, i, 'nuevoDomicilioObs', e.target.value),
        nuevoStyle: 'max-width:220px' + ((p.domicilio === 'Nueva dirección…' && !(p.nuevoDomicilio || '').trim()) ? ';border-color:#b3261e' : ''),
        puedeQuitar: i > 0, quitar: () => this.quitarParte(campo, i),
        mostrarCompleto: true,
        estadoCompleto: patasHechasParte.hasOwnProperty(keyParte) ? (patasHechasParte[keyParte] ? 'completado' : 'pendiente') : (forma === 'cuenta corriente' ? 'completado' : 'pendiente'),
        onEstadoCompleto: (e) => this.setFormPata(keyParte, e.target.value === 'completado')
      };
    };
    const partesPagoArr = s.form.partesPago || [], partesDivisaArr = s.form.partesDivisa || [];
    const asignadoPago = partesPagoArr.reduce((a, p) => a + (parseNum(p.monto) || 0), 0);
    const asignadoDivisa = partesDivisaArr.reduce((a, p) => a + (parseNum(p.monto) || 0), 0);
    const nPartes = Math.max(partesPagoArr.length, partesDivisaArr.length);
    const partesFilas = Array.from({ length: nPartes }).map((_, i) => {
      const pago = construirParte('partesPago', i, partesPagoArr[i]);
      const divisa = construirParte('partesDivisa', i, partesDivisaArr[i]);
      const ambosDomicilio = !!(pago && pago.esDomicilio && divisa && divisa.esDomicilio);
      const domDistintos = ambosDomicilio && !!(s.form.partesDomDistintos && s.form.partesDomDistintos[i]);
      const domUnico = ambosDomicilio && !domDistintos;
      const domFilaDoble = ((pago && pago.esDomicilio) || (divisa && divisa.esDomicilio)) && !domUnico;
      const domCompartido = domUnico ? {
        domicilio: pago.domicilio, onDomicilio: (e) => this.setParteAmbos(i, 'domicilio', e.target.value), domicilioStyle: pago.domicilioStyle,
        esNueva: pago.esNueva,
        alias: pago.alias, onAlias: (e) => this.setParteAmbos(i, 'nuevoDomicilioAlias', e.target.value), aliasStyle: pago.aliasStyle,
        nuevo: pago.nuevo, onNuevo: (e) => this.setParteAmbos(i, 'nuevoDomicilio', e.target.value), nuevoStyle: pago.nuevoStyle,
        nuevoRef: this.addressRef((place) => this.setParteAmbosPlace(i, place)), validado: pago.validado, sinValidar: pago.sinValidar,
        piso: pago.piso, onPiso: (e) => this.setParteAmbos(i, 'nuevoDomicilioPiso', e.target.value),
        obs: pago.obs, onObs: (e) => this.setParteAmbos(i, 'nuevoDomicilioObs', e.target.value)
      } : null;
      return { numero: i + 1, pago: pago, divisa: divisa, tienePago: !!pago, tieneDivisa: !!divisa,
        sinPago: !pago, sinDivisa: !divisa,
        domUnico: domUnico, domFilaDoble: domFilaDoble, domCompartido: domCompartido,
        mostrarCheckDistintos: ambosDomicilio, domDistintos: domDistintos,
        onToggleDistintos: (e) => this.togglePartDomDistintos(i, e.target.checked),
        muestraNuevaUnico: domUnico && domCompartido.esNueva };
    });

    const liqOpcionesMayorista = LIQ;
    const partesMayoristaArr = s.form.partesMayorista || [], partesClienteArr = s.form.partesCliente || [];
    const asignadoMayorista = partesMayoristaArr.reduce((a, p) => a + (parseNum(p.monto) || 0), 0);
    const asignadoCliente = partesClienteArr.reduce((a, p) => a + (parseNum(p.monto) || 0), 0);
    const nPartesCable = Math.max(partesMayoristaArr.length, partesClienteArr.length);
    const cablePartesFilas = Array.from({ length: nPartesCable }).map((_, i) => ({
      numero: i + 1,
      mayorista: construirParte('partesMayorista', i, partesMayoristaArr[i]),
      cliente: construirParte('partesCliente', i, partesClienteArr[i])
    }));
    const cableMontoV = parseNum(s.form.monto), cableCostoV = parseNum(s.form.costoPct), cableMargenV = parseNum(s.form.margenPct);
    const cableEsSubida = (s.form.tipo || 'Bajada') === 'Subida';
    const cableDebeMayoristaTotal = cableEsSubida ? (cableMontoV * (1 + cableCostoV / 100)) : (cableMontoV * (1 - cableCostoV / 100));
    const cableDebemosClienteTotal = cableEsSubida
      ? (cableMontoV * (1 + cableMargenV / 100 + Math.max(cableCostoV, 0) / 100))
      : (cableMontoV * (1 - cableMargenV / 100 - Math.max(cableCostoV, 0) / 100));

    return {
      mostrarLogin: !s.authUser,
      loginUsuario: s.loginUsuario || '',
      loginPassword: s.loginPassword || '',
      loginError: s.loginError || '',
      onLoginUsuarioChange: (e) => this.setState({ loginUsuario: e.target.value, loginError: '' }),
      onLoginPasswordChange: (e) => this.setState({ loginPassword: e.target.value, loginError: '' }),
      onLoginSubmit: (e) => this.onLoginSubmit(e),
      usuarioNombre: s.authUser ? s.authUser.nombre : '',
      usuarioIniciales: s.authUser ? s.authUser.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '',
      usuarioRolLabel: s.authUser ? s.authUser.rolLabel : '',
      logout: () => this.logout(),
      puedeVerGastosDetalle: !s.authUser || s.authUser.rol !== 'operador',
      soloAltaGastos: !!s.authUser && s.authUser.rol === 'operador',
      navItems: NAV.filter(n => !(s.authUser && s.authUser.rol === 'operador' && NAV_OCULTO_OPERADOR.indexOf(n.id) >= 0)).reduce((acc, n, i, arr) => {
        const isNewGroup = i === 0 || arr[i - 1].group !== n.group;
        const navColl = s.navColl || {};
        const groupActivo = arr.filter(x => x.group === n.group).some(x => x.id === s.screen);
        const colapsado = !!navColl[n.group] && !groupActivo;
        if (isNewGroup) {
          acc.push({
            isHeader: true, isItem: false, groupLabel: n.group,
            groupLabelStyle: 'display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;text-decoration:none;cursor:pointer;font-family:var(--font-heading);font-size:15px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;color:var(--color-text);padding:' + (i === 0 ? '0' : '16px') + ' 8px 6px 8px',
            chevronStyle: 'transition:transform 0.15s ease;transform:rotate(' + (colapsado ? '0' : '90') + 'deg)',
            go: (e) => { e.preventDefault(); this.setState({ navColl: Object.assign({}, navColl, { [n.group]: !navColl[n.group] }) }); }
          });
        }
        if (colapsado) return acc;
        const activoPrincipal = n.id === s.screen && (n.id !== 'ops' || (s.opVista || 'todos') !== 'dia' && (s.opVista || 'todos') !== 'pendientes');
        acc.push({
          isHeader: false, isItem: true,
          icon: n.icon, icon2: n.icon2, label: n.label,
          style: 'display:flex;align-items:center;gap:8px;padding:7px 8px;font-size:13px;text-decoration:none;border-left:2px solid ' +
            (activoPrincipal ? 'var(--color-accent);background:color-mix(in srgb, var(--color-accent) 12%, transparent);color:var(--color-accent-800);font-weight:500' : 'transparent;color:var(--color-neutral-700)'),
                go: (e) => { e.preventDefault(); this.setState({ screen: n.id, vista: 'lista', opVista: n.id === 'ops' ? 'todos' : s.opVista, opFoco: null, criptoFoco: null, cableFoco: null, navOpen: false, cliente: null, comisionistaSel: null, opDetalle: null, criptoOpDetalle: null, cableDetalle: null, navStack: [] }); }
        });
        if (n.id === 'ops' && s.screen === 'ops') {
          [{ id: 'dia', label: 'Del día de hoy' }, { id: 'pendientes', label: 'Pendientes' }].forEach((sub) => {
            const activo = s.screen === 'ops' && (s.opVista || 'todos') === sub.id;
            acc.push({
              isHeader: false, isItem: true, icon: '', icon2: '', label: sub.label,
              style: 'display:flex;align-items:center;gap:8px;padding:6px 8px 6px 22px;font-size:11px;text-decoration:none;border-left:2px solid ' +
                (activo ? 'var(--color-accent);background:color-mix(in srgb, var(--color-accent) 12%, transparent);color:var(--color-accent-800);font-weight:500' : 'transparent;color:var(--color-neutral-700)'),
                    go: (e) => { e.preventDefault(); this.setState({ screen: 'ops', vista: 'lista', opVista: sub.id, opFoco: null, criptoFoco: null, cableFoco: null, navOpen: false, cliente: null, comisionistaSel: null, opDetalle: null, criptoOpDetalle: null, cableDetalle: null, navStack: [] }); }
            });
          });
        }
        return acc;
      }, []),
      isMobile: s.isMobile,
      isDesktop: !s.isMobile,
      liqMinWidth: s.isMobile ? '640px' : 'auto',
      navOpen: s.navOpen,
      toggleNav: () => this.setState({ navOpen: !s.navOpen }),
      closeNav: () => this.setState({ navOpen: false }),
      sidebarStyle: s.isMobile
        ? ('flex:none;width:230px;border-right:1px solid var(--color-divider);display:flex;flex-direction:column;padding:16px 0;position:fixed;top:0;left:0;height:100vh;background:var(--color-bg);z-index:40;transition:transform 0.2s ease;transform:translateX(' + (s.navOpen ? '0' : '-100%') + ')')
        : 'flex:none;width:200px;border-right:1px solid var(--color-divider);display:flex;flex-direction:column;padding:16px 0;position:sticky;top:0;height:100vh',
      backdropStyle: 'display:' + (s.isMobile && s.navOpen ? 'block' : 'none') + ';position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:30',
      hayToast: !!s.toast, toastMensaje: s.toast ? s.toast.mensaje : '', toastDeshacer: s.toast ? s.toast.deshacer : null, toastCerrar: () => this.cerrarToast(),
      mainStyle: s.isMobile ? 'flex:1;min-width:0;display:flex;flex-direction:column;width:100%' : 'flex:1;min-width:0;display:flex;flex-direction:column',
      contentStyle: s.isMobile ? 'padding:14px;display:flex;flex-direction:column;gap:16px' : 'padding:22px;display:flex;flex-direction:column;gap:22px',
      screenTitle: nav.label, screenSub: nav.sub,
      bloqueo: s.bloqueo || '',
      cerrarBloqueo: () => { if (this._tBloqueo) clearTimeout(this._tBloqueo); this.setState({ bloqueo: null }); },
      query: s.query, onQuery: (e) => this.setState({ query: e.target.value }),
      queryVisible: s.screen === 'ops' || s.screen === 'clientes',
      operador: d.operador || 'Mesa', onOperador: (e) => this.setOperador(e.target.value),
      hasAction: !!actions, actionLabel: actions ? actions[0] : '', doAction: () => this.openModal(actions ? actions[1] : 'op'),

      hayNavAtras: (s.navStack || []).length > 0, navAtras: () => this.volver(),
      isTablero: s.screen === 'tablero', isOps: s.screen === 'ops', isCierre: s.screen === 'cierre',
      isGastos: s.screen === 'gastos', isCotiz: s.screen === 'cotiz', isPatrimonio: s.screen === 'patrimonio',
      isComisionistas: s.screen === 'comisionistas',
      comisionistasFilas: (d.comisionistas || []).map(c => ({
        nombre: c.nombre, tipo: c.tipo || '—', pct: c.comisionPct ? nf(c.comisionPct, 2) + '%' : '—',
        go: () => { this.navPush(); this.setState({ screen: 'clientes', vista: 'fichaComisionista', comisionistaSel: c.id }); }
      })),
      sinComisionistas: (d.comisionistas || []).length === 0,
      isAudit: s.screen === 'audit',
      auditRows: (d.audit || []).slice().sort((a, b) => b.ts.localeCompare(a.ts)).map(a => ({
        ts: stamp(a.ts), operador: a.operador || '—', accion: a.accion, entidad: a.entidad, detalle: a.detalle || '—'
      })),
      sinAudit: (d.audit || []).length === 0,
      auditCount: (d.audit || []).length + ' movimientos registrados',
      auditExport: () => this.descargarCSV('auditoria.csv',
        [['Fecha y hora', 'Operador', 'Acción', 'Registro', 'Ref', 'Detalle']].concat(
          (d.audit || []).slice().sort((a, b) => b.ts.localeCompare(a.ts))
            .map(a => [stamp(a.ts), a.operador || '', a.accion, a.entidad, a.refId || '', a.detalle || '']))),
      isUsuarios: s.screen === 'usuarios',
      usuariosRows: (d.usuarios || []).slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).map(u => {
        const rolObj = ROLES.find(r => r.id === u.rol) || ROLES[1];
        const activo = u.estado !== 'desactivado';
        return {
          id: u.id, nombre: u.nombre, usuario: u.usuario, rol: rolObj.nombre,
          estado: activo ? 'Activo' : 'Desactivado',
          estadoStyle: activo ? 'font-size:11px;background:transparent;border-color:var(--color-accent-300);color:var(--color-accent-800)' : 'font-size:11px;background:transparent;color:var(--color-neutral-600)',
          ultimoAcceso: u.ultimoAcceso ? stamp(u.ultimoAcceso) : 'nunca',
          esSesionActual: !!(s.authUser && s.authUser.usuario === u.usuario),
          editar: () => this.openModal('usuario', { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol }),
          resetPassword: () => { if (window.confirm('¿Restablecer la contraseña de ' + u.nombre + '? La contraseña anterior deja de funcionar.')) this.resetPasswordUsuario(u.id); },
          toggleEstado: () => this.toggleEstadoUsuario(u.id),
          toggleLabel: activo ? 'Desactivar' : 'Activar',
          toggleStyle: activo ? 'font-size:12px' : 'font-size:12px;background:var(--color-accent-100);color:var(--color-accent-800);border-color:var(--color-accent-300)'
        };
      }),
      sinUsuarios: (d.usuarios || []).length === 0,
      rolesMatriz: (() => {
        const pantallasRoles = NAV.filter(n => n.id !== 'usuarios');
        return ROLES.map(r => ({
          nombre: r.nombre, desc: r.desc,
          pantallas: pantallasRoles.map(n => ({ label: n.label, habilitada: r.pantallasOcultas.indexOf(n.id) < 0 ? '✓' : '—' })),
          gastosNota: r.gastosLimitado ? 'En Gastos: solo alta, sin ver historial ni gráficos.' : 'En Gastos: acceso completo.'
        }));
      })(),
      passwordAMostrar: s.passwordAMostrar || null,
      cerrarPasswordAMostrar: () => this.setState({ passwordAMostrar: null }),
      isImportador: s.screen === 'importador',
      impImportador: (() => {
        if (s.screen !== 'importador') return null;
        const datos = s.impDatos || {};
        const yaImportado = !!d.importAperturaHecha;
        const paso = s.impPaso || (yaImportado ? 'yaImportado' : 'subida');
        const idx = s.impEntidadIdx || 0;
        const ent = ENTIDADES_IMPORT[idx];
        const datEnt = datos[ent.id] || {};
        const base = {
          esYaImportado: paso === 'yaImportado', esSubida: paso === 'subida', esMapeo: paso === 'mapeo',
          esPreview: paso === 'preview', esConfirmar: paso === 'confirmar', esResultado: paso === 'resultado',
          fechaImportado: yaImportado ? dmy(d.importAperturaHecha.fecha) : '',
          reimportarTexto: s.impReimportarTexto || '', onReimportarTexto: (e) => this.setState({ impReimportarTexto: e.target.value }),
          bloqueaReimportar: (s.impReimportarTexto || '').trim().toUpperCase() !== 'REIMPORTAR',
          confirmarReimportar: () => this.impReiniciar(),
          pasos: ENTIDADES_IMPORT.map((e, i) => ({
            label: (datos[e.id] && datos[e.id].lista ? '✓ ' : '') + e.label,
            style: i === idx ? 'font-size:12px;background:var(--color-accent-100);border-color:var(--color-accent-500)' : 'font-size:12px',
            ir: () => this.impIrEntidad(i)
          })),
          entLabel: ent.label, entNota: ent.nota, entIdx: idx + 1, entTotal: ENTIDADES_IMPORT.length
        };
        if (paso === 'subida') {
          Object.assign(base, {
            archivoError: datEnt.error || '',
            onDrop: (e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) this.impProcesarArchivo(f); },
            onDragOver: (e) => e.preventDefault(),
            onClickZona: () => { const el = document.getElementById('impFileInput'); if (el) el.click(); },
            onFileInput: (e) => this.impOnFileInput(e),
            omitir: () => this.impOmitirEntidad(ent.id), puedeOmitir: idx < ENTIDADES_IMPORT.length
          });
        } else if (paso === 'mapeo') {
          Object.assign(base, {
            mapeoFilas: ent.campos.map(c => ({
              label: c.label + (c.req ? ' *' : ''),
              value: datEnt.mapeo && datEnt.mapeo[c.k] >= 0 ? String(datEnt.mapeo[c.k]) : '',
              onChange: (e) => this.impSetMapeo(ent.id, c.k, e.target.value === '' ? -1 : Number(e.target.value)),
              options: (datEnt.headers || []).map((h, i) => ({ v: String(i), l: h }))
            })),
            archivoNombre: datEnt.archivo || '',
            continuar: () => this.setState({ impPaso: 'preview' })
          });
        } else if (paso === 'preview') {
          const filas = this.impFilasValidadas(ent);
          const bloqueantes = filas.filter(f => f.bloqueante).length;
          const listas = filas.filter(f => f.ok).length;
          Object.assign(base, {
            campos: ent.campos.map(c => c.label),
            filas: filas.map(f => ({
              celdas: ent.campos.map(c => ({ value: f.valores[c.k] || '', onChange: (e) => this.impEditarValor(ent.id, f.i, c.k, e.target.value) })),
              errores: f.errores.join(' · '),
              rowStyle: f.bloqueante ? 'background:color-mix(in srgb, #b3261e 10%, transparent)' : (f.errores.length ? 'background:color-mix(in srgb, var(--color-accent) 8%, transparent)' : '')
            })),
            total: filas.length, listas, conErrores: filas.length - listas, bloqueantesCount: bloqueantes,
            bloqueaContinuar: bloqueantes > 0,
            volverAMapeo: () => this.setState({ impPaso: 'mapeo' }),
            confirmarEntidad: () => this.impConfirmarEntidad(ent.id)
          });
        } else if (paso === 'confirmar') {
          Object.assign(base, {
            resumenEntidades: ENTIDADES_IMPORT.map(e => {
              const de = datos[e.id];
              const ok = de && de.lista ? this.impFilasValidadas(e).filter(f => f.ok).length : 0;
              return { label: e.label, lista: !!(de && de.lista), count: ok };
            }),
            hayAlgunaLista: ENTIDADES_IMPORT.some(e => datos[e.id] && datos[e.id].lista),
            bloqueaConfirmarTodo: !ENTIDADES_IMPORT.some(e => datos[e.id] && datos[e.id].lista),
            confirmarTodo: () => this.impConfirmarImportacion()
          });
        } else if (paso === 'resultado') {
          const r = s.impResultado || {};
          const lineas = [];
          if (r.clientes) lineas.push('Clientes: ' + r.clientes.creados + ' creados' + (r.clientes.repetidos ? ' · ' + r.clientes.repetidos + ' ya existían (no se duplicaron)' : ''));
          if (r.ctacte) lineas.push('Saldos de cuenta corriente: ' + r.ctacte.creados + ' cargados' + (r.ctacte.sinCliente ? ' · ' + r.ctacte.sinCliente + ' se descartaron por no encontrar el cliente' : ''));
          if (r.caja) lineas.push('Saldos de caja: ' + r.caja.creados + ' cargados como aporte de apertura');
          if (r.margenes) lineas.push('Márgenes: ' + r.margenes.aplicados + ' aplicados');
          Object.assign(base, { resultadoLineas: lineas, sinNada: lineas.length === 0, irATablero: () => this.setState({ screen: 'tablero', impPaso: null }) });
        }
        return base;
      })(),
      isListaClientes: s.screen === 'clientes' && s.vista === 'lista',
      isFichaCliente: s.screen === 'clientes' && s.vista === 'ficha',
      isFichaComisionista: s.screen === 'clientes' && s.vista === 'fichaComisionista',
      backToClientes: () => this.volver({ screen: 'clientes', vista: 'lista' }),
      volverDeComisionista: () => this.volver({ screen: 'ctacte' }),

      cajaPesos: { valor: pesos(caja.pesos), inicial: pesos(serie.cap.pesos), mov: pesos(caja.pesos - serie.cap.pesos),
        tienePendiente: !!(pend.ARS), pendienteTexto: pesos(pend.ARS || 0), disponibleTexto: pesos(caja.pesos - (pend.ARS || 0)), irPendiente: irPend(['ARS']) },
      cajaUsd: { inicial: usd(serie.cap.usd), mov: usd(caja.usd + (caja.saldos['USD cara chica'] || 0) - serie.cap.usd) },
      cajaUsdFilas: [
        { moneda: 'Dólar', valor: usd(calid.limpios), tienePendiente: !!(pend.USD), pendienteTexto: usd(pend.USD || 0), disponibleTexto: usd(calid.limpios - (pend.USD || 0)), irPendiente: irPend(['USD']) },
        { moneda: 'Cara chica', valor: usd(calid['cara chica']), tienePendiente: !!(pend['USD cara chica']), pendienteTexto: usd(pend['USD cara chica'] || 0), disponibleTexto: usd(calid['cara chica'] - (pend['USD cara chica'] || 0)), irPendiente: irPend(['USD cara chica']) }
      ],
      cajaCripto: { valor: money(caja.usdt, 'USDT', 0), inicial: money(serie.cap.usdt, 'USDT', 0),
        mov: money(caja.usdt - serie.cap.usdt, 'USDT', 0),
        tienePendiente: !!(pend.USDT), pendienteTexto: money(pend.USDT || 0, 'USDT', 0), disponibleTexto: money(caja.usdt - (pend.USDT || 0), 'USDT', 0), irPendiente: irPend(['USDT']) },
      cajaDivisas: ['EUR', 'BRL', 'LBR'].map(k => ({ moneda: k, valor: money(k === 'EUR' ? caja.eur : (caja.saldos[k] || 0), k, 0), tienePendiente: !!(pend[k]), pendienteTexto: money(pend[k] || 0, k, 0), disponibleTexto: money((k === 'EUR' ? caja.eur : (caja.saldos[k] || 0)) - (pend[k] || 0), k, 0), irPendiente: irPend([k]) })).concat(
        Object.keys(caja.saldos).filter(k => ['USD', 'USD cara chica', 'EUR', 'USDT', 'BRL', 'LBR'].indexOf(k) < 0).map(k => ({ moneda: k, valor: money(caja.saldos[k] || 0, k, 0),
          tienePendiente: !!(pend[k]), pendienteTexto: money(pend[k] || 0, k, 0), disponibleTexto: money((caja.saldos[k] || 0) - (pend[k] || 0), k, 0), irPendiente: irPend([k]) }))),
      usdLimpios: usd(calid.limpios), usdCaraChica: usd(calid['cara chica']),
      usdTotal: usd(calid.limpios + calid['cara chica']),
      ganDesde: gDesde, ganHasta: gHasta,
      onGanDesde: (e) => this.setState({ ganDesde: e.target.value }),
      onGanHasta: (e) => this.setState({ ganHasta: e.target.value }),
      rangoNota: dmy(gDesde) + ' → ' + dmy(gHasta),
      volAgrupar,
      volAgruparBtns: [{ v: 'dia', l: 'Día' }, { v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mes' }].map(o => ({
        label: o.l, style: 'font-size:11px;padding:4px 10px;' + (volAgrupar === o.v ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent'),
        go: () => this.setState({ volAgrupar: o.v })
      })),
      volTipos: volData.tipos.map(t => ({ label: t.label, color: t.color })),
      volBarrasUsd: volData.barrasUsd, volBarrasCant: volData.barrasCant, sinVolumen: volData.sinBarras,
      volUsdReadout: 'Total del per\u00edodo: ' + usd(volData.totalUsd),
      volCantReadout: 'Total del per\u00edodo: ' + volData.totalCant + ' operaci' + (volData.totalCant === 1 ? '\u00f3n' : 'ones'),
      chartTipShow: !!s.chartTip,
      chartTipStyle: s.chartTip ? ('position:fixed;left:' + (s.chartTip.x + 14) + 'px;top:' + (s.chartTip.y + 14) + 'px;z-index:1000;pointer-events:none;background:var(--color-bg);border:1px solid var(--color-accent-700);padding:6px 10px;font-size:11px;box-shadow:var(--shadow-md)') : 'display:none',
      chartTipTitle: s.chartTip ? s.chartTip.title : '',
      chartTipValue: s.chartTip ? s.chartTip.value : '',
      volTortaPares: volData.tortaPares.slices, volTortaParesLegend: volData.tortaPares.legend, sinTortaPares: volData.tortaPares.sinDatos,
      volTortaTipos: volData.tortaTipos.slices, volTortaTiposLegend: volData.tortaTipos.legend, sinTortaTipos: volData.tortaTipos.sinDatos,
      saldosAbiertosFilas: [
        { moneda: 'ARS', valor: pesos(u ? u.sPesos : 0) },
        { moneda: 'USD', valor: usd(caja.usd) },
        { moneda: 'USD cara chica', valor: usd(caja.saldos['USD cara chica'] || 0) },
        { moneda: 'USDT', valor: money(caja.usdt, 'USDT', 0) },
        { moneda: 'EUR', valor: money(caja.eur, 'EUR', 0) }
      ].concat(Object.keys(caja.saldos).filter(k => ['USD', 'USD cara chica', 'EUR', 'USDT'].indexOf(k) < 0).map(k => ({ moneda: k, valor: money(caja.saldos[k] || 0, k, 0) }))),
      saldosAbiertosNota: u ? 'al cierre del ' + dmy(u.fecha) : 'sin cierres registrados',
      saldoUsdHoy: u ? usd(u.patValuado) : usd(0),
      patrimonioUsdTotal: usd(u ? u.patValuado : 0),
      patrimonioFilas: patBreak.filas.map(f => ({ moneda: MONEDA_LABEL[f.moneda] || f.moneda, monto: formatoMoneda(f.moneda, f.monto) })),
      patTortaSlices: patTorta.slices, patTortaLegend: patTorta.legend, sinPatTorta: patTorta.sinDatos,
      patEvolBarras: patEvolBarras, sinPatEvol: gSel.length === 0,
      saldosLineasViewBox: saldosLineas.viewBox, saldosLineasSeries: saldosLineas.series, sinSaldosLineas: saldosLineas.sinDatos,
      ccLineaViewBox: ccLineaRaw.viewBox, ccLineaPuntos: ccLineaRaw.series[0] ? ccLineaRaw.series[0].points : '',
      ccLineaActual: u ? usd(u.ccUsd || 0) : usd(0), sinCcLinea: ccLineaRaw.sinDatos,
      ccLineaTitulo: 'Posición neta CC: ' + (u ? usd(u.ccUsd || 0) : usd(0)) + ' (último cierre)',
      ganPeriodo: usd(gTot), ganPeriodoStyle: gTot > 0.005 ? 'color:#1e7d3a' : (gTot < -0.005 ? 'color:#b3261e' : ''),
      ganPeriodoNota: dmy(gDesde) + ' → ' + dmy(gHasta) + ' · ' + plural(gSel.length, 'día con cierre', 'días con cierre'),
      ganPresets: gPresets,
      gasDesde: xDesde, gasHasta: xHasta,
      onGasDesde: (e) => this.setState({ gasDesde: e.target.value }),
      onGasHasta: (e) => this.setState({ gasHasta: e.target.value }),
      gasPresets: gasPresets,
      abrirCalendario: (e) => { e.preventDefault(); const el = e.currentTarget; el.focus(); if (el.showPicker) { try { el.showPicker(); } catch (x) {} } },
      bloquearTecla: (e) => e.preventDefault(),
      gasTotalPeriodo: pesos(xTot),
      gasPromDia: pesos(promDia), gasPromMes: pesos(promMes),
      gasNota: dmy(xDesde) + ' → ' + dmy(xHasta) + ' · ' + plural(xSel.length, 'gasto', 'gastos'),
      gasDias: gasDiasRows, gasMeses: gasMesesRows,
      gasLineaDia: lineaProm(porDia, promDia), gasLineaMes: lineaProm(porMes, promMes),
      gasPromDiaEtiqueta: 'promedio ' + pesos(promDia), gasPromMesEtiqueta: 'promedio ' + pesos(promMes),
      sinGastosPeriodo: xSel.length === 0,
      gasAlertaNota: (() => {
        const nd = gasDiasRows.filter(r => r.alerta).length, nm = gasMesesRows.filter(r => r.alerta).length;
        return nd + nm === 0 ? 'ningún día ni mes del período superó el promedio'
          : 'por encima del promedio: ' + plural(nd, 'día', 'días') + ' y ' + plural(nm, 'mes', 'meses');
      })(),
      ganDia: u ? usd(u.resultadoTotal) : usd(0), ganMes: u ? usd(u.mesTotal) : usd(0), ganAcum: u ? usd(u.patReal) : usd(0),
      ganDiaStyle: u && u.resultadoTotal > 0.005 ? 'color:#1e7d3a' : (u && u.resultadoTotal < -0.005 ? 'color:#b3261e' : ''),
      ganMesStyle: u && u.mesTotal > 0.005 ? 'color:#1e7d3a' : (u && u.mesTotal < -0.005 ? 'color:#b3261e' : ''),
      ganOperativaHoy: u ? usd(u.ganOperativa) : usd(0), ganVarTcHoy: u ? usd(u.varTC) : usd(0),
      ganOperativaHoyStyle: u && u.ganOperativa > 0.005 ? 'color:#1e7d3a' : (u && u.ganOperativa < -0.005 ? 'color:#b3261e' : ''),
      ganVarTcHoyStyle: u && u.varTC > 0.005 ? 'color:#1e7d3a' : (u && u.varTC < -0.005 ? 'color:#b3261e' : ''),
      ganGastosHoy: u && u.gastosHoy ? '−' + usd(u.gastosHoy) : usd(0),
      ganGastosHoyStyle: u && u.gastosHoy > 0.005 ? 'color:#b3261e' : '',
      ganOperativaMes: u ? usd(u.mesOperativa) : usd(0), ganVarTcMes: u ? usd(u.mesVarTC) : usd(0),
      ganOperativaMesStyle: u && u.mesOperativa > 0.005 ? 'color:#1e7d3a' : (u && u.mesOperativa < -0.005 ? 'color:#b3261e' : ''),
      ganVarTcMesStyle: u && u.mesVarTC > 0.005 ? 'color:#1e7d3a' : (u && u.mesVarTC < -0.005 ? 'color:#b3261e' : ''),
      ganGastosMes: u && u.mesGastos ? '−' + usd(u.mesGastos) : usd(0),
      ganGastosMesStyle: u && u.mesGastos > 0.005 ? 'color:#b3261e' : '',
      hoyPatValuado: u ? usd(u.patValuado) : usd(0),
      hoyResultado: u ? usd(u.resultadoTotal) : usd(0),
      hoyResultadoStyle: u ? (u.resultadoTotal > 0.005 ? 'color:#1e7d3a' : (u.resultadoTotal < -0.005 ? 'color:#b3261e' : '')) : '',
      hoyOperativa: u ? usd(u.ganOperativa) : usd(0), hoyVarTC: u ? usd(u.varTC) : usd(0), hoyGastos: u ? usd(u.gastosHoy) : usd(0),
      saldoCardsCierre: saldoCardsCierre, otrasDivisasCierre: otrasDivisasCierre,
      patVarMontoTexto: patVarCierre.texto, patVarPctTexto: patVarCierre.pctTexto, patVarStyle: patVarCierre.style,
      pieGradient: pieGradient, volLeyenda: volLeyenda, sinVolumenHoy: sinVolumenHoy, onPieMove: onPieMove, onPieLeave: onPieLeave,
      ccNosDebenCierre: ccNosDebenCierre, ccDebemosCierre: ccDebemosCierre, ccNetoUsdCierre: usd(u ? u.ccUsd : 0),
      ccNetoStyle: ccNetoStyle, ccNetoVarTexto: ccNetoVar.texto, ccNetoVarPctTexto: ccNetoVar.pctTexto, ccNetoVarStyle: ccNetoVar.style,
      irCtacte: irCtacte,
      sinCcNosDebenCierre: ccNosDebenCierre.length === 0, sinCcDebemosCierre: ccDebemosCierre.length === 0,
      resultadoBarras: resultadoBarras, patDesglose: patDesglose,
      gastosHoyTotal: u && u.gastosHoy ? '−' + usd(u.gastosHoy) : usd(0),
      gastosHoyStyle: u && u.gastosHoy > 0.005 ? 'color:#b3261e' : '',
      gastosHoyCant: String(gastosHoyLista.length), irGastosHoy: irGastosHoy,
      ultimaFecha: u ? dmy(u.fecha) : '—', fechaCierreHoy: fechaCierreHoy,
      cotizOperativa: this.financiera(d),
      mercadoRows: PARES.map(p => {
        const ult = p.id === 'USD' ? this.ultimaCotiz(d) : (this.ultimaCotizPar(d, p.id) || {});
        const val = (k) => (p.pre || '') + nf(Number(ult[k]) || 0, p.dec);
        return { moneda: p.par, compra: val(p.kc), venta: val(p.kv),
          editar: () => { this.openModal('cotiz'); this.setState({ soloPar: p.id }); } };
      }),
      mercadoNota: (() => { const q = this.ultimaCotiz(d); return q.fecha ? 'última carga ' + dmy(q.fecha) + ' · ' + (q.momento || '') : 'sin cotizaciones cargadas'; })(),
      euroNota: 'la financiera solo carga el dólar en ARS; el resto son cruces contra el dólar. Los pares que queden vacíos toman la última cotización cargada',
      cargarCotiz: () => this.openModal('cotiz'),

      isCtaCte: s.screen === 'ctacte',
      ccNosDebenFilas: ccNosDebenFilas, sinCcNosDeben: ccNosDebenFilas.length === 0,
      ccLesDebemosFilas: ccLesDebemosFilas, sinCcLesDebemos: ccLesDebemosFilas.length === 0,
      ccDeudores: plural(abiertas.filter(c => c.monedas.some(k => c.porMon[k] > 0.005)).length, 'cliente', 'clientes'),
      ccAcreedores: plural(abiertas.filter(c => c.monedas.some(k => c.porMon[k] < -0.005)).length, 'cliente', 'clientes'),
      ccResumenNota: abiertas.length + ' cuentas con saldo abierto · cada moneda se muestra por separado, sin convertir' +
        (huerfanos.length ? ' · ' + huerfanos.length + ' movimientos sin titular asignado' : ''),
      sinCtas: abiertas.length === 0,
      ccBusca: s.ccBusca || '', onCcBusca: (e) => this.setState({ ccBusca: e.target.value }),
      ctaCols: ctaColsDef.map(c => ({
        label: c.label, thStyle: 'white-space:nowrap' + (c.k !== 'codigo' && c.k !== 'nombre' ? ';text-align:right' : ''),
        flecha: ccOrd.col === c.k ? (ccOrd.dir === 'asc' ? '▲' : '▼') : '',
        ordenar: () => this.setState({ ccOrd: { col: c.k, dir: ccOrd.col === c.k && ccOrd.dir === 'asc' ? 'desc' : 'asc' } })
      })),
      ctasCorrientes: ctasOrdenadas.map(c => ({
        codigo: c.codigo, nombre: c.cliente.nombre, esComisionista: c.tipo === 'comisionista',
        celdas: MON_COLS.map(mc => Object.assign({ label: mc.label, show: Math.abs(c.porMon[mc.key] || 0) > 0.005 }, celdaSaldo(c.porMon[mc.key] || 0))),
        antiguedad: antigTxt(c), cant: String(c.movs.length),
        go: () => { this.navPush(); c.tipo === 'comisionista'
          ? this.setState({ screen: 'clientes', vista: 'fichaComisionista', comisionistaSel: c.cliente.id })
          : this.setState({ screen: 'clientes', vista: 'ficha', cliente: c.cliente.id }); }
      })),
      ccExportar: () => this.descargarCSV('cuentas-corrientes.csv',
        [['Cliente', 'Moneda', 'Situación', 'Monto', 'Antigüedad (días)', 'Movimientos']].concat(
          abiertas.flatMap(c => c.monedas.map(k => [c.cliente.nombre, monedaTexto(k), c.porMon[k] > 0 ? 'nos debe' : 'le debemos',
            nf(Math.abs(c.porMon[k]), 2), dias(c.desde) === null ? '' : dias(c.desde), c.movs.length])))),

      opTabs: [{ id: 'cambio', label: 'Cambio de divisas' }, { id: 'cripto', label: 'Cripto (USDT)' }, { id: 'cable', label: 'Cables' }, { id: 'mayorista', label: 'Tesorería' }].map(t => ({
        label: t.label,
        style: s.opTab === t.id ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent',
        go: () => this.setState({ opTab: t.id })
      })),
      isCambio: s.opTab === 'cambio', isCripto: s.opTab === 'cripto', isCable: s.opTab === 'cable', isMayorista: s.opTab === 'mayorista',
      opFoco: !!(s.opFoco || s.criptoFoco || s.cableFoco || s.mayoristaFoco),
      limpiarFoco: () => this.setState({ opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null }),
      opVistaFecha: s.opVista === 'fecha' && !(s.opFoco || s.criptoFoco || s.cableFoco || s.mayoristaFoco),
      opVistaFechaLabel: s.opVista === 'fecha' ? 'viendo el ' + dmy(s.opFechaFiltro) : '',
      limpiarVistaFecha: () => this.setState({ opVista: 'todos', opFechaFiltro: null }),
      opMonedaPendLabel: (s.opVista === 'pendientes' && s.opMonedaPend) ? 'viendo pendientes en ' + s.opMonedaPend.join('/') : '',
      limpiarMonedaPend: () => this.setState({ opMonedaPend: null }),
      opEnDetalle: !!opDetalle, opEnLista: !opDetalle, opDetalle: opDetalle,
      mostrarTabsOps: !opDetalle && criptoEnLista && cableEnLista && mayoristaEnLista,
      volverOps: () => this.volver({ opDetalle: null }),
      opsCambio: opsRows, sinOps: opsRows.length === 0,
      opsCount: s.opTab === 'cripto' ? d.cripto.length + ' operaciones de cripto'
        : s.opTab === 'cable' ? d.cables.length + ' cables cargados'
        : s.opTab === 'mayorista' ? (d.mayoristaOps || []).length + ' operaciones de tesorería'
        : d.ops.length + ' operaciones cargadas',

      criptoNota: 'precio del día: compra ' + nf(this.precio(d, 'compra', 'USDT'), 2) + ' · venta ' + nf(this.precio(d, 'venta', 'USDT'), 2),
      sinCripto: criptoRows.length === 0,
      criptoEnLista: criptoEnLista, criptoEnDetalle: criptoEnDetalle, criptoDetalle: criptoDetalle, volverCripto: volverCripto,
      criptoRows: criptoRows,

      sinMayorista: mayoristaRows.length === 0,
      mayoristaEnLista: mayoristaEnLista, mayoristaEnDetalle: mayoristaEnDetalle, mayoristaDetalle: mayoristaDetalle, volverMayorista: volverMayorista,
      mayoristaRows: mayoristaRows,

      sinCables: cableRows.length === 0,
      cableEnLista: cableEnLista, cableEnDetalle: cableEnDetalle, cableDetalle: cableDetalle, volverCable: volverCable,
      cableRows: cableRows,

      cierres: serie.rows.slice().reverse().map(r => {
        const pn = (v) => v > 0.005 ? 'color:#1e7d3a' : (v < -0.005 ? 'color:#b3261e' : '');
        const otrasKeysRow = Object.keys(r.movDivDia || {}).filter(k => ['USD', 'USDT', 'USD cara chica'].indexOf(k) < 0 && Math.abs(r.movDivDia[k] || 0) > 0.005);
        const otrasTexto = otrasKeysRow.map(k => money(r.movDivDia[k], k, 0));
        const usdVarDia = (r.movDivDia && r.movDivDia.USD || 0) + (r.movDivDia && r.movDivDia['USD cara chica'] || 0);
        const usdtVarDia = r.movDivDia && r.movDivDia.USDT || 0;
        return {
        fecha: dmy(r.fecha), movPesos: pesos(r.movPesos), movUsd: usd(r.movUsd),
        gastos: r.gastosHoy ? '−' + usd(r.gastosHoy) : usd(0), gastosStyle: pn(-r.gastosHoy),
        tc: '$' + nf(r.tc, 2),
        onTcClick: (e) => { e.stopPropagation(); this.openModal('cotiz'); this.setState(prev => ({ form: Object.assign({}, prev.form, { fecha: r.fecha }) })); },
        saldoPesos: (r.movPesosTotalDia >= 0 ? '+' : '') + pesos(r.movPesosTotalDia), saldoPesosStyle: pn(r.movPesosTotalDia),
        saldoUsd: (usdVarDia >= 0 ? '+' : '') + usd(usdVarDia), saldoUsdStyle: pn(usdVarDia),
        saldoUsdt: (usdtVarDia >= 0 ? '+' : '') + money(usdtVarDia, 'USDT', 0), saldoUsdtStyle: pn(usdtVarDia),
        hayOtras: otrasKeysRow.length > 0,
        otrasExpandido: s.cierreOtrasExpandido === r.fecha,
        otrasCaret: s.cierreOtrasExpandido === r.fecha ? '▾' : '▸',
        otrasResumen: otrasKeysRow.length ? otrasKeysRow.length + ' moneda' + (otrasKeysRow.length > 1 ? 's' : '') : '—',
        otrasTexto: otrasTexto.length ? otrasTexto.join(' · ') : '—',
        otrasTextoLista: otrasTexto,
        toggleOtras: (e) => { e.stopPropagation(); this.setState({ cierreOtrasExpandido: s.cierreOtrasExpandido === r.fecha ? null : r.fecha }); },
        ganOperativa: usd(r.ganOperativa), ganOperativaStyle: pn(r.ganOperativa),
        varTC: usd(r.varTC), varTCStyle: pn(r.varTC),
        resultadoStyle: 'font-weight:500;' + pn(r.resultadoTotal),
        resultado: usd(r.resultadoTotal),
        patValuado: (r.patValuadoVar >= 0 ? '+' : '') + usd(r.patValuadoVar), patValuadoStyle: pn(r.patValuadoVar),
        cerrado: r.cerrado, estado: r.cerrado ? 'Cerrado ✓' : 'Fijar cierre',
        congelado: r.congelado ? 'TC fijados' : '',
        estadoStyle: 'font-size:12px;white-space:nowrap;' + (r.cerrado ? 'background:var(--color-accent);color:var(--color-bg);border-color:var(--color-accent)' : 'background:transparent'),
        toggle: (e) => { e.stopPropagation(); this.setCierre(r.fecha, { cerrado: !r.cerrado }); },
        expandido: s.cierreExpandido === r.fecha,
        caret: s.cierreExpandido === r.fecha ? '▾' : '▸',
        toggleExpand: () => this.setState({ cierreExpandido: s.cierreExpandido === r.fecha ? null : r.fecha }),
        desglose: r.desglose.map(g => ({
          label: g.label, cant: String(g.cant),
          movPesos: (g.movPesos >= 0 ? '+' : '') + pesos(g.movPesos), movPesosStyle: pn(g.movPesos),
          movUsdD: ((g.divs.USD || 0) >= 0 ? '+' : '') + usd(g.divs.USD || 0), movUsdDStyle: pn(g.divs.USD || 0),
          movUsdtD: ((g.divs.USDT || 0) >= 0 ? '+' : '') + money(g.divs.USDT || 0, 'USDT', 0), movUsdtDStyle: pn(g.divs.USDT || 0),
          ir: g.tipo === 'ctacte'
            ? () => { this.navPush(); this.setState({ screen: 'ctacte', navOpen: false }); }
            : () => { this.navPush(); this.setState({ screen: 'ops', vista: 'lista', opTab: g.tipo, opVista: 'fecha', opFechaFiltro: r.fecha,
                opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null, navOpen: false }); }
        }))
      }; }),

      clientes: (() => {
        const tierMapCli = tierMapDe(d);
        return d.clientes.filter(c => !q || c.nombre.toLowerCase().includes(q)).map(c => {
          const ops = d.ops.filter(o => o.clienteId === c.id);
          const ult = ops.map(o => o.fecha).sort().slice(-1)[0];
          const st = tierMapCli[c.id];
          return { codigo: this.codigoCliente(c.numero), nombre: c.nombre, contacto: c.contacto || '—',
            cantOps: String(ops.length), ultima: ult ? dmy(ult) : '—',
            promedio: st ? pesos(st.prom) : '—', tier: st ? st.tier : '—',
            go: () => { this.navPush(); this.setState({ screen: 'clientes', vista: 'ficha', cliente: c.id }); },
            editar: (e) => { e.stopPropagation(); this.openModal('cliente', c); } };
        });
      })(),
      ficha: { nombre: cli.nombre, contacto: cli.contacto || '—', alta: dmy(cli.alta), obs: cli.obs || '—',
        editar: () => this.openModal('cliente', cli),
        cantOps: String(d.ops.filter(o => o.clienteId === cli.id).length), direcciones: cli.direcciones || [],
        ccSaldos: saldosDeCta(cta), sinSaldoCC: cta.monedas.length === 0,
        resumenSaldo: MON_COLS.map(mc => celdaSaldo(cta.porMon[mc.key] || 0)),
        antiguedad: cta.desde ? 'saldo más viejo sin cubrir: ' + dmy(cta.desde) + ' · ' + antigTxt(cta) : 'sin saldo pendiente',
        movs: filasResumen(cta), sinMovs: cta.movs.length === 0,
        nuevoMov: () => this.openModal('ctacte'),
        imprimir: () => window.print(),
        exportar: () => this.descargarCSV('cuenta-' + cli.nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv',
          [['Fecha', 'Concepto', 'Origen', 'Moneda', 'Monto', 'Saldo']].concat(
            cta.movs.map(m => { return [dmy(m.fecha), m.motivo || '', m.auto ? codigoDeOrigen(m) : 'manual', monedaTexto(m.moneda), nf(m.monto, 2), '']; }))) },
      fichaComisionista: { nombre: comSel.nombre, tipo: comSel.tipo || '—', pct: comSel.comisionPct ? nf(comSel.comisionPct, 2) + '%' : '—',
        contacto: comSel.contacto || '—', obs: comSel.obs && comSel.obs !== '—' ? comSel.obs : '—',
        nuevoMov: () => this.openModal('ctacte'),
        editar: () => this.openModal('comisionista', comSel),
        del: () => { if (window.confirm('¿Borrar este operador? Esta acción no se puede deshacer.')) { this.del('comisionistas', comSel.id); this.setState({ screen: 'comisionistas' }); } },
        ccSaldos: saldosDeCta(ctaCom), sinSaldoCC: ctaCom.monedas.length === 0,
        resumenSaldo: MON_COLS.map(mc => celdaSaldo(ctaCom.porMon[mc.key] || 0)),
        movs: filasResumen(ctaCom), sinMovs: ctaCom.movs.length === 0,
        exportar: () => this.descargarCSV('comisionista-' + comSel.nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv',
          [['Fecha', 'Concepto', 'Origen', 'Moneda', 'Monto']].concat(
            ctaCom.movs.map(m => [dmy(m.fecha), m.motivo || '', m.auto ? codigoDeOrigen(m) : 'manual', monedaTexto(m.moneda), nf(m.monto, 2)]))),
        imprimir: () => window.print() },
      opsMayorista: [].concat(
        (d.cables || []).filter(c => c.comisionistaId === comSel.id).map(c => ({
          _f: c.fecha, codigo: this.codigoOp('cables', c.numero), fecha: dmy(c.fecha), cliente: nombreDe(c.clienteId),
          moneda: (c.tipo === 'Subida' ? 'Subida' : 'Bajada') + ' · Cable USD',
          vendido: usd(Number(c.monto) || 0), comprado: '—', tc: '—',
          ok: c.cancelado ? 'Cancelado' : estadoCableLabel(c.estado),
          okStyle: badgeStyle(c.estado === 'cancelado', c.estado === 'ejecutado'),
          okToggle: (e) => { e.stopPropagation(); },
          goCliente: (e) => { e.preventDefault(); e.stopPropagation(); },
          abrir: () => this.setState({ screen: 'ops', opTab: 'cable', opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null, cableDetalle: c.id })
        })),
        (d.mayoristaOps || []).filter(o => o.comisionistaId === comSel.id).map(o => ({
          _f: o.fecha, codigo: this.codigoOp('mayoristaOps', o.numero), fecha: dmy(o.fecha), cliente: 'Tesorería (interno)',
          moneda: monedaLabel(o.monedaPago, o.monedaPagoOtra) + ' / ' + monedaLabel(o.moneda, o.monedaOtra),
          vendido: money((Number(o.cantidad) || 0) * (Number(o.tc) || 0), monedaSimbolo(o.monedaPago, o.monedaPagoOtra), 0),
          comprado: money(Number(o.cantidad) || 0, monedaSimbolo(o.moneda, o.monedaOtra), 0),
          tc: nf(this.tcVista(o.monedaPago || 'ARS', o.moneda || 'USD', Number(o.tc) || 0), this.tcDecimales(o.monedaPago || 'ARS', o.moneda || 'USD')),
          ok: o.ok === 'OK' ? ENTREGADO : cap(o.ok || 'pendiente'),
          okStyle: badgeStyle(o.ok === 'cancelado', o.ok && o.ok !== 'pendiente'),
          okToggle: (e) => { e.stopPropagation(); this.toggleOk('mayoristaOps', o.id); },
          goCliente: (e) => { e.preventDefault(); e.stopPropagation(); },
          abrir: () => this.setState({ screen: 'ops', opTab: 'mayorista', opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null, mayoristaOpDetalle: o.id })
        }))
      ).sort((a, b) => b._f.localeCompare(a._f)),
      sinOpsMayorista: (d.cables || []).filter(c => c.comisionistaId === comSel.id).length === 0 && (d.mayoristaOps || []).filter(o => o.comisionistaId === comSel.id).length === 0,
      opsCliente: [].concat(
        d.ops.filter(o => o.clienteId === cli.id).map(o => Object.assign({ _f: o.fecha }, filaOp(o, true))),
        (d.cripto || []).filter(o => o.clienteId === cli.id).map(o => ({
          _f: o.fecha, codigo: this.codigoOp('cripto', o.numero), fecha: dmy(o.fecha), cliente: nombreDe(o.clienteId),
          moneda: monedaLabel(o.monedaPago) + ' / ' + monedaLabel(o.moneda || 'USDT'),
          vendido: money((Number(o.cantidad) || 0) * (Number(o.tc) || 0), monedaSimbolo(o.monedaPago || 'ARS'), 0),
          comprado: money(Number(o.cantidad) || 0, monedaSimbolo(o.moneda || 'USDT'), 0),
          tc: nf(this.tcVista(o.monedaPago || 'ARS', o.moneda || 'USDT', Number(o.tc) || 0), this.tcDecimales(o.monedaPago || 'ARS', o.moneda || 'USDT')),
          ok: o.ok === 'OK' ? ENTREGADO : cap(o.ok || 'pendiente'),
          okStyle: badgeStyle(o.ok === 'cancelado', o.ok && o.ok !== 'pendiente'),
          okToggle: (e) => { e.stopPropagation(); this.toggleOk('cripto', o.id); },
          goCliente: (e) => { e.preventDefault(); e.stopPropagation(); },
          abrir: () => this.setState({ screen: 'ops', opTab: 'cripto', opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null, criptoOpDetalle: o.id })
        })),
        (d.cables || []).filter(c => c.clienteId === cli.id).map(c => ({
          _f: c.fecha, codigo: this.codigoOp('cables', c.numero), fecha: dmy(c.fecha), cliente: nombreDe(c.clienteId),
          moneda: (c.tipo === 'Subida' ? 'Subida' : 'Bajada') + ' · Cable USD',
          vendido: usd(Number(c.monto) || 0), comprado: '—', tc: '—',
          ok: c.cancelado ? 'Cancelado' : estadoCableLabel(c.estado),
          okStyle: badgeStyle(c.estado === 'cancelado', c.estado === 'ejecutado'),
          okToggle: (e) => { e.stopPropagation(); },
          goCliente: (e) => { e.preventDefault(); e.stopPropagation(); },
          abrir: () => this.setState({ screen: 'ops', opTab: 'cable', opFoco: null, criptoFoco: null, cableFoco: null, mayoristaFoco: null, cableDetalle: c.id })
        }))
      ).sort((a, b) => b._f.localeCompare(a._f)),

      gastos: gastosVis.map(g => ({
        fecha: dmy(g.fecha), motivo: g.motivo, socio: g.socio || '—', monto: pesos(g.monto) + (g.moneda === 'USD' ? ' (USD ' + nf(g.montoOriginal, 0) + ')' : ''), obs: g.obs || '—',
        editar: () => this.openModal('gasto', g), del: () => { if (window.confirm('¿Borrar este gasto? Esta acción no se puede deshacer.')) this.del('gastos', g.id); }
      })),
      gastoCols: GASTO_COLS.map(c => ({
        label: c.label,
        thStyle: 'white-space:nowrap' + (c.right ? ';text-align:right' : ''),
        filaStyle: 'display:flex;align-items:center;gap:6px' + (c.right ? ';justify-content:flex-end' : ''),
        flecha: gOrd.col === c.k ? (gOrd.dir === 'asc' ? '▲' : '▼') : '',
        ordenar: () => this.setState({ gasOrd: { col: c.k, dir: gOrd.col === c.k && gOrd.dir === 'asc' ? 'desc' : 'asc' } }),
        abrirFiltro: abrirPanel(c.k),
        filtroStyle: 'border:none;background:transparent;cursor:pointer;padding:0 2px;line-height:1;color:'
          + ((gExcl[c.k] || []).length ? '#b3261e' : 'var(--color-neutral-600)')
      })),
      filtroPanelAbierto: !!colAbierta,
      filtroPanelStyle: 'position:fixed;left:' + Math.max(8, Math.min(posFil.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250))
        + 'px;top:' + posFil.y + 'px;z-index:60;width:236px;background:var(--color-bg);border:1px solid var(--color-divider);padding:10px;display:flex;flex-direction:column;gap:7px;box-shadow:0 6px 20px rgba(0,0,0,0.12)',
      filtroPanelTitulo: colAbierta ? (GASTO_COLS.find(c => c.k === colAbierta) || {}).label : '',
      filtroBusca: s.gasFilBusca || '',
      onFiltroBusca: (e) => this.setState({ gasFilBusca: e.target.value }),
      filtroOpciones: colAbierta ? opcionesDe(colAbierta).filter(o => o.label.toLowerCase().indexOf(buscaFil) >= 0) : [],
      seleccionarTodos: () => this.setState({ gasFil: Object.assign({}, this.state.gasFil, { [colAbierta]: [] }) }),
      deseleccionarTodos: () => this.setState({ gasFil: Object.assign({}, this.state.gasFil, { [colAbierta]: opcionesDe(colAbierta).map(o => o.label) }) }),
      cerrarFiltro: () => this.setState({ gasFilAbierto: null, gasFilBusca: '' }),
      gastoChips: (gBarra ? [{
        label: (gBarra.tipo === 'dia' ? 'Día ' + dmy(gBarra.k) : 'Mes ' + gBarra.k),
        quitar: () => this.setState({ gasBarra: null }),
        abrir: () => {}
      }] : []).concat(GASTO_COLS.filter(c => (gExcl[c.k] || []).length).map(c => {
        const total = opcionesDe(c.k).length, fuera = (gExcl[c.k] || []).length;
        return {
          label: c.label + ': ' + Math.max(total - fuera, 0) + ' de ' + total,
          quitar: () => this.setState({ gasFil: Object.assign({}, this.state.gasFil, { [c.k]: [] }), gasFilAbierto: null }),
          abrir: abrirPanel(c.k)
        };
      })),
      hayChips: !!gBarra || GASTO_COLS.some(c => (gExcl[c.k] || []).length > 0),
      gastoFiltroBarra: gBarra ? (gBarra.tipo === 'dia' ? 'día ' + dmy(gBarra.k) : 'mes ' + gBarra.k) : '',
      hayFiltroBarra: !!gBarra,
      limpiarFiltroBarra: () => this.setState({ gasBarra: null }),
      gastosTotal: pesos(gastosVis.reduce((a, g) => a + (Number(g.monto) || 0), 0)),
      gastosCuenta: plural(gastosVis.length, 'gasto', 'gastos'),
      gastosPorSocio: Object.keys(d.gastos.reduce((acc, g) => { acc[g.socio || 'Sin asignar'] = 1; return acc; }, {})).map(soc => ({
        socio: soc,
        monto: pesos(d.gastos.filter(g => (g.socio || 'Sin asignar') === soc).reduce((a, g) => a + (Number(g.monto) || 0), 0))
      })),

      cotizDiarias: d.cotiz.slice().sort((a, b) => (b.fecha + b.momento).localeCompare(a.fecha + a.momento)).map(c => ({
        fecha: dmy(c.fecha), momento: c.momento, dc: 'ARS ' + nf(c.dc, 2), dv: 'ARS ' + nf(c.dv, 2),
        ec: c.ec ? nf(c.ec, 4) : '—', ev: c.ev ? nf(c.ev, 4) : '—',
        rc: c.rc ? nf(c.rc, 4) : '—', rv: c.rv ? nf(c.rv, 4) : '—',
        lc: c.lc ? nf(c.lc, 4) : '—', lv: c.lv ? nf(c.lv, 4) : '—',
        editar: () => this.openModal('cotiz', c), del: () => { if (window.confirm('¿Borrar esta cotización? Esta acción no se puede deshacer.')) this.del('cotiz', c.id); }
      })),

      sinClientes: (d.clientes || []).length === 0,
      sinCotizHist: (d.cotiz || []).length === 0,
      sinAportes: (d.aportes || []).length === 0,
      aportes: d.aportes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(a => ({
        socio: a.socio, fecha: dmy(a.fecha), moneda: a.moneda, monto: nf(a.monto, 0), concepto: a.concepto || '—',
        usd: usd(aportesUsd(a)),
        part: totalAportado ? nf((porSocio[a.socio] / totalAportado) * 100, 1) + '%' : '—',
        editar: () => this.openModal('aporte', a), del: () => { if (window.confirm('¿Borrar este aporte? Esta acción no se puede deshacer.')) this.del('aportes', a.id); }
      })),
      patrimonio: [
        { moneda: 'USD', inicial: usd(serie.cap.usd), hoy: usd(caja.usd) },
        { moneda: 'ARS', inicial: pesos(serie.cap.pesos), hoy: pesos(caja.pesos) },
        { moneda: 'USDT', inicial: money(serie.cap.usdt, 'USDT', 0), hoy: money(caja.usdt, 'USDT', 0) },
        { moneda: 'Euros', inicial: money(serie.cap.eur, 'EUR', 0), hoy: money(caja.eur, 'EUR', 0) },
        { moneda: 'Cuentas corrientes (neto)', inicial: usd(0), hoy: usd(ccNetoN) },
        // los gastos no se imputan al día: se restan del patrimonio de hoy
        { moneda: 'Gastos acumulados', inicial: usd(0), hoy: '−' + usd(gastosUsd) }
      ],
      pnInicial: usd(pnIniUsd), pnHoy: usd(pnHoyUsd + ccNetoN - gastosUsd), tcActual: nf(tcRef, 2),
      params: MARGEN_DEFS.map(p => {
        const raw = (s.draft && s.draft[p.k] !== undefined) ? s.draft[p.k] : nf(d.params[p.k], p.dec);
        const bad = !soloComa(raw);
        return {
          label: p.label, value: raw, pre: p.pre || '', post: p.post || '',
          tienePre: !!p.pre, tienePost: !!p.post,
          texto: (p.pre || '') + nf(d.params[p.k], p.dec) + (p.post || ''),
          cajaStyle: 'display:flex;align-items:center;gap:2px;border:1px solid ' + (bad ? '#b3261e' : 'var(--color-divider)') + ';padding:6px 8px;background:var(--color-surface, transparent)' + (bad ? ';color:#b3261e' : ''),
          onChange: (e) => this.setState({ draft: Object.assign({}, this.state.draft, { [p.k]: fmtNum(e.target.value) }) })
        };
      }),
      margenEdit: !!s.margenEdit,
      margenLock: !s.margenEdit,
      editarMargenes: () => this.setState({ margenEdit: true, draft: {}, margenErr: '' }),
      cancelarMargenes: () => this.setState({ margenEdit: false, draft: {}, margenErr: '' }),
      guardarMargenes: () => {
        const dr = this.state.draft || {};
        if (Object.keys(dr).some(k => !soloComa(dr[k]))) return this.setState({ margenErr: 'Solo números con coma decimal (ej. 2,50).' });
        this.setParams(dr);
        this.setState({ margenEdit: false, draft: {}, margenErr: '' });
      },
      margenErr: s.margenErr || '', hayMargenErr: !!s.margenErr,

      modalOpen: !!mf, modalNote: mf ? mf.note : '',
      esModalCotiz: s.modal === 'cotiz',
      esModalGenerico: !!mf && s.modal !== 'cotiz',
      esModalDirecciones: s.modal === 'cliente' || (s.modal === 'comisionista' && (s.form.tipo || TIPOS_COMISIONISTA[0]) === 'Mayorista'),
      mapsActivo: this.mapsActivo(),
      domiciliosForm: ((s.modal === 'cliente' || (s.modal === 'comisionista' && (s.form.tipo || TIPOS_COMISIONISTA[0]) === 'Mayorista')) ? (s.form.domicilios || []) : []).map((dm, i) => ({
        alias: dm.alias || '', calle: dm.calle || '', piso: dm.piso || '', obs: dm.obs || '',
        puedeQuitar: (s.form.domicilios || []).length > 1,
        onAlias: (e) => this.setDomicilio(i, 'alias', e.target.value),
        onCalle: (e) => this.setDomicilioTexto(i, e.target.value),
        onPiso: (e) => this.setDomicilio(i, 'piso', e.target.value),
        onObs: (e) => this.setDomicilio(i, 'obs', e.target.value),
        calleRef: this.addressRef((place) => this.setDomicilioPlace(i, place)),
        validado: !!dm.geo,
        sinValidar: this.mapsActivo() && !!(dm.calle || '').trim() && !dm.geo,
        quitar: () => this.quitarDomicilio(i)
      })),
      esModalOp: s.modal === 'op' || s.modal === 'cripto' || s.modal === 'mayorista',
      opLabelPago: opMonPago + ': vendemos',
      opLabelDivisa: opMonDivisa + ': compramos',
      liqOpciones: LIQ,
      agregarPartePago: () => this.agregarParte('partesPago'),
      agregarParteDivisa: () => this.agregarParte('partesDivisa'),
      liqOpcionesPago: s.form.monedaPago === 'USDT' ? [{ v: 'transferencia', l: 'Transferencia' }, { v: 'depósito', l: 'Depósito' }, { v: 'tarjeta de crédito', l: 'Tarjeta de Crédito' }, { v: 'cuenta corriente', l: 'Cuenta corriente' }] : LIQ,
      liqOpcionesDivisa: s.form.moneda === 'USDT' ? [{ v: 'transferencia', l: 'Transferencia' }, { v: 'depósito', l: 'Depósito' }, { v: 'tarjeta de crédito', l: 'Tarjeta de Crédito' }, { v: 'cuenta corriente', l: 'Cuenta corriente' }] : LIQ,
      opFormaPago: s.form.formaPago || 'efectivo',
      onOpFormaPago: (e) => this.setField('formaPago', e.target.value),
      opFormaRetiro: s.form.formaRetiro || 'efectivo',
      onOpFormaRetiro: (e) => this.setField('formaRetiro', e.target.value),
      opPagoCompletoMostrar: !s.form.dividirPartes,
      opPagoEstadoCompleto: (s.form.patasHechas || {}).hasOwnProperty('pago') ? ((s.form.patasHechas || {})['pago'] ? 'completado' : 'pendiente') : ((s.form.formaPago || 'efectivo') === 'cuenta corriente' ? 'completado' : 'pendiente'),
      onOpPagoEstadoCompleto: (e) => this.setFormPata('pago', e.target.value === 'completado'),
      opDivisaCompletoMostrar: !s.form.dividirPartes,
      opDivisaEstadoCompleto: (s.form.patasHechas || {}).hasOwnProperty('divisa') ? ((s.form.patasHechas || {})['divisa'] ? 'completado' : 'pendiente') : ((s.form.formaRetiro || 'efectivo') === 'cuenta corriente' ? 'completado' : 'pendiente'),
      onOpDivisaEstadoCompleto: (e) => this.setFormPata('divisa', e.target.value === 'completado'),
      opDividirPartes: !!s.form.dividirPartes, opNoDividirPartes: !s.form.dividirPartes,
      onOpDividirPartes: (e) => this.setField('dividirPartes', e.target.checked),
      partesFilas: partesFilas,
      pesosAsignado: moneyPago(asignadoPago), pesosTotalTxt: moneyPago(opTotalPesos),
      pesosRestanteTxt: Math.abs(asignadoPago - opTotalPesos) < 0.5 ? 'cierra exacto' : (asignadoPago < opTotalPesos ? 'falta ' + moneyPago(opTotalPesos - asignadoPago) : 'sobra ' + moneyPago(asignadoPago - opTotalPesos)),
      pesosRestanteStyle: Math.abs(asignadoPago - opTotalPesos) < 0.5 ? 'color:var(--color-neutral-700)' : 'color:#b3261e;font-weight:500',
      divisaAsignado: nf(asignadoDivisa, 0) + ' ' + opMonDivisa, divisaTotalTxt: nf(opTotalDivisa, 0) + ' ' + opMonDivisa,
      divisaRestanteTxt: Math.abs(asignadoDivisa - opTotalDivisa) < 0.01 ? 'cierra exacto' : (asignadoDivisa < opTotalDivisa ? 'falta ' + nf(opTotalDivisa - asignadoDivisa, 0) + ' ' + opMonDivisa : 'sobra ' + nf(asignadoDivisa - opTotalDivisa, 0) + ' ' + opMonDivisa),
      divisaRestanteStyle: Math.abs(asignadoDivisa - opTotalDivisa) < 0.01 ? 'color:var(--color-neutral-700)' : 'color:#b3261e;font-weight:500',
      opPagoEfec: pagoEfec,
      opPagoNoEfec: !pagoEfec,
      opDivisaEfec: divisaEfec,
      opDivisaNoEfec: !divisaEfec,
      opMuestraLugarFila: pagoEfec || divisaEfec,
      opDirs: opDirs,
      opLugarPago: s.form.lugarPago || 'retiro',
      onOpLugarPago: (e) => this.setField('lugarPago', e.target.value),
      opLugarDivisa: s.form.lugarDivisa || 'retiro',
      onOpLugarDivisa: (e) => this.setField('lugarDivisa', e.target.value),
      opPagoDom: pagoEfec && s.form.lugarPago === 'domicilio',
      opPagoNoDom: !(pagoEfec && s.form.lugarPago === 'domicilio'),
      opDivisaDom: divisaEfec && s.form.lugarDivisa === 'domicilio',
      opDivisaNoDom: !(divisaEfec && s.form.lugarDivisa === 'domicilio'),
      opMuestraDomFila: (pagoEfec && s.form.lugarPago === 'domicilio') || (divisaEfec && s.form.lugarDivisa === 'domicilio'),
      opAmbosDomicilio: pagoEfec && s.form.lugarPago === 'domicilio' && divisaEfec && s.form.lugarDivisa === 'domicilio',
      opDistintos: !!s.form.domiciliosDistintos,
      onOpDistintos: (e) => this.setField('domiciliosDistintos', e.target.checked),
      opDomDistintos: pagoEfec && s.form.lugarPago === 'domicilio' && divisaEfec && s.form.lugarDivisa === 'domicilio' && !!s.form.domiciliosDistintos,
      opDomAmbosCompartido: pagoEfec && s.form.lugarPago === 'domicilio' && divisaEfec && s.form.lugarDivisa === 'domicilio' && !s.form.domiciliosDistintos,
      opDomSoloPago: pagoEfec && s.form.lugarPago === 'domicilio' && !(divisaEfec && s.form.lugarDivisa === 'domicilio'),
      opDomSoloDivisa: divisaEfec && s.form.lugarDivisa === 'domicilio' && !(pagoEfec && s.form.lugarPago === 'domicilio'),
      opAliasNoDivisa: !(divisaEfec && s.form.lugarDivisa === 'domicilio' && !(pagoEfec && s.form.lugarPago === 'domicilio')),
      opDomicilio: s.form.domicilio || '',
      onOpDomicilio: (e) => this.setField('domicilio', e.target.value),
      opDomicilioStyle: errStyle('domicilio').replace('max-width:220px;', 'width:100%;'),
      opDomicilioPagoStyle: errStyle('domicilioPago'),
      opDomicilioDivisaStyle: errStyle('domicilioDivisa'),
      opAliasUnicoStyle: errStyle('nuevoDomicilioAlias'),
      opNuevoUnicoStyle: errStyle('nuevoDomicilio'),
      opAliasPagoStyle: errStyle('nuevoDomicilioPagoAlias'),
      opNuevoPagoStyle: errStyle('nuevoDomicilioPago'),
      opAliasDivisaStyle: errStyle('nuevoDomicilioDivisaAlias'),
      opNuevoDivisaStyle: errStyle('nuevoDomicilioDivisa'),
      opMuestraNuevaUnica: !(pagoEfec && s.form.lugarPago === 'domicilio' && divisaEfec && s.form.lugarDivisa === 'domicilio' && s.form.domiciliosDistintos) && s.form.domicilio === 'Nueva dirección…',
      opAliasUnico: s.form.nuevoDomicilioAlias || '',
      onOpAliasUnico: (e) => this.setField('nuevoDomicilioAlias', e.target.value),
      opNuevoUnico: s.form.nuevoDomicilio || '',
      onOpNuevoUnico: (e) => this.setField('nuevoDomicilio', e.target.value),
      opNuevoUnicoRef: this.addressRef((place) => this.setFieldPlace('nuevoDomicilio', place)),
      opNuevoUnicoValidado: !!s.form.nuevoDomicilioGeo,
      opNuevoUnicoSinValidar: this.mapsActivo() && !!(s.form.nuevoDomicilio || '').trim() && !s.form.nuevoDomicilioGeo,
      opNuevoUnicoPiso: s.form.nuevoDomicilioPiso || '', onOpNuevoUnicoPiso: (e) => this.setField('nuevoDomicilioPiso', e.target.value),
      opNuevoUnicoObs: s.form.nuevoDomicilioObs || '', onOpNuevoUnicoObs: (e) => this.setField('nuevoDomicilioObs', e.target.value),
      opDomicilioPago: s.form.domicilioPago || '',
      onOpDomicilioPago: (e) => this.setField('domicilioPago', e.target.value),
      opDomicilioDivisa: s.form.domicilioDivisa || '',
      onOpDomicilioDivisa: (e) => this.setField('domicilioDivisa', e.target.value),
      opPagoNueva: pagoEfec && s.form.lugarPago === 'domicilio' && s.form.domicilioPago === 'Nueva dirección…',
      opPagoNoNueva: !(pagoEfec && s.form.lugarPago === 'domicilio' && s.form.domicilioPago === 'Nueva dirección…'),
      opDivisaNueva: divisaEfec && s.form.lugarDivisa === 'domicilio' && s.form.domicilioDivisa === 'Nueva dirección…',
      opDivisaNoNueva: !(divisaEfec && s.form.lugarDivisa === 'domicilio' && s.form.domicilioDivisa === 'Nueva dirección…'),
      opMuestraNuevaFila: (pagoEfec && s.form.lugarPago === 'domicilio' && s.form.domicilioPago === 'Nueva dirección…')
        || (divisaEfec && s.form.lugarDivisa === 'domicilio' && s.form.domicilioDivisa === 'Nueva dirección…'),
      opAliasPago: s.form.nuevoDomicilioPagoAlias || '',
      onOpAliasPago: (e) => this.setField('nuevoDomicilioPagoAlias', e.target.value),
      opAliasDivisa: s.form.nuevoDomicilioDivisaAlias || '',
      onOpAliasDivisa: (e) => this.setField('nuevoDomicilioDivisaAlias', e.target.value),
      opNuevoPago: s.form.nuevoDomicilioPago || '',
      onOpNuevoPago: (e) => this.setField('nuevoDomicilioPago', e.target.value),
      opNuevoPagoRef: this.addressRef((place) => this.setFieldPlace('nuevoDomicilioPago', place)),
      opNuevoPagoValidado: !!s.form.nuevoDomicilioPagoGeo,
      opNuevoPagoSinValidar: this.mapsActivo() && !!(s.form.nuevoDomicilioPago || '').trim() && !s.form.nuevoDomicilioPagoGeo,
      opNuevoPagoPiso: s.form.nuevoDomicilioPagoPiso || '', onOpNuevoPagoPiso: (e) => this.setField('nuevoDomicilioPagoPiso', e.target.value),
      opNuevoPagoObs: s.form.nuevoDomicilioPagoObs || '', onOpNuevoPagoObs: (e) => this.setField('nuevoDomicilioPagoObs', e.target.value),
      opNuevoDivisa: s.form.nuevoDomicilioDivisa || '',
      onOpNuevoDivisa: (e) => this.setField('nuevoDomicilioDivisa', e.target.value),
      opNuevoDivisaRef: this.addressRef((place) => this.setFieldPlace('nuevoDomicilioDivisa', place)),
      opNuevoDivisaValidado: !!s.form.nuevoDomicilioDivisaGeo,
      opNuevoDivisaSinValidar: this.mapsActivo() && !!(s.form.nuevoDomicilioDivisa || '').trim() && !s.form.nuevoDomicilioDivisaGeo,
      opNuevoDivisaPiso: s.form.nuevoDomicilioDivisaPiso || '', onOpNuevoDivisaPiso: (e) => this.setField('nuevoDomicilioDivisaPiso', e.target.value),
      opNuevoDivisaObs: s.form.nuevoDomicilioDivisaObs || '', onOpNuevoDivisaObs: (e) => this.setField('nuevoDomicilioDivisaObs', e.target.value),
      modalErr: s.modalErr || '', hayModalErr: !!s.modalErr,
      hayModalErrGenerico: !!s.modalErr && s.modal !== 'cotiz',
      cotizFecha: formVis.fecha || today(),
      onCotizFecha: (e) => this.setState({ form: Object.assign({}, this.state.form, { fecha: e.target.value }) }),
      cotizMomento: formVis.momento || 'apertura',
      onCotizMomento: (e) => this.setState({ form: Object.assign({}, this.state.form, { momento: e.target.value }) }),
      momentos: ['apertura', 'cierre'],
      cotizFilas: (s.modal === 'cotiz' ? PARES.filter(p => !s.soloPar || s.soloPar === p.id) : []).map(p => {
        const ult = p.id === 'USD' ? this.ultimaCotiz(d) : (this.ultimaCotizPar(d, p.id) || {});
        const cel = (k) => {
          const raw = (s.form && s.form[k] !== undefined) ? s.form[k] : '';
          const bad = !soloComa(raw);
          return {
            value: raw, pre: p.pre || '', tienePre: !!p.pre,
            ref: 'último ' + (p.pre || '') + nf(Number(ult[k]) || 0, p.dec),
            cajaStyle: 'display:flex;align-items:center;gap:2px;border:1px solid ' + (bad ? '#b3261e' : 'var(--color-divider)') + ';padding:6px 8px' + (bad ? ';color:#b3261e' : ''),
            onChange: (e) => this.setState({ form: Object.assign({}, this.state.form, { [k]: fmtNum(e.target.value) }), modalErr: '' })
          };
        };
        return { par: p.par, c: cel(p.kc), v: cel(p.kv) };
      }),
      modalTitle: mf ? (s.soloPar ? 'Cotización · ' + (PARES.find(p => p.id === s.soloPar) || {}).par : (s.editId ? mf.title.replace(/^(Nuevo|Nueva|Movimiento de)\s+/, 'Editar ') : mf.title)) : '',
      saveLabel: s.guardando ? 'Guardando…' : (s.editId ? 'Guardar cambios' : 'Guardar'),
      hayErrores: (s.errors || []).length > 0,
      erroresTexto: (s.errors || []).map(k => OP_LABELS[k] || (mf ? (mf.fields.find(x => x.k === k) || {}).label : '') || k).join(' · '),
      modalFields: mf ? mf.fields.map(f => {
        const err = (s.errors || []).indexOf(f.k) >= 0;
        return {
          label: f.label, ph: f.ph || '', hint: f.hint || '',
          cellStyle: { gridColumn: s.isMobile ? '1 / -1' : ((f.br ? '1 / span ' : 'span ') + (f.span || 2)) },
          labelStyle: Object.assign({}, err ? { color: '#b3261e' } : {}, f.type === 'checkbox' ? { display: 'none' } : {}),
          inputStyle: err ? { borderColor: '#b3261e', boxShadow: 'inset 0 0 0 1px #b3261e' } : {},
          isSelect: !!f.select, isText: !f.select, type: f.type || 'text',
          isCheckbox: f.type === 'checkbox',
          checked: !!formVis[f.k], onToggle: (e) => this.setField(f.k, e.target.checked),
          isTextPlain: !f.select && !f.pre && !f.post && f.type !== 'checkbox', isTextBox: !f.select && (!!f.pre || !!f.post),
          tienePre: !!f.pre, pre: f.pre || '', tienePost: !!f.post, post: f.post || '',
          disabled: !!f.disabled,
          cajaStyle: f.disabled
            ? 'display:flex;align-items:center;gap:2px;border:1px solid var(--color-divider);padding:6px 8px;background:var(--color-neutral-100);color:var(--color-neutral-600)'
            : ('display:flex;align-items:center;gap:2px;border:1px solid '
              + ((err || (f.soloNum && !soloComa(formVis[f.k]))) ? '#b3261e' : 'var(--color-divider)')
              + ';padding:6px 8px' + ((f.soloNum && !soloComa(formVis[f.k])) ? ';color:#b3261e' : '')),
          options: (f.select || []).map(v => (v && typeof v === 'object') ? v : { v: v, l: (f.optLabels && f.optLabels[v]) || v }), value: formVis[f.k] === undefined ? '' : formVis[f.k],
          onChange: (e) => this.setField(f.k, e.target.value),
          addressRef: f.k === 'nuevoDomicilio' ? this.addressRef((place) => this.setFieldPlace('nuevoDomicilio', place)) : null,
          mapsValidado: f.k === 'nuevoDomicilio' && !!s.form.nuevoDomicilioGeo,
          mapsSinValidar: f.k === 'nuevoDomicilio' && this.mapsActivo() && !!(s.form.nuevoDomicilio || '').trim() && !s.form.nuevoDomicilioGeo
        };
      }) : [],
      esModalCable: s.modal === 'cable',
      cableFormaMayorista: s.form.formaMayorista || 'cuenta corriente', onCableFormaMayorista: (e) => this.setField('formaMayorista', e.target.value),
      cableFormaCliente: s.form.formaCliente || 'cuenta corriente', onCableFormaCliente: (e) => this.setField('formaCliente', e.target.value),
      cableMayoristaCompletoMostrar: !s.form.dividirPartesCable,
      cableMayoristaEstadoCompleto: (s.form.patasHechas || {}).hasOwnProperty('mayorista') ? ((s.form.patasHechas || {})['mayorista'] ? 'completado' : 'pendiente') : ((s.form.formaMayorista || 'cuenta corriente') === 'cuenta corriente' ? 'completado' : 'pendiente'),
      onCableMayoristaEstadoCompleto: (e) => this.setFormPata('mayorista', e.target.value === 'completado'),
      cableClienteCompletoMostrar: !s.form.dividirPartesCable,
      cableClienteEstadoCompleto: (s.form.patasHechas || {}).hasOwnProperty('cliente') ? ((s.form.patasHechas || {})['cliente'] ? 'completado' : 'pendiente') : ((s.form.formaCliente || 'cuenta corriente') === 'cuenta corriente' ? 'completado' : 'pendiente'),
      onCableClienteEstadoCompleto: (e) => this.setFormPata('cliente', e.target.value === 'completado'),
      cableClienteEfectivo: s.form.formaCliente === 'efectivo' && !s.form.dividirPartesCable,
      cableClienteNoEfectivo: !(s.form.formaCliente === 'efectivo' && !s.form.dividirPartesCable),
      cableLugarCliente: s.form.lugarCliente || 'retiro', onCableLugarCliente: (e) => this.setField('lugarCliente', e.target.value),
      cableClienteDom: s.form.formaCliente === 'efectivo' && s.form.lugarCliente === 'domicilio' && !s.form.dividirPartesCable,
      cableDomicilioCliente: s.form.domicilioCliente || '', onCableDomicilioCliente: (e) => this.setField('domicilioCliente', e.target.value),
      cableDomEsNueva: s.form.formaCliente === 'efectivo' && s.form.lugarCliente === 'domicilio' && !s.form.dividirPartesCable && s.form.domicilioCliente === 'Nueva dirección…',
      cableNuevoDomAlias: s.form.nuevoDomicilioClienteAlias || '', onCableNuevoDomAlias: (e) => this.setField('nuevoDomicilioClienteAlias', e.target.value),
      cableNuevoDom: s.form.nuevoDomicilioCliente || '', onCableNuevoDom: (e) => this.setField('nuevoDomicilioCliente', e.target.value),
      cableNuevoDomRef: this.addressRef((place) => this.setFieldPlace('nuevoDomicilioCliente', place)),
      cableNuevoDomValidado: !!s.form.nuevoDomicilioClienteGeo,
      cableNuevoDomSinValidar: this.mapsActivo() && !!(s.form.nuevoDomicilioCliente || '').trim() && !s.form.nuevoDomicilioClienteGeo,
      cableNuevoDomPiso: s.form.nuevoDomicilioClientePiso || '', onCableNuevoDomPiso: (e) => this.setField('nuevoDomicilioClientePiso', e.target.value),
      cableNuevoDomObs: s.form.nuevoDomicilioClienteObs || '', onCableNuevoDomObs: (e) => this.setField('nuevoDomicilioClienteObs', e.target.value),
      comDirs: comDirs,
      cableMayoristaEfectivo: s.form.formaMayorista === 'efectivo' && !s.form.dividirPartesCable,
      cableMayoristaNoEfectivo: !(s.form.formaMayorista === 'efectivo' && !s.form.dividirPartesCable),
      cableMuestraLugarFila: (s.form.formaMayorista === 'efectivo' || s.form.formaCliente === 'efectivo') && !s.form.dividirPartesCable,
      cableLugarMayorista: s.form.lugarMayorista || 'retiro', onCableLugarMayorista: (e) => this.setField('lugarMayorista', e.target.value),
      cableMayoristaDom: s.form.formaMayorista === 'efectivo' && s.form.lugarMayorista === 'domicilio' && !s.form.dividirPartesCable,
      cableDomicilioMayorista: s.form.domicilioMayorista || '', onCableDomicilioMayorista: (e) => this.setField('domicilioMayorista', e.target.value),
      cableMayDomEsNueva: s.form.formaMayorista === 'efectivo' && s.form.lugarMayorista === 'domicilio' && !s.form.dividirPartesCable && s.form.domicilioMayorista === 'Nueva dirección…',
      cableNuevoDomMayAlias: s.form.nuevoDomicilioMayoristaAlias || '', onCableNuevoDomMayAlias: (e) => this.setField('nuevoDomicilioMayoristaAlias', e.target.value),
      cableNuevoDomMay: s.form.nuevoDomicilioMayorista || '', onCableNuevoDomMay: (e) => this.setField('nuevoDomicilioMayorista', e.target.value),
      cableNuevoDomMayRef: this.addressRef((place) => this.setFieldPlace('nuevoDomicilioMayorista', place)),
      cableNuevoDomMayValidado: !!s.form.nuevoDomicilioMayoristaGeo,
      cableNuevoDomMaySinValidar: this.mapsActivo() && !!(s.form.nuevoDomicilioMayorista || '').trim() && !s.form.nuevoDomicilioMayoristaGeo,
      cableNuevoDomMayPiso: s.form.nuevoDomicilioMayoristaPiso || '', onCableNuevoDomMayPiso: (e) => this.setField('nuevoDomicilioMayoristaPiso', e.target.value),
      cableNuevoDomMayObs: s.form.nuevoDomicilioMayoristaObs || '', onCableNuevoDomMayObs: (e) => this.setField('nuevoDomicilioMayoristaObs', e.target.value),
      cableDividirPartes: !!s.form.dividirPartesCable, onCableDividirPartes: (e) => this.setField('dividirPartesCable', e.target.checked),
      cableNoDividir: !s.form.dividirPartesCable,
      liqOpcionesMayorista: liqOpcionesMayorista, liqOpcionesCliente: LIQ,
      agregarParteMayorista: () => this.agregarParte('partesMayorista'),
      agregarParteCliente: () => this.agregarParte('partesCliente'),
      cablePartesFilas: cablePartesFilas,
      cableMayoristaAsignado: usd(asignadoMayorista), cableMayoristaTotalTxt: usd(cableDebeMayoristaTotal),
      cableClienteAsignado: usd(asignadoCliente), cableClienteTotalTxt: usd(cableDebemosClienteTotal),
      modalCalc: s.modal === 'cable',
      modalCalcRows: (() => {
        const esSubida = (s.form.tipo || 'Bajada') === 'Subida';
        const mC = parseNum(s.form.monto), costoC = parseNum(s.form.costoPct), margenC = parseNum(s.form.margenPct);
        if (esSubida) {
          const debemosMay = mC * (1 + costoC / 100), nosDaCliente = mC * (1 + margenC / 100 + Math.max(costoC, 0) / 100);
          return [
            { label: 'Le damos al mayorista', value: usd(debemosMay), style: '' },
            { label: 'El cliente nos entrega', value: usd(nosDaCliente), style: '' },
            { label: 'Margen', value: usd(nosDaCliente - debemosMay), style: (nosDaCliente - debemosMay) < 0 ? 'color:#b3261e' : '' }
          ];
        }
        const debeMay = mC * (1 - costoC / 100), debemosCli = mC * (1 - margenC / 100 - Math.max(costoC, 0) / 100);
        return [
          { label: 'El mayorista nos debe', value: usd(debeMay), style: '' },
          { label: 'Le debemos al cliente', value: usd(debemosCli), style: '' },
          { label: 'Margen', value: usd(debeMay - debemosCli), style: (debeMay - debemosCli) < 0 ? 'color:#b3261e' : '' }
        ];
      })(),
      closeModal: () => this.closeModalNow(),
      onBackdropClick: (e) => { if (e.target === e.currentTarget) this.closeModalNow(); },
      saveModal: () => this.guardarConEstado(),
      guardando: !!s.guardando,
      offline: s.online === false
    };
  }
}


// ── Referencia dorada: los cálculos del PROTOTIPO con sus propios datos ──────
const inst = new Component({});
const d = inst.state.data;
const seguro = (fn) => { try { return fn(); } catch (e) { return { __error: String((e && e.message) || e) }; } };

const ref = {
  _meta: { generado: new Date().toISOString(), origen: 'ERP Financiera.dc.html' },
  datos: d,
  capital:        seguro(() => inst.capital(d)),
  serie:          seguro(() => inst.serie(d)),
  movimientosCC:  seguro(() => inst.movimientosCC(d)),
};
try { const s = ref.serie; if (Array.isArray(s) && s.length) {
  const ult = s[s.length-1];
  ref.cuentas = seguro(() => inst.cuentas(d, ult.tc || 1));
} } catch(e) {}
console.log(JSON.stringify(ref, null, 1));
