#!/bin/sh
set -e

# Start PostgreSQL in the background
/usr/local/bin/docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
for i in $(seq 1 30); do
    if pg_isready -U "${POSTGRES_USER:-syncpad}" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "PostgreSQL is ready. Checking for required databases..."

# Create additional databases
if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    for db_name in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
        echo "Checking database '$db_name'..."
        
        # Check if database exists
        DB_EXISTS=$(psql -U "${POSTGRES_USER:-syncpad}" -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" 2>/dev/null || echo "")
        
        if [ "$DB_EXISTS" = "1" ]; then
            echo "  Database '$db_name' already exists"
        else
            echo "  Creating database '$db_name'..."
            psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-syncpad}" -c "CREATE DATABASE $db_name;"
            echo "  Database '$db_name' created successfully"
        fi
    done
fi

echo "Database setup complete. PostgreSQL is running."

# Wait for PostgreSQL process
wait $PG_PID
