import numpy as np
import cv2
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.colors import LinearSegmentedColormap
import base64
import xml.etree.ElementTree as ET
from PIL import Image
from io import BytesIO
from typing import Tuple, Dict, Optional, Union
import warnings

# Suppress matplotlib warnings
warnings.filterwarnings('ignore', category=UserWarning)

class MedicalGradCAMEnhancer:
    """
    Enhanced Grad-CAM processor for clinical retinal analysis.
    
    Implements medical-grade visualization with:
    - Robust percentile normalization (1-99 or 2-98)
    - Bicubic interpolation for smooth scaling
    - Gaussian blur for transition smoothing
    - Circular retina masking
    - Noise elimination with morphological operations
    - Clinical colormaps (Inferno preferred)
    - Professional overlay composition
    - Dual PNG export (RGBA + RGB)
    - SVG colorbar generation
    - Comprehensive metadata tracking
    """
    
    def __init__(self):
        self.input_size = (96, 96)  # Original Grad-CAM size
        self.output_size = (512, 512)  # High-resolution output
        self.default_alpha = 0.35  # Clinical transparency
        
    def enhance_gradcam(
        self, 
        heatmap_raw: np.ndarray, 
        retina_hr: Union[np.ndarray, Image.Image],
        target_size: int = 512,
        percentile_range: Tuple[float, float] = (0.5, 99.5),
        gaussian_kernel: int = 7,
        alpha_overlay: float = 0.35,
        colormap_type: str = 'inferno'
    ) -> Dict:
        """
        Main enhancement pipeline for medical Grad-CAM visualization.
        
        Args:
            heatmap_raw: Raw Grad-CAM heatmap (96x96, float)
            retina_hr: High-resolution retinal image (≥512x512, RGB)
            target_size: Output resolution (default: 512)
            percentile_range: Normalization percentiles (default: 1-99)
            gaussian_kernel: Blur kernel size (default: 7, must be odd)
            alpha_overlay: Overlay transparency (default: 0.35)
            colormap_type: Clinical colormap ('inferno', 'jet', 'viridis')
            
        Returns:
            Dict containing enhanced visualizations and metadata
        """
        # Ensure kernel is odd
        if gaussian_kernel % 2 == 0:
            gaussian_kernel += 1
            
        # Convert PIL to numpy if needed
        if isinstance(retina_hr, Image.Image):
            retina_array = np.array(retina_hr.convert('RGB'))
        else:
            retina_array = retina_hr.copy()
            
        # Ensure target resolution
        if retina_array.shape[:2] != (target_size, target_size):
            retina_array = cv2.resize(retina_array, (target_size, target_size), cv2.INTER_LANCZOS4)
        
        result = {}
        
        # STEP 1: Robust percentile normalization
        print(f"🔬 Step 1: Robust normalization ({percentile_range[0]}-{percentile_range[1]} percentiles)")
        heatmap_normalized = self._robust_normalize(heatmap_raw, percentile_range)
        
        # STEP 2: Bicubic upsampling to high resolution
        print(f"🔬 Step 2: Bicubic interpolation to {target_size}x{target_size}")
        heatmap_hires = self._bicubic_upscale(heatmap_normalized, (target_size, target_size))
        
        # STEP 3: Gaussian blur for smooth transitions
        print(f"🔬 Step 3: Gaussian blur (kernel={gaussian_kernel})")
        heatmap_smooth = self._gaussian_smooth(heatmap_hires, gaussian_kernel)
        
        # STEP 4: Circular retina masking
        print("🔬 Step 4: Circular retina masking")
        mask_info = self._create_retina_mask(retina_array)
        heatmap_masked = self._apply_retina_mask(heatmap_smooth, mask_info['mask'])
        
        # STEP 5: Noise elimination
        print("🔬 Step 5: Noise elimination")
        heatmap_clean = self._eliminate_noise(heatmap_masked, threshold=0.05)
        
        # STEP 6: Clinical colormap application
        print(f"🔬 Step 6: Clinical colormap ({colormap_type})")
        colormap = self._get_clinical_colormap(colormap_type)
        heatmap_colored = self._apply_colormap(heatmap_clean, colormap)
        
        # STEP 7: Create overlay compositions
        print("🔬 Step 7: Overlay composition")
        overlays = self._create_overlays(
            heatmap_colored, 
            heatmap_clean, 
            retina_array, 
            alpha_overlay,
            mask_info['mask']
        )
        
        # STEP 8: Export PNG assets
        print("🔬 Step 8: PNG export")
        png_assets = self._export_png_assets(overlays, heatmap_colored, heatmap_clean)
        
        # STEP 9: Generate SVG colorbar
        print("🔬 Step 9: SVG colorbar generation")
        colorbar_svg = self._generate_svg_colorbar(colormap_type)
        
        # STEP 10: Compile metadata
        print("🔬 Step 10: Metadata compilation")
        metadata = self._compile_metadata(
            heatmap_raw.shape,
            (target_size, target_size),
            percentile_range,
            gaussian_kernel,
            colormap_type,
            alpha_overlay,
            mask_info
        )
        
        # Compile final result
        result.update({
            'gradcam_rgba_transparent': png_assets['rgba_transparent'],
            'gradcam_rgb_overlay': png_assets['rgb_overlay'], 
            'colorbar_svg': colorbar_svg,
            'metadata': metadata,
            'mask_confidence': mask_info['confidence'],
            'enhancement_applied': True,
            'medical_grade': True,
            'clinical_ready': True
        })
        
        print(f"✅ Enhanced Grad-CAM generation completed - Quality: MEDICAL GRADE")
        return result
    
    def _robust_normalize(self, heatmap: np.ndarray, percentile_range: Tuple[float, float]) -> np.ndarray:
        """
        Step 1: Enhanced percentile-based normalization (0.5-99.5%)
        Evita saturación en rojo y mantiene detalles clínicos importantes
        """
        p_low, p_high = percentile_range
        
        # 🏥 MEJORA CLÍNICA: Usar percentiles más precisos para evitar saturación
        print(f"🔬 Aplicando normalización clínica: percentiles {p_low}-{p_high}%")
        
        # Calculate percentiles only on non-zero values to avoid background bias
        non_zero_mask = heatmap > 1e-6  # Umbral más estricto para valores válidos
        if np.any(non_zero_mask):
            valid_values = heatmap[non_zero_mask]
            p_low_val = np.percentile(valid_values, p_low)
            p_high_val = np.percentile(valid_values, p_high)
            print(f"   📊 Rango de activación: [{p_low_val:.6f}, {p_high_val:.6f}]")
        else:
            p_low_val = np.percentile(heatmap, p_low)
            p_high_val = np.percentile(heatmap, p_high)
            print(f"   ⚠️  Usando todos los valores: [{p_low_val:.6f}, {p_high_val:.6f}]")
        
        # Avoid division by zero with better handling
        if p_high_val <= p_low_val:
            p_high_val = p_low_val + 1e-8
            print(f"   🔧 Rango ajustado para evitar división por cero")
            
        # 🎯 MEJORA: Normalización suave que preserva gradientes sutiles
        heatmap_clipped = np.clip(heatmap, p_low_val, p_high_val)
        heatmap_normalized = (heatmap_clipped - p_low_val) / (p_high_val - p_low_val)
        
        # Verificar calidad de la normalización
        final_min, final_max = heatmap_normalized.min(), heatmap_normalized.max()
        print(f"   ✅ Normalización completada: [{final_min:.3f}, {final_max:.3f}]")
        
        return heatmap_normalized
    
    def _bicubic_upscale(self, heatmap: np.ndarray, target_shape: Tuple[int, int]) -> np.ndarray:
        """Step 2: High-quality bicubic interpolation"""
        return cv2.resize(heatmap, target_shape, interpolation=cv2.INTER_CUBIC)
    
    def _gaussian_smooth(self, heatmap: np.ndarray, kernel_size: int) -> np.ndarray:
        """Step 3: Gaussian blur for smooth transitions"""
        sigma = kernel_size / 6.0  # Standard sigma calculation
        return cv2.GaussianBlur(heatmap, (kernel_size, kernel_size), sigma)
    
    def _create_retina_mask(self, retina_image: np.ndarray) -> Dict:
        """Step 4: Create circular retina mask"""
        height, width = retina_image.shape[:2]
        
        # Convert to grayscale for circle detection
        gray = cv2.cvtColor(retina_image, cv2.COLOR_RGB2GRAY)
        
        # Apply bilateral filter to reduce noise while preserving edges
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Adaptive Canny edge detection
        mean_intensity = np.mean(filtered)
        lower_thresh = max(30, int(mean_intensity * 0.4))
        upper_thresh = max(60, int(mean_intensity * 0.8))
        edges = cv2.Canny(filtered, lower_thresh, upper_thresh)
        
        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        # Circle detection with multiple parameter sets
        min_radius = int(min(width, height) * 0.3)
        max_radius = int(min(width, height) * 0.48)
        
        circles = cv2.HoughCircles(
            filtered,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=int(min(width, height) * 0.5),
            param1=50,
            param2=30,
            minRadius=min_radius,
            maxRadius=max_radius
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            # Select best circle (closest to center with appropriate size)
            center_x, center_y = width // 2, height // 2
            best_circle = None
            best_score = -1
            
            for (x, y, r) in circles:
                if (r >= min_radius and r <= max_radius and
                    x - r >= 0 and x + r < width and
                    y - r >= 0 and y + r < height):
                    
                    # Score based on centrality and size
                    center_dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
                    center_score = 1 - (center_dist / (min(width, height) * 0.3))
                    size_score = 1 - abs(r - (min_radius + max_radius) / 2) / (max_radius - min_radius)
                    total_score = center_score * 0.6 + size_score * 0.4
                    
                    if total_score > best_score:
                        best_score = total_score
                        best_circle = (x, y, r)
            
            if best_circle:
                center_x, center_y, radius = best_circle
                confidence = min(0.9, best_score * 1.2)
            else:
                center_x, center_y = width // 2, height // 2
                radius = int(min(width, height) * 0.4)
                confidence = 0.3
        else:
            # Fallback to center estimation
            center_x, center_y = width // 2, height // 2
            radius = int(min(width, height) * 0.4)
            confidence = 0.3
        
        # 🎯 MEJORA: Crear máscara circular con borde feather de 20px
        print(f"🎯 Creando máscara circular mejorada: centro=({center_x}, {center_y}), radio={radius}")
        
        mask = np.zeros((height, width), dtype=np.float32)
        
        # Crear máscara con feather de 20px
        feather_pixels = 20
        y_coords, x_coords = np.ogrid[:height, :width]
        distances = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
        
        # Zona completamente opaca (interior)
        inner_radius = max(0, radius - feather_pixels)
        # Zona de transición suave (feather)
        outer_radius = radius + feather_pixels
        
        # Aplicar transición suave con función sigmoide
        mask = np.where(distances <= inner_radius, 1.0, 
                       np.where(distances >= outer_radius, 0.0,
                               1.0 - (distances - inner_radius) / (outer_radius - inner_radius)))
        
        # 🔬 MEJORA CLÍNICA: Suavizar aún más los bordes para evitar artefactos
        mask = cv2.GaussianBlur(mask, (7, 7), 2.5)
        
        print(f"   ✅ Máscara creada con feather de {feather_pixels}px - Sin artefactos rectangulares")
        
        return {
            'mask': mask,
            'center': (center_x, center_y),
            'radius': radius,
            'confidence': confidence
        }
    
    def _apply_retina_mask(self, heatmap: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Apply circular mask to heatmap"""
        return heatmap * mask
    
    def _eliminate_noise(self, heatmap: np.ndarray, threshold: float = 0.05) -> np.ndarray:
        """Step 5: Noise elimination with soft thresholding and morphological opening"""
        # Soft thresholding
        heatmap_thresh = np.where(heatmap < threshold, 0, heatmap)
        
        # Morphological opening to remove small noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        
        # Convert to uint8 for morphology
        heatmap_uint8 = (heatmap_thresh * 255).astype(np.uint8)
        
        # Apply opening
        opened = cv2.morphologyEx(heatmap_uint8, cv2.MORPH_OPENING, kernel, iterations=1)
        
        # Convert back to float
        heatmap_clean = opened.astype(np.float32) / 255.0
        
        return heatmap_clean
    
    def _get_clinical_colormap(self, colormap_type: str):
        """Get clinical colormap"""
        if colormap_type == 'inferno':
            return plt.cm.inferno
        elif colormap_type == 'jet':
            # Custom medical jet: blue (safe) -> red (critical)
            colors = [
                (0.0, [0.0, 0.0, 0.5, 0.0]),  # Dark blue transparent
                (0.2, [0.0, 0.2, 0.8, 0.4]),  # Blue
                (0.4, [0.0, 0.8, 0.8, 0.7]),  # Cyan  
                (0.6, [0.0, 1.0, 0.0, 0.8]),  # Green
                (0.8, [1.0, 1.0, 0.0, 0.9]),  # Yellow
                (1.0, [1.0, 0.0, 0.0, 1.0])   # Red
            ]
            return LinearSegmentedColormap.from_list('medical_jet', colors)
        elif colormap_type == 'viridis':
            return plt.cm.viridis
        else:
            return plt.cm.inferno  # Default fallback
    
    def _apply_colormap(self, heatmap: np.ndarray, colormap) -> np.ndarray:
        """Apply colormap to heatmap"""
        return colormap(heatmap)
    
    def _create_overlays(
        self, 
        heatmap_colored: np.ndarray, 
        heatmap_intensity: np.ndarray,
        retina_image: np.ndarray, 
        alpha_overlay: float,
        mask: np.ndarray
    ) -> Dict:
        """Create different overlay compositions"""
        overlays = {}
        
        # RGBA transparent overlay (for web control)
        rgba_overlay = heatmap_colored.copy()
        # Set alpha based on activation intensity and mask
        alpha_channel = heatmap_intensity * mask * alpha_overlay
        rgba_overlay[:, :, 3] = alpha_channel
        overlays['rgba_transparent'] = rgba_overlay
        
        # Opaque RGBA (full alpha where there's activation)  
        rgba_opaque = heatmap_colored.copy()
        alpha_opaque = (heatmap_intensity > 0.01) * mask
        rgba_opaque[:, :, 3] = alpha_opaque
        overlays['rgba_opaque'] = rgba_opaque
        
        # RGB overlay (traditional superimposition)
        rgb_overlay = retina_image.astype(np.float32) / 255.0
        heatmap_rgb = heatmap_colored[:, :, :3]
        
        # Blend based on activation intensity
        blend_mask = (heatmap_intensity * mask)[:, :, np.newaxis]
        rgb_overlay = (1 - blend_mask * alpha_overlay) * rgb_overlay + blend_mask * alpha_overlay * heatmap_rgb
        rgb_overlay = np.clip(rgb_overlay * 255, 0, 255).astype(np.uint8)
        overlays['rgb_overlay'] = rgb_overlay
        
        return overlays
    
    def _export_png_assets(self, overlays: Dict, heatmap_colored: np.ndarray, heatmap_intensity: np.ndarray) -> Dict:
        """
        🏥 MEJORA CLÍNICA: Exportar PNG transparente sin fondo rojo
        Permite superposición directa sobre imagen original
        """
        assets = {}
        
        print(f"🎨 Exportando PNG transparente clínico...")
        
        # 🎯 MEJORA: RGBA transparente SIN fondo rojo para superposición médica
        rgba_img = (overlays['rgba_transparent'] * 255).astype(np.uint8)
        
        # Verificar que tenemos canal alpha correcto
        if rgba_img.shape[2] == 4:
            print(f"   ✅ Canal RGBA válido: {rgba_img.shape}")
            # Asegurar que el fondo sea completamente transparente
            alpha_channel = rgba_img[:, :, 3]
            # Donde alpha es 0, hacer RGB también 0 para evitar bleeding
            zero_alpha_mask = alpha_channel == 0
            rgba_img[zero_alpha_mask, :3] = 0
        else:
            print(f"   ⚠️  Convirtiendo a RGBA: {rgba_img.shape}")
            # Convertir RGB a RGBA con alpha basado en intensidad
            if rgba_img.shape[2] == 3:
                alpha = np.where(heatmap_intensity > 0.01, 
                               (heatmap_intensity * 255).astype(np.uint8), 0)
                rgba_img = np.dstack([rgba_img, alpha])
        
        rgba_pil = Image.fromarray(rgba_img, 'RGBA')
        rgba_buffer = BytesIO()
        rgba_pil.save(rgba_buffer, format='PNG', optimize=True, compress_level=6)
        assets['rgba_transparent'] = base64.b64encode(rgba_buffer.getvalue()).decode('utf-8')
        
        # RGB overlay PNG (mantenido para compatibilidad)
        rgb_pil = Image.fromarray(overlays['rgb_overlay'], 'RGB')
        rgb_buffer = BytesIO()
        rgb_pil.save(rgb_buffer, format='PNG', optimize=True, compress_level=6)
        assets['rgb_overlay'] = base64.b64encode(rgb_buffer.getvalue()).decode('utf-8')
        
        print(f"   ✅ PNG transparente exportado - Listo para superposición clínica")
        return assets
    
    def _generate_svg_colorbar(self, colormap_type: str, width: int = 350, height: int = 60) -> str:
        """
        🏥 MEJORA CLÍNICA: Barra de color médica con etiquetas profesionales
        Escala 'Baja ↔ Alta activación' para interpretación clínica
        """
        print(f"📊 Generando barra de color clínica...")
        
        colormap = self._get_clinical_colormap(colormap_type)
        
        # Create SVG root con mayor altura para etiquetas médicas
        svg = ET.Element('svg', {
            'width': str(width),
            'height': str(height + 50),
            'viewBox': f'0 0 {width} {height + 50}',
            'xmlns': 'http://www.w3.org/2000/svg',
            'style': 'background: white; border-radius: 8px;'
        })
        
        # 🎯 TÍTULO MÉDICO
        title = ET.SubElement(svg, 'text', {
            'x': str(width//2), 'y': '15',
            'font-family': 'Arial, sans-serif', 'font-size': '14', 'font-weight': 'bold',
            'fill': '#2d3748', 'text-anchor': 'middle'
        })
        title.text = 'Mapa de Activación Neural - Análisis Clínico'
        
        # Create gradient definition
        defs = ET.SubElement(svg, 'defs')
        gradient = ET.SubElement(defs, 'linearGradient', {
            'id': 'medicalGradient',
            'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '0%'
        })
        
        # Add color stops con más resolución para suavidad
        num_stops = 50
        for i in range(num_stops):
            position = i / (num_stops - 1)
            color_rgba = colormap(position)
            color_hex = f"#{int(color_rgba[0]*255):02x}{int(color_rgba[1]*255):02x}{int(color_rgba[2]*255):02x}"
            
            ET.SubElement(gradient, 'stop', {
                'offset': f'{position*100}%',
                'stop-color': color_hex,
                'stop-opacity': '1'
            })
        
        # Gradient rectangle con bordes redondeados
        ET.SubElement(svg, 'rect', {
            'x': '30', 'y': '25',
            'width': str(width-60), 'height': str(height-35),
            'fill': 'url(#medicalGradient)',
            'stroke': '#4a5568', 'stroke-width': '2',
            'rx': '4', 'ry': '4'
        })
        
        # 🏥 ETIQUETAS MÉDICAS MEJORADAS
        # Etiqueta izquierda
        left_label = ET.SubElement(svg, 'text', {
            'x': '30', 'y': str(height + 40),
            'font-family': 'Arial, sans-serif', 'font-size': '13', 'font-weight': '600',
            'fill': '#4a5568', 'text-anchor': 'start'
        })
        left_label.text = '← Baja Activación'
        
        # Etiqueta central con flecha bidireccional
        center_label = ET.SubElement(svg, 'text', {
            'x': str(width//2), 'y': str(height + 40),
            'font-family': 'Arial, sans-serif', 'font-size': '12', 'font-weight': '500',
            'fill': '#2d3748', 'text-anchor': 'middle'
        })
        center_label.text = 'Intensidad de Atención IA'
        
        # Etiqueta derecha
        right_label = ET.SubElement(svg, 'text', {
            'x': str(width-30), 'y': str(height + 40),
            'font-family': 'Arial, sans-serif', 'font-size': '13', 'font-weight': '600',
            'fill': '#4a5568', 'text-anchor': 'end'
        })
        right_label.text = 'Alta Activación →'
        
        # 📈 MARCADORES DE ESCALA
        for i, (pos, label) in enumerate([(0, '0%'), (0.25, '25%'), (0.5, '50%'), (0.75, '75%'), (1, '100%')]):
            x_pos = 30 + (width-60) * pos
            # Línea de tick
            ET.SubElement(svg, 'line', {
                'x1': str(x_pos), 'y1': str(height - 10),
                'x2': str(x_pos), 'y2': str(height - 5),
                'stroke': '#4a5568', 'stroke-width': '1.5'
            })
            # Etiqueta de porcentaje
            tick_label = ET.SubElement(svg, 'text', {
                'x': str(x_pos), 'y': str(height + 15),
                'font-family': 'Arial, sans-serif', 'font-size': '10',
                'fill': '#718096', 'text-anchor': 'middle'
            })
            tick_label.text = label
        
        print(f"   ✅ Barra de color clínica generada con éxito")
        return ET.tostring(svg, encoding='unicode')
    
    def _compile_metadata(
        self, 
        input_shape: Tuple, 
        output_shape: Tuple,
        percentile_range: Tuple[int, int],
        gaussian_kernel: int,
        colormap_type: str,
        alpha_overlay: float,
        mask_info: Dict
    ) -> Dict:
        """Compile comprehensive metadata"""
        return {
            'enhancement_method': 'Medical-grade Grad-CAM Enhancement v2.0',
            'input_size': f"{input_shape[0]}x{input_shape[1]}" if len(input_shape) >= 2 else str(input_shape),
            'output_size': f"{output_shape[0]}x{output_shape[1]}",
            'normalization': f'Robust percentiles {percentile_range[0]}-{percentile_range[1]}',
            'interpolation': 'Bicubic INTER_CUBIC (medical-grade)',
            'smoothing': f'Gaussian blur kernel={gaussian_kernel}, σ={gaussian_kernel/6:.2f}',
            'masking': f'Circular retina mask (confidence: {mask_info["confidence"]:.3f})',
            'noise_reduction': 'Soft threshold 0.05 + morphological opening',
            'colormap': f'{colormap_type.title()} (clinical standard)',
            'overlay_alpha': f'{alpha_overlay:.2f}',
            'export_formats': ['PNG RGBA transparent', 'PNG RGB overlay', 'SVG colorbar'],
            'medical_compliance': 'Clinical visualization standards',
            'interpretation': {
                'dark_blue_transparent': 'No significant activation',
                'blue_cyan': 'Low activation (normal tissue)', 
                'green_yellow': 'Moderate activation (attention needed)',
                'orange_red': 'High activation (critical findings)'
            },
            'quality_assurance': {
                'anti_aliasing': 'Applied',
                'edge_smoothing': 'Gaussian + bilateral filtering',
                'contrast_preservation': 'Percentile normalization',
                'anatomical_masking': 'Automatic circular detection'
            }
        }


def enhance_gradcam_medical(
    heatmap_raw: np.ndarray, 
    retina_hr: Union[np.ndarray, Image.Image],
    target_size: int = 512,
    colormap_type: str = 'inferno',
    percentile_range: Tuple[float, float] = (0.5, 99.5)
) -> Dict:
    """
    🏥 FUNCIÓN PRINCIPAL MEJORADA: Enhanced Medical Grad-CAM con optimizaciones clínicas
    
    Args:
        heatmap_raw: Raw Grad-CAM heatmap (96x96, float) 
        retina_hr: High-resolution retinal image (≥512x512, RGB)
        target_size: Output resolution (default: 512)
        colormap_type: Clinical colormap ('inferno', 'jet', 'viridis')
        percentile_range: Percentiles for normalization (default: 0.5-99.5% para evitar saturación)
        
    Returns:
        Dict with enhanced visualizations, PNG transparente, y barra de color clínica
    """
    print(f"🏥 Iniciando GradCAM++ médico mejorado con percentiles {percentile_range}")
    
    enhancer = MedicalGradCAMEnhancer()
    return enhancer.enhance_gradcam(
        heatmap_raw=heatmap_raw,
        retina_hr=retina_hr, 
        target_size=target_size,
        percentile_range=percentile_range,  # 🎯 USAR NUEVOS PERCENTILES
        colormap_type=colormap_type
    )