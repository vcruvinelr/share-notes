#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -U "${POSTGRES_USER:-syncpad}" > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "PostgreSQL is ready. Checking for required databases..."

# Function to check if database exists and create if it doesn't
create_database_if_not_exists() {
    local db_name=$1
    echo "Checking if database '$db_name' exists..."
    
    if psql -U "${POSTGRES_USER:-syncpad}" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo "  Database '$db_name' already exists"
    else
        echo "  Creating database '$db_name'..."
        psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-syncpad}" <<-EOSQL
            CREATE DATABASE $db_name;
EOSQL
        echo "  Database '$db_name' created successfully"
    fi
}

# Create keycloak database
if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
        create_database_if_not_exists "$db"
    done
fi

echo "Database initialization complete"
