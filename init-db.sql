-- Inicialización de base de datos PostgreSQL
-- Este archivo se ejecuta automáticamente al crear el contenedor

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurar locale para español
ALTER DATABASE retinopatia_db SET timezone TO 'America/Lima';

-- Crear índices adicionales para búsqueda de texto
-- (Se ejecutarán después de las migraciones de Django)