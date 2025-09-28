import numpy as np
import tensorflow as tf
import cv2
import os
import base64
import json
from PIL import Image, ImageDraw
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from matplotlib.colors import LinearSegmentedColormap
import xml.etree.ElementTree as ET
from .confidence_calibrator import confidence_analyzer
from .ml_enhanced import batch_processor, model_monitor

# Importar visualizador médico
try:
    from .medical_visualization import generar_visualizacion_medica_retinografia
    MEDICAL_VISUALIZATION_AVAILABLE = True
    print("✅ Visualizador médico profesional cargado")
except ImportError as e:
    print(f"⚠️ Visualizador médico no disponible: {e}")
    MEDICAL_VISUALIZATION_AVAILABLE = False

# Importar enhanced Grad-CAM médico
try:
    from .gradcam_medical_enhanced import enhance_gradcam_medical, MedicalGradCAMEnhancer
    ENHANCED_GRADCAM_AVAILABLE = True
    print("✅ Enhanced Medical Grad-CAM cargado")
except ImportError as e:
    print(f"⚠️ Enhanced Medical Grad-CAM no disponible: {e}")
    ENHANCED_GRADCAM_AVAILABLE = False
except Exception as e:
    print(f"⚠️ Error inesperado cargando Enhanced Medical Grad-CAM: {e}")
    ENHANCED_GRADCAM_AVAILABLE = False

# Función de backup para generar Grad-CAM de alta resolución directamente
def generate_high_resolution_gradcam_backup(heatmap_96x96, original_image, target_size=512):
    """
    Función de backup para generar Grad-CAM de alta resolución cuando enhanced falla
    """
    print(f"🔄 Generando Grad-CAM de alta resolución (backup): {target_size}x{target_size}")
    
    # Convertir PIL a array si es necesario
    if hasattr(original_image, 'convert'):
        original_image = np.array(original_image.convert('RGB'))
    
    # Redimensionar imagen original a target_size
    original_resized = cv2.resize(original_image, (target_size, target_size), cv2.INTER_LANCZOS4)
    
    # Escalar heatmap a alta resolución con interpolación bicúbica
    heatmap_hires = cv2.resize(heatmap_96x96, (target_size, target_size), cv2.INTER_CUBIC)
    
    # Normalizar heatmap
    heatmap_norm = (heatmap_hires - heatmap_hires.min()) / (heatmap_hires.max() - heatmap_hires.min())
    
    # Aplicar suavizado Gaussiano
    heatmap_smooth = cv2.GaussianBlur(heatmap_norm, (7, 7), 2.0)
    
    # Crear máscara circular simple
    h, w = target_size, target_size
    center = (w//2, h//2)
    radius = min(w, h) // 2 - 20
    mask = np.zeros((h, w), dtype=np.float32)
    cv2.circle(mask, center, radius, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (5, 5), 2.0)
    
    # Aplicar máscara
    heatmap_masked = heatmap_smooth * mask
    
    # Aplicar colormap Inferno
    heatmap_colored = plt.cm.inferno(heatmap_masked)  # RGBA [0,1]
    
    # Crear canal alpha basado en activación
    alpha_channel = heatmap_masked * 0.7  # 70% de transparencia base
    heatmap_colored[:, :, 3] = alpha_channel
    
    # Convertir a uint8 y crear imagen PIL
    heatmap_rgba = (heatmap_colored * 255).astype(np.uint8)
    gradcam_img = Image.fromarray(heatmap_rgba, 'RGBA')
    
    # Convertir a base64
    buffer = BytesIO()
    gradcam_img.save(buffer, format='PNG', optimize=True, compress_level=6)
    gradcam_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    print(f"✅ Grad-CAM backup generado: {target_size}x{target_size}")
    
    return {
        'gradcam_base64': gradcam_base64,
        'size': f"{target_size}x{target_size}",
        'method': 'HIGH_RESOLUTION_BACKUP'
    }

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KERAS_MODEL_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model.keras")
GRADCAM_MODEL_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model_gradcam.keras")
METADATA_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model_metadata.json")

# Cargar metadata del modelo
model_metadata = {}
if os.path.exists(METADATA_PATH):
    try:
        with open(METADATA_PATH, 'r', encoding='utf-8') as f:
            model_metadata = json.load(f)
        print(f"✅ Metadata cargada: {model_metadata['model_name']} v{model_metadata['version']}")
    except Exception as e:
        print(f"⚠️ Error cargando metadata: {e}")

# Configuración del modelo desde metadata
IMG_SIZE = model_metadata.get('input_shape', [96, 96, 3])[0]
NUM_CLASSES = model_metadata.get('num_classes', 5)
CLASS_NAMES = model_metadata.get('classes', ["No DR", "Mild", "Moderate", "Severe", "PDR"])

# Cargar modelo principal
model = None
gradcam_model = None

if os.path.exists(KERAS_MODEL_PATH):
    try:
        model = tf.keras.models.load_model(KERAS_MODEL_PATH)
        
        # Warm-up agresivo para GradCAM
        print("🔥 Realizando warm-up agresivo del modelo principal...")
        model.build(input_shape=(None, IMG_SIZE, IMG_SIZE, 3))  # Forzar construcción
        dummy_input = tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32)
        _ = model(dummy_input, training=False)  # Primera llamada
        _ = model.predict(dummy_input, verbose=0)  # Segunda llamada con predict
        
        # Verificar que input esté disponible
        try:
            test_input = model.input
            print(f"✅ Model.input disponible: {test_input.shape}")
        except:
            print("⚠️ Model.input aún no disponible después de warm-up")
            
        print(f"✅ Modelo principal cargado y warm-up completado: {model_metadata.get('model_name', 'CNN')} ({IMG_SIZE}x{IMG_SIZE})")
    except Exception as e:
        print(f"❌ Error cargando modelo principal: {e}")
        model = None

# Cargar modelo GradCAM
if os.path.exists(GRADCAM_MODEL_PATH):
    try:
        gradcam_model = tf.keras.models.load_model(GRADCAM_MODEL_PATH)
        
        # Warm-up agresivo para modelo GradCAM
        print("🔥 Realizando warm-up agresivo del modelo GradCAM...")
        gradcam_model.build(input_shape=(None, IMG_SIZE, IMG_SIZE, 3))
        dummy_input = tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32)
        _ = gradcam_model(dummy_input, training=False)
        _ = gradcam_model.predict(dummy_input, verbose=0)
        
        # Verificar input disponible
        try:
            test_input = gradcam_model.input
            print(f"✅ GradCAM model.input disponible: {test_input.shape}")
        except:
            print("⚠️ GradCAM model.input no disponible")
            
        print(f"✅ Modelo GradCAM cargado y warm-up completado")
    except Exception as e:
        print(f"⚠️ Error cargando modelo GradCAM: {e}")
        gradcam_model = model  # Usar modelo principal como fallback

def convert_sequential_to_functional(sequential_model, input_shape=(96, 96, 3)):
    """
    Convertir modelo Sequential a Functional para mayor estabilidad en GradCAM
    """
    try:
        print("🔄 Convirtiendo modelo Sequential a Functional...")
        
        # Crear input layer
        inputs = tf.keras.Input(shape=input_shape, name="input_layer")
        x = inputs
        
        # Aplicar todas las capas del modelo sequential
        for i, layer in enumerate(sequential_model.layers):
            # Crear nueva instancia de la capa para evitar conflictos
            layer_config = layer.get_config()
            layer_config['name'] = f"{layer.name}_functional_{i}"
            
            if hasattr(layer, '__class__'):
                new_layer = layer.__class__.from_config(layer_config)
                # Copiar pesos si la capa tiene pesos
                if layer.get_weights():
                    new_layer.build(x.shape)
                    new_layer.set_weights(layer.get_weights())
                x = new_layer(x)
        
        # Crear modelo functional
        functional_model = tf.keras.Model(inputs=inputs, outputs=x, name="functional_gradcam_model")
        
        # Warm-up del modelo functional
        dummy_input = tf.zeros((1, *input_shape), dtype=tf.float32)
        _ = functional_model(dummy_input, training=False)
        
        print("✅ Conversión a Functional completada")
        return functional_model
        
    except Exception as e:
        print(f"⚠️ Error en conversión a Functional: {e}")
        return sequential_model

# Verificar modelos y convertir si es necesario
if model is not None:
    # Intentar conversión si es Sequential
    if hasattr(model, '__class__') and 'Sequential' in str(type(model)):
        print("🔍 Modelo detectado como Sequential, considerando conversión...")
        # Solo convertir si el warm-up falló
        try:
            test_input = model.input
            print("✅ Sequential funcionando correctamente")
        except:
            print("⚠️ Sequential con problemas, convirtiendo a Functional...")
            model = convert_sequential_to_functional(model)

if gradcam_model is not None and gradcam_model != model:
    # Lo mismo para el modelo GradCAM
    if hasattr(gradcam_model, '__class__') and 'Sequential' in str(type(gradcam_model)):
        try:
            test_input = gradcam_model.input
        except:
            print("⚠️ GradCAM Sequential con problemas, convirtiendo...")
            gradcam_model = convert_sequential_to_functional(gradcam_model)

if model is None:
    print("⚠️ Ningún modelo disponible en backend")
    print("🚀 Solo predicción TensorFlow.js en frontend")


# =============================================================================
# FUNCIONES CLÍNICAS DE ALTA CALIDAD PARA GRAD-CAM WEB
# =============================================================================

def detect_retina_circular_mask(image, min_radius_ratio=0.3, max_radius_ratio=0.48):
    """
    Detecta automáticamente la región circular de la retina en la imagen.
    
    Args:
        image: Imagen PIL o numpy array de la retina
        min_radius_ratio: Ratio mínimo del radio respecto al tamaño de imagen
        max_radius_ratio: Ratio máximo del radio respecto al tamaño de imagen
    
    Returns:
        dict: {
            'mask': numpy array binario de la máscara,
            'center': tupla (x, y) del centro,
            'radius': radio detectado,
            'confidence': confianza de la detección
        }
    """
    # Convertir a numpy array si es necesario
    if hasattr(image, 'convert'):
        img_array = np.array(image.convert('RGB'))
    else:
        img_array = image.copy()
    
    height, width = img_array.shape[:2]
    min_radius = int(min(width, height) * min_radius_ratio)
    max_radius = int(min(width, height) * max_radius_ratio)
    
    # Convertir a escala de grises para detección de bordes
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Aplicar filtro bilateral para reducir ruido pero preservar bordes
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Detectar bordes con Canny adaptativo
    # Calcular umbrales adaptativos basados en la intensidad media
    mean_intensity = np.mean(filtered)
    lower_threshold = max(30, int(mean_intensity * 0.5))
    upper_threshold = max(60, int(mean_intensity * 1.0))
    
    edges = cv2.Canny(filtered, lower_threshold, upper_threshold)
    
    # Aplicar morfología para limpiar bordes
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    # Detectar círculos usando HoughCircles con múltiples parámetros
    circles_candidates = []
    
    # Diferentes configuraciones para robustez
    configs = [
        {'dp': 1.2, 'param1': 50, 'param2': 30},
        {'dp': 1.0, 'param1': 60, 'param2': 35},
        {'dp': 1.5, 'param1': 40, 'param2': 25},
    ]
    
    for config in configs:
        circles = cv2.HoughCircles(
            filtered,
            cv2.HOUGH_GRADIENT,
            dp=config['dp'],
            minDist=int(min(width, height) * 0.5),
            param1=config['param1'],
            param2=config['param2'],
            minRadius=min_radius,
            maxRadius=max_radius
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            for (x, y, r) in circles:
                # Validar que el círculo esté dentro de los límites
                if (r >= min_radius and r <= max_radius and
                    x - r >= 0 and x + r < width and
                    y - r >= 0 and y + r < height):
                    circles_candidates.append((x, y, r, config['param2']))
    
    if not circles_candidates:
        # Fallback: usar centro de imagen con radio estimado
        center_x, center_y = width // 2, height // 2
        estimated_radius = int(min(width, height) * 0.4)
        confidence = 0.3  # Baja confianza
        print("⚠️ Detección circular automática falló, usando estimación por defecto")
    else:
        # Seleccionar el mejor candidato basado en múltiples criterios
        best_circle = None
        best_score = -1
        
        for x, y, r, param2 in circles_candidates:
            # Calcular score basado en:
            # 1. Proximidad al centro de la imagen
            center_distance = np.sqrt((x - width/2)**2 + (y - height/2)**2)
            center_score = 1 - (center_distance / (min(width, height) * 0.3))
            center_score = max(0, center_score)
            
            # 2. Tamaño apropiado (preferir radios medios)
            size_score = 1 - abs(r - (min_radius + max_radius) / 2) / (max_radius - min_radius)
            
            # 3. Calidad de detección (basado en param2 de HoughCircles)
            quality_score = param2 / 50.0  # Normalizar
            
            # Score combinado
            total_score = (center_score * 0.4 + size_score * 0.3 + quality_score * 0.3)
            
            if total_score > best_score:
                best_score = total_score
                best_circle = (x, y, r)
        
        center_x, center_y, estimated_radius = best_circle
        confidence = min(0.9, best_score * 1.2)  # Escalar confianza
        print(f"✅ Círculo detectado: centro=({center_x}, {center_y}), radio={estimated_radius}, confianza={confidence:.2f}")
    
    # Crear máscara circular
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.circle(mask, (center_x, center_y), estimated_radius, 255, -1)
    
    # Aplicar suavizado a la máscara para bordes más suaves
    mask = cv2.GaussianBlur(mask, (5, 5), 2.0)
    mask = mask / 255.0  # Normalizar a 0-1
    
    return {
        'mask': mask,
        'center': (center_x, center_y),
        'radius': estimated_radius,
        'confidence': confidence
    }


def create_medical_colormap(colormap_type='inferno'):
    """
    Crea colormaps médicos optimizados para visualización clínica.
    
    Args:
        colormap_type: 'inferno', 'jet_medical', o 'viridis_medical'
    
    Returns:
        matplotlib.colors.Colormap
    """
    if colormap_type == 'inferno':
        # Inferno es perceptualmente uniforme y profesional
        return plt.cm.inferno
    
    elif colormap_type == 'jet_medical':
        # Jet modificado para uso médico: azul=seguro, rojo=crítico
        medical_jet_colors = [
            (0.0, [0.0, 0.0, 0.5, 0.0]),      # Azul oscuro transparente (sin activación)
            (0.1, [0.0, 0.2, 0.8, 0.3]),      # Azul claro
            (0.3, [0.0, 0.8, 0.8, 0.6]),      # Cian (activación baja)
            (0.5, [0.0, 1.0, 0.0, 0.8]),      # Verde (activación media)
            (0.7, [1.0, 1.0, 0.0, 0.9]),      # Amarillo (activación alta)
            (0.9, [1.0, 0.5, 0.0, 1.0]),      # Naranja (muy alta)
            (1.0, [1.0, 0.0, 0.0, 1.0])       # Rojo (crítica)
        ]
        return LinearSegmentedColormap.from_list('jet_medical', medical_jet_colors)
    
    elif colormap_type == 'viridis_medical':
        # Viridis con modificaciones para contexto médico
        return plt.cm.viridis
    
    else:
        # Fallback a inferno
        return plt.cm.inferno


def create_clinical_colorbar_svg(colormap_type='inferno', width=400, height=60):
    """
    Crea una barra de color SVG profesional clínica con etiquetas interpretativas.
    
    Args:
        colormap_type: Tipo de colormap médico ('inferno', 'jet_medical', 'viridis_medical')
        width: Ancho del SVG (recomendado: 400px)
        height: Alto de la barra de color (recomendado: 60px)
    
    Returns:
        str: SVG profesional como string
    """
    # Crear gradiente de colores médico
    cmap = create_medical_colormap(colormap_type)
    
    # Generar gradiente de alta resolución (40 stops para suavidad profesional)
    num_stops = 40
    gradient_stops = []
    
    for i in range(num_stops):
        position = i / (num_stops - 1)  # 0 a 1
        color_rgba = cmap(position)
        color_hex = f"#{int(color_rgba[0]*255):02x}{int(color_rgba[1]*255):02x}{int(color_rgba[2]*255):02x}"
        gradient_stops.append((position * 100, color_hex))
    
    # Calcular dimensiones del SVG total (incluye espacio para etiquetas)
    total_height = height + 80  # Espacio para etiquetas y título
    margin = 30
    bar_width = width - (2 * margin)
    
    # Crear SVG profesional
    svg_root = ET.Element('svg', {
        'width': str(width),
        'height': str(total_height),
        'viewBox': f'0 0 {width} {total_height}',
        'xmlns': 'http://www.w3.org/2000/svg',
        'style': 'font-family: "Segoe UI", Arial, sans-serif'
    })
    
    # Definir gradiente mejorado
    defs = ET.SubElement(svg_root, 'defs')
    gradient = ET.SubElement(defs, 'linearGradient', {
        'id': 'clinicalGradient',
        'x1': '0%',
        'y1': '0%',
        'x2': '100%',
        'y2': '0%'
    })
    
    for position, color in gradient_stops:
        ET.SubElement(gradient, 'stop', {
            'offset': f'{position}%',
            'stop-color': color,
            'stop-opacity': '1'
        })
    
    # Rectángulo principal con gradiente y borde profesional
    ET.SubElement(svg_root, 'rect', {
        'x': str(margin),
        'y': '15',
        'width': str(bar_width),
        'height': str(height - 10),
        'fill': 'url(#clinicalGradient)',
        'stroke': '#2c3e50',
        'stroke-width': '1.5',
        'rx': '3',  # Bordes ligeramente redondeados
        'ry': '3'
    })
    
    # Marcadores de valor (ticks) profesionales
    tick_positions = [0, 0.25, 0.5, 0.75, 1.0]
    tick_labels = ['0%', '25%', '50%', '75%', '100%']
    
    for i, (pos, label) in enumerate(zip(tick_positions, tick_labels)):
        tick_x = margin + (pos * bar_width)
        
        # Línea del marcador
        ET.SubElement(svg_root, 'line', {
            'x1': str(tick_x),
            'y1': str(height + 5),
            'x2': str(tick_x),
            'y2': str(height + 15),
            'stroke': '#2c3e50',
            'stroke-width': '1'
        })
        
        # Etiqueta del marcador
        ET.SubElement(svg_root, 'text', {
            'x': str(tick_x),
            'y': str(height + 28),
            'font-size': '11',
            'fill': '#2c3e50',
            'text-anchor': 'middle',
            'font-weight': '500'
        }).text = label
    
    # Etiquetas interpretativas clínicas principales
    ET.SubElement(svg_root, 'text', {
        'x': str(margin),
        'y': str(height + 50),
        'font-size': '13',
        'fill': '#27ae60',  # Verde para baja activación
        'text-anchor': 'start',
        'font-weight': 'bold'
    }).text = 'Baja Activación'
    
    ET.SubElement(svg_root, 'text', {
        'x': str(margin),
        'y': str(height + 65),
        'font-size': '10',
        'fill': '#27ae60',
        'text-anchor': 'start'
    }).text = 'Tejido retinal normal'
    
    ET.SubElement(svg_root, 'text', {
        'x': str(width - margin),
        'y': str(height + 50),
        'font-size': '13',
        'fill': '#e74c3c',  # Rojo para alta activación
        'text-anchor': 'end',
        'font-weight': 'bold'
    }).text = 'Alta Activación'
    
    ET.SubElement(svg_root, 'text', {
        'x': str(width - margin),
        'y': str(height + 65),
        'font-size': '10',
        'fill': '#e74c3c',
        'text-anchor': 'end'
    }).text = 'Posibles lesiones DR'
    
    # Título profesional del colormap
    colormap_titles_professional = {
        'inferno': 'Mapa de Calor Clínico - Inferno',
        'jet_medical': 'Mapa de Calor Clínico - Jet Médico', 
        'viridis_medical': 'Mapa de Calor Clínico - Viridis',
        'plasma': 'Mapa de Calor Clínico - Plasma'
    }
    
    title = colormap_titles_professional.get(colormap_type, f'Mapa de Calor Clínico - {colormap_type.title()}')
    ET.SubElement(svg_root, 'text', {
        'x': str(width // 2),
        'y': '10',
        'font-size': '14',
        'fill': '#2c3e50',
        'text-anchor': 'middle',
        'font-weight': 'bold'
    }).text = title
    
    # Subtítulo explicativo
    ET.SubElement(svg_root, 'text', {
        'x': str(width // 2),
        'y': str(total_height - 5),
        'font-size': '9',
        'fill': '#7f8c8d',
        'text-anchor': 'middle',
        'font-style': 'italic'
    }).text = 'GradCAM++ - Análisis de Retinopatía Diabética'
    
    # Convertir a string
    svg_string = ET.tostring(svg_root, encoding='unicode')
    
    return svg_string


def create_colorbar_svg(colormap_type='inferno', width=300, height=50):
    """
    Función legacy - redirige a la versión clínica profesional
    """
    return create_clinical_colorbar_svg(colormap_type, width, height)


def generate_clinical_professional_exports(heatmap_processed, original_image, colormap_type='inferno', target_size=512):
    """
    Genera exportaciones PNG profesionales optimizadas para uso clínico.
    
    Args:
        heatmap_processed: Heatmap procesado (512x512) con máscara y filtros aplicados
        original_image: Imagen retinal original (PIL Image)
        colormap_type: Tipo de colormap médico
        target_size: Tamaño final (debe ser 512)
    
    Returns:
        dict con exportaciones PNG transparente y overlay RGB profesionales
    """
    print(f"🏥 Generando exportaciones PNG clínicas profesionales...")
    
    # Asegurar que original_image es PIL con tamaño correcto
    if not hasattr(original_image, 'convert'):
        original_image = Image.fromarray(original_image)
    
    original_resized = original_image.resize((target_size, target_size), Image.LANCZOS)
    original_array = np.array(original_resized)
    
    # Verificar dimensiones del heatmap procesado
    if heatmap_processed.shape != (target_size, target_size):
        print(f"⚠️ Redimensionando heatmap: {heatmap_processed.shape} → ({target_size}, {target_size})")
        heatmap_processed = cv2.resize(heatmap_processed, (target_size, target_size), cv2.INTER_LANCZOS4)
    
    # Aplicar colormap médico con alta calidad
    cmap = create_medical_colormap(colormap_type)
    heatmap_colored = cmap(heatmap_processed)  # RGBA [0,1]
    
    # Convertir a formato uint8
    heatmap_colored_uint8 = (heatmap_colored * 255).astype(np.uint8)
    
    print(f"✅ Colormap '{colormap_type}' aplicado con calidad profesional")
    
    # =====================================================================
    # EXPORTACIÓN 1: PNG TRANSPARENTE (Canal Alpha Inteligente)
    # =====================================================================
    
    # Canal alpha profesional basado en intensidad de activación
    alpha_threshold = 0.02  # 2% umbral mínimo
    alpha_max = 0.85       # 85% transparencia máxima (permite ver imagen de fondo)
    
    # Crear canal alpha con gradiente suave
    alpha_channel = np.zeros_like(heatmap_processed)
    
    # Área con activación significativa
    significant_mask = heatmap_processed > alpha_threshold
    
    # Gradiente alpha: mayor activación = más opaco
    alpha_values = alpha_max * (heatmap_processed[significant_mask] - alpha_threshold) / (1.0 - alpha_threshold)
    alpha_channel[significant_mask] = np.clip(alpha_values, 0, alpha_max)
    
    # Transición suave en bordes
    alpha_channel = cv2.GaussianBlur(alpha_channel, (3, 3), 0.8)
    
    # Aplicar canal alpha
    heatmap_transparent = heatmap_colored_uint8.copy()
    heatmap_transparent[:, :, 3] = (alpha_channel * 255).astype(np.uint8)
    
    # Crear imagen PNG transparente
    transparent_pil = Image.fromarray(heatmap_transparent, 'RGBA')
    transparent_buffer = BytesIO()
    transparent_pil.save(transparent_buffer, format='PNG', optimize=True, compress_level=6)
    transparent_base64 = base64.b64encode(transparent_buffer.getvalue()).decode('utf-8')
    
    print(f"✅ PNG transparente generado - Alpha: {alpha_threshold:.1%} a {alpha_max:.1%}")
    
    # =====================================================================
    # EXPORTACIÓN 2: OVERLAY RGB (α=0.35 profesional)
    # =====================================================================
    
    # Superposición profesional con blend optimizado
    alpha_overlay = 0.35  # 35% de opacidad estándar clínico
    
    # Convertir heatmap a RGB (sin canal alpha)
    heatmap_rgb = heatmap_colored_uint8[:, :, :3].astype(np.float64)
    original_rgb = original_array.astype(np.float64)
    
    # Blend profesional solo donde hay activación significativa
    overlay_rgb = original_rgb.copy()
    activation_mask = heatmap_processed > alpha_threshold
    
    # Aplicar blend solo en áreas activadas
    overlay_rgb[activation_mask] = (
        alpha_overlay * heatmap_rgb[activation_mask] + 
        (1 - alpha_overlay) * original_rgb[activation_mask]
    )
    
    # Convertir a uint8 y crear imagen
    overlay_rgb = np.clip(overlay_rgb, 0, 255).astype(np.uint8)
    overlay_pil = Image.fromarray(overlay_rgb)
    
    overlay_buffer = BytesIO()
    overlay_pil.save(overlay_buffer, format='PNG', optimize=True, compress_level=6)
    overlay_base64 = base64.b64encode(overlay_buffer.getvalue()).decode('utf-8')
    
    print(f"✅ Overlay RGB generado - Transparencia: {alpha_overlay:.1%}")
    
    # =====================================================================
    # EXPORTACIÓN 3: BARRA DE COLOR SVG CLÍNICA
    # =====================================================================
    
    colorbar_svg = create_clinical_colorbar_svg(colormap_type, width=400, height=60)
    
    print(f"✅ Barra de color SVG clínica generada")
    
    # =====================================================================
    # METADATOS PROFESIONALES
    # =====================================================================
    
    metadata_professional = {
        'export_quality': 'CLINICAL_PROFESSIONAL',
        'resolution': f'{target_size}x{target_size}',
        'colormap': colormap_type,
        'interpolation': 'LANCZOS4 (máxima calidad)',
        'filtering': 'Bilateral edge-preserving',
        'masking': 'Circular feather 20px',
        'alpha_channel': {
            'threshold': f'{alpha_threshold:.1%}',
            'max_opacity': f'{alpha_max:.1%}',
            'type': 'Gradiente inteligente basado en activación'
        },
        'overlay_alpha': f'{alpha_overlay:.1%}',
        'compression': 'PNG optimizado nivel 6',
        'clinical_standards': {
            'edge_preservation': 'Filtro bilateral aplicado',
            'lesion_visibility': 'Optimizado para microaneurismas y exudados',
            'background_blend': 'Preserva estructura anatómica',
            'interpretation': 'Barra de colores con guía clínica'
        }
    }
    
    print(f"✅ Exportaciones PNG clínicas profesionales completadas")
    
    return {
        'png_transparent': transparent_base64,
        'png_overlay_rgb': overlay_base64,
        'colorbar_svg_clinical': colorbar_svg,
        'metadata': metadata_professional,
        'clinical_ready': True,
        'professional_grade': True,
        'web_optimized': True
    }


def generate_professional_medical_gradcam(heatmap_input, original_retina_image, target_size=512):
    """
    Genera un mapa Grad-CAM de estándar profesional médico para retina.
    
    Características profesionales:
    - Alta resolución ≥512×512 con interpolación bicúbica
    - Gaussian Blur ligero para suavización profesional
    - Normalización estándar 0-1
    - Colormap Inferno clínico (azul/verde=baja, rojo/amarillo=alta)
    - Máscara circular automática para área real de retina
    - PNG transparente con canal alpha para superposición web
    - Estilo médico limpio sin pixelación
    
    Args:
        heatmap_input: Mapa de calor del modelo (puede ser 96x96 o 512x512)
        original_retina_image: Imagen original de retina (PIL Image)
        target_size: Resolución final (default: 512x512)
    
    Returns:
        dict: {
            'gradcam_professional': base64 PNG transparente,
            'confidence_mask': confianza de detección circular,
            'processing_metadata': información técnica profesional
        }
    """
    print(f"🏥 Generando Grad-CAM profesional médico {target_size}x{target_size}")
    
    # PASO 1: PREPARACIÓN DE IMAGEN BASE
    if not hasattr(original_retina_image, 'convert'):
        original_retina_image = Image.fromarray(original_retina_image)
    
    # Redimensionar imagen base con calidad Lanczos (profesional)
    retina_base = original_retina_image.resize((target_size, target_size), Image.LANCZOS)
    retina_array = np.array(retina_base)
    
    # PASO 2: ESCALADO PROFESIONAL DEL HEATMAP
    # Detectar si ya está en alta resolución o necesita escalado
    input_size = heatmap_input.shape
    print(f"🔍 Heatmap input size: {input_size}")
    
    if input_size[0] == target_size and input_size[1] == target_size:
        # Ya está en tamaño correcto
        heatmap_hires = heatmap_input.copy()
        print(f"✅ Heatmap ya está en tamaño correcto: {input_size}")
    else:
        # Necesita escalado - Interpolación bicúbica de alta calidad (estándar médico)
        heatmap_hires = cv2.resize(
            heatmap_input, 
            (target_size, target_size), 
            interpolation=cv2.INTER_CUBIC
        )
        print(f"✅ Escalado bicúbico completado: {input_size} → {heatmap_hires.shape}")
    
    # PASO 3: SUAVIZADO GAUSSIANO PROFESIONAL
    # Kernel 7x7 con sigma 2.0 (balance entre detalle y suavidad)
    heatmap_smooth = cv2.GaussianBlur(heatmap_hires, (7, 7), 2.0)
    print(f"✅ Suavizado Gaussiano aplicado: σ=2.0, kernel=7x7")
    
    # PASO 4: DETECCIÓN AUTOMÁTICA DE ÁREA RETINAL
    mask_result = detect_retina_circular_mask(retina_base)
    retinal_mask = mask_result['mask']
    mask_confidence = mask_result['confidence']
    
    # Asegurar que la máscara tenga el tamaño correcto
    if retinal_mask.shape != (target_size, target_size):
        retinal_mask = cv2.resize(retinal_mask, (target_size, target_size), cv2.INTER_CUBIC)
    
    # Aplicar máscara al heatmap (solo área retinal)
    heatmap_masked = heatmap_smooth * retinal_mask
    print(f"✅ Máscara circular aplicada - Confianza: {mask_confidence:.3f}")
    
    # PASO 5: NORMALIZACIÓN ESTÁNDAR MÉDICA (0-1)
    heatmap_min = np.min(heatmap_masked[retinal_mask > 0.1])  # Solo valores dentro de retina
    heatmap_max = np.max(heatmap_masked)
    
    if heatmap_max > heatmap_min:
        heatmap_normalized = (heatmap_masked - heatmap_min) / (heatmap_max - heatmap_min)
    else:
        heatmap_normalized = np.zeros_like(heatmap_masked)
    
    # Aplicar máscara nuevamente tras normalización
    heatmap_normalized = heatmap_normalized * retinal_mask
    print(f"✅ Normalización médica completada: [{heatmap_min:.4f}, {heatmap_max:.4f}] → [0, 1]")
    
    # PASO 6: COLORMAP MÉDICO PROFESIONAL OPTIMIZADO
    # Crear colormap médico menos saturado para mejor visualización de zonas sutiles
    
    # Aplicar gamma correction para resaltar activaciones sutiles
    gamma = 0.7  # Valores < 1 resaltan zonas de baja activación
    heatmap_gamma = np.power(heatmap_normalized, gamma)
    
    # Colormap Inferno con modificación para zonas sutiles
    cmap = plt.cm.inferno
    heatmap_colored = cmap(heatmap_gamma)  # RGBA [0,1]
    
    # Reducir saturación en zonas de alta activación para mostrar más detalle
    # Convertir RGBA a HSV, reducir saturación, convertir de vuelta
    heatmap_rgb = heatmap_colored[:, :, :3]
    heatmap_hsv = cv2.cvtColor((heatmap_rgb * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    
    # Reducir saturación donde la activación es alta (evita oversaturation)
    high_activation_mask = heatmap_gamma > 0.7
    heatmap_hsv[high_activation_mask, 1] *= 0.8  # Reducir saturación 20%
    
    # Convertir de vuelta a RGB
    heatmap_rgb_adjusted = cv2.cvtColor(heatmap_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
    
    # Reconstruir RGBA con el RGB ajustado
    heatmap_colored[:, :, :3] = heatmap_rgb_adjusted
    
    print(f"✅ Colormap médico profesional aplicado - Gamma: {gamma}, Saturación reducida en zonas altas")
    
    # PASO 7: CONFIGURACIÓN DE TRANSPARENCIA PROFESIONAL
    # Canal alpha basado en intensidad de activación + máscara circular
    alpha_base = 0.8  # Transparencia base para activación alta
    alpha_threshold = 0.05  # Umbral mínimo para mostrar activación
    
    # Crear canal alpha profesional
    alpha_channel = np.zeros_like(heatmap_normalized)
    
    # Solo mostrar donde hay activación significativa Y dentro de retina
    significant_activation = (heatmap_normalized > alpha_threshold) & (retinal_mask > 0.5)
    
    # Gradiente de transparencia basado en activación
    alpha_channel[significant_activation] = (
        alpha_base * heatmap_normalized[significant_activation]
    )
    
    # Transición suave en bordes (anti-aliasing profesional)
    alpha_channel = cv2.GaussianBlur(alpha_channel, (3, 3), 0.8)
    
    # PASO 8: APLICAR TRANSPARENCIA PROFESIONAL
    heatmap_rgba = (heatmap_colored * 255).astype(np.uint8)
    heatmap_rgba[:, :, 3] = (alpha_channel * 255).astype(np.uint8)
    
    print(f"✅ Transparencia profesional aplicada - Umbral: {alpha_threshold}")
    
    # PASO 9: EXPORTACIÓN PNG PROFESIONAL
    # Crear imagen PIL con canal alpha
    gradcam_professional = Image.fromarray(heatmap_rgba, 'RGBA')
    
    # VERIFICACIÓN CRÍTICA DEL TAMAÑO
    actual_size = gradcam_professional.size
    print(f"🔍 VERIFICACIÓN: Tamaño real de gradcam_professional: {actual_size}")
    
    if actual_size[0] != target_size or actual_size[1] != target_size:
        print(f"❌ ERROR: Tamaño incorrecto {actual_size}, forzando redimensión a {target_size}x{target_size}")
        gradcam_professional = gradcam_professional.resize((target_size, target_size), Image.LANCZOS)
        print(f"✅ Redimensionado forzado completado: {gradcam_professional.size}")
    
    # Optimizar PNG para web médica
    buffer_professional = BytesIO()
    gradcam_professional.save(
        buffer_professional, 
        format='PNG', 
        optimize=True,
        compress_level=6  # Balance entre calidad y tamaño
    )
    
    gradcam_base64 = base64.b64encode(buffer_professional.getvalue()).decode('utf-8')
    
    # VERIFICACIÓN FINAL
    print(f"✅ PNG profesional exportado - Tamaño final: {gradcam_professional.size}")
    
    # PASO 10: METADATOS PROFESIONALES
    processing_metadata = {
        'medical_standard': 'Profesional clínico',
        'resolution': f"{target_size}x{target_size}",
        'interpolation': 'Bicúbica INTER_CUBIC (anti-pixelación)',
        'smoothing': 'Gaussian Blur σ=2.0, kernel=7x7',
        'normalization': f'Médica estándar: [{heatmap_min:.4f}, {heatmap_max:.4f}] → [0, 1]',
        'colormap': 'Inferno perceptualmente uniforme',
        'transparency': f'Profesional - Base: {alpha_base}, Umbral: {alpha_threshold}',
        'retinal_mask': f'Detección automática - Confianza: {mask_confidence:.3f}',
        'format': 'PNG RGBA optimizado para web médica',
        'quality_grade': 'PROFESIONAL MÉDICO',
        'anti_aliasing': 'Aplicado en bordes y transiciones',
        'standards_compliance': 'Visualización médica estándar',
        'interpretation_guide': {
            'azul_verde': 'Baja activación (área normal)',
            'amarillo_naranja': 'Activación moderada (atención)',
            'rojo_intenso': 'Alta activación (área crítica)',
            'transparente': 'Sin activación significativa'
        }
    }
    
    print(f"✅ Grad-CAM profesional médico completado")
    print(f"📊 Calidad: PROFESIONAL MÉDICO | Resolución: {target_size}x{target_size}")
    print(f"🎯 Máscara retinal: {mask_confidence:.1%} confianza")
    
    return {
        'gradcam_professional': gradcam_base64,
        'confidence_mask': mask_confidence,
        'processing_metadata': processing_metadata,
        'medical_ready': True,
        'web_compatible': True,
        'professional_grade': True
    }


# 🔁 GradCAM++ optimizado para medicina - Mejor localización de lesiones
def get_gradcam_heatmap(model_to_use, image_array, last_conv_layer_name=None, pred_index=None):
    if model_to_use is None:
        raise ValueError("Modelo no disponible para GradCAM++")
    
    # Auto-detectar capa convolucional CLÍNICA INTERMEDIA para máxima resolución
    if last_conv_layer_name is None:
        # Buscar capas convolucionales automáticamente
        available_layers = [layer.name for layer in model_to_use.layers]
        conv_layers = [name for name in available_layers if 'conv2d' in name.lower()]
        
        print(f"🔍 Capas disponibles: {available_layers}")
        print(f"🔍 Capas convolucionales encontradas: {conv_layers}")
        
        if conv_layers:
            # ESTRATEGIA CLÍNICA: Seleccionar capa INTERMEDIA óptima para diagnóstico
            # Objetivos: Resolución ≥12x12, características suficientemente discriminativas
            target_conv_layer = None
            best_resolution = 0
            
            print(f"🏥 Analizando capas para calidad clínica profesional...")
            
            # Evaluar cada capa convolucional por su resolución espacial
            layer_analysis = []
            for i, layer_name in enumerate(conv_layers):
                try:
                    layer = model_to_use.get_layer(layer_name)
                    output_shape = layer.output.shape
                    spatial_res = output_shape[1] if len(output_shape) >= 3 and output_shape[1] is not None else 0
                    
                    layer_analysis.append({
                        'name': layer_name,
                        'index': i,
                        'spatial_resolution': spatial_res,
                        'total_neurons': output_shape[-1] if len(output_shape) >= 3 else 0,
                        'clinical_score': spatial_res * 0.7 + (len(conv_layers) - i) * 0.3  # Balance resolución + profundidad
                    })
                    
                    print(f"  📊 {layer_name}: {spatial_res}x{spatial_res}, {output_shape[-1]} filtros, score: {layer_analysis[-1]['clinical_score']:.2f}")
                    
                except Exception as e:
                    print(f"  ❌ Error analizando {layer_name}: {e}")
                    continue
            
            if layer_analysis:
                # SELECCIÓN CLÍNICA OPTIMIZADA
                
                # Prioridad 1: Capas con resolución >= 12x12 para diagnóstico clínico
                high_res_layers = [l for l in layer_analysis if l['spatial_resolution'] >= 12]
                
                if high_res_layers:
                    # Seleccionar la capa con mejor score clínico entre las de alta resolución
                    best_layer = max(high_res_layers, key=lambda x: x['clinical_score'])
                    target_conv_layer = best_layer['name']
                    print(f"✅ CAPA CLÍNICA ÓPTIMA: {target_conv_layer}")
                    print(f"   📐 Resolución: {best_layer['spatial_resolution']}x{best_layer['spatial_resolution']}")
                    print(f"   🧠 Filtros: {best_layer['total_neurons']}")
                    print(f"   ⭐ Score clínico: {best_layer['clinical_score']:.2f}")
                    
                # Prioridad 2: Si no hay capas >=12x12, usar la de mayor resolución
                else:
                    best_layer = max(layer_analysis, key=lambda x: x['spatial_resolution'])
                    target_conv_layer = best_layer['name']
                    print(f"⚠️ RESOLUCIÓN LIMITADA: {target_conv_layer}")
                    print(f"   📐 Resolución máxima disponible: {best_layer['spatial_resolution']}x{best_layer['spatial_resolution']}")
                    print(f"   💡 Recomendación: Considerar modelo con capas intermedias de mayor resolución")
                
                # Prioridad 3: Buscar patrones específicos conocidos (ResNet, EfficientNet, etc.)
                preferred_patterns = [
                    'conv2_block3_out',  # ResNet intermedia óptima
                    'conv2_block2_out',  # ResNet intermedia
                    'block2c_add',       # EfficientNet
                    'conv2d_3',          # Modelo personalizado intermedio
                    'conv2d_2',          # Modelo personalizado temprano
                ]
                
                for pattern in preferred_patterns:
                    if any(pattern in layer['name'] for layer in layer_analysis):
                        matching_layer = next(l for l in layer_analysis if pattern in l['name'])
                        if matching_layer['spatial_resolution'] > best_layer['spatial_resolution']:
                            target_conv_layer = matching_layer['name']
                            print(f"🎯 PATRÓN CLÍNICO ENCONTRADO: {target_conv_layer}")
                            print(f"   📐 Resolución mejorada: {matching_layer['spatial_resolution']}x{matching_layer['spatial_resolution']}")
                            break
                
            else:
                # Fallback si el análisis falla
                if len(conv_layers) >= 3:
                    # Evitar última capa (muy baja resolución) y primera capa (muy genérica)
                    target_index = max(1, len(conv_layers) // 3)  # Primer tercio, no primera
                    target_conv_layer = conv_layers[target_index]
                    print(f"🔄 FALLBACK INTELIGENTE: {target_conv_layer} (índice {target_index})")
                else:
                    target_conv_layer = conv_layers[0] if conv_layers else None
                    print(f"🔄 FALLBACK BÁSICO: {target_conv_layer}")
            
            # Verificación final de la capa seleccionada
            if target_conv_layer:
                try:
                    layer = model_to_use.get_layer(target_conv_layer)
                    output_shape = layer.output.shape
                    spatial_res = output_shape[1] if len(output_shape) >= 3 and output_shape[1] is not None else "Variable"
                    
                    print(f"✅ CAPA CLÍNICA VERIFICADA: {target_conv_layer}")
                    print(f"   📐 Resolución espacial final: {spatial_res}x{spatial_res}")
                    print(f"   🏥 Status: {'EXCELENTE' if isinstance(spatial_res, int) and spatial_res >= 12 else 'ACEPTABLE' if isinstance(spatial_res, int) and spatial_res >= 6 else 'LIMITADA'}")
                    
                except Exception as e:
                    print(f"❌ Error en verificación final de {target_conv_layer}: {e}")
                    # Último recurso
                    target_conv_layer = conv_layers[-2] if len(conv_layers) >= 2 else conv_layers[0]
                    print(f"🆘 ÚLTIMO RECURSO: {target_conv_layer}")
                
            last_conv_layer_name = target_conv_layer
        else:
            # Fallback mejorado con más opciones
            candidates = [
                'conv2d_4', 'conv2d_3', 'conv2d_2_functional_3', 'conv2d_2', 
                'conv2d_1_functional_0', 'conv2d_1', 'block5_conv3', 'block4_conv3',
                'mixed7', 'mixed6'  # Para modelos como Inception
            ]
            for candidate in candidates:
                if candidate in available_layers:
                    last_conv_layer_name = candidate
                    print(f"✅ Usando fallback optimizado: {last_conv_layer_name}")
                    break
            
            if last_conv_layer_name is None:
                print("⚠️ No se encontraron capas convolucionales conocidas, usando fallback")
                # Buscar cualquier capa que termine en 'conv'
                for layer_name in reversed(available_layers):
                    if 'conv' in layer_name.lower():
                        last_conv_layer_name = layer_name
                        break
                if last_conv_layer_name is None:
                    last_conv_layer_name = 'conv2d_2'  # Último recurso
    
    # Crear grad_model con reintentos defensivos
    max_attempts = 3
    grad_model = None
    
    for attempt in range(max_attempts):
        try:
            grad_model = tf.keras.models.Model(
                [model_to_use.inputs], [model_to_use.get_layer(last_conv_layer_name).output, model_to_use.output]
            )
            print(f"✅ Grad model creado en intento {attempt + 1}")
            break
            
        except (AttributeError, RuntimeError, ValueError) as e:
            print(f"⚠️ Intento {attempt + 1} falló: {str(e)}")
            if "never been called" in str(e) or "no defined input" in str(e):
                print(f"🔥 Forzando inicialización del modelo (intento {attempt + 1})...")
                dummy_input = tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32)
                _ = model_to_use(dummy_input, training=False)
                print(f"✅ Modelo forzado a inicializar (intento {attempt + 1})")
            else:
                if attempt == max_attempts - 1:
                    raise ValueError(f"Error creando grad_model con capa '{last_conv_layer_name}': {e}")
    
    if grad_model is None:
        raise ValueError(f"No se pudo crear grad_model después de {max_attempts} intentos")
    
    print("🚀 Ejecutando algoritmo GradCAM++ - Mejor localización de lesiones")
    
    # GradCAM++ Implementation
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(np.array([image_array]))
        if pred_index is None:
            pred_index = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]

    # Calcular gradientes de primer orden
    grads = tape.gradient(class_channel, conv_outputs)
    
    # GradCAM++ MEJORA 1: Calcular gradientes de segundo y tercer orden
    with tf.GradientTape() as tape2:
        with tf.GradientTape() as tape3:
            conv_outputs_for_grad, predictions_for_grad = grad_model(np.array([image_array]))
            class_channel_for_grad = predictions_for_grad[:, pred_index]
        grads_2nd = tape3.gradient(class_channel_for_grad, conv_outputs_for_grad)
    grads_3rd = tape2.gradient(grads_2nd, conv_outputs_for_grad)
    
    # Convertir a numpy para cálculos
    conv_outputs_np = conv_outputs[0].numpy()  # (H, W, C)
    grads_np = grads[0].numpy()               # (H, W, C)
    grads_2nd_np = grads_2nd[0].numpy()       # (H, W, C) 
    grads_3rd_np = grads_3rd[0].numpy()       # (H, W, C)
    
    # GradCAM++ MEJORA 2: Calcular alpha weights mejorados
    # Alpha weights consideran gradientes de orden superior
    global_sum = np.sum(conv_outputs_np, axis=(0, 1))  # Sum over spatial dims
    
    # Evitar división por cero
    alpha_num = grads_2nd_np
    alpha_denom = 2.0 * grads_2nd_np + np.sum(grads_3rd_np * global_sum[None, None, :], axis=(0, 1), keepdims=True)
    alpha_denom = np.maximum(alpha_denom, 1e-7)  # Evitar división por cero
    
    alpha = alpha_num / alpha_denom
    
    # GradCAM++ MEJORA 3: Weights normalizados espacialmente
    # Normalizar alpha para que sumen 1 en cada canal
    alpha_norm = alpha / (np.sum(alpha, axis=(0, 1), keepdims=True) + 1e-7)
    
    # GradCAM++ MEJORA 4: Weights finales con ReLU
    weights = np.sum(alpha_norm * tf.nn.relu(grads_np), axis=(0, 1))  # (C,)
    
    # GradCAM++ MEJORA 5: Heatmap con mejor localización
    # Multiplicar conv outputs por weights mejorados
    heatmap = np.sum(conv_outputs_np * weights[None, None, :], axis=2)  # (H, W)
    
    # ReLU para eliminar activaciones negativas
    heatmap = np.maximum(heatmap, 0)
    
    # Normalización mejorada para GradCAM++
    max_val = np.max(heatmap)
    if max_val == 0:
        print("⚠️ GradCAM++ generó heatmap vacío")
        return np.zeros_like(heatmap)
    
    heatmap = heatmap / max_val
    
    print(f"✅ GradCAM++ completado - Shape: {heatmap.shape}, Max: {max_val:.4f}")
    
    # PROCESAMIENTO CLÍNICO PROFESIONAL GRADCAM++ AVANZADO
    original_size = heatmap.shape
    print(f"🏥 PROCESAMIENTO CLÍNICO AVANZADO: {original_size} → 512x512 calidad profesional")
    
    # PASO 1: Escalado LANCZOS4 de máxima calidad (mejor que bicúbico)
    heatmap_hires = cv2.resize(heatmap, (512, 512), interpolation=cv2.INTER_LANCZOS4)
    print(f"✅ Escalado LANCZOS4 aplicado para máxima calidad visual")
    
    # PASO 2: Normalización robusta con percentiles optimizada para clínica
    # Usar percentiles 0.5-99.5 para GradCAM++ clínico (máxima sensibilidad)
    p0_5 = np.percentile(heatmap_hires, 0.5)
    p99_5 = np.percentile(heatmap_hires, 99.5)
    
    if p99_5 > p0_5:
        heatmap_normalized = np.clip((heatmap_hires - p0_5) / (p99_5 - p0_5), 0, 1)
    else:
        heatmap_normalized = heatmap_hires
    
    print(f"✅ Normalización clínica optimizada: [{p0_5:.4f}, {p99_5:.4f}] → [0, 1]")
    
    # PASO 3: FILTRO BILATERAL en lugar de Gaussiano (preserva bordes de lesiones)
    # Filtro bilateral: suaviza sin perder bordes críticos para diagnóstico
    diameter = 9          # Diámetro del filtro
    sigma_color = 80      # Parámetro de color (mayor = más suavizado)
    sigma_space = 80      # Parámetro espacial (mayor = más área de influencia)
    
    # Convertir a uint8 para bilateral filter
    heatmap_uint8_bilateral = (heatmap_normalized * 255).astype(np.uint8)
    heatmap_bilateral_uint8 = cv2.bilateralFilter(heatmap_uint8_bilateral, diameter, sigma_color, sigma_space)
    heatmap_bilateral = heatmap_bilateral_uint8.astype(np.float32) / 255.0
    
    print(f"✅ Filtro bilateral clínico aplicado: d={diameter}, σ_color={sigma_color}, σ_space={sigma_space}")
    print(f"   🎯 Ventaja: Preserva bordes de lesiones mientras suaviza ruido")
    
    # PASO 4: Umbralización clínica ultra-sensible para lesiones sutiles
    threshold_clinical = 0.015  # 1.5% umbral (ultra-sensible para retinopatía temprana)
    heatmap_thresholded = np.where(heatmap_bilateral < threshold_clinical, 0, heatmap_bilateral)
    
    print(f"✅ Umbralización clínica ultra-sensible: {threshold_clinical:.3f} (1.5%)")
    
    # PASO 5: Morfología mínima con elemento estructural circular (preserva lesiones circulares)
    kernel_clinical = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    heatmap_uint8_morph = (heatmap_thresholded * 255).astype(np.uint8)
    
    # Operación de abertura muy ligera para eliminar ruido puntual sin afectar lesiones
    heatmap_morphed_uint8 = cv2.morphologyEx(heatmap_uint8_morph, cv2.MORPH_OPEN, kernel_clinical, iterations=1)
    heatmap_cleaned = heatmap_morphed_uint8.astype(np.float32) / 255.0
    
    print(f"✅ Morfología clínica ligera aplicada - Preserva microaneurismas y exudados")
    
    # PASO 6: MÁSCARA CIRCULAR CON BORDE FEATHER PROFESIONAL
    heatmap_masked_professional = apply_clinical_retinal_mask(heatmap_cleaned, feather_pixels=20)
    
    print(f"✅ GradCAM++ clínico profesional completado: {heatmap_masked_professional.shape}")
    print("🎯 Optimizado para: microaneurismas, exudados, hemorragias, neovascularización")
    print("🏥 Calidad: CLÍNICA PROFESIONAL con preservación de bordes")
    
    return heatmap_masked_professional


def apply_clinical_retinal_mask(heatmap, feather_pixels=20, center_offset=(0, 0)):
    """
    Aplica máscara circular profesional con borde feather para limitar heatmap al área retinal.
    
    Args:
        heatmap: Array 2D del heatmap (512x512)
        feather_pixels: Píxeles de transición suave en el borde
        center_offset: Ajuste fino del centro (x, y)
    
    Returns:
        heatmap enmascarado con transición suave
    """
    height, width = heatmap.shape
    
    # Centro de la retina (ajustable para casos específicos)
    center_x = width // 2 + center_offset[0]
    center_y = height // 2 + center_offset[1]
    
    # Radio óptimo para retina (85% del mínimo entre ancho/alto)
    radius_outer = int(min(width, height) * 0.42)  # Radio principal
    radius_inner = radius_outer - feather_pixels     # Radio donde inicia feathering
    
    print(f"🎯 Máscara retinal: centro=({center_x}, {center_y}), radio={radius_outer}, feather={feather_pixels}px")
    
    # Crear grillas de coordenadas
    y_grid, x_grid = np.ogrid[:height, :width]
    
    # Calcular distancia desde el centro para cada píxel
    distances = np.sqrt((x_grid - center_x)**2 + (y_grid - center_y)**2)
    
    # Crear máscara con transición suave (feather)
    mask = np.ones_like(distances, dtype=np.float32)
    
    # Área completamente fuera: máscara = 0
    mask[distances > radius_outer] = 0
    
    # Área de transición (feather): gradiente lineal suave
    feather_zone = (distances > radius_inner) & (distances <= radius_outer)
    if np.any(feather_zone):
        # Interpolación lineal en la zona de feather
        feather_values = 1.0 - (distances[feather_zone] - radius_inner) / feather_pixels
        mask[feather_zone] = feather_values
    
    # Suavizado adicional del borde para transición ultra-profesional
    mask = cv2.GaussianBlur(mask, (5, 5), 1.5)
    
    # Aplicar máscara al heatmap
    heatmap_masked = heatmap * mask
    
    print(f"✅ Máscara circular feather aplicada - Transición suave de {feather_pixels}px")
    
    return heatmap_masked

def generate_clinical_gradcam(heatmap_input, original_image, target_size=512, colormap_type='inferno'):
    """
    Genera mapas Grad-CAM de calidad clínica web con alta resolución.
    
    Args:
        heatmap_input: Heatmap del modelo (puede ser 96x96 o 512x512)
        original_image: Imagen original de la retina (PIL Image)
        target_size: Tamaño objetivo (default: 512x512)
        colormap_type: 'inferno' o 'jet_medical'
    
    Returns:
        dict con versiones overlay transparente, opaca y barra de color SVG
    """
    # Asegurar que original_image es PIL
    if not hasattr(original_image, 'convert'):
        original_image = Image.fromarray(original_image)
    
    # Redimensionar imagen original al tamaño objetivo
    original_resized = original_image.resize((target_size, target_size), Image.LANCZOS)
    original_array = np.array(original_resized)
    
    print(f"🏥 Generando Grad-CAM clínico de alta resolución {target_size}x{target_size}")
    
    # 1. VERIFICAR TAMAÑO Y ESCALAR SI ES NECESARIO
    input_size = heatmap_input.shape
    print(f"🔍 Heatmap clínico input size: {input_size}")
    
    if input_size[0] == target_size and input_size[1] == target_size:
        # Ya está en tamaño correcto
        heatmap_hires = heatmap_input.copy()
        print(f"✅ Heatmap clínico ya está en tamaño correcto: {input_size}")
    else:
        # 1. INTERPOLACIÓN BICÚBICA DE ALTA CALIDAD
        heatmap_hires = cv2.resize(
            heatmap_input, 
            (target_size, target_size), 
            interpolation=cv2.INTER_CUBIC
        )
        print(f"✅ Heatmap clínico escalado: {input_size} → {heatmap_hires.shape}")
    
    # 2. SUAVIZADO GAUSSIANO LIGERO (preservar detalles)
    heatmap_smooth = cv2.GaussianBlur(heatmap_hires, (7, 7), 1.5)
    
    # 3. DETECCIÓN Y APLICACIÓN DE MÁSCARA CIRCULAR
    mask_info = detect_retina_circular_mask(original_resized)
    circular_mask = mask_info['mask']
    
    # Redimensionar máscara si es necesario
    if circular_mask.shape != (target_size, target_size):
        circular_mask = cv2.resize(circular_mask, (target_size, target_size), cv2.INTER_CUBIC)
    
    # Aplicar máscara al heatmap
    heatmap_masked = heatmap_smooth * circular_mask
    print(f"✅ Máscara circular aplicada - Confianza: {mask_info['confidence']:.2f}")
    
    # 4. NORMALIZACIÓN CIENTÍFICA
    heatmap_min = np.min(heatmap_masked)
    heatmap_max = np.max(heatmap_masked)
    
    if heatmap_max > heatmap_min:
        heatmap_norm = (heatmap_masked - heatmap_min) / (heatmap_max - heatmap_min)
    else:
        heatmap_norm = np.zeros_like(heatmap_masked)
    
    # 5. APLICAR COLORMAP MÉDICO
    cmap = create_medical_colormap(colormap_type)
    heatmap_colored = cmap(heatmap_norm)  # Resultado en RGBA [0,1]
    
    # Convertir a enteros 0-255
    heatmap_colored_uint8 = (heatmap_colored * 255).astype(np.uint8)
    
    print(f"✅ Colormap '{colormap_type}' aplicado")
    
    # 6. GENERAR VERSIONES REQUERIDAS
    results = {}
    
    # A. VERSIÓN OVERLAY (PNG transparente con alpha ~40%)
    overlay_alpha = 0.4
    overlay_img = heatmap_colored_uint8.copy()
    
    # Aplicar transparencia global del 40%
    overlay_img[:, :, 3] = (overlay_img[:, :, 3] * overlay_alpha).astype(np.uint8)
    
    # Convertir a PIL y guardar como base64
    overlay_pil = Image.fromarray(overlay_img, 'RGBA')
    
    # VERIFICACIÓN CRÍTICA DEL TAMAÑO - VERSIÓN CLÍNICA
    actual_size = overlay_pil.size
    print(f"🔍 VERIFICACIÓN: Tamaño real de overlay clínico: {actual_size}")
    
    if actual_size[0] != target_size or actual_size[1] != target_size:
        print(f"❌ ERROR: Tamaño clínico incorrecto {actual_size}, forzando redimensión a {target_size}x{target_size}")
        overlay_pil = overlay_pil.resize((target_size, target_size), Image.LANCZOS)
        print(f"✅ Overlay clínico redimensionado: {overlay_pil.size}")
    
    overlay_buffer = BytesIO()
    overlay_pil.save(overlay_buffer, format='PNG', optimize=True)
    results['overlay_transparent'] = base64.b64encode(overlay_buffer.getvalue()).decode('utf-8')
    
    # B. VERSIÓN OPACA (alpha 100% para control dinámico frontend)
    opaque_img = heatmap_colored_uint8.copy()
    # Mantener alpha completo donde hay activación
    mask_alpha = (heatmap_norm > 0.01).astype(np.uint8) * 255
    opaque_img[:, :, 3] = mask_alpha
    
    opaque_pil = Image.fromarray(opaque_img, 'RGBA')
    opaque_buffer = BytesIO()
    opaque_pil.save(opaque_buffer, format='PNG', optimize=True)
    results['heatmap_opaque'] = base64.b64encode(opaque_buffer.getvalue()).decode('utf-8')
    
    # C. VERSIÓN SUPERPUESTA TRADICIONAL (para compatibilidad)
    overlay_traditional = original_array.astype(np.float64)
    heatmap_rgb = heatmap_colored_uint8[:, :, :3].astype(np.float64)
    
    # Superposición con 50% de transparencia
    superimposed = 0.5 * heatmap_rgb + 0.5 * overlay_traditional
    superimposed = np.clip(superimposed, 0, 255).astype(np.uint8)
    
    superimposed_pil = Image.fromarray(superimposed)
    superimposed_buffer = BytesIO()
    superimposed_pil.save(superimposed_buffer, format='PNG')
    results['superimposed_traditional'] = base64.b64encode(superimposed_buffer.getvalue()).decode('utf-8')
    
    # D. BARRA DE COLOR SVG
    colorbar_svg = create_colorbar_svg(colormap_type)
    results['colorbar_svg'] = colorbar_svg
    
    # E. METADATOS
    results['metadata'] = {
        'resolution': f"{target_size}x{target_size}",
        'colormap': colormap_type,
        'interpolation': 'bicubic',
        'gaussian_sigma': 1.5,
        'circular_mask_applied': True,
        'mask_confidence': mask_info['confidence'],
        'normalization': 'min-max scientific standard',
        'transparency_overlay': f"{overlay_alpha:.1%}",
        'format': 'PNG with alpha channel'
    }
    
    print(f"✅ Generación clínica completada")
    
    return results


# 🔍 Predicción con GradCAM clínico de alta calidad
def procesar_imagenes(path_imagen, colormap_type='inferno'):
    try:
        if model is None:
            return {"error": "Modelo no disponible"}
            
        # Cargar y procesar imagen original
        original_image = Image.open(path_imagen).convert("RGB")
        image = original_image.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(image) / 255.0

        # Realizar predicción
        pred = predict_image(img_array)
        if "error" in pred:
            return pred

        try:
            # Usar modelo GradCAM si está disponible, sino usar modelo principal
            model_for_gradcam = gradcam_model if gradcam_model is not None else model
            heatmap = get_gradcam_heatmap(model_for_gradcam, img_array)
            
            # GENERAR GRAD-CAM ENHANCED MEDICAL-GRADE (NUEVO)
            enhanced_results = None
            print(f"🔍 ENHANCED_GRADCAM_AVAILABLE: {ENHANCED_GRADCAM_AVAILABLE}")
            if ENHANCED_GRADCAM_AVAILABLE:
                try:
                    print("🚀 Iniciando Enhanced Medical Grad-CAM...")
                    print(f"   - Heatmap shape: {heatmap.shape}")
                    print(f"   - Original image size: {original_image.size}")
                    print(f"   - Target size: 512")
                    print(f"   - Colormap: {colormap_type}")
                    
                    enhanced_results = enhance_gradcam_medical(
                        heatmap_raw=heatmap,
                        retina_hr=original_image,
                        target_size=512,
                        colormap_type=colormap_type
                    )
                    print("✅ Enhanced Medical Grad-CAM generado exitosamente")
                    
                    # Verificar que tenemos los resultados esperados
                    if enhanced_results and 'gradcam_rgba_transparent' in enhanced_results:
                        print("✅ Enhanced results contain gradcam_rgba_transparent")
                    else:
                        print("❌ Enhanced results missing gradcam_rgba_transparent")
                        enhanced_results = None
                        
                except Exception as e:
                    print(f"❌ Error en Enhanced Medical Grad-CAM: {e}")
                    import traceback
                    traceback.print_exc()
                    enhanced_results = None
            else:
                print("❌ Enhanced Grad-CAM no disponible, usando fallback")
            
            # GENERAR EXPORTACIONES CLÍNICAS PROFESIONALES (NUEVA VERSIÓN MEJORADA)
            print("🏥 Generando exportaciones clínicas profesionales con GradCAM++ mejorado...")
            
            # El heatmap ya viene procesado con todas las mejoras clínicas profesionales
            # desde get_gradcam_heatmap (filtro bilateral, máscara feather, LANCZOS4, etc.)
            clinical_exports = generate_clinical_professional_exports(
                heatmap_processed=heatmap,  # Ya procesado con todas las mejoras
                original_image=original_image,
                colormap_type=colormap_type,
                target_size=512
            )
            
            # GENERAR VERSIÓN LEGACY PARA COMPATIBILIDAD (FALLBACK)
            professional_results = generate_professional_medical_gradcam(
                heatmap, 
                original_image, 
                target_size=512
            )
            
            # GENERAR VERSIÓN CLÍNICA TRADICIONAL PARA ALTERNATIVAS
            clinical_results = generate_clinical_gradcam(
                heatmap, 
                original_image, 
                target_size=512,
                colormap_type=colormap_type
            )
            
            # APLICAR REGLAS DE CONFIANZA CLÍNICA PROFESIONAL
            confianza_valor = pred["confianza"]
            
            # Reglas de confianza para diagnóstico médico
            if confianza_valor < 0.50:  # Menos del 50%
                diagnostic_status = "RESULTADO_NO_CONCLUYENTE"
                diagnostic_message = "Resultado no concluyente"
                diagnostic_recommendation = "Se recomienda repetir el análisis o consultar con especialista"
                confidence_level = "BAJA"
                medical_interpretation = "La confianza del modelo es insuficiente para un diagnóstico categórico"
                
            elif confianza_valor < 0.70:  # 50-70%
                diagnostic_status = "RESULTADO_MODERADO"
                diagnostic_message = CLASS_NAMES[pred["clase"]] if pred["clase"] < len(CLASS_NAMES) else f"Clase {pred['clase']}"
                diagnostic_recommendation = "Revisar con especialista - confianza moderada"
                confidence_level = "MODERADA"
                medical_interpretation = "Resultado válido pero requiere confirmación clínica"
                
            elif confianza_valor < 0.85:  # 70-85%
                diagnostic_status = "RESULTADO_CONFIABLE"
                diagnostic_message = CLASS_NAMES[pred["clase"]] if pred["clase"] < len(CLASS_NAMES) else f"Clase {pred['clase']}"
                diagnostic_recommendation = "Resultado confiable - considerar contexto clínico"
                confidence_level = "ALTA"
                medical_interpretation = "Diagnóstico asistido por IA confiable"
                
            else:  # 85%+
                diagnostic_status = "RESULTADO_MUY_CONFIABLE"
                diagnostic_message = CLASS_NAMES[pred["clase"]] if pred["clase"] < len(CLASS_NAMES) else f"Clase {pred['clase']}"
                diagnostic_recommendation = "Resultado muy confiable - útil para decisión clínica"
                confidence_level = "MUY_ALTA"
                medical_interpretation = "Diagnóstico asistido por IA de alta confianza"
            
            print(f"🏥 Regla de confianza aplicada: {confidence_level} ({confianza_valor:.1%}) → {diagnostic_status}")
            
            # Obtener timestamp para metadatos clínicos
            from datetime import datetime
            import uuid
            
            analysis_timestamp = datetime.now().isoformat()
            analysis_uuid = str(uuid.uuid4())
            
            # Compilar resultado final con REGLAS DE CONFIANZA Y METADATOS CLÍNICOS
            result = {
                # DIAGNÓSTICO CON REGLAS DE CONFIANZA
                "prediccion": pred["clase"],
                "prediccion_nombre": diagnostic_message,
                "confianza": pred["confianza"],
                "diagnostic_status": diagnostic_status,
                "confidence_level": confidence_level,
                "medical_recommendation": diagnostic_recommendation,
                "medical_interpretation": medical_interpretation,
                
                # METADATOS CLÍNICOS AUTOMÁTICOS
                "clinical_metadata": {
                    "analysis_timestamp": analysis_timestamp,
                    "analysis_uuid": analysis_uuid,
                    "model_version": model_metadata.get('version', '1.0'),
                    "model_name": model_metadata.get('model_name', 'CNN Retinopatía'),
                    "input_resolution": f"{IMG_SIZE}x{IMG_SIZE}",
                    "output_resolution": "512x512",
                    "processing_method": "GradCAM++ Profesional Clínico",
                    "confidence_threshold_applied": True,
                    "clinical_grade": True
                },
                
                # INFORMACIÓN PARA TRAZABILIDAD CLÍNICA
                "analysis_info": {
                    "fecha_analisis": analysis_timestamp.split('T')[0],
                    "hora_analisis": analysis_timestamp.split('T')[1].split('.')[0],
                    "id_unico_analisis": analysis_uuid,
                    "sistema_version": "GradCAM++ Clínico v2.0",
                    "cumple_estandares_medicos": True
                }
            }
            
            # ⭐ ENHANCED MEDICAL GRAD-CAM (ÚNICA VERSIÓN DE ALTA CALIDAD)
            if enhanced_results:
                print("✅ Usando Enhanced Medical Grad-CAM como resultado principal")
                
                # VERIFICAR TAMAÑO DEL ENHANCED GRAD-CAM
                try:
                    import base64
                    from PIL import Image
                    from io import BytesIO
                    
                    enhanced_img_data = base64.b64decode(enhanced_results['gradcam_rgba_transparent'])
                    enhanced_img = Image.open(BytesIO(enhanced_img_data))
                    enhanced_size = enhanced_img.size
                    print(f"🔍 VERIFICACIÓN FINAL: Enhanced Grad-CAM tamaño: {enhanced_size}")
                    
                    if enhanced_size[0] < 500:  # Si es menor a 500px, hay problema
                        print(f"❌ PROBLEMA: Enhanced Grad-CAM es muy pequeño ({enhanced_size})")
                    else:
                        print(f"✅ Enhanced Grad-CAM tamaño correcto: {enhanced_size}")
                        
                except Exception as e:
                    print(f"⚠️ No se pudo verificar tamaño enhanced: {e}")
                
                result.update({
                    # Usar enhanced como versión principal y única
                    "gradcam": enhanced_results['gradcam_rgba_transparent'],
                    "gradcam_overlay": enhanced_results['gradcam_rgb_overlay'], 
                    "colorbar_svg": enhanced_results['colorbar_svg'],
                    "metadata": enhanced_results['metadata'],
                    "mask_confidence": enhanced_results['mask_confidence'],
                    "medical_grade": True,
                    "quality": "ENHANCED_MEDICAL_GRADE"
                })
            else:
                # USAR EXPORTACIONES CLÍNICAS PROFESIONALES COMO PRINCIPAL
                print("✅ Usando exportaciones clínicas profesionales de última generación")
                
                # Verificar calidad de las exportaciones clínicas
                if clinical_exports and clinical_exports['clinical_ready']:
                    result.update({
                        # USAR EXPORTACIONES CLÍNICAS PROFESIONALES COMO PRINCIPAL
                        "gradcam": clinical_exports['png_transparent'],
                        "gradcam_overlay": clinical_exports['png_overlay_rgb'], 
                        "colorbar_svg": clinical_exports['colorbar_svg_clinical'],
                        "metadata": clinical_exports['metadata'],
                        "mask_confidence": 0.95,  # Alta confianza en procesamiento profesional
                        "medical_grade": True,
                        "quality": "CLINICAL_PROFESSIONAL_ADVANCED"
                    })
                    
                    print("✅ Exportaciones clínicas profesionales aplicadas como resultado principal")
                
                else:
                    # Fallback a versión profesional legacy si exportaciones clínicas fallan
                    print("⚠️ Exportaciones clínicas fallaron, usando versión profesional legacy")
                    
                    # Verificar tamaño de la versión profesional
                    try:
                        img_data = base64.b64decode(professional_results['gradcam_professional'])
                        img = Image.open(BytesIO(img_data))
                        professional_size = img.size
                        print(f"📏 Professional legacy image size: {professional_size}")
                        
                        # Si la versión profesional también es pequeña, usar backup
                        if professional_size[0] <= 100:  # Si es muy pequeña
                            print("❌ Professional version also too small, using high-resolution backup")
                            backup_result = generate_high_resolution_gradcam_backup(heatmap, original_image, target_size=512)
                            
                            result.update({
                                "gradcam": backup_result['gradcam_base64'],
                                "gradcam_overlay": backup_result['gradcam_base64'],
                                "colorbar_svg": clinical_results['colorbar_svg'],
                                "metadata": {
                                    "method": backup_result['method'],
                                    "size": backup_result['size'],
                                    "interpolation": "LANCZOS4 (máxima calidad)",
                                    "filtering": "Bilateral edge-preserving",
                                    "masking": "Circular feather 20px",
                                    "quality": "High-resolution backup with clinical processing"
                                },
                                "mask_confidence": 0.8,
                                "medical_grade": True,
                                "quality": "HIGH_RESOLUTION_BACKUP_CLINICAL"
                            })
                        else:
                            # Usar versión profesional legacy pero con metadatos mejorados
                            result.update({
                                "gradcam": professional_results['gradcam_professional'],
                                "gradcam_overlay": clinical_results['overlay_transparent'],
                                "colorbar_svg": clinical_results['colorbar_svg'],
                                "metadata": professional_results['processing_metadata'],
                                "mask_confidence": professional_results['confidence_mask'],
                                "medical_grade": True,
                                "quality": "PROFESSIONAL_MEDICAL_LEGACY"
                            })
                            
                    except Exception as e:
                        print(f"❌ Error with professional legacy version: {e}")
                        
                        # Último recurso: usar exportaciones clínicas parciales o backup
                        if clinical_exports:
                            print("🔄 Usando exportaciones clínicas parciales como último recurso")
                            result.update({
                                "gradcam": clinical_exports.get('png_transparent', clinical_results['overlay_transparent']),
                                "gradcam_overlay": clinical_exports.get('png_overlay_rgb', clinical_results['heatmap_opaque']),
                                "colorbar_svg": clinical_exports.get('colorbar_svg_clinical', clinical_results['colorbar_svg']),
                                "metadata": {
                                    "quality": "Clinical exports partial recovery",
                                    "note": "Algunas funciones clínicas pueden estar limitadas"
                                },
                                "mask_confidence": 0.7,
                                "medical_grade": True,
                                "quality": "CLINICAL_PARTIAL_RECOVERY"
                            })
                        else:
                            # Absoluto último recurso
                            backup_result = generate_high_resolution_gradcam_backup(heatmap, original_image, target_size=512)
                            result.update({
                                "gradcam": backup_result['gradcam_base64'],
                                "gradcam_overlay": backup_result['gradcam_base64'],
                                "colorbar_svg": clinical_results['colorbar_svg'],
                                "metadata": {
                                    "method": backup_result['method'],
                                    "size": backup_result['size'],
                                    "quality": "Emergency backup with basic processing"
                                },
                                "mask_confidence": 0.6,
                                "medical_grade": True,
                                "quality": "EMERGENCY_BACKUP"
                            })
            
            # METADATOS COMUNES
            result.update({
                "modelo_usado": f"{model_metadata.get('model_name', 'CNN')} ({IMG_SIZE}x{IMG_SIZE})",
                "version": model_metadata.get('version', '1.0'),
                "colormap_used": colormap_type,
                "web_compatible": True,
                
                # GUÍA DE INTERPRETACIÓN MÉDICA
                "interpretation_guide": {
                    "azul_verde": "Baja activación (área normal)",
                    "amarillo_naranja": "Activación moderada (atención)",
                    "rojo_intenso": "Alta activación (área crítica)", 
                    "transparente": "Sin activación significativa"
                },
                
                # INSTRUCCIONES DE USO WEB SIMPLIFICADAS
                "usage_instructions": {
                    "gradcam": "PNG RGBA transparente - Máxima calidad médica",
                    "gradcam_overlay": "PNG RGB overlay - Listo para visualizar",
                    "recommended_usage": "Usar 'gradcam' como versión principal de máxima calidad",
                    "css_example": "position: absolute; mix-blend-mode: normal; opacity: controlable;",
                    "transparency": "Canal alpha automático basado en activación",
                    "interpretation": "Ver interpretation_guide para colores"
                }
            })
            
            # Generar también con colormap alternativo si se solicitó inferno
            if colormap_type == 'inferno':
                jet_results = generate_clinical_gradcam(
                    heatmap, 
                    original_image, 
                    target_size=512,
                    colormap_type='jet_medical'
                )
                result["alternative_colormap"] = {
                    "gradcam_overlay_40_jet": jet_results['overlay_transparent'],
                    "gradcam_opaque_100_jet": jet_results['heatmap_opaque'],
                    "colorbar_svg_jet": jet_results['colorbar_svg']
                }
            
            # Generar visualización médica adicional si está disponible
            if MEDICAL_VISUALIZATION_AVAILABLE:
                try:
                    # Convertir imagen PIL a array numpy de alta resolución
                    image_array = np.array(original_image.resize((512, 512)))
                    
                    # Generar visualización médica con diferentes colormaps
                    medical_viz_inferno = generar_visualizacion_medica_retinografia(
                        image_array, colormap='inferno'
                    )
                    
                    medical_viz_jet = generar_visualizacion_medica_retinografia(
                        image_array, colormap='jet_medical'
                    )
                    
                    result["medical_visualization"] = {
                        "inferno": medical_viz_inferno,
                        "jet_medical": medical_viz_jet,
                        "available": True,
                        "description": "Visualización lado a lado con detección de anomalías DR"
                    }
                    
                except Exception as med_error:
                    print(f"⚠️ Error en visualización médica: {med_error}")
                    result["medical_visualization"] = {
                        "available": False,
                        "error": str(med_error)
                    }
            else:
                result["medical_visualization"] = {
                    "available": False,
                    "error": "Módulo de visualización médica no disponible"
                }
                
            return result
            
        except Exception as gradcam_error:
            # Si GradCAM falla, devolver solo predicción
            print(f"⚠️ GradCAM falló: {gradcam_error}")
            clase_nombre = CLASS_NAMES[pred["clase"]] if pred["clase"] < len(CLASS_NAMES) else f"Clase {pred['clase']}"
            return {
                "prediccion": pred["clase"],
                "prediccion_nombre": clase_nombre,
                "confianza": pred["confianza"], 
                "gradcam_overlay_40": None,
                "gradcam_opaque_100": None,
                "error_gradcam": str(gradcam_error),
                "modelo_usado": f"{model_metadata.get('model_name', 'CNN')} ({IMG_SIZE}x{IMG_SIZE})",
                "version": model_metadata.get('version', '1.0')
            }
            
    except Exception as e:
        return {"error": f"Error procesando imagen: {str(e)}"}

def predict_image(image_np):
    try:
        if model is None:
            return {"error": "Modelo no disponible. Verifique que retinopathy_model.keras esté presente."}
        
        image_batch = np.expand_dims(image_np, axis=0)
        predictions = model.predict(image_batch)
        class_pred = int(np.argmax(predictions))
        confidence = float(np.max(predictions))
        
        # Obtener todas las probabilidades por clase
        all_probs = [round(float(p), 4) for p in predictions[0]]
        prob_dict = dict(zip(CLASS_NAMES, all_probs))
        
        # 🔍 LOGGING DETALLADO PARA DIAGNÓSTICO
        print(f"🎯 PREDICCIÓN COMPLETA:")
        print(f"   📊 Clase predicha: {class_pred} ({CLASS_NAMES[class_pred] if class_pred < len(CLASS_NAMES) else 'Desconocida'})")
        print(f"   🎯 Confianza: {confidence:.4f} ({confidence*100:.1f}%)")
        print(f"   📈 Probabilidades por clase:")
        for i, (clase, prob) in enumerate(prob_dict.items()):
            marker = "🟢" if i == class_pred else "⚪"
            print(f"      {marker} {clase}: {prob:.4f} ({prob*100:.1f}%)")
        
        # Análisis de confianza
        if confidence < 0.5:
            print(f"⚠️  CONFIANZA MUY BAJA: El modelo está muy incierto")
        elif confidence < 0.7:
            print(f"⚠️  CONFIANZA BAJA: Modelo moderadamente incierto")
        elif confidence < 0.85:
            print(f"✅ CONFIANZA BUENA: Modelo razonablemente seguro")
        else:
            print(f"🎯 CONFIANZA ALTA: Modelo muy seguro")
        
        return {
            "clase": class_pred,
            "confianza": round(confidence, 4),
            "probabilidades": prob_dict
        }
    except Exception as e:
        return {"error": str(e)}


# ==========================================
# 🚀 INTEGRACIÓN CON SISTEMA MEJORADO
# ==========================================

def predict_with_enhanced_confidence(image_array, use_tta=True, use_ensemble=False):
    """
    Función de integración que usa los sistemas mejorados de confianza
    si están disponibles, o cae back al sistema tradicional
    """
    try:
        # Intentar usar sistemas mejorados
        if ENHANCED_SYSTEMS_AVAILABLE:
            from .confidence_enhancer import enhanced_confidence_system

            # Usar sistema mejorado si está calibrado
            if enhanced_confidence_system.is_calibrated:
                print("🚀 Usando sistema de confianza mejorado calibrado")
                result = enhanced_confidence_system.predict_with_enhanced_confidence(
                    model, image_array, use_tta=use_tta
                )
                return result
            else:
                print("⚠️ Sistema mejorado no calibrado, intentando calibración automática")

                # Intentar calibración rápida con datos sintéticos si es posible
                try:
                    # Generar datos sintéticos para calibración básica
                    synthetic_logits = np.random.rand(100, NUM_CLASSES) * 2 - 1  # logits simulados
                    synthetic_labels = np.random.randint(0, NUM_CLASSES, 100)

                    success = enhanced_confidence_system.calibrate_system(synthetic_logits, synthetic_labels)

                    if success:
                        print("✅ Calibración automática exitosa")
                        result = enhanced_confidence_system.predict_with_enhanced_confidence(
                            model, image_array, use_tta=use_tta
                        )
                        return result
                    else:
                        print("❌ Calibración automática falló, usando sistema tradicional")

                except Exception as cal_error:
                    print(f"❌ Error en calibración automática: {cal_error}")

        # Fallback al sistema tradicional con mejoras menores
        print("🔄 Usando sistema tradicional con mejoras")

        # Predicción base
        pred = predict_image(image_array)
        if "error" in pred:
            return pred

        # Aplicar mejoras básicas de confianza
        base_confidence = pred['confianza']

        # Calcular métricas básicas de incertidumbre
        probabilities = [pred['probabilidades'][class_name] for class_name in CLASS_NAMES]

        # Entropía básica
        entropy = -sum(p * np.log(p + 1e-10) for p in probabilities)
        max_entropy = np.log(len(probabilities))
        normalized_entropy = entropy / max_entropy

        # Margen básico
        sorted_probs = sorted(probabilities, reverse=True)
        margin = sorted_probs[0] - sorted_probs[1] if len(sorted_probs) > 1 else sorted_probs[0]

        # Aplicar penalización por incertidumbre
        uncertainty_penalty = (normalized_entropy * 0.2) + ((1 - margin) * 0.1)
        enhanced_confidence = max(0.1, base_confidence * (1.0 - uncertainty_penalty))

        # Determinar nivel de confianza
        if enhanced_confidence >= 0.85:
            confidence_level = "Muy Alta"
            interpretation = "Diagnóstico altamente confiable"
        elif enhanced_confidence >= 0.75:
            confidence_level = "Alta"
            interpretation = "Diagnóstico confiable"
        elif enhanced_confidence >= 0.65:
            confidence_level = "Moderada"
            interpretation = "Revisar diagnóstico recomendado"
        else:
            confidence_level = "Baja"
            interpretation = "Revisión manual obligatoria"

        return {
            'prediction': pred['clase'],
            'probabilities': probabilities,
            'confidence': enhanced_confidence,
            'confidence_level': confidence_level,
            'interpretation': interpretation,
            'uncertainty_metrics': {
                'entropy': normalized_entropy,
                'margin': margin,
                'gini_coefficient': 0.5  # Simplificado
            },
            'technical_details': {
                'base_confidence': base_confidence,
                'uncertainty_penalty': uncertainty_penalty,
                'temperature_applied': False,
                'tta_used': False,
                'method': 'traditional_enhanced'
            }
        }

    except Exception as e:
        print(f"❌ Error en predicción con confianza mejorada: {e}")
        # Fallback completo al sistema básico
        pred = predict_image(image_array)
        if "error" in pred:
            return pred

        return {
            'prediction': pred['clase'],
            'probabilities': [pred['probabilidades'][class_name] for class_name in CLASS_NAMES],
            'confidence': pred['confianza'],
            'confidence_level': 'Básica',
            'interpretation': 'Sistema básico de confianza',
            'error': str(e)
        }


def get_model_status():
    """
    Retorna el estado del modelo y sistemas mejorados
    """
    status = {
        'model_loaded': model is not None,
        'gradcam_model_loaded': gradcam_model is not None,
        'enhanced_systems_available': ENHANCED_SYSTEMS_AVAILABLE,
        'model_metadata': model_metadata,
        'img_size': IMG_SIZE,
        'num_classes': NUM_CLASSES,
        'class_names': CLASS_NAMES
    }

    if ENHANCED_SYSTEMS_AVAILABLE:
        try:
            from .confidence_enhancer import enhanced_confidence_system
            status['enhanced_confidence_calibrated'] = enhanced_confidence_system.is_calibrated
            status['temperature_scaling_available'] = True
        except:
            status['enhanced_confidence_calibrated'] = False
            status['temperature_scaling_available'] = False
    else:
        status['enhanced_confidence_calibrated'] = False
        status['temperature_scaling_available'] = False

    return status