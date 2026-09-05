#!/usr/bin/env bash
# Todas las pruebas, en orden de lo más barato a lo más caro.
# Necesita DATABASE_URL (o ERP_DATABASE_URL) apuntando a la base de desarrollo.
set -u
cd "$(dirname "$0")"
PY=${PY:-.venv/bin/python}
# Sin DATABASE_URL las pruebas levantan su propia base local y descartable.
# Ponerla a mano apunta a staging, y eso es una decisión explícita.
falla=0
for t in pruebas/test_calculos.py pruebas/test_mutaciones.py \
         pruebas/test_estado.py pruebas/test_estado_en_base.py \
         pruebas/test_api.py; do
  salida=$($PY "$t" 2>&1); codigo=$?
  linea=$(echo "$salida" | grep -E "^(✅|🔴)" | tail -1)
  printf '  %-14s %s\n' "$(basename "$t" .py | sed 's/test_//')" "${linea:-sin salida}"
  [ $codigo -ne 0 ] && { falla=1; echo "$salida" | tail -20 | sed 's/^/      /'; }
done
echo
[ $falla -eq 0 ] && echo "✅ TODO VERDE" || echo "🔴 HAY PRUEBAS EN ROJO"
exit $falla
