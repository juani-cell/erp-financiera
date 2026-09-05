-- ════════════════════════════════════════════════════════════════════════════
-- Lo que hace falta para que el estado del prototipo vaya y vuelva IDÉNTICO
--
-- La UI que reusamos manda su estado entero y espera recibirlo igual. Todo lo
-- que la base no sepa reproducir se pierde en silencio en el primer guardado,
-- y el usuario ve un campo vacío sin entender por qué. Estas columnas existen
-- para eso, no porque el negocio las pida.
-- ════════════════════════════════════════════════════════════════════════════

-- ── La moneda "Otra" ────────────────────────────────────────────────────────
-- El prototipo tiene un mecanismo de escape: `moneda: 'Otra'` más
-- `monedaOtra: 'JPY'`. Eso es una FORMA DE CARGA, no un hecho del negocio: el
-- hecho es que la operación fue en yenes.
-- Guardamos la moneda RESUELTA (con su clave foránea, que es la que sirve para
-- consultar) y aparte el texto original, sólo para poder rearmar el estado tal
-- como vino. Una moneda que no conocíamos se da de alta sola: la tabla aprende
-- de los datos en vez de rechazarlos.
alter table operacion add column moneda_otra      text;
alter table operacion add column moneda_pago_otra text;

-- ── Campos de la operación que el prototipo trae y no teníamos ──────────────
alter table operacion add column lugar_pago    text;
alter table operacion add column lugar_divisa  text;
alter table operacion add column entrega_pago  text;
alter table operacion add column entrega_divisa text;

alter table cable add column lugar_mayorista   text;
alter table cable add column lugar_cliente     text;
alter table cable add column entrega_mayorista text;
alter table cable add column entrega_cliente   text;

-- ── Configuración ───────────────────────────────────────────────────────────
-- Los márgenes y precios vigentes (`params`) son un solo juego de valores, no
-- una tabla de filas. Van como un documento, con la fecha del último cambio.
create table config (
  clave       text primary key,
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);

create trigger config_auditar
  after insert or update or delete on config
  for each row execute function auditar();

-- ── Versión del estado, para que dos socios no se pisen ─────────────────────
-- La UI manda el estado entero. Sin esto, si dos personas guardan casi a la vez,
-- la segunda le borra el trabajo a la primera y NADIE SE ENTERA. Con esto, la
-- segunda recibe un rechazo, recarga y vuelve a intentar.
create table estado_version (
  id       boolean primary key default true check (id),
  version  bigint  not null default 1,
  guardado timestamptz not null default now(),
  quien    text
);

insert into estado_version (id) values (true);
