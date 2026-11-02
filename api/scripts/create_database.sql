-- One-time setup for a LOCAL PostgreSQL 17 install. Not needed with the Docker option.
-- Optional: with DB_AUTO_CREATE=true and a role that has CREATEDB, the API creates the database itself.
--
-- pgAdmin: connect to your server as the superuser (usually "postgres"),
-- open the "postgres" database → Tools → Query Tool, paste this file, run it (F5).
-- psql:    psql -h localhost -p 5432 -U postgres -f scripts/create_database.sql
--
-- Values must match DB_USERNAME, DB_PASSWORD and DB_NAME in your .env.
-- The app gets its own login, never the superuser: it owns its database and nothing else.

CREATE ROLE broadcastly WITH LOGIN PASSWORD 'broadcastly';

CREATE DATABASE broadcastly
  OWNER broadcastly
  ENCODING 'UTF8'
  TEMPLATE template0;

-- Lets migrations create the uuid extension and tables in the public schema.
\connect broadcastly
GRANT ALL ON SCHEMA public TO broadcastly;
 