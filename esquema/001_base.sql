-- ════════════════════════════════════════════════════════════════════════════
-- ERP Financiera · esquema base
--
-- Una base POR CLIENTE (ver DECISIONES.md, 26/8): acá no hay `tenant_id` ni RLS
-- multi-inquilino, porque los datos de dos clientes nunca comparten base.
--
-- Cuatro cosas que este esquema hace cumplir por construcción, no por convención:
--   1. La plata es decimal exacto. Nunca coma flotante.
--   2. Una pata guarda SI está completada y CUÁNDO. Son dos datos distintos:
--      existe "completada pero no se sabe cuándo" (dato viejo), y el fallback a
--      la fecha de la operación depende de poder representarlo.
--   3. Las monedas viven en una TABLA. Alaska las tenía como columnas del
--      movimiento y agregar una no fluía a las operaciones.
--   4. La auditoría NO SE PUEDE BORRAR: el rol de la aplicación no tiene
--      permiso de UPDATE ni DELETE sobre ella. Una decisión escrita no es un
--      control; esto sí lo es.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Dinero ──────────────────────────────────────────────────────────────────
-- numeric(20,6): 14 dígitos enteros alcanzan para pesos con inflación, y 6
-- decimales para cripto. Nunca `float`/`double`: 0.1 + 0.2 no da 0.3 y en los
-- libros de una financiera eso se acumula.
create domain monto as numeric(20,6);

-- ── Monedas ─────────────────────────────────────────────────────────────────
create table moneda (
  codigo      text primary key,
  nombre      text not null,
  -- "USD cara chica" y USDT valen como dólar para la posición, pero son
  -- billetes distintos y el prototipo los trata aparte.
  familia_usd boolean not null default false,
  decimales   smallint not null default 2 check (decimales between 0 and 6),
  activa      boolean not null default true,
  orden       smallint not null default 100
);

insert into moneda (codigo, nombre, familia_usd, decimales, orden) values
  ('ARS',            'Peso argentino',  false, 2,  10),
  ('USD',            'Dólar',           true,  2,  20),
  ('USD cara chica', 'Dólar cara chica',true,  2,  30),
  ('USDT',           'Tether',          true,  6,  40),
  ('EUR',            'Euro',            false, 2,  50),
  ('BRL',            'Real',            false, 2,  60),
  ('LBR',            'Libra',           false, 2,  70);

-- ── Titulares ───────────────────────────────────────────────────────────────
-- Clientes y comisionistas/mayoristas comparten forma y ambos tienen cuenta
-- corriente, así que van en una tabla con un discriminador.
create table titular (
  id       uuid primary key default gen_random_uuid(),
  clase    text not null check (clase in ('cliente','comisionista')),
  numero   integer not null,
  nombre   text not null,
  contacto text,
  alta     date not null default current_date,
  obs      text,
  activo   boolean not null default true,
  unique (clase, numero)
);

create table direccion (
  id         uuid primary key default gen_random_uuid(),
  titular_id uuid not null references titular(id) on delete cascade,
  alias      text,
  calle      text,
  piso       text,
  obs        text
);

-- ── El día ──────────────────────────────────────────────────────────────────
-- Los parámetros del día quedan CONGELADOS al cerrar: el resultado de un día
-- cerrado no puede moverse porque alguien cambió un margen hoy.
create table cierre_diario (
  fecha       date primary key,
  cerrado_en  timestamptz not null default now(),
  cerrado_por text not null default current_user,
  params      jsonb not null
);

create table cotizacion (
  id      uuid primary key default gen_random_uuid(),
  fecha   date not null,
  momento text not null check (momento in ('apertura','cierre')),
  -- El orden entre cotizaciones del mismo día se resuelve por este campo y por
  -- `creada_en`, NUNCA comparando 'apertura' < 'cierre' como texto.
  creada_en timestamptz not null default now(),
  valores jsonb not null,
  unique (fecha, momento)
);

-- ── Operaciones ─────────────────────────────────────────────────────────────
-- Cambio, cripto y tesorería comparten casi todos los campos y los cálculos las
-- tratan igual, así que van juntas con un discriminador. Los cables son otra
-- cosa (monto único, dos porcentajes, patas con otros nombres) y van aparte.
create table operacion (
  id              uuid primary key default gen_random_uuid(),
  numero          integer not null,
  clase           text not null check (clase in ('cambio','cripto','tesoreria')),
  tipo            text not null check (tipo in ('compra','venta')),
  fecha           date not null,
  cliente_id      uuid references titular(id),
  comisionista_id uuid references titular(id),
  moneda_pago     text not null references moneda(codigo),
  moneda          text not null references moneda(codigo),
  cantidad        monto not null,
  tc              monto not null check (tc > 0),
  comision        monto not null default 0,
  comision_moneda text references moneda(codigo),
  -- Sólo cripto: costo de red. Se imputa al día de la OPERACIÓN, no al de
  -- liquidación de las patas (verificado con el caso `cr3` del arnés).
  costo           monto,
  costo_a         text check (costo_a in ('cueva','cliente')),
  estado          text not null default 'Pendiente',
  cancelado       boolean not null default false,
  creada_en       timestamptz not null default now(),
  unique (clase, numero),
  constraint costo_solo_en_cripto
    check (clase = 'cripto' or (costo is null and costo_a is null)),
  constraint tesoreria_no_tiene_cliente
    check (clase <> 'tesoreria' or cliente_id is null)
);

create index on operacion (fecha);
create index on operacion (cliente_id) where cliente_id is not null;

create table cable (
  id              uuid primary key default gen_random_uuid(),
  numero          integer not null unique,
  fecha           date not null,
  fecha_ejecucion date,
  tipo            text not null check (tipo in ('Subida','Bajada')),
  cliente_id      uuid references titular(id),
  comisionista_id uuid references titular(id),
  monto           monto not null check (monto > 0),
  -- Puede ser NEGATIVO: cuando el mayorista paga en lugar de cobrar. El
  -- traslado al cliente se topa en cero (caso `cb2` del arnés).
  costo_pct       monto not null default 0,
  margen_pct      monto not null default 0,
  estado          text not null default 'pendiente',
  cancelado       boolean not null default false,
  obs             text,
  creada_en       timestamptz not null default now()
);

create index on cable (fecha);

-- ── LA PATA · el corazón de la regla de imputación ──────────────────────────
-- «Cada pata mueve caja el día en que se marca Completada, no el día en que se
-- cargó la operación» (Agus, 5/9, tras hablar con Tomi). Es trade date vs
-- settlement date.
create table pata (
  id            uuid primary key default gen_random_uuid(),
  operacion_id  uuid references operacion(id) on delete cascade,
  cable_id      uuid references cable(id) on delete cascade,
  -- 'pago', 'pago-0', 'divisa-1', 'mayorista', 'cliente'
  clave         text not null,
  monto         monto not null,
  moneda        text not null references moneda(codigo),
  forma         text not null check (forma in ('efectivo','transferencia','cuenta corriente')),
  lugar         text,
  entrega       text,

  completada    boolean not null default false,
  -- 🔑 NULA aunque `completada` sea true: es el caso "completada pero no se sabe
  -- cuándo" (dato migrado, o una pata de cuenta corriente que arrancó completada
  -- sin marca explícita). Esos casos imputan a la fecha de la operación. Este
  -- campo NO se puede colapsar con `completada`, y esa fue una corrección real:
  -- ver DECISIONES.md, 5/9.
  completada_en date,

  constraint pata_cuelga_de_una_sola_cosa
    check (num_nonnulls(operacion_id, cable_id) = 1),
  constraint fecha_de_liquidacion_exige_completada
    check (completada_en is null or completada),
  unique nulls not distinct (operacion_id, cable_id, clave)
);

create index on pata (completada_en) where completada_en is not null;
create index on pata (operacion_id);
create index on pata (cable_id);

-- ── Cuenta corriente, gastos y aportes ──────────────────────────────────────
create table movimiento_cc (
  id         uuid primary key default gen_random_uuid(),
  titular_id uuid not null references titular(id),
  fecha      date not null,
  moneda     text not null references moneda(codigo),
  monto      monto not null,
  tipo_mov   text not null,
  motivo     text,
  efectivo   boolean not null default false,
  lugar      text,
  entrega    text,
  creado_en  timestamptz not null default now()
);

create index on movimiento_cc (titular_id, fecha);

create table gasto (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null,
  motivo         text not null,
  moneda         text not null references moneda(codigo),
  monto          monto not null,
  monto_original monto,
  socio          text,
  obs            text
);

-- ⚠️ Los aportes NO son ganancia. La fórmula de variación de stock tiene que
-- netearlos: sin eso, el día que se cargan los saldos de apertura el sistema
-- informa como ganancia todo el capital del cliente (medido: 133.444,82).
create table aporte (
  id       uuid primary key default gen_random_uuid(),
  socio    text not null,
  fecha    date not null,
  moneda   text not null references moneda(codigo),
  monto    monto not null,          -- negativo = retiro
  concepto text
);

create index on gasto (fecha);
create index on aporte (fecha);
