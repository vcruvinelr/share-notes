#!/bin/sh
set -e

# Function to create databases
create_databases() {
    echo "Checking and creating databases if needed..."
    
    # Wait a moment for postgres to fully initialize
    sleep 2
    
    if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
        for db_name in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
            echo "Checking database '$db_name'..."
            
            # Try to create database, ignore if exists
            psql -v ON_ERROR_STOP=0 -U "${POSTGRES_USER:-syncpad}" -tc "SELECT 1 FROM pg_database WHERE datname = '$db_name'" | grep -q 1 || \
            psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-syncpad}" -c "CREATE DATABASE $db_name;" && \
            echo "  Database '$db_name' ready"
        done
    fi
    
    echo "All databases ready"
}

# Run original entrypoint in background
docker-entrypoint.sh postgres &
PID=$!

# Wait for PostgreSQL to accept connections
echo "Waiting for PostgreSQL to be ready..."
timeout=30
counter=0
until pg_isready -U "${POSTGRES_USER:-syncpad}" >/dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "ERROR: PostgreSQL did not become ready in time"
        exit 1
    fi
    sleep 1
done

# Create additional databases
create_databases

# Keep container running
wait $PID
