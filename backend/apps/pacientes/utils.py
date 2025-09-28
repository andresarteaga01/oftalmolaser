import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile
import logging

logger = logging.getLogger(__name__)

def preprocess_retina_image_file(file: InMemoryUploadedFile, target_size=(512, 512)):
    # 🔁 Reiniciar puntero del archivo
    file.seek(0)
    file_bytes = file.read()
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("No se pudo leer la imagen")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Recorte centrado
    h, w = image.shape[:2]
    min_dim = min(h, w)
    cx, cy = w // 2, h // 2
    image = image[cy - min_dim // 2 : cy + min_dim // 2,
                  cx - min_dim // 2 : cx + min_dim // 2]

    image = cv2.resize(image, target_size)

    # CLAHE en cada canal para mantener información de color
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    
    # Aplicar CLAHE a cada canal por separado
    r_channel = clahe.apply(image[:, :, 0])
    g_channel = clahe.apply(image[:, :, 1])
    b_channel = clahe.apply(image[:, :, 2])
    
    # Recombinar canales
    image = cv2.merge([r_channel, g_channel, b_channel])

    # Máscara circular
    mask = np.zeros((target_size[1], target_size[0]), dtype=np.uint8)
    radius = int(min(target_size) * 0.45)
    cv2.circle(mask, (target_size[0] // 2, target_size[1] // 2), radius, 255, -1)
    image = cv2.bitwise_and(image, image, mask=mask)

    # Normalización
    image = image.astype(np.float32) / 255.0

    # Validación final dinámica
    expected_shape = (target_size[1], target_size[0], 3)
    if image.shape != expected_shape:
        raise ValueError(f"Shape inválido detectado: {image.shape}, esperado: {expected_shape}")

    return image


def preprocess_retina_image_file_to_jpeg(file: InMemoryUploadedFile, target_size=(512, 512)) -> ContentFile:
    # 🔁 Reiniciar puntero del archivo
    file.seek(0)
    file_bytes = file.read()
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("No se pudo leer la imagen")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    h, w = image.shape[:2]
    min_dim = min(h, w)
    cx, cy = w // 2, h // 2
    image = image[cy - min_dim // 2 : cy + min_dim // 2,
                  cx - min_dim // 2 : cx + min_dim // 2]

    image = cv2.resize(image, target_size)

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    image = cv2.merge([enhanced, enhanced, enhanced])

    mask = np.zeros(target_size, dtype=np.uint8)
    radius = int(min(target_size) * 0.45)
    cv2.circle(mask, (target_size[0] // 2, target_size[1] // 2), radius, 255, -1)
    image = cv2.bitwise_and(image, image, mask=mask)

    pil_image = Image.fromarray(image)
    buffer = BytesIO()
    pil_image.save(buffer, format='JPEG')
    file_name = 'procesada.jpg'

    return ContentFile(buffer.getvalue(), name=file_name)


def detect_color_cast(image):
    """
    Detecta filtros de color dominantes en la imagen
    """
    # Calcular promedios por canal
    mean_r = np.mean(image[:, :, 0])
    mean_g = np.mean(image[:, :, 1])
    mean_b = np.mean(image[:, :, 2])

    # Detectar dominancia de color
    total_mean = (mean_r + mean_g + mean_b) / 3

    # Umbrales para detectar filtros
    threshold = 30  # Diferencia mínima para considerar filtro

    color_info = {
        'has_cast': False,
        'dominant_channel': None,
        'cast_strength': 0,
        'means': [mean_r, mean_g, mean_b]
    }

    if mean_g > mean_r + threshold and mean_g > mean_b + threshold:
        color_info['has_cast'] = True
        color_info['dominant_channel'] = 'green'
        color_info['cast_strength'] = (mean_g - max(mean_r, mean_b)) / total_mean
    elif mean_r > mean_g + threshold and mean_r > mean_b + threshold:
        color_info['has_cast'] = True
        color_info['dominant_channel'] = 'red'
        color_info['cast_strength'] = (mean_r - max(mean_g, mean_b)) / total_mean
    elif mean_b > mean_r + threshold and mean_b > mean_g + threshold:
        color_info['has_cast'] = True
        color_info['dominant_channel'] = 'blue'
        color_info['cast_strength'] = (mean_b - max(mean_r, mean_g)) / total_mean

    return color_info


def correct_color_cast(image, color_info):
    """
    Corrige filtros de color dominantes
    """
    if not color_info['has_cast']:
        return image

    logger.info(f"🎨 Corrigiendo filtro de color {color_info['dominant_channel']} (fuerza: {color_info['cast_strength']:.2f})")

    # Crear copia para no modificar original
    corrected = image.copy()

    if color_info['dominant_channel'] == 'green':
        # Reducir canal verde y aumentar otros
        corrected[:, :, 1] = corrected[:, :, 1] * 0.7  # Reducir verde
        corrected[:, :, 0] = np.clip(corrected[:, :, 0] * 1.2, 0, 255)  # Aumentar rojo
        corrected[:, :, 2] = np.clip(corrected[:, :, 2] * 1.1, 0, 255)  # Aumentar azul
    elif color_info['dominant_channel'] == 'red':
        corrected[:, :, 0] = corrected[:, :, 0] * 0.8
        corrected[:, :, 1] = np.clip(corrected[:, :, 1] * 1.2, 0, 255)
        corrected[:, :, 2] = np.clip(corrected[:, :, 2] * 1.2, 0, 255)
    elif color_info['dominant_channel'] == 'blue':
        corrected[:, :, 2] = corrected[:, :, 2] * 0.8
        corrected[:, :, 0] = np.clip(corrected[:, :, 0] * 1.2, 0, 255)
        corrected[:, :, 1] = np.clip(corrected[:, :, 1] * 1.2, 0, 255)

    return corrected.astype(np.uint8)


def enhance_fundus_contrast(image):
    """
    Mejora específica para imágenes de fondo de ojo
    """
    # Convertir a LAB para mejor manejo de luminancia
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l_channel = lab[:, :, 0]

    # CLAHE más agresivo en canal L
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)

    # Recombinar
    lab[:, :, 0] = l_enhanced
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

    return enhanced


def preprocess_retina_image_enhanced(file: InMemoryUploadedFile, target_size=(96, 96)):
    """
    Preprocesamiento mejorado para imágenes de retina con corrección de filtros
    """
    logger.info("🔍 Iniciando preprocesamiento mejorado")

    # Leer imagen
    file.seek(0)
    file_bytes = file.read()
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("No se pudo leer la imagen")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    logger.info(f"📐 Imagen original: {image.shape}")

    # 1. Detectar y corregir filtros de color
    color_info = detect_color_cast(image)
    if color_info['has_cast']:
        logger.info(f"🎨 Filtro detectado: {color_info['dominant_channel']} (fuerza: {color_info['cast_strength']:.2f})")
        image = correct_color_cast(image, color_info)
    else:
        logger.info("✅ No se detectaron filtros de color")

    # 2. Recorte centrado (mismo que antes)
    h, w = image.shape[:2]
    min_dim = min(h, w)
    cx, cy = w // 2, h // 2
    image = image[cy - min_dim // 2 : cy + min_dim // 2,
                  cx - min_dim // 2 : cx + min_dim // 2]

    # 3. Resize
    image = cv2.resize(image, target_size)
    logger.info(f"📐 Imagen redimensionada: {image.shape}")

    # 4. Mejora de contraste específica para fundus
    image = enhance_fundus_contrast(image)

    # 5. Máscara circular
    mask = np.zeros((target_size[1], target_size[0]), dtype=np.uint8)
    radius = int(min(target_size) * 0.45)
    cv2.circle(mask, (target_size[0] // 2, target_size[1] // 2), radius, 255, -1)
    image = cv2.bitwise_and(image, image, mask=mask)

    # 6. Normalización final
    image = image.astype(np.float32) / 255.0

    logger.info("✅ Preprocesamiento mejorado completado")
    return image


def preprocess_retina_image_enhanced_to_jpeg(file: InMemoryUploadedFile, target_size=(512, 512)) -> ContentFile:
    """
    Versión JPEG del preprocesamiento mejorado
    """
    logger.info("🔍 Iniciando preprocesamiento mejorado para JPEG")

    # Leer imagen
    file.seek(0)
    file_bytes = file.read()
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("No se pudo leer la imagen")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # 1. Detectar y corregir filtros de color
    color_info = detect_color_cast(image)
    if color_info['has_cast']:
        logger.info(f"🎨 Filtro detectado para JPEG: {color_info['dominant_channel']}")
        image = correct_color_cast(image, color_info)

    # 2. Recorte centrado
    h, w = image.shape[:2]
    min_dim = min(h, w)
    cx, cy = w // 2, h // 2
    image = image[cy - min_dim // 2 : cy + min_dim // 2,
                  cx - min_dim // 2 : cx + min_dim // 2]

    # 3. Resize
    image = cv2.resize(image, target_size)

    # 4. Mejora de contraste específica para fundus
    image = enhance_fundus_contrast(image)

    # 5. Máscara circular
    mask = np.zeros(target_size, dtype=np.uint8)
    radius = int(min(target_size) * 0.45)
    cv2.circle(mask, (target_size[0] // 2, target_size[1] // 2), radius, 255, -1)
    image = cv2.bitwise_and(image, image, mask=mask)

    # 6. Guardar como JPEG
    pil_image = Image.fromarray(image)
    buffer = BytesIO()
    pil_image.save(buffer, format='JPEG', quality=95)
    file_name = 'procesada_enhanced.jpg'

    logger.info("✅ JPEG mejorado completado")
    return ContentFile(buffer.getvalue(), name=file_name)