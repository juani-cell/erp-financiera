-- ════════════════════════════════════════════════════════════════════════════
-- ¿Los controles del esquema atrapan lo que dicen atrapar?
--
-- Un disparador que nadie rompió es una promesa, no un control. Esto prueba
-- CADA regla por los dos lados: que rechaza lo que tiene que rechazar Y que
-- deja pasar lo que tiene que dejar pasar (ese segundo lado es el que importa,
-- porque un control que bloquea todo también "pasaría" la mitad del test).
--
-- Corre entero adentro de una transacción que REVIERTE: no deja rastro.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create temp table resultado (n int, prueba text, esperado text, obtenido text) on commit drop;

do $probar$
declare
  v_cli   text;
  v_op    text;
  v_pata  text;
  v_op2   text;
  v_hoy   date := current_date;
  v_cerr  date := current_date - 1;   -- el día de ayer va a quedar CERRADO
  v_audit bigint;
begin
  -- ── Escenario ─────────────────────────────────────────────────────────────
  insert into titular (clase, numero, nombre) values ('cliente', 9001, 'Test')
    returning id into v_cli;

  insert into operacion (numero, clase, tipo, fecha, cliente_id,
                         moneda_pago, moneda, cantidad, tc)
    values (9001, 'cambio', 'compra', v_cerr, v_cli, 'ARS', 'USD', 1000, 1500)
    returning id into v_op;

  insert into pata (operacion_id, clave, monto, moneda, forma, completada, completada_en)
    values (v_op, 'pago', 1500000, 'ARS', 'efectivo', true, v_cerr);
  insert into pata (operacion_id, clave, monto, moneda, forma, completada)
    values (v_op, 'divisa', 1000, 'USD', 'efectivo', false)
    returning id into v_pata;

  -- Recién ahora se cierra el día: si se cerrara antes, no se podría ni sembrar.
  insert into cierre_diario (fecha, params) values (v_cerr, '{"tc": 1500}'::jsonb);

  -- ── 1 · Modificar una operación de un día cerrado: TIENE QUE FALLAR ───────
  begin
    update operacion set cantidad = 9999 where id = v_op;
    insert into resultado values (1,'modificar una operación de un día cerrado','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (1,'modificar una operación de un día cerrado','RECHAZA','rechazó ✅');
  end;

  -- ── 2 · Borrar una operación de un día cerrado: TIENE QUE FALLAR ──────────
  begin
    delete from operacion where id = v_op;
    insert into resultado values (2,'borrar una operación de un día cerrado','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (2,'borrar una operación de un día cerrado','RECHAZA','rechazó ✅');
  end;

  -- ── 3 · EL BUG DE AGUS: completar HOY una pata que quedó pendiente ────────
  --        de un día YA CERRADO. TIENE QUE DEJAR PASAR.
  begin
    update pata set completada = true, completada_en = v_hoy where id = v_pata;
    insert into resultado values (3,'completar hoy una pata pendiente de un día cerrado','DEJA PASAR','dejó pasar ✅');
  exception when others then
    insert into resultado values (3,'completar hoy una pata pendiente de un día cerrado','DEJA PASAR','rechazó 🔴 ('||sqlerrm||')');
  end;

  -- ── 4 · Reabrir una pata que se liquidó EN el día cerrado: TIENE QUE FALLAR
  begin
    update pata set completada = false, completada_en = null
      where operacion_id = v_op and clave = 'pago';
    insert into resultado values (4,'reabrir una pata liquidada en el día cerrado','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (4,'reabrir una pata liquidada en el día cerrado','RECHAZA','rechazó ✅');
  end;

  -- ── 5 · Reabrir la que se liquidó HOY (día abierto): TIENE QUE DEJAR PASAR
  begin
    update pata set completada = false, completada_en = null where id = v_pata;
    insert into resultado values (5,'reabrir una pata liquidada hoy','DEJA PASAR','dejó pasar ✅');
  exception when others then
    insert into resultado values (5,'reabrir una pata liquidada hoy','DEJA PASAR','rechazó 🔴 ('||sqlerrm||')');
  end;

  -- ── 6 · Fecha de liquidación sin estar completada: TIENE QUE FALLAR ───────
  begin
    insert into pata (operacion_id, clave, monto, moneda, forma, completada, completada_en)
      values (v_op, 'zz-1', 1, 'USD', 'efectivo', false, v_hoy);
    insert into resultado values (6,'fecha de liquidación sin completar','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (6,'fecha de liquidación sin completar','RECHAZA','rechazó ✅');
  end;

  -- ── 7 · Completada SIN fecha (el fallback), en un día ABIERTO ─────────────
  --        Es el caso "dato viejo" del que depende todo el histórico del
  --        cliente: la pata está completada pero no se sabe cuándo, así que
  --        imputa a la fecha de la operación.
  insert into operacion (numero, clase, tipo, fecha, cliente_id,
                         moneda_pago, moneda, cantidad, tc)
    values (9002, 'cambio', 'venta', v_hoy, v_cli, 'ARS', 'USD', 500, 1520)
    returning id into v_op2;
  begin
    insert into pata (operacion_id, clave, monto, moneda, forma, completada)
      values (v_op2, 'zz-2', 1, 'USD', 'cuenta corriente', true);
    insert into resultado values (7,'completada SIN fecha, en día abierto','DEJA PASAR','dejó pasar ✅');
  exception when others then
    insert into resultado values (7,'completada SIN fecha, en día abierto','DEJA PASAR','rechazó 🔴 ('||sqlerrm||')');
  end;

  -- ── 7b · La misma pata, pero sobre un día CERRADO: TIENE QUE FALLAR ───────
  --         Agregar una pata a un día cerrado le cambia los números a ese día.
  --         ⚠️ CONSECUENCIA PARA LA CARGA INICIAL (Etapa 5): el importador tiene
  --         que cargar TODA la historia primero y escribir los cierres AL
  --         FINAL. Si cierra a medida que avanza, se bloquea a sí mismo.
  begin
    insert into pata (operacion_id, clave, monto, moneda, forma, completada)
      values (v_op, 'zz-2b', 1, 'USD', 'cuenta corriente', true);
    insert into resultado values (11,'agregar una pata a un día cerrado','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (11,'agregar una pata a un día cerrado','RECHAZA','rechazó ✅');
  end;

  -- ── 8 · Una pata colgando de una operación Y de un cable: TIENE QUE FALLAR
  begin
    insert into pata (operacion_id, cable_id, clave, monto, moneda, forma)
      values (v_op, gen_random_uuid()::text, 'zz-3', 1, 'USD', 'efectivo');
    insert into resultado values (8,'una pata colgando de dos cosas','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (8,'una pata colgando de dos cosas','RECHAZA','rechazó ✅');
  end;

  -- ── 9 · ¿La auditoría registró todo esto? ─────────────────────────────────
  select count(*) into v_audit from auditoria where tabla in ('operacion','pata','titular');
  insert into resultado values (9,'la auditoría registró los cambios','>0 filas',
    case when v_audit > 0 then v_audit||' filas ✅' else 'CERO 🔴' end);
  -- ── 12 · UN DÍA REABIERTO SE PUEDE EDITAR ────────────────────────────────
  --         La fila de `cierre_diario` SOBREVIVE a la reapertura, con
  --         `cerrado=false`, porque es donde viven los parámetros congelados.
  --         Si el disparador mirara sólo si la fila EXISTE, un socio reabriría
  --         el día para corregir algo y el sistema se lo seguiría prohibiendo.
  --         Es el bug de Agus al revés, y lo encontró la UAT, no un test.
  update cierre_diario set cerrado = false where fecha = v_cerr;
  begin
    update operacion set cantidad = 4242 where id = v_op;
    insert into resultado values (12,'editar una operación de un día REABIERTO','DEJA PASAR','dejó pasar ✅');
  exception when others then
    insert into resultado values (12,'editar una operación de un día REABIERTO','DEJA PASAR','rechazó 🔴 ('||sqlerrm||')');
  end;

  -- ── 13 · y al volver a cerrarlo, vuelve a proteger ───────────────────────
  update cierre_diario set cerrado = true where fecha = v_cerr;
  begin
    update operacion set cantidad = 5353 where id = v_op;
    insert into resultado values (13,'y al volver a cerrarlo vuelve a bloquear','RECHAZA','dejó pasar 🔴');
  exception when others then
    insert into resultado values (13,'y al volver a cerrarlo vuelve a bloquear','RECHAZA','rechazó ✅');
  end;
end
$probar$;

-- ── 10 · El rol de la aplicación NO puede borrar la auditoría ───────────────
do $borrar$
declare
  v_res text;
begin
  -- El rol de la consola no es miembro de erp_app, así que hay que hacerlo
  -- miembro para poder ASUMIRLO. Va adentro de la transacción que revierte, y
  -- se hace así a propósito: preguntar `has_table_privilege` diría lo mismo,
  -- pero INTENTAR el borrado prueba el comportamiento y no la declaración.
  execute format('grant erp_app to %I', current_user);
  begin
    set local role erp_app;
    delete from auditoria;
    v_res := 'BORRÓ 🔴🔴';
  exception when others then
    v_res := 'sin permiso ✅ ('||sqlerrm||')';
  end;
  -- Volver al rol propio ANTES de escribir: con erp_app asumido no hay permiso
  -- ni sobre la tabla temporal de resultados.
  reset role;
  insert into resultado values (10,'erp_app borra la auditoría','RECHAZA', v_res);
end
$borrar$;

select n, prueba, esperado, obtenido from resultado order by n;

rollback;
