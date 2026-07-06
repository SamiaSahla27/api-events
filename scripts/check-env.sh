#!/usr/bin/env bash
set -e

required_vars=("DATABASE_URL" "API_PASSWORD" "NODE_ENV")

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name}" ]; then
    echo "::error::Variable d'environnement manquante: ${var_name}"
    exit 1
  fi
done

echo "OK: toutes les variables d'environnement obligatoires sont definies."
