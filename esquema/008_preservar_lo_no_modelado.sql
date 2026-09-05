-- ════════════════════════════════════════════════════════════════════════════
-- Modelar lo que necesitamos, PRESERVAR lo que no
--
-- El documento que la UI manda no es el que le dimos: `migrar()` lo normaliza al
-- cargar (da vuelta operaciones cargadas al revés, agrega marcas suyas como
-- `_patasFijas`, completa campos). Si nuestro mapeo pierde alguno de esos
-- campos, cada carga produce un diff FANTASMA contra lo guardado, y basta que
-- ese diff roce una fila de un día cerrado para que el disparador bloquee
-- CUALQUIER guardado. Pasó en la primera prueba real con el navegador: agregar
-- un cliente fallaba con "el 10/08 está cerrado".
--
-- Medido: 41 campos se perdían. Perseguirlos de a uno no sirve, porque Agus va a
-- agregar otros. La columna `extra` guarda todo lo que no modelamos, tal cual
-- vino, y se devuelve tal cual.
--
-- Las columnas siguen existiendo para lo que la BASE tiene que entender: fechas
-- para el día cerrado, montos y monedas para consultar, patas para las reglas.
-- `extra` es para fidelidad, no para lógica: nada del sistema lee adentro.
-- ════════════════════════════════════════════════════════════════════════════
alter table titular       add column extra jsonb;
alter table operacion     add column extra jsonb;
alter table cable         add column extra jsonb;
alter table movimiento_cc add column extra jsonb;
alter table gasto         add column extra jsonb;
alter table aporte        add column extra jsonb;
alter table cotizacion    add column extra jsonb;

comment on column operacion.extra is
  'Campos del documento del prototipo que no modelamos, guardados tal cual para '
  'que la ida y vuelta sea exacta. NADA del sistema lee adentro: si un dato de '
  'acá hace falta para una regla, se le hace su columna.';
