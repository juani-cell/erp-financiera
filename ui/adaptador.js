// ════════════════════════════════════════════════════════════════════════════
// Adaptador: la UI de Agus, con nuestra base por debajo.
//
// El archivo del prototipo NO se toca. Este script se inyecta al servirlo, así
// las mejoras que Agus le siga haciendo entran reemplazando el archivo, sin
// conflictos y sin volver a aplicar parches a mano.
//
// El enganche es `localStorage`, no el código de la app. La app guarda TODO su
// estado en un solo documento y lo toca en exactamente dos momentos: lo lee
// entero al arrancar y lo escribe entero en cada cambio. Reemplazando el
// almacén, la app sigue creyendo que guarda en el navegador y en realidad habla
// con la API, sin enterarse de que existimos.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var CLAVE_DATOS  = 'erpfinanciera.fase1.v2';
  var CLAVE_SESION = 'erpfinanciera.sesion.v1';

  var inicial = window.__ERP_ESTADO__ || {};
  var version = inicial.version || 0;

  // El estado viene INCRUSTADO por el servidor, no se busca con fetch. La app
  // lee el almacén de forma sincrónica en su constructor, así que si tuviera que
  // esperar una respuesta arrancaría vacía y después pisaría todo al guardar.
  var almacen = {};
  almacen[CLAVE_DATOS] = JSON.stringify(inicial.documento || {});
  almacen[CLAVE_SESION] = JSON.stringify(inicial.sesion || null);

  // ── Aviso al usuario ──────────────────────────────────────────────────────
  // Con `localStorage` guardar no falla nunca. Contra un servidor SÍ puede
  // fallar: otra persona guardó primero, o se tocó un día cerrado. Un guardado
  // que falla en silencio es la peor forma de perder trabajo, así que se ve.
  var barra;
  function avisar(texto, tipo) {
    if (!barra) {
      barra = document.createElement('div');
      barra.style.cssText =
        'position:fixed;left:0;right:0;top:0;z-index:99999;padding:10px 16px;' +
        'font:600 13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;' +
        'text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.15)';
      document.body.appendChild(barra);
    }
    barra.textContent = texto;
    barra.style.background = tipo === 'error' ? '#b3261e' : '#1e7d3a';
    barra.style.color = '#fff';
    barra.style.display = 'block';
    if (tipo !== 'error') setTimeout(function () { barra.style.display = 'none'; }, 1800);
  }

  // ── Guardado ──────────────────────────────────────────────────────────────
  var pendiente = null, enVuelo = false, temporizador = null;

  function mandar() {
    if (enVuelo || pendiente === null) return;
    var doc = pendiente; pendiente = null; enVuelo = true;
    fetch('/estado', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ version: version, documento: doc })
    }).then(function (r) {
      return r.json().then(function (cuerpo) { return { ok: r.ok, estado: r.status, cuerpo: cuerpo }; });
    }).then(function (res) {
      enVuelo = false;
      if (res.ok) {
        version = res.cuerpo.version;
        avisar('Guardado', 'ok');
        if (pendiente !== null) mandar();
        return;
      }
      if (res.estado === 401) {
        avisar('Se cerró la sesión. Volvé a entrar.', 'error');
        setTimeout(function () { location.href = '/'; }, 2000);
        return;
      }
      var motivo = (res.cuerpo && res.cuerpo.detail && res.cuerpo.detail.motivo) ||
                   (res.cuerpo && res.cuerpo.detail) || 'no se pudo guardar';
      // Un conflicto de versión NO se reintenta pisando: la única salida
      // correcta es recargar y que la persona vea lo que hizo la otra.
      if (res.estado === 409 && /guard/i.test(String(motivo))) {
        avisar('Otra persona guardó cambios. Recargando para no pisarlos…', 'error');
        setTimeout(function () { location.reload(); }, 2500);
        return;
      }
      avisar('NO SE GUARDÓ: ' + motivo, 'error');
    }).catch(function (e) {
      enVuelo = false;
      avisar('NO SE GUARDÓ (sin conexión con el servidor): ' + e.message, 'error');
    });
  }

  // ── El almacén falso ──────────────────────────────────────────────────────
  var falso = {
    getItem: function (k) { return k in almacen ? almacen[k] : null; },
    setItem: function (k, v) {
      almacen[k] = String(v);
      if (k !== CLAVE_DATOS) return;          // la sesión la maneja el servidor
      try { pendiente = JSON.parse(v); } catch (e) { return; }
      // Se agrupan los cambios seguidos: la app guarda en cada tecla y no tiene
      // sentido mandar el documento entero por cada una.
      clearTimeout(temporizador);
      temporizador = setTimeout(mandar, 400);
    },
    removeItem: function (k) {
      delete almacen[k];
      if (k === CLAVE_SESION) {               // la app cerró sesión
        fetch('/sesion', { method: 'DELETE', credentials: 'same-origin' })
          .then(function () { location.href = '/'; });
      }
    },
    clear: function () { almacen = {}; },
    key: function (i) { return Object.keys(almacen)[i] || null; },
    get length() { return Object.keys(almacen).length; }
  };

  try {
    Object.defineProperty(window, 'localStorage', { value: falso, configurable: true });
  } catch (e) {
    window.localStorage = falso;
  }

  // Un cambio sin guardar no se pierde por cerrar la pestaña sin avisar.
  window.addEventListener('beforeunload', function (e) {
    if (pendiente !== null || enVuelo) {
      clearTimeout(temporizador); mandar();
      e.preventDefault(); e.returnValue = '';
      return '';
    }
  });
})();
