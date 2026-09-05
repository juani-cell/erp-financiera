// ════════════════════════════════════════════════════════════════════════════
// El adaptador, sin navegador.
//
// Existe por un bug concreto: la primera versión hacía
//     var doc = pendiente; pendiente = null;
// o sea que descartaba el cambio APENAS lo mandaba. Si el guardado fallaba, ese
// cambio se perdía para siempre, sin reintento, y el único rastro era un cartel
// que además se desvanecía. En una financiera eso es trabajo perdido en silencio.
//
// Las tres conductas que se exigen acá son las tres formas en que un guardado
// termina, y cada una necesita algo distinto:
//   · sale bien           → confirma y el indicador se apaga solo
//   · lo rechaza una REGLA → no se reintenta (el servidor va a decir lo mismo),
//                            pero el cambio NO se pierde y el aviso SE QUEDA
//   · se cae la RED        → se reintenta solo, y se recupera sin que nadie haga
//                            nada
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const resultados = [];
function check(nombre, ok, detalle) {
  resultados.push([nombre, ok]);
  console.log(`  ${ok ? '✅' : '🔴'} ${nombre}${!ok && detalle ? '  → ' + detalle : ''}`);
}

function montar(respuesta) {
  // DOM mínimo: sólo lo que el adaptador toca.
  const nodo = () => ({
    style: {}, children: [], firstChild: null, textContent: '',
    appendChild(h) { this.children.push(h); if (!this.firstChild) this.firstChild = h; return h; },
  });
  const cuerpo = nodo();
  global.document = { body: cuerpo, documentElement: cuerpo, createElement: nodo };
  const oyentes = {};
  global.window = {
    __ERP_ESTADO__: { version: 7, documento: { ops: [] }, sesion: { usuario: 'x' } },
    addEventListener: (e, f) => { oyentes[e] = f; },
  };
  global.location = { href: '', reload: () => {} };
  const llamadas = [];
  global.fetch = (url, opciones) => { llamadas.push({ url, opciones }); return respuesta(); };
  global.setTimeout = setTimeout;
  global.clearTimeout = clearTimeout;

  const codigo = fs.readFileSync(path.join(__dirname, '..', 'ui', 'adaptador.js'), 'utf8');
  new Function('window', 'document', 'fetch', 'location', codigo)(
    global.window, global.document, global.fetch, global.location);
  return { llamadas, estado: () => global.window.__erpEstadoGuardado(),
           guardar: (doc) => global.window.localStorage.setItem(
             'erpfinanciera.fase1.v2', JSON.stringify(doc)) };
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('='.repeat(72));
  console.log('EL ADAPTADOR · las tres formas en que termina un guardado');
  console.log('='.repeat(72));

  // ── 1 · sale bien ─────────────────────────────────────────────────────────
  let a = montar(() => Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve({ version: 8 }) }));
  a.guardar({ ops: [1] });
  check('al cambiar algo queda PENDIENTE al instante', a.estado().pendiente);
  check('y el indicador se ve', a.estado().visible);
  await esperar(900);
  check('cuando sale bien, deja de estar pendiente', !a.estado().pendiente);
  check('y toma la versión nueva del servidor', a.estado().version === 8,
        'versión ' + a.estado().version);
  await esperar(2400);
  check('el verde se apaga solo', !a.estado().visible);

  // ── 2 · lo rechaza una regla ──────────────────────────────────────────────
  a = montar(() => Promise.resolve({
    ok: false, status: 409,
    json: () => Promise.resolve({ detail: { motivo: 'El 10/08/2026 está cerrado' } }) }));
  a.guardar({ ops: [2] });
  await esperar(900);
  check('🔑 si una REGLA lo rechaza, el cambio NO se pierde', a.estado().pendiente);
  check('el aviso SE QUEDA a la vista', a.estado().visible);
  check('y dice el motivo que devolvió la base',
        /10\/08\/2026 está cerrado/.test(a.estado().mensaje || ''), a.estado().mensaje);
  const llamadasAntes = a.llamadas.length;
  await esperar(2500);
  check('no lo reintenta al pedo (el servidor diría lo mismo)',
        a.llamadas.length === llamadasAntes, a.llamadas.length + ' llamadas');
  check('y el aviso sigue ahí después de esperar', a.estado().visible);

  // ── 3 · se cae la red ─────────────────────────────────────────────────────
  let caida = true;
  a = montar(() => caida
    ? Promise.reject(new Error('Failed to fetch'))
    : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ version: 9 }) }));
  a.guardar({ ops: [3] });
  await esperar(900);
  check('con la red caída, el cambio sigue pendiente', a.estado().pendiente);
  check('y avisa que va a reintentar',
        /Reintentando/.test(a.estado().mensaje || ''), a.estado().mensaje);
  caida = false;                       // vuelve la red
  await esperar(3500);
  check('🔑 cuando vuelve la red se guarda SOLO', !a.estado().pendiente);
  check('con la versión del servidor', a.estado().version === 9, 'versión ' + a.estado().version);

  const mal = resultados.filter(([, ok]) => !ok);
  console.log();
  console.log('='.repeat(72));
  if (mal.length) {
    console.log(`🔴 ${mal.length} de ${resultados.length} fallaron`);
    process.exit(1);
  }
  console.log(`✅ LAS ${resultados.length} PRUEBAS DEL ADAPTADOR PASAN`);
  console.log('='.repeat(72));
})();
