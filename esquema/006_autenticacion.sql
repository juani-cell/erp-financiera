-- ════════════════════════════════════════════════════════════════════════════
-- Autenticación · lo único del prototipo que NO se reusa
--
-- El prototipo trae los usuarios y sus contraseñas EN TEXTO PLANO adentro del
-- archivo que se descarga el navegador (`admin`/`admin123`). No es un descuido:
-- es que todo lo que vive en el navegador lo puede leer quien abra la página.
-- Por eso esto vive acá y no allá.
--
-- Tres decisiones, y las tres son el default correcto y no una preferencia:
--   · la contraseña se guarda derivada con scrypt, con sal por usuario. Nunca
--     en claro, nunca reversible, y nunca vuelve al navegador.
--   · de la sesión se guarda el HASH del token, no el token. Si alguien se lleva
--     una copia de esta tabla, no puede usar ninguna sesión.
--   · el bloqueo por intentos fallidos vive en la fila del usuario, así que vale
--     aunque el ataque venga de mil direcciones distintas.
-- ════════════════════════════════════════════════════════════════════════════

create table usuario (
  id               text primary key default gen_random_uuid()::text,
  usuario          text not null unique,
  nombre           text not null,
  rol              text not null check (rol in ('admin', 'operador', 'lectura')),
  -- Formato: scrypt$n$r$p$sal$derivada, todo en hexadecimal. Los parámetros
  -- viajan adentro para poder endurecerlos después sin invalidar lo guardado.
  clave_hash       text not null,
  estado           text not null default 'activo'
                     check (estado in ('activo', 'desactivado')),
  intentos_fallidos int not null default 0,
  bloqueado_hasta  timestamptz,
  ultimo_ingreso   timestamptz,
  creado_en        timestamptz not null default now()
);

create table sesion (
  -- La clave primaria es el HASH del token. El token en claro sólo existe en el
  -- navegador de quien lo pidió y en la respuesta que lo entregó.
  token_hash       text primary key,
  usuario_id       text not null references usuario(id) on delete cascade,
  creada_en        timestamptz not null default now(),
  vence_en         timestamptz not null,
  ultima_actividad timestamptz not null default now()
);

create index on sesion (usuario_id);
create index on sesion (vence_en);

-- La auditoría alcanza a los usuarios: dar de alta, cambiar el rol o desactivar
-- a alguien queda registrado igual que un movimiento de plata.
create trigger usuario_auditar
  after insert or update or delete on usuario
  for each row execute function auditar();

-- ⚠️ `sesion` NO se audita a propósito: se escribe en cada request y llenaría la
-- auditoría de ruido, que es exactamente lo que mata una herramienta de
-- auditoría. Lo que importa (quién entró y cuándo) queda en `usuario`.

grant select, insert, update, delete on usuario to erp_app;
grant select, insert, update, delete on sesion  to erp_app;

-- Sí, `erp_app` puede leer `clave_hash`: es la aplicación la que verifica la
-- contraseña, así que necesita la derivada. Esconderla exigiría mover scrypt
-- adentro de Postgres, y para una herramienta interna de dos socios eso es
-- desproporcionado. Lo que protege de verdad es que la derivada NO sea
-- reversible y que NUNCA vuelva al navegador.
