"""
Puente temporal para GradCAM sin modelo Keras.
Genera mapas de calor basados en características de imagen.
"""
import numpy as np
import cv2
import base64
from PIL import Image
from io import BytesIO

def generate_mock_gradcam(image_array, prediction_result=None):
    """
    Genera un GradCAM simulado basado en características de la imagen.
    Temporal hasta que tengamos el modelo Keras compatible.
    """
    try:
        # Asegurar dimensiones correctas
        if image_array.ndim == 4:
            image_array = image_array[0]  # Remover batch dimension
        
        # Convertir a 96x96 si es necesario
        if image_array.shape[:2] != (96, 96):
            image_pil = Image.fromarray((image_array * 255).astype(np.uint8))
            image_pil = image_pil.resize((96, 96))
            image_array = np.array(image_pil) / 255.0
        
        # Generar heatmap basado en características visuales
        # Esto es temporal - será reemplazado por modelo real
        gray = cv2.cvtColor((image_array * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
        
        # Detectar bordes y características importantes
        edges = cv2.Canny(gray, 50, 150)
        
        # Aplicar filtros para simular activaciones convolutionales
        # Enfocarse en áreas con mayor variación (posibles lesiones)
        kernel = np.ones((5,5), np.float32) / 25
        blur = cv2.filter2D(gray, -1, kernel)
        
        # Combinar edges y blur para crear heatmap base
        heatmap_base = cv2.addWeighted(edges.astype(np.float32), 0.3, 
                                     (255 - blur).astype(np.float32), 0.7, 0)
        
        # Normalizar y aplicar suavizado
        heatmap_base = cv2.GaussianBlur(heatmap_base, (11, 11), 0)
        heatmap_base = (heatmap_base - heatmap_base.min()) / (heatmap_base.max() - heatmap_base.min() + 1e-8)
        
        # Aplicar colormap
        heatmap_colored = cv2.applyColorMap((heatmap_base * 255).astype(np.uint8), cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Superponer con imagen original
        original_uint8 = (image_array * 255).astype(np.uint8)
        superimposed = cv2.addWeighted(original_uint8, 0.6, heatmap_colored, 0.4, 0)
        
        # Convertir a base64
        img_pil = Image.fromarray(superimposed)
        buffer = BytesIO()
        img_pil.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return {
            "gradcam": img_base64,
            "mensaje": "GradCAM simulado generado (temporal)",
            "tipo": "simulado",
            "nota": "Basado en características visuales. Será reemplazado por modelo real."
        }
        
    except Exception as e:
        raise RuntimeError(f"Error generando GradCAM simulado: {str(e)}")


def generate_gradcam_from_tfjs_prediction(image_array, prediction_local):
    """
    Genera GradCAM combinando imagen con predicción local de TensorFlow.js
    """
    try:
        # Por ahora usar mock GradCAM mejorado
        result = generate_mock_gradcam(image_array, prediction_local)
        
        # Agregar información de la predicción local
        if prediction_local:
            result["prediccion_local"] = prediction_local
            result["mensaje"] = f"GradCAM para predicción clase {prediction_local.get('clase', 'N/A')}"
        
        return result
        
    except Exception as e:
        raise RuntimeError(f"Error en GradCAM híbrido: {str(e)}")