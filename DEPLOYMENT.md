# 🚀 Guía de Despliegue - Sistema de Retinopatía Diabética

Este documento detalla cómo desplegar el sistema en **Vercel** (frontend) y **Render** (backend).

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Render](https://render.com)
- Repositorio Git (GitHub, GitLab, etc.)

## 🎯 Arquitectura de Despliegue

- **Frontend (React)**: Vercel - Hosting estático optimizado
- **Backend (Django)**: Render - Servicio web con PostgreSQL
- **Base de Datos**: Render PostgreSQL
- **Archivos Estáticos**: Whitenoise (incluido en Django)

---

## 🌐 1. Despliegue del Backend en Render

### Paso 1: Crear Servicio Web

1. Ir a [Render Dashboard](https://dashboard.render.com)
2. **New** → **Web Service**
3. Conectar repositorio Git
4. Configurar:
   - **Name**: `retinopatia-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn core.wsgi:application`

### Paso 2: Variables de Entorno

Agregar en Render Environment Variables:

```bash
SECRET_KEY=tu-clave-secreta-super-segura-aqui
DEBUG=False
ALLOWED_HOSTS=tu-app.onrender.com
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
DATABASE_URL=postgresql://user:password@host:port/database
```

### Paso 3: Base de Datos PostgreSQL

1. **New** → **PostgreSQL**
2. **Name**: `oftalmolaserdb`
3. Copiar `DATABASE_URL` y agregarla al backend

### Paso 4: Deploy

1. Click **Create Web Service**
2. Render automáticamente:
   - Ejecuta `build.sh`
   - Instala dependencias
   - Ejecuta migraciones
   - Inicia aplicación

---

## ⚡ 2. Despliegue del Frontend en Vercel

### Paso 1: Configurar Proyecto

1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. **Add New** → **Project**
3. Importar repositorio Git
4. Configurar:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### Paso 2: Variables de Entorno

Agregar en Vercel Environment Variables:

```bash
REACT_APP_API_URL=https://tu-backend.onrender.com
REACT_APP_ENVIRONMENT=production
```

### Paso 3: Deploy

1. Click **Deploy**
2. Vercel automáticamente:
   - Instala dependencias (`npm install`)
   - Ejecuta build (`npm run build`)
   - Despliega archivos estáticos

---

## 🔗 3. Configuración de Dominios

### Backend (Render)
- URL automática: `https://retinopatia-backend.onrender.com`
- Dominio personalizado: Configurar en Render Settings

### Frontend (Vercel)
- URL automática: `https://tu-proyecto.vercel.app`
- Dominio personalizado: Configurar en Vercel Domains

---

## ⚙️ 4. Configuraciones Importantes

### CORS en Backend
Actualizar variables de entorno cuando tengas las URLs finales:

```bash
CORS_ALLOWED_ORIGINS=https://tu-frontend-final.vercel.app
CSRF_TRUSTED_ORIGINS=https://tu-frontend-final.vercel.app
```

### API URL en Frontend
Actualizar en Vercel:

```bash
REACT_APP_API_URL=https://tu-backend-final.onrender.com
```

---

## 🔧 5. Scripts de Despliegue

### Actualizar Backend
```bash
# Los cambios se despliegan automáticamente con git push
git add .
git commit -m "Update backend"
git push origin main
```

### Actualizar Frontend
```bash
# Los cambios se despliegan automáticamente con git push
git add .
git commit -m "Update frontend"
git push origin main
```

---

## 🚨 6. Troubleshooting

### Backend no inicia
- ✅ Verificar logs en Render Dashboard
- ✅ Confirmar variables de entorno
- ✅ Verificar `requirements.txt`

### Frontend no carga
- ✅ Verificar build logs en Vercel
- ✅ Confirmar `REACT_APP_API_URL`
- ✅ Revisar CORS en backend

### Error de Base de Datos
- ✅ Verificar `DATABASE_URL`
- ✅ Ejecutar migraciones manualmente
- ✅ Revisar conexión PostgreSQL

### CORS Error
```bash
# Agregar frontend URL a backend
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
```

---

## 📊 7. Monitoreo y Logs

### Render
- **Logs**: Dashboard → Service → Logs
- **Metrics**: Dashboard → Service → Metrics
- **Events**: Dashboard → Service → Events

### Vercel
- **Functions**: Dashboard → Project → Functions
- **Analytics**: Dashboard → Project → Analytics
- **Speed Insights**: Dashboard → Project → Speed Insights

---

## 🔐 8. Seguridad en Producción

### Variables Críticas
```bash
SECRET_KEY=genera-una-clave-super-segura
DEBUG=False
ALLOWED_HOSTS=solo-tu-dominio.com
```

### Headers de Seguridad
El middleware ya incluye:
- CSRF Protection
- CORS configurado
- Security Headers
- Rate Limiting

---

## 📈 9. Optimizaciones

### Backend
- ✅ WhiteNoise para archivos estáticos
- ✅ Gunicorn como servidor WSGI
- ✅ PostgreSQL optimizado
- ✅ Middleware de caché

### Frontend
- ✅ Build optimizado de React
- ✅ Code splitting automático
- ✅ CDN global de Vercel
- ✅ Compresión automática

---

## 🎉 ¡Despliegue Completado!

Tu aplicación estará disponible en:

- **Frontend**: `https://oftalmolaser.vercel.app`
- **Backend API**: `https://oftalmolaser-api.onrender.com`
- **Admin Panel**: `https://oftalmolaser-api.onrender.com/admin`

### URLs de Prueba
- Health Check: `https://oftalmolaser-api.onrender.com/api/health/`
- Login: `https://oftalmolaser.vercel.app/login`
- Dashboard: `https://oftalmolaser.vercel.app/`

---

¿Necesitas ayuda? Revisa los logs en ambas plataformas y verifica las variables de entorno.