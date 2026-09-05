-- ════════════════════════════════════════════════════════════════════════════
-- ERP Financiera · auditoría y validación de día cerrado
--
-- Las dos van en la BASE y no en la aplicación, por el mismo motivo: son las
-- reglas que protegen los libros, y tienen que valer aunque alguien entre por
-- otro camino (un script, la consola de Supabase, una API futura).
-- ════════════════════════════════════════════════════════════════════════════

-- ── AUDITORÍA ───────────────────────────────────────────────────────────────
-- El prototipo hace `d.audit = []` dentro de la función que corre en cada carga.
-- Acá eso no puede pasar: el rol de la aplicación no tiene UPDATE ni DELETE
-- sobre esta tabla (ver el final del archivo).
create table auditoria (
  id          bigserial primary key,
  ocurrido_en timestamptz not null default now(),
  quien       text not null default current_user,
  tabla       text not null,
  accion      text not null check (accion in ('INSERT','UPDATE','DELETE')),
  fila_id     text,
  antes       jsonb,
  despues     jsonb
);

create index on auditoria (tabla, ocurrido_en desc);
create index on auditoria (fila_id);

create or replace function auditar() returns trigger
language plpgsql security definer as $$
declare
  v_id text;
begin
  v_id := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'fecha');

  insert into auditoria (tabla, accion, fila_id, antes, despues)
  values (tg_table_name, tg_op, v_id,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);

  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ── DÍA CERRADO ─────────────────────────────────────────────────────────────
create or replace function dia_cerrado(p_fecha date) returns boolean
language sql stable as $$
  select exists (select 1 from cierre_diario where fecha = p_fecha)
$$;

-- El bloqueo se evalúa contra LA FECHA RELEVANTE DE CADA ACCIÓN, no siempre
-- contra la fecha de la operación. Es la regla de Agus del 2/9, y es el arreglo
-- de fondo del bug que reportó: con el día cerrado no se podían marcar como
-- completadas las operaciones que habían quedado pendientes.
--
--   · completar una pata  → impacta HOY, así que se bloquea si HOY está cerrado
--   · reabrir una pata    → deshace un movimiento que ya se contó en el día en
--                           que se liquidó, así que se bloquea si ESE día está
--                           cerrado
--
-- Con esto, cerrar el día deja de ser una traba para la operación normal: podés
-- terminar de entregar mañana lo que quedó pendiente ayer, y el día cerrado
-- queda intacto porque el movimiento cae en el día en que se completa.
create or replace function proteger_dia_cerrado_pata() returns trigger
language plpgsql as $$
declare
  v_fecha_op   date;
  v_relevante  date;
begin
  select coalesce(o.fecha, c.fecha) into v_fecha_op
  from (select 1) z
  left join operacion o on o.id = coalesce(new.operacion_id, old.operacion_id)
  left join cable    c on c.id = coalesce(new.cable_id,     old.cable_id);

  if tg_op = 'INSERT' then
    v_relevante := coalesce(new.completada_en, v_fecha_op);

  elsif tg_op = 'UPDATE' then
    if new.completada and not old.completada then
      -- Completar: el movimiento nace hoy.
      v_relevante := coalesce(new.completada_en, current_date);
    elsif old.completada and not new.completada then
      -- Reabrir: hay que poder deshacer el movimiento donde fue contado.
      v_relevante := coalesce(old.completada_en, v_fecha_op);
    else
      v_relevante := coalesce(new.completada_en, v_fecha_op);
    end if;

  else -- DELETE
    v_relevante := coalesce(old.completada_en, v_fecha_op);
  end if;

  if v_relevante is not null and dia_cerrado(v_relevante) then
    raise exception
      'El % está cerrado: no se puede % esta pata.',
      to_char(v_relevante, 'DD/MM/YYYY'),
      case tg_op when 'INSERT' then 'crear' when 'DELETE' then 'borrar' else 'modificar' end
      using errcode = 'raise_exception',
            hint = 'Reabrí ese día en Cierre diario si de verdad hay que tocarlo.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function proteger_dia_cerrado_fecha() returns trigger
language plpgsql as $$
declare
  v_fecha date := coalesce(new.fecha, old.fecha);
begin
  if dia_cerrado(v_fecha) then
    raise exception 'El % está cerrado: no se puede modificar lo que pasó ese día.',
      to_char(v_fecha, 'DD/MM/YYYY')
      using errcode = 'raise_exception';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ── Enganchar los disparadores ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['titular','operacion','cable','pata','movimiento_cc',
                           'gasto','aporte','cotizacion','cierre_diario','moneda']
  loop
    execute format(
      'create trigger %I_auditar after insert or update or delete on %I
         for each row execute function auditar()', t, t);
  end loop;

  -- El día cerrado protege lo que mueve plata. `pata` tiene su propia función
  -- porque su fecha relevante depende de la acción.
  foreach t in array array['operacion','cable','movimiento_cc','gasto','aporte']
  loop
    execute format(
      'create trigger %I_dia_cerrado before insert or update or delete on %I
         for each row execute function proteger_dia_cerrado_fecha()', t, t);
  end loop;
end $$;

create trigger pata_dia_cerrado
  before insert or update or delete on pata
  for each row execute function proteger_dia_cerrado_pata();

-- ── EL CONTROL QUE HACE QUE LA AUDITORÍA NO SE PUEDA BORRAR ─────────────────
-- `auditar()` es SECURITY DEFINER, así que inserta con los permisos del dueño
-- aunque la aplicación no tenga INSERT propio. Y sin UPDATE ni DELETE, ni un
-- bug ni una migración de la aplicación pueden vaciarla.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'erp_app') then
    create role erp_app nologin;
  end if;
end $$;

grant usage on schema public to erp_app;
grant select, insert, update, delete on all tables in schema public to erp_app;
grant usage, select on all sequences in schema public to erp_app;

revoke insert, update, delete on auditoria from erp_app;
grant select on auditoria to erp_app;
revoke usage, select on sequence auditoria_id_seq from erp_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to erp_app;
