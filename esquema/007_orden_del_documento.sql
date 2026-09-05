-- ════════════════════════════════════════════════════════════════════════════
-- El orden de las listas es DATO, no presentación
--
-- Postgres no garantiza ningún orden sin `order by`, y el orden de las listas
-- del documento importa por dos motivos: la UI muestra en ese orden, y algunos
-- cálculos DEPENDEN de él (la antigüedad por FIFO consume desde el frente).
--
-- 🔴 El primer intento fue una `posicion` con el índice de la lista, y estaba
-- mal: agregar una operación corría la posición de todas las que venían
-- después, incluidas las de días CERRADOS, y el disparador rechazaba el
-- guardado entero. Un campo de presentación disparaba la protección contable.
--
-- Lo correcto es un orden de INSERCIÓN inmutable: lo pone la base al crear la
-- fila, nunca lo escribe la aplicación, y por lo tanto ningún alta mueve a
-- ninguna otra. Alcanza porque el prototipo AGREGA al final: el orden de la
-- lista es el orden en que se cargaron.
-- ════════════════════════════════════════════════════════════════════════════
alter table titular       add column orden bigserial;
alter table direccion     add column orden bigserial;
alter table operacion     add column orden bigserial;
alter table cable         add column orden bigserial;
alter table pata          add column orden bigserial;
alter table movimiento_cc add column orden bigserial;
alter table gasto         add column orden bigserial;
alter table aporte        add column orden bigserial;
alter table cotizacion    add column orden bigserial;

-- La aplicación no lo escribe nunca: lo asigna la base y se queda quieto.
revoke update (orden) on titular, direccion, operacion, cable, pata,
                        movimiento_cc, gasto, aporte, cotizacion from erp_app;

-- ⚠️ Las secuencias que crea `bigserial` son NUEVAS, y el permiso de secuencias
-- que da la migración 002 se aplicó cuando todavía no existían: `grant ... on
-- all sequences` alcanza a las de ese momento, no a las futuras. Sin esto, el
-- primer guardado falla con "permission denied for sequence".
grant usage, select on all sequences in schema public to erp_app;
revoke usage, select on sequence auditoria_id_seq from erp_app;

-- Y para que no vuelva a pasar con la próxima tabla:
alter default privileges in schema public grant usage, select on sequences to erp_app;
