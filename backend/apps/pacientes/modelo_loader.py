import os
import json
import tensorflow as tf
from django.conf import settings

# Construir rutas para el nuevo modelo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "modelos")
MODEL_PATH = os.path.join(MODELS_DIR, "retinopathy_model.keras")
GRADCAM_MODEL_PATH = os.path.join(MODELS_DIR, "retinopathy_model_gradcam.keras")
METADATA_PATH = os.path.join(MODELS_DIR, "retinopathy_model_metadata.json")

# Cargar metadata
model_metadata = {}
if os.path.exists(METADATA_PATH):
    try:
        with open(METADATA_PATH, 'r', encoding='utf-8') as f:
            model_metadata = json.load(f)
        print(f"✅ Metadata cargada: {model_metadata['model_name']} v{model_metadata['version']}")
    except Exception as e:
        print(f"⚠️ Error cargando metadata: {e}")

# Configuración desde metadata
IMG_SIZE = model_metadata.get('input_shape', [96, 96, 3])[0]
CLASS_NAMES = model_metadata.get('classes', ["No DR", "Mild", "Moderate", "Severe", "PDR"])

# Carga del modelo principal
modelo_cnn = None
if os.path.exists(MODEL_PATH):
    try:
        modelo_cnn = tf.keras.models.load_model(MODEL_PATH)
        print(f"✅ Modelo CNN cargado: {model_metadata.get('model_name', 'CNN')} ({IMG_SIZE}x{IMG_SIZE})")
    except Exception as e:
        print(f"❌ Error cargando modelo CNN: {e}")

# Carga del modelo GradCAM
modelo_gradcam = None
if os.path.exists(GRADCAM_MODEL_PATH):
    try:
        modelo_gradcam = tf.keras.models.load_model(GRADCAM_MODEL_PATH)
        print(f"✅ Modelo GradCAM cargado exitosamente")
    except Exception as e:
        print(f"⚠️ Error cargando modelo GradCAM: {e}")
        modelo_gradcam = modelo_cnn  # Fallback al modelo principal