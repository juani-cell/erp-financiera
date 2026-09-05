-- ════════════════════════════════════════════════════════════════════════════
-- Lo que el test de ida y vuelta encontró que faltaba
--
-- Los tres primeros son PÉRDIDA DE DATOS de verdad: sin ellos, guardar borra
-- un dato que el usuario había cargado. Los encontró el test, no un incidente.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. El porcentaje de comisión del operador. Es un dato de negocio, no de forma.
alter table titular add column comision_pct monto;

-- 2. La forma de pago de la operación existe AUNQUE el pago esté partido en
--    partes: el prototipo guarda las dos cosas. Derivarla de las patas perdía
--    el valor original en toda operación con partes.
alter table operacion add column forma_pago    text;
alter table operacion add column forma_retiro  text;
alter table cable     add column forma_mayorista text;
alter table cable     add column forma_cliente   text;

-- 3. Una pata de cuenta corriente NUNCA figura en `patasHechas` (el prototipo
--    la excluye al armar las claves accionables) y esa AUSENCIA es lo que hace
--    que arranque completada. Si al rearmar el documento le agregáramos la
--    clave, cambiaríamos el cálculo. Hay que poder reproducir la ausencia.
alter table pata add column en_patas_hechas boolean not null default true;

comment on column pata.en_patas_hechas is
  'false = la clave NO figura en patasHechas del prototipo, y esa ausencia es '
  'la que define el default. Ver pata_lista() en api/calculos.py.';
