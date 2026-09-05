-- ════════════════════════════════════════════════════════════════════════════
-- Un MONTO y una COTIZACIÓN no son la misma cosa
--
-- El dominio `monto` es numeric(20,6): perfecto para plata, porque nadie factura
-- millonésimas de peso. Pero el tipo de cambio se guardaba ahí también, y con el
-- par invertido un tc es 1/1530 = 0,000653594771...  Redondeado a 6 decimales
-- queda 0,000654, que es 0,06% de diferencia: sobre una operación de USD 100.000
-- son USD 60 que aparecen de la nada.
--
-- Lo encontró la ida y vuelta contra el documento real, no una revisión: el
-- valor entraba con 17 dígitos y volvía con 6.
-- ════════════════════════════════════════════════════════════════════════════
create domain tasa as numeric(24, 12);

alter table operacion alter column tc type tasa;

comment on domain tasa is
  'Cotizaciones y factores de conversión. 12 decimales porque un tc con el par '
  'invertido es 1/1530 y con 6 decimales se pierde plata de verdad. Para montos '
  'va el dominio `monto`, que tiene 6: nadie factura millonésimas de peso.';
