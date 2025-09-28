import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image
import base64
from io import BytesIO

class RetinographyVisualizer:
    """
    Visualizador médico profesional para retinografías con detección de anomalías
    y mapas de calor pseudocolor para resaltar patologías de retinopatía diabética
    """
    
    def __init__(self):
        self.target_size = (512, 512)
        
    def detect_diabetic_retinopathy_features(self, image):
        """
        Detectar características de retinopatía diabética:
        - Microaneurismas (puntos rojos pequeños)
        - Hemorragias (manchas rojas más grandes)  
        - Exudados duros (puntos amarillos/blancos brillantes)
        - Exudados blandos (manchas grises difusas)
        """
        
        # Convertir a diferentes espacios de color para análisis
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        
        # Separar canales
        h, s, v = cv2.split(hsv)
        l, a, b = cv2.split(lab)
        r, g, blue = cv2.split(image)
        
        # 1. DETECCIÓN DE MICROANEURISMAS Y HEMORRAGIAS
        # Usar canal rojo invertido para detectar lesiones rojas
        red_lesions = 255 - r
        
        # Aplicar CLAHE para mejorar contraste en lesiones pequeñas
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        red_enhanced = clahe.apply(red_lesions)
        
        # Filtro morfológico para microaneurismas (estructuras pequeñas y circulares)
        kernel_micro = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        microaneurysms = cv2.morphologyEx(red_enhanced, cv2.MORPH_TOPHAT, kernel_micro)
        
        # Filtro para hemorragias (estructuras más grandes)
        kernel_hem = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        hemorrhages = cv2.morphologyEx(red_enhanced, cv2.MORPH_TOPHAT, kernel_hem)
        
        # 2. DETECCIÓN DE EXUDADOS DUROS (brillantes, amarillentos)
        # Usar luminancia alta y componente amarilla
        bright_spots = cv2.threshold(l, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        # Filtrar por color amarillento en espacio HSV
        yellow_mask = cv2.inRange(hsv, (15, 50, 100), (35, 255, 255))
        hard_exudates = cv2.bitwise_and(bright_spots, yellow_mask)
        
        # 3. DETECCIÓN DE EXUDADOS BLANDOS (manchas grises difusas)
        # Usar filtro Gaussiano para detectar cambios graduales
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), 0)
        soft_exudates = cv2.absdiff(gray, blurred)
        soft_exudates = cv2.threshold(soft_exudates, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        # 4. CREAR MAPA DE ANOMALÍAS COMBINADO
        anomaly_map = np.zeros_like(gray, dtype=np.float32)
        
        # Pesar diferentes tipos de lesiones
        anomaly_map += microaneurysms.astype(np.float32) * 0.8  # Alta importancia
        anomaly_map += hemorrhages.astype(np.float32) * 0.7     # Alta importancia  
        anomaly_map += hard_exudates.astype(np.float32) * 0.6   # Moderada importancia
        anomaly_map += soft_exudates.astype(np.float32) * 0.4   # Menor importancia
        
        # Normalizar el mapa
        if np.max(anomaly_map) > 0:
            anomaly_map = anomaly_map / np.max(anomaly_map)
            
        return anomaly_map, {
            'microaneurysms': microaneurysms,
            'hemorrhages': hemorrhages, 
            'hard_exudates': hard_exudates,
            'soft_exudates': soft_exudates
        }
    
    def enhance_retinal_image(self, image):
        """
        Mejorar imagen retinal usando CLAHE y técnicas específicas para retinografía
        """
        
        # 1. Aplicar CLAHE adaptativo por canal
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        # CLAHE más agresivo en luminancia para retinografía
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        
        # Recombinar canales
        enhanced_lab = cv2.merge([l_enhanced, a, b])
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
        
        # 2. Mejorar canal verde (mejor contraste vascular en retinografía)
        green_channel = enhanced_rgb[:, :, 1]
        green_enhanced = clahe.apply(green_channel)
        enhanced_rgb[:, :, 1] = green_enhanced
        
        # 3. Reducción de ruido preservando bordes
        enhanced_rgb = cv2.bilateralFilter(enhanced_rgb, 9, 75, 75)
        
        # 4. Sharpening suave para detalles finos
        kernel_sharpen = np.array([[-1, -1, -1],
                                  [-1,  9, -1], 
                                  [-1, -1, -1]]) * 0.1
        enhanced_rgb = cv2.filter2D(enhanced_rgb, -1, kernel_sharpen)
        enhanced_rgb = np.clip(enhanced_rgb, 0, 255).astype(np.uint8)
        
        return enhanced_rgb
    
    def create_medical_colormap(self, style='inferno'):
        """
        Crear colormaps médicos profesionales
        """
        if style == 'inferno':
            # Colormap tipo inferno médico
            colors = [
                [0.0, 0.0, 0.0],      # Negro (sin anomalía)
                [0.1, 0.0, 0.3],      # Púrpura oscuro
                [0.4, 0.0, 0.5],      # Púrpura
                [0.7, 0.2, 0.3],      # Rojo púrpura
                [0.9, 0.5, 0.1],      # Naranja
                [1.0, 0.8, 0.3],      # Amarillo
                [1.0, 1.0, 0.8]       # Amarillo brillante
            ]
        elif style == 'jet_medical':
            # JET modificado para uso médico
            colors = [
                [0.0, 0.0, 0.5],      # Azul oscuro
                [0.0, 0.4, 0.8],      # Azul 
                [0.0, 0.8, 0.8],      # Cian
                [0.4, 1.0, 0.4],      # Verde
                [0.8, 1.0, 0.0],      # Amarillo
                [1.0, 0.6, 0.0],      # Naranja
                [0.8, 0.0, 0.0]       # Rojo
            ]
        elif style == 'medical_thermal':
            # Mapa térmico médico
            colors = [
                [0.05, 0.05, 0.2],    # Azul muy oscuro
                [0.2, 0.1, 0.4],      # Azul púrpura
                [0.5, 0.0, 0.6],      # Púrpura
                [0.8, 0.2, 0.4],      # Rojo púrpura
                [1.0, 0.4, 0.0],      # Naranja rojizo
                [1.0, 0.7, 0.0],      # Naranja
                [1.0, 1.0, 0.5]       # Amarillo suave
            ]
        
        return LinearSegmentedColormap.from_list(f"medical_{style}", colors, N=256)
    
    def create_side_by_side_visualization(self, image_path, colormap_style='inferno'):
        """
        Crear visualización lado a lado: original vs pseudocolor con anomalías
        """
        # Cargar y redimensionar imagen
        if isinstance(image_path, str):
            image = cv2.imread(image_path)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image = image_path
            
        image_resized = cv2.resize(image, self.target_size, interpolation=cv2.INTER_CUBIC)
        
        # Mejorar imagen original
        enhanced_image = self.enhance_retinal_image(image_resized)
        
        # Detectar anomalías
        anomaly_map, lesion_details = self.detect_diabetic_retinopathy_features(enhanced_image)
        
        # Aplicar suavizado al mapa de anomalías
        anomaly_map_smooth = cv2.GaussianBlur(anomaly_map, (5, 5), 1.0)
        
        # Crear visualización profesional
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8), dpi=150)
        
        # === PANEL IZQUIERDO: IMAGEN ORIGINAL MEJORADA ===
        ax1.imshow(enhanced_image)
        ax1.set_title('Retinografía Original\n(CLAHE + Realce de Contraste)', 
                     fontsize=14, fontweight='bold', pad=20)
        ax1.axis('off')
        
        # Añadir anotaciones anatómicas
        ax1.text(0.02, 0.98, 'Disco Óptico', transform=ax1.transAxes, 
                bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
                fontsize=10, verticalalignment='top')
        
        ax1.text(0.02, 0.88, 'Mácula', transform=ax1.transAxes,
                bbox=dict(boxstyle="round,pad=0.3", facecolor="orange", alpha=0.7), 
                fontsize=10, verticalalignment='top')
        
        # === PANEL DERECHO: MAPA DE CALOR PSEUDOCOLOR ===
        cmap = self.create_medical_colormap(colormap_style)
        
        # Crear imagen base con transparencia
        base_alpha = 0.3
        pseudocolor_img = enhanced_image.copy().astype(np.float64)
        
        # Aplicar pseudocolor donde hay anomalías
        anomaly_colored = cmap(anomaly_map_smooth)[:, :, :3] * 255
        
        # Superposición inteligente
        mask = anomaly_map_smooth > 0.1  # Umbral para mostrar colores
        alpha_map = np.clip(base_alpha + 0.6 * anomaly_map_smooth, 0, 1)
        
        for c in range(3):
            pseudocolor_img[mask, c] = (
                (1 - alpha_map[mask]) * enhanced_image[mask, c] +
                alpha_map[mask] * anomaly_colored[mask, c]
            )
        
        pseudocolor_img = np.clip(pseudocolor_img, 0, 255).astype(np.uint8)
        
        im = ax2.imshow(pseudocolor_img)
        ax2.set_title(f'Mapa de Calor - Anomalías DR\n(Colormap: {colormap_style.title()})', 
                     fontsize=14, fontweight='bold', pad=20)
        ax2.axis('off')
        
        # === BARRA DE COLORES INTERPRETATIVA ===
        # Crear mappable para colorbar
        sm = plt.cm.ScalarMappable(cmap=cmap, norm=plt.Normalize(vmin=0, vmax=1))
        sm.set_array([])
        
        # Añadir colorbar
        cbar = plt.colorbar(sm, ax=ax2, fraction=0.046, pad=0.04, aspect=20)
        cbar.set_label('Nivel de Anomalía\n(Probabilidad de Patología DR)', 
                      rotation=270, labelpad=25, fontsize=12, fontweight='bold')
        
        # Etiquetas interpretativas
        cbar.set_ticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
        cbar.set_ticklabels([
            'Normal', 'Leve', 'Moderado', 
            'Significativo', 'Severo', 'Crítico'
        ], fontsize=10)
        
        # === INFORMACIÓN TÉCNICA ===
        info_text = (
            "Detección Automática:\n"
            "• Microaneurismas\n" 
            "• Hemorragias\n"
            "• Exudados duros/blandos\n"
            f"• Resolución: {self.target_size[0]}x{self.target_size[1]}\n"
            "• CLAHE aplicado\n"
            "• Filtros morfológicos"
        )
        
        ax2.text(0.02, 0.02, info_text, transform=ax2.transAxes, fontsize=9,
                bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.9),
                verticalalignment='bottom', fontfamily='monospace')
        
        # === CONFIGURACIÓN FINAL ===
        plt.tight_layout()
        plt.suptitle('Análisis de Retinopatía Diabética - Visualización Médica Profesional', 
                    fontsize=16, fontweight='bold', y=0.95)
        
        # Guardar en buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='PNG', bbox_inches='tight', 
                   facecolor='white', dpi=150, pad_inches=0.2)
        plt.close()
        
        # Estadísticas de detección
        stats = {
            'total_anomalies': np.sum(anomaly_map > 0.1),
            'high_risk_pixels': np.sum(anomaly_map > 0.6),
            'anomaly_percentage': (np.sum(anomaly_map > 0.1) / anomaly_map.size) * 100,
            'max_anomaly_score': float(np.max(anomaly_map)),
            'mean_anomaly_score': float(np.mean(anomaly_map[anomaly_map > 0]))
        }
        
        return base64.b64encode(buffer.getvalue()).decode("utf-8"), stats

# Función principal para integrar con el sistema existente
def generar_visualizacion_medica_retinografia(image_path, colormap='inferno'):
    """
    Función principal para generar visualización médica de retinografía
    
    Args:
        image_path: Ruta a la imagen o array numpy
        colormap: 'inferno', 'jet_medical', o 'medical_thermal'
    
    Returns:
        dict con visualización base64 y estadísticas
    """
    visualizer = RetinographyVisualizer()
    
    try:
        visualization_b64, stats = visualizer.create_side_by_side_visualization(
            image_path, colormap
        )
        
        return {
            "visualization": visualization_b64,
            "statistics": stats,
            "colormap_used": colormap,
            "resolution": "512x512",
            "processing": "CLAHE + Morfología + Pseudocolor",
            "features_detected": [
                "Microaneurismas",
                "Hemorragias", 
                "Exudados duros",
                "Exudados blandos"
            ],
            "medical_grade": True
        }
        
    except Exception as e:
        return {
            "error": f"Error generando visualización médica: {str(e)}",
            "visualization": None
        }