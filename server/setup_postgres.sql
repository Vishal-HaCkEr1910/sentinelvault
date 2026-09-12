-- Run this file as a PostgreSQL administrator.
-- The application only needs access to the already-created database.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'luffy') THEN
        CREATE ROLE luffy LOGIN PASSWORD 'luffy';
    ELSE
        ALTER ROLE luffy WITH LOGIN PASSWORD 'luffy';
    END IF;
END
$$;

SELECT 'CREATE DATABASE "SentinelVault" OWNER luffy'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'SentinelVault')\gexec

GRANT ALL PRIVILEGES ON DATABASE "SentinelVault" TO luffy;

\connect "SentinelVault"

GRANT USAGE, CREATE ON SCHEMA public TO luffy;
