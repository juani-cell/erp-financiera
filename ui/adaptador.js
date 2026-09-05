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

  // ── El indicador de estado ────────────────────────────────────────────────
  // Con `localStorage` guardar no falla NUNCA, así que el prototipo no necesita
  // decir nada. Contra un servidor sí puede fallar, y lo que no se puede es que
  // alguien cierre la pantalla creyendo que guardó. Por eso el indicador es
  // PERMANENTE mientras haya algo sin confirmar: no es un cartel que pasa, es
  // un estado que se queda hasta que el servidor diga que sí.
  var chapa, detalle, estadoActual = null, mensajeActual = '';
  var ESTILOS = {
    guardando: { fondo: '#4a6fa5', texto: '#fff', icono: '⟳', label: 'Guardando…' },
    sinGuardar:{ fondo: '#a86b1e', texto: '#fff', icono: '●', label: 'SIN GUARDAR' },
    guardado:  { fondo: '#1e7d3a', texto: '#fff', icono: '✓', label: 'Guardado' },
    error:     { fondo: '#b3261e', texto: '#fff', icono: '⚠', label: 'NO SE GUARDÓ' }
  };
  var ocultarLuego;

  function mostrar(estado, texto) {
    if (!chapa) {
      chapa = document.createElement('div');
      chapa.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:420px;' +
        'padding:10px 14px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.22);' +
        'font:600 13px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;cursor:default';
      detalle = document.createElement('div');
      detalle.style.cssText = 'font-weight:400;margin-top:5px;font-size:12px;opacity:.95';
      chapa.appendChild(document.createElement('span'));
      chapa.appendChild(detalle);
      (document.body || document.documentElement).appendChild(chapa);
    }
    estadoActual = estado; mensajeActual = texto || '';
    var e = ESTILOS[estado];
    chapa.style.background = e.fondo;
    chapa.style.color = e.texto;
    chapa.firstChild.textContent = e.icono + '  ' + e.label;
    detalle.textContent = texto || '';
    detalle.style.display = texto ? 'block' : 'none';
    chapa.style.display = 'block';

    clearTimeout(ocultarLuego);
    // "Guardado" es lo único que se va solo. Todo lo demás se queda: si hay algo
    // sin confirmar, tiene que seguir a la vista.
    if (estado === 'guardado') {
      ocultarLuego = setTimeout(function () { chapa.style.display = 'none'; }, 2000);
    }
  }

  // ── Guardado ──────────────────────────────────────────────────────────────
  var pendiente = null;      // el documento que falta confirmar
  var enVuelo = false;
  var reintentos = 0;
  var temporizador, temporizadorReintento;

  function mandar() {
    if (enVuelo || pendiente === null) return;
    // ⚠️ El documento NO se descarta acá. Una versión anterior hacía
    // `doc = pendiente; pendiente = null;` y si el guardado fallaba ese cambio
    // se perdía para siempre, sin reintento y sin más rastro que un cartel.
    var doc = pendiente;
    enVuelo = true;
    mostrar('guardando');
    fetch('/estado', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ version: version, documento: doc })
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
              .then(function (cuerpo) { return { ok: r.ok, estado: r.status, cuerpo: cuerpo }; });
    }).then(function (res) {
      enVuelo = false;

      if (res.ok) {
        version = res.cuerpo.version;
        reintentos = 0;
        // Sólo ahora se da por confirmado, y sólo si nadie escribió encima
        // mientras viajaba.
        if (pendiente === doc) { pendiente = null; mostrar('guardado'); }
        else { mandar(); }
        return;
      }

      if (res.estado === 401) {
        mostrar('error', 'Se cerró la sesión. Volvé a entrar; tus cambios siguen acá hasta que lo hagas.');
        return;
      }

      var motivo = (res.cuerpo && res.cuerpo.detail && res.cuerpo.detail.motivo) ||
                   (res.cuerpo && res.cuerpo.detail) || 'el servidor rechazó el guardado';

      // Un conflicto de versión NO se reintenta pisando: la única salida
      // correcta es recargar y que la persona vea lo que hizo la otra.
      if (res.estado === 409 && /guard/i.test(String(motivo))) {
        mostrar('error', 'Otra persona guardó cambios. Recargando para no pisarlos…');
        setTimeout(function () { location.reload(); }, 2800);
        return;
      }

      // Rechazo por una REGLA (día cerrado, sólo lectura). Reintentar no sirve:
      // el servidor va a decir lo mismo. El cambio se queda a la vista para que
      // la persona lo deshaga o lo corrija, y no se pierde en silencio.
      mostrar('error', motivo + '  ·  El cambio NO se guardó y sigue en pantalla: corregilo o recargá para descartarlo.');
    }).catch(function (e) {
      // Falla de RED, que sí conviene reintentar sola: la conexión de una
      // oficina se cae y vuelve, y no tiene sentido perder trabajo por eso.
      enVuelo = false;
      reintentos++;
      var espera = Math.min(30000, 1000 * Math.pow(2, reintentos));
      mostrar('error', 'Sin conexión con el servidor (' + e.message + '). ' +
              'Reintentando en ' + Math.round(espera / 1000) + ' s. No cierres esta pantalla.');
      clearTimeout(temporizadorReintento);
      temporizadorReintento = setTimeout(mandar, espera);
    });
  }

  // ── El almacén falso ──────────────────────────────────────────────────────
  var falso = {
    getItem: function (k) { return k in almacen ? almacen[k] : null; },
    setItem: function (k, v) {
      almacen[k] = String(v);
      if (k !== CLAVE_DATOS) return;          // la sesión la maneja el servidor
      try { pendiente = JSON.parse(v); } catch (e) { return; }
      mostrar('sinGuardar');
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

  // Un cambio sin confirmar no se pierde por cerrar la pestaña sin mirar.
  window.addEventListener('beforeunload', function (e) {
    if (pendiente !== null || enVuelo) {
      clearTimeout(temporizador); mandar();
      e.preventDefault(); e.returnValue = '';
      return '';
    }
  });

  // Para poder afirmar en una prueba si hay algo sin confirmar, sin adivinar
  // mirando pixeles.
  window.__erpEstadoGuardado = function () {
    return { pendiente: pendiente !== null, enVuelo: enVuelo, version: version,
             visible: !!chapa && chapa.style.display !== 'none',
             estado: estadoActual, mensaje: mensajeActual,
             leyenda: chapa ? chapa.textContent : null };
  };
})();
