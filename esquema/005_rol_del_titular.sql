-- ════════════════════════════════════════════════════════════════════════════
-- La etiqueta `tipo` del titular, y por qué no se puede suponer
--
-- Dos cosas que encontró el test de ida y vuelta, no una inspección:
--
-- 1. Comisionista y Mayorista NO son lo mismo, aunque vivan en la misma lista
--    del prototipo. Al comisionista se le paga una comisión; el mayorista es la
--    contraparte a la que se le compra y se le vende. El test devolvía
--    "Comisionista" donde el dato decía "Mayorista".
--
-- 2. El documento CRUDO no le pone `tipo` al cliente, y el ya normalizado SÍ
--    (se lo agrega la migración del prototipo). Suponer cualquiera de las dos
--    formas rompía `cuentas()`. Por eso se guarda la etiqueta TAL CUAL viene, en
--    vez de derivarla de la colección en la que estaba.
-- ════════════════════════════════════════════════════════════════════════════
alter table titular add column rol text
  check (rol is null or rol in ('Comisionista', 'Mayorista', 'cliente'));

comment on column titular.rol is
  'La etiqueta "tipo" del prototipo, guardada tal cual viene. Para el cliente es "cliente"; para la otra lista distingue Comisionista (cobra comision) de Mayorista (la contraparte de tesoreria), que NO son lo mismo.';
