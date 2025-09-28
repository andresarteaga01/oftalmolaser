#!/bin/bash

# 🚀 Script de Despliegue Rápido
# Sistema de Retinopatía Diabética

echo "🚀 Preparando despliegue en Vercel y Render..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes coloridos
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 1. Verificar estructura del proyecto
print_status "Verificando estructura del proyecto..."

if [[ ! -d "frontend" ]]; then
    print_error "Directorio 'frontend' no encontrado"
    exit 1
fi

if [[ ! -d "backend" ]]; then
    print_error "Directorio 'backend' no encontrado"
    exit 1
fi

print_success "Estructura del proyecto correcta"

# 2. Verificar archivos de configuración
print_status "Verificando archivos de configuración..."

# Frontend
if [[ ! -f "frontend/vercel.json" ]]; then
    print_error "frontend/vercel.json no encontrado"
    exit 1
fi

if [[ ! -f "frontend/.env.example" ]]; then
    print_error "frontend/.env.example no encontrado"
    exit 1
fi

# Backend
if [[ ! -f "backend/render.yaml" ]]; then
    print_error "backend/render.yaml no encontrado"
    exit 1
fi

if [[ ! -f "backend/build.sh" ]]; then
    print_error "backend/build.sh no encontrado"
    exit 1
fi

if [[ ! -f "backend/.env.example" ]]; then
    print_error "backend/.env.example no encontrado"
    exit 1
fi

print_success "Todos los archivos de configuración están presentes"

# 3. Verificar dependencias del frontend
print_status "Verificando dependencias del frontend..."
cd frontend

if [[ ! -f "package.json" ]]; then
    print_error "package.json no encontrado en frontend"
    exit 1
fi

if [[ ! -d "node_modules" ]]; then
    print_warning "node_modules no encontrado. Instalando dependencias..."
    npm install
    if [[ $? -eq 0 ]]; then
        print_success "Dependencias del frontend instaladas"
    else
        print_error "Error instalando dependencias del frontend"
        exit 1
    fi
else
    print_success "Dependencias del frontend ya instaladas"
fi

cd ..

# 4. Verificar dependencias del backend
print_status "Verificando dependencias del backend..."
cd backend

if [[ ! -f "requirements.txt" ]]; then
    print_error "requirements.txt no encontrado en backend"
    exit 1
fi

# Verificar si Python está disponible
if ! command -v python3 &> /dev/null; then
    print_error "Python3 no está instalado"
    exit 1
fi

print_success "Backend configurado correctamente"

cd ..

# 5. Test de build del frontend
print_status "Probando build del frontend..."
cd frontend

npm run build
if [[ $? -eq 0 ]]; then
    print_success "Build del frontend exitoso"
    rm -rf build  # Limpiar para deploy
else
    print_error "Error en el build del frontend"
    cd ..
    exit 1
fi

cd ..

# 6. Generar comando de Git
print_status "Preparando para commit y push..."

echo ""
echo "🎯 SIGUIENTES PASOS:"
echo ""
echo "1. Configurar repositorio Git (si no está configurado):"
echo "   git init"
echo "   git remote add origin https://github.com/tu-usuario/tu-repo.git"
echo ""
echo "2. Hacer commit y push:"
echo "   git add ."
echo "   git commit -m 'Deploy: Configure for Vercel and Render'"
echo "   git push origin main"
echo ""
echo "3. Desplegar en Render (Backend):"
echo "   - Ir a https://dashboard.render.com"
echo "   - New → Web Service"
echo "   - Conectar tu repositorio"
echo "   - Root Directory: backend"
echo "   - Build Command: ./build.sh"
echo "   - Start Command: gunicorn core.wsgi:application"
echo ""
echo "4. Configurar variables de entorno en Render:"
echo "   - SECRET_KEY=tu-clave-super-segura"
echo "   - DEBUG=False"
echo "   - DATABASE_URL=postgresql://..."
echo ""
echo "5. Desplegar en Vercel (Frontend):"
echo "   - Ir a https://vercel.com/dashboard"
echo "   - Add New → Project"
echo "   - Importar tu repositorio"
echo "   - Root Directory: frontend"
echo "   - Framework Preset: Create React App"
echo ""
echo "6. Configurar variables de entorno en Vercel:"
echo "   - REACT_APP_API_URL=https://tu-backend.onrender.com"
echo ""

print_success "¡Proyecto listo para despliegue!"
print_warning "Revisa DEPLOYMENT.md para instrucciones detalladas"

echo ""
echo "📚 Documentación completa en: ./DEPLOYMENT.md"
echo "🔧 Variables de entorno ejemplo en: ./backend/.env.example y ./frontend/.env.example"
echo ""