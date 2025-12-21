#!/bin/bash
set -e

# Start PostgreSQL in the background
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until pg_isready -U "${POSTGRES_USER:-syncpad}" > /dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL is ready. Checking for required databases..."

# Function to create database if it doesn't exist
create_database_if_not_exists() {
    local db_name=$1
    echo "Checking database '$db_name'..."
    
    if psql -U "${POSTGRES_USER:-syncpad}" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo "  Database '$db_name' already exists"
    else
        echo "  Creating database '$db_name'..."
        psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-syncpad}" <<-EOSQL
            CREATE DATABASE $db_name;
EOSQL
        echo "  Database '$db_name' created"
    fi
}

# Create additional databases
if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
        create_database_if_not_exists "$db"
    done
fi

echo "Database setup complete. PostgreSQL is running."

# Wait for PostgreSQL process
wait $PG_PID
