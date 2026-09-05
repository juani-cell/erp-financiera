-- ════════════════════════════════════════════════════════════════════════════
-- 🔴 Que exista la fila NO significa que el día esté cerrado
--
-- Mi esquema asumía que una fila en `cierre_diario` equivale a "día cerrado".
-- Es falso: la app guarda `{cerrado: true|false, params}` y **al REABRIR deja la
-- entrada con `cerrado: false`**, porque la fila es también el lugar donde
-- vivieron los parámetros congelados.
--
-- La consecuencia era grave y muy concreta: un socio reabre el día para
-- corregir algo y el disparador se lo sigue prohibiendo. Es el bug que Agus
-- reportó, al revés: en vez de no poder completar, no podés corregir.
--
-- Lo encontró la UAT abriendo el sistema y reabriendo un día. Las pruebas
-- automáticas no podían: los 40 casos del arnés sólo tenían `cerrado: true`.
-- ════════════════════════════════════════════════════════════════════════════
alter table cierre_diario add column cerrado boolean not null default true;

-- Los datos que ya estaban traen el estado adentro del jsonb.
update cierre_diario
   set cerrado = coalesce((params->>'cerrado')::boolean, true),
       params  = case when params ? 'params' then params->'params' else params end;

comment on column cierre_diario.cerrado is
  'La fila puede existir con cerrado=false: es un día que se cerró y se volvió '
  'a abrir. La fila sobrevive porque es donde viven los parámetros congelados.';

create or replace function dia_cerrado(p_fecha date) returns boolean
language sql stable as $$
  select exists (
    select 1 from cierre_diario where fecha = p_fecha and cerrado
  )
$$;
