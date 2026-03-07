-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Configuración de Row Level Security
-- El app_user es el rol que usará NestJS para conectarse
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cobraia_app') THEN
    CREATE ROLE cobraia_app LOGIN PASSWORD 'cobraia_app_123';
  END IF;
END
$$;

-- Permisos básicos al rol de la aplicación
GRANT CONNECT ON DATABASE cobraia_dev TO cobraia_app;
GRANT USAGE ON SCHEMA public TO cobraia_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cobraia_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cobraia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cobraia_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cobraia_app;