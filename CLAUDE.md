# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a medical application for diabetic retinopathy detection using machine learning. The system consists of a Django REST API backend and a React frontend, designed for ophthalmology clinics to analyze retinal images and predict diabetic retinopathy severity levels.

## Architecture

### Backend (Django)
- **Framework**: Django 3.2.15 with Django REST Framework
- **Location**: `/backend/`
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Authentication**: JWT tokens via djangorestframework-simplejwt + Djoser
- **File Storage**: Local filesystem with potential AWS S3 support via django-storages
- **Machine Learning**: TensorFlow 2.17.0 with ResNet50 model for image classification

### Frontend (React)
- **Framework**: React 18.2.0 with Create React App
- **Location**: `/frontend/`
- **State Management**: Redux with Redux Thunk
- **Styling**: Tailwind CSS 3.1.8
- **Routing**: React Router v6
- **Charts**: Chart.js, ECharts, Recharts for data visualization

### Key Models
- **UserAccount** (`backend/apps/api/models.py`): Custom user model with roles (administrador, especialista, medico)
- **Paciente** (`backend/apps/pacientes/models.py`): Patient information with medical history
- **ImagenPaciente**: Multiple retinal images per patient with ML predictions and GradCAM visualizations

## Development Commands

### Backend (Django)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Development server
python manage.py runserver

# Run tests
python manage.py test
```

### Frontend (React)
```bash
cd frontend

# Install dependencies
npm install

# Development server (with polling for WSL/Docker)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Key Configuration

### Environment Variables (Backend)
- `SECRET_KEY`: Django secret key
- `DEBUG`: Development mode flag
- `DATABASE_URL`: PostgreSQL connection string

### Machine Learning Model
- Model file: `backend/apps/pacientes/modelos/resnet50_512_final_2.0.keras`
- Prediction function: `backend/apps/pacientes/prediction.py`
- Supports GradCAM visualization for explainable AI

### User Roles & Permissions
- **Administrador**: Full system access, user management
- **Especialista**: Patient management, image analysis
- **Medico**: Patient search, reports, diagnosis viewing

## API Structure
- Authentication: `/auth/` (Djoser endpoints)
- User management: `/api/user/`
- Patient management: `/api/pacientes/`
- Static files served from `/static/` and `/media/`

## Frontend Architecture
- **Redux Store**: Centralized state management in `src/store.js`
- **Route Protection**: Role-based access control via `PrivateRoute` and `RoleRoute` components
- **Components**: Organized by feature in `src/components/` and `src/containers/`
- **Styling**: Tailwind CSS with custom configuration

## Image Processing Pipeline
1. Upload retinal images through frontend
2. Backend processes images using TensorFlow model
3. Generates predictions (0-4 scale: Sin retinopatía to Proliferativa)
4. Creates GradCAM heatmaps for visualization
5. Stores results with confidence scores

## Development Notes
- Frontend runs on port 3000, backend on port 8000
- CORS configured for localhost development
- Media files uploaded to `/media/` directory
- Static files collected to `/static/` for production