"""
📄 Generador Profesional de Reportes PDF para Retinopatía Diabética
Sistema completo de generación de reportes médicos profesionales con visualizaciones
"""

import os
import io
import base64
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.platypus import Table, TableStyle, KeepTogether, Frame, PageTemplate
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import numpy as np
from PIL import Image as PILImage
import matplotlib
matplotlib.use('Agg')  # Backend sin GUI
import matplotlib.pyplot as plt
import seaborn as sns

logger = logging.getLogger(__name__)

class ProfessionalPDFReport:
    """
    Generador de reportes PDF profesionales para diagnóstico de retinopatía diabética
    Incluye visualizaciones médicas, análisis de confianza y recomendaciones
    """

    def __init__(self):
        self.styles = self._create_custom_styles()
        self.colors = {
            'primary': HexColor('#2E86AB'),
            'secondary': HexColor('#A23B72'),
            'success': HexColor('#2ECC71'),
            'warning': HexColor('#F39C12'),
            'danger': HexColor('#E74C3C'),
            'info': HexColor('#3498DB'),
            'dark': HexColor('#2C3E50'),
            'light_gray': HexColor('#ECF0F1'),
            'medical_blue': HexColor('#1E3A8A'),
            'medical_green': HexColor('#059669')
        }

    def _create_custom_styles(self):
        """Crea estilos personalizados para el reporte médico"""
        styles = getSampleStyleSheet()

        # Estilo para título principal
        styles.add(ParagraphStyle(
            name='TitleMain',
            parent=styles['Title'],
            fontSize=24,
            textColor=HexColor('#1E3A8A'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Estilo para subtítulos
        styles.add(ParagraphStyle(
            name='SubTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=HexColor('#2E86AB'),
            spaceAfter=12,
            spaceBefore=18,
            fontName='Helvetica-Bold'
        ))

        # Estilo para encabezados de sección
        styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=HexColor('#2C3E50'),
            spaceAfter=8,
            spaceBefore=15,
            fontName='Helvetica-Bold',
            borderWidth=0,
            borderColor=HexColor('#2E86AB'),
            borderPadding=5
        ))

        # Estilo para texto médico
        styles.add(ParagraphStyle(
            name='MedicalText',
            parent=styles['Normal'],
            fontSize=11,
            textColor=HexColor('#2C3E50'),
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))

        # Estilo para datos importantes
        styles.add(ParagraphStyle(
            name='ImportantData',
            parent=styles['Normal'],
            fontSize=12,
            textColor=HexColor('#1E3A8A'),
            spaceAfter=8,
            fontName='Helvetica-Bold'
        ))

        # Estilo para confianza alta
        styles.add(ParagraphStyle(
            name='HighConfidence',
            parent=styles['Normal'],
            fontSize=11,
            textColor=HexColor('#059669'),
            fontName='Helvetica-Bold'
        ))

        # Estilo para confianza baja
        styles.add(ParagraphStyle(
            name='LowConfidence',
            parent=styles['Normal'],
            fontSize=11,
            textColor=HexColor('#DC2626'),
            fontName='Helvetica-Bold'
        ))

        # Estilo para recomendaciones
        styles.add(ParagraphStyle(
            name='Recommendation',
            parent=styles['Normal'],
            fontSize=11,
            textColor=HexColor('#2C3E50'),
            spaceAfter=6,
            leftIndent=20,
            bulletIndent=15,
            fontName='Helvetica'
        ))

        return styles

    def generate_patient_report(self, patient_data: Dict, diagnosis_data: Dict,
                              confidence_analysis: Dict, gradcam_data: Optional[Dict] = None) -> bytes:
        """
        Genera reporte completo del paciente

        Args:
            patient_data: Información del paciente
            diagnosis_data: Datos del diagnóstico
            confidence_analysis: Análisis de confianza
            gradcam_data: Datos de GradCAM (opcional)

        Returns:
            bytes: PDF generado
        """
        try:
            # Buffer para el PDF
            buffer = io.BytesIO()

            # Crear documento
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )

            # Construir contenido
            story = []

            # 1. Encabezado principal
            self._add_header(story, patient_data)

            # 2. Información del paciente
            self._add_patient_info(story, patient_data)

            # 3. Diagnóstico principal
            self._add_diagnosis_section(story, diagnosis_data, confidence_analysis)

            # 4. Análisis de confianza detallado
            self._add_confidence_analysis(story, confidence_analysis)

            # 5. Visualizaciones médicas
            if gradcam_data:
                self._add_medical_visualizations(story, gradcam_data)

            # 6. Recomendaciones clínicas
            self._add_clinical_recommendations(story, diagnosis_data, confidence_analysis)

            # 7. Información técnica
            self._add_technical_details(story, diagnosis_data, confidence_analysis)

            # 8. Pie de página con disclaimer
            self._add_disclaimer(story)

            # Generar PDF
            doc.build(story)

            # Obtener contenido del buffer
            pdf_content = buffer.getvalue()
            buffer.close()

            logger.info(f"✅ Reporte PDF generado: {len(pdf_content)} bytes")
            return pdf_content

        except Exception as e:
            logger.error(f"Error generando reporte PDF: {e}")
            raise

    def _add_header(self, story: List, patient_data: Dict):
        """Agrega encabezado principal del reporte"""
        # Logo o título institucional (si tienes logo, añádelo aquí)
        story.append(Paragraph(
            "REPORTE DE ANÁLISIS DE RETINOPATÍA DIABÉTICA",
            self.styles['TitleMain']
        ))

        story.append(Paragraph(
            "Sistema de Inteligencia Artificial para Diagnóstico Médico",
            self.styles['SubTitle']
        ))

        # Línea divisoria
        story.append(Spacer(1, 15))

        # Información del reporte
        report_info = [
            ["Fecha del Reporte:", datetime.now().strftime("%d/%m/%Y %H:%M")],
            ["Número de Historia:", patient_data.get('historia_clinica', 'N/A')],
            ["Sistema:", "IA Retinopatía v2.0"],
        ]

        table = Table(report_info, colWidths=[4*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), self.colors['dark']),
        ]))

        story.append(table)
        story.append(Spacer(1, 20))

    def _add_patient_info(self, story: List, patient_data: Dict):
        """Agrega información del paciente"""
        story.append(Paragraph("INFORMACIÓN DEL PACIENTE", self.styles['SectionHeader']))

        # Calcular edad si hay fecha de nacimiento
        edad = "N/A"
        if patient_data.get('fecha_nacimiento'):
            try:
                from datetime import date
                fecha_nac = datetime.strptime(patient_data['fecha_nacimiento'], '%Y-%m-%d').date()
                edad = str((date.today() - fecha_nac).days // 365)
            except:
                pass

        patient_info = [
            ["Nombre Completo:", f"{patient_data.get('nombres', '')} {patient_data.get('apellidos', '')}"],
            ["CI:", patient_data.get('ci', 'N/A')],
            ["Edad:", f"{edad} años"],
            ["Género:", patient_data.get('genero', 'N/A')],
            ["Tipo de Diabetes:", patient_data.get('tipo_diabetes', 'N/A')],
            ["Estado Dilatación:", patient_data.get('estado_dilatacion', 'N/A')],
            ["Cámara Retinal:", patient_data.get('camara_retinal', 'N/A')],
        ]

        table = Table(patient_info, colWidths=[4*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), self.colors['medical_blue']),
            ('GRID', (0, 0), (-1, -1), 0.5, self.colors['light_gray']),
            ('BACKGROUND', (0, 0), (0, -1), self.colors['light_gray']),
        ]))

        story.append(table)
        story.append(Spacer(1, 20))

    def _add_diagnosis_section(self, story: List, diagnosis_data: Dict, confidence_analysis: Dict):
        """Agrega sección de diagnóstico principal"""
        story.append(Paragraph("DIAGNÓSTICO PRINCIPAL", self.styles['SectionHeader']))

        # Mapeo de resultados
        resultados_map = {
            0: "Sin retinopatía diabética",
            1: "Retinopatía diabética leve",
            2: "Retinopatía diabética moderada",
            3: "Retinopatía diabética severa",
            4: "Retinopatía diabética proliferativa"
        }

        # Severidad y color
        severidad_map = {
            0: ("NORMAL", self.colors['success']),
            1: ("LEVE", self.colors['info']),
            2: ("MODERADA", self.colors['warning']),
            3: ("SEVERA", self.colors['danger']),
            4: ("CRÍTICA", self.colors['danger'])
        }

        resultado = diagnosis_data.get('resultado', 0)
        confianza = float(diagnosis_data.get('confianza', 0))

        diagnóstico = resultados_map.get(resultado, "Resultado desconocido")
        severidad, color_severidad = severidad_map.get(resultado, ("DESCONOCIDO", self.colors['dark']))

        # Tabla de diagnóstico
        diagnosis_table = [
            ["DIAGNÓSTICO:", diagnóstico],
            ["SEVERIDAD:", severidad],
            ["CONFIANZA DEL SISTEMA:", f"{confianza:.1%}"],
            ["NIVEL DE CONFIANZA:", confidence_analysis.get('confidence_level', 'N/A')],
        ]

        table = Table(diagnosis_table, colWidths=[5*cm, 9*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TEXTCOLOR', (0, 0), (0, -1), self.colors['medical_blue']),
            ('TEXTCOLOR', (1, 1), (1, 1), color_severidad),  # Color para severidad
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, self.colors['medical_blue']),
            ('BACKGROUND', (0, 0), (0, -1), self.colors['light_gray']),
        ]))

        story.append(table)

        # Interpretación del diagnóstico
        story.append(Spacer(1, 15))
        story.append(Paragraph("INTERPRETACIÓN CLÍNICA", self.styles['SectionHeader']))

        interpretacion = self._get_clinical_interpretation(resultado, confianza)
        story.append(Paragraph(interpretacion, self.styles['MedicalText']))

        story.append(Spacer(1, 15))

    def _add_confidence_analysis(self, story: List, confidence_analysis: Dict):
        """Agrega análisis detallado de confianza"""
        story.append(Paragraph("ANÁLISIS DE CONFIANZA DEL SISTEMA", self.styles['SectionHeader']))

        # Métricas de confianza
        final_confidence = confidence_analysis.get('final_confidence', 0)
        raw_confidence = confidence_analysis.get('raw_confidence', 0)
        calibrated_confidence = confidence_analysis.get('calibrated_confidence', 0)

        confidence_data = [
            ["Confianza Base:", f"{raw_confidence:.1%}"],
            ["Confianza Calibrada:", f"{calibrated_confidence:.1%}"],
            ["Confianza Final:", f"{final_confidence:.1%}"],
            ["Interpretación:", confidence_analysis.get('interpretation', 'N/A')],
        ]

        table = Table(confidence_data, colWidths=[4*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), self.colors['medical_blue']),
            ('GRID', (0, 0), (-1, -1), 0.5, self.colors['light_gray']),
        ]))

        story.append(table)

        # Métricas de incertidumbre si están disponibles
        uncertainty = confidence_analysis.get('uncertainty_metrics', {})
        if uncertainty:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Métricas de Incertidumbre:", self.styles['ImportantData']))

            uncertainty_data = [
                ["Entropía:", f"{uncertainty.get('entropy', 0):.3f}"],
                ["Margen de Confianza:", f"{uncertainty.get('margin', 0):.3f}"],
                ["Coeficiente de Gini:", f"{uncertainty.get('gini_coefficient', 0):.3f}"],
            ]

            uncertainty_table = Table(uncertainty_data, colWidths=[4*cm, 3*cm])
            uncertainty_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), self.colors['dark']),
            ]))

            story.append(uncertainty_table)

        story.append(Spacer(1, 15))

    def _add_medical_visualizations(self, story: List, gradcam_data: Dict):
        """Agrega visualizaciones médicas"""
        story.append(Paragraph("VISUALIZACIONES MÉDICAS", self.styles['SectionHeader']))

        # Descripción de GradCAM
        story.append(Paragraph(
            "El siguiente mapa de calor muestra las regiones de la retina que el sistema de IA "
            "consideró más relevantes para el diagnóstico. Las áreas rojas indican mayor activación "
            "del modelo, mientras que las áreas azules indican menor relevancia.",
            self.styles['MedicalText']
        ))

        story.append(Spacer(1, 10))

        # Insertar imagen GradCAM si está disponible
        if gradcam_data.get('gradcam_base64'):
            try:
                # Decodificar imagen base64
                image_data = base64.b64decode(gradcam_data['gradcam_base64'])
                img = Image(io.BytesIO(image_data))

                # Ajustar tamaño
                img.drawHeight = 8*cm
                img.drawWidth = 8*cm

                # Centrar imagen
                img.hAlign = 'CENTER'

                story.append(img)

                # Información técnica de la visualización
                story.append(Spacer(1, 10))

                viz_info = [
                    ["Método de Visualización:", gradcam_data.get('method', 'GradCAM')],
                    ["Resolución:", gradcam_data.get('size', 'N/A')],
                    ["Confianza de Máscara:", f"{gradcam_data.get('mask_confidence', 0):.1%}"],
                ]

                viz_table = Table(viz_info, colWidths=[5*cm, 6*cm])
                viz_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ]))

                story.append(viz_table)

            except Exception as e:
                logger.error(f"Error insertando GradCAM: {e}")
                story.append(Paragraph(
                    "Error al cargar la visualización médica.",
                    self.styles['MedicalText']
                ))

        story.append(Spacer(1, 20))

    def _add_clinical_recommendations(self, story: List, diagnosis_data: Dict, confidence_analysis: Dict):
        """Agrega recomendaciones clínicas"""
        story.append(Paragraph("RECOMENDACIONES CLÍNICAS", self.styles['SectionHeader']))

        resultado = diagnosis_data.get('resultado', 0)
        confianza = float(diagnosis_data.get('confianza', 0))

        recommendations = self._generate_clinical_recommendations(resultado, confianza, confidence_analysis)

        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(
                f"{i}. {rec}",
                self.styles['Recommendation']
            ))

        story.append(Spacer(1, 15))

        # Seguimiento recomendado
        follow_up = self._get_followup_schedule(resultado)
        story.append(Paragraph("CRONOGRAMA DE SEGUIMIENTO SUGERIDO", self.styles['SectionHeader']))
        story.append(Paragraph(follow_up, self.styles['MedicalText']))

        story.append(Spacer(1, 20))

    def _add_technical_details(self, story: List, diagnosis_data: Dict, confidence_analysis: Dict):
        """Agrega detalles técnicos"""
        story.append(Paragraph("DETALLES TÉCNICOS", self.styles['SectionHeader']))

        technical_info = [
            ["Modelo de IA:", "ResNet50 + Transfer Learning"],
            ["Versión del Sistema:", diagnosis_data.get('modelo_version', 'v2.0')],
            ["Fecha de Procesamiento:", datetime.now().strftime("%d/%m/%Y %H:%M:%S")],
            ["ID de Procesamiento:", diagnosis_data.get('processing_id', 'N/A')],
        ]

        # Agregar detalles técnicos si están disponibles
        tech_details = confidence_analysis.get('technical_details', {})
        if tech_details:
            technical_info.extend([
                ["Temperature Scaling:", "Sí" if tech_details.get('temperature_applied') else "No"],
                ["Test-Time Augmentation:", "Sí" if tech_details.get('tta_used') else "No"],
                ["Confianza Base:", f"{tech_details.get('base_confidence', 0):.3f}"],
            ])

        table = Table(technical_info, colWidths=[5*cm, 6*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.colors['dark']),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ]))

        story.append(table)
        story.append(Spacer(1, 15))

    def _add_disclaimer(self, story: List):
        """Agrega disclaimer médico y legal"""
        story.append(Paragraph("IMPORTANTE - DISCLAIMER MÉDICO", self.styles['SectionHeader']))

        disclaimer_text = """
        Este reporte ha sido generado por un sistema de inteligencia artificial como herramienta
        de apoyo diagnóstico. Los resultados deben ser interpretados por un profesional médico
        cualificado y NO reemplazan el juicio clínico profesional.

        • Este sistema es una herramienta de apoyo diagnóstico, no un sustituto del criterio médico
        • Se requiere validación por oftalmólogo especialista antes de tomar decisiones clínicas
        • La responsabilidad del diagnóstico final y tratamiento recae en el médico tratante
        • Este reporte debe ser considerado junto con la historia clínica completa del paciente

        Para consultas técnicas o dudas sobre el sistema, contacte al administrador del sistema.
        """

        story.append(Paragraph(disclaimer_text, self.styles['MedicalText']))

    def _get_clinical_interpretation(self, resultado: int, confianza: float) -> str:
        """Genera interpretación clínica del diagnóstico"""
        interpretations = {
            0: "No se detectan signos de retinopatía diabética. La retina presenta características normales según el análisis automatizado.",
            1: "Se detectan signos leves de retinopatía diabética. Recomendable seguimiento periódico y control glucémico estricto.",
            2: "Retinopatía diabética moderada detectada. Se requiere evaluación oftalmológica especializada y posible intervención.",
            3: "Retinopatía diabética severa identificada. Necesita atención oftalmológica urgente y evaluación para tratamiento inmediato.",
            4: "Retinopatía diabética proliferativa detectada. URGENTE: Requiere intervención oftalmológica inmediata para prevenir pérdida visual."
        }

        base_interpretation = interpretations.get(resultado, "Resultado no reconocido.")

        if confianza < 0.7:
            base_interpretation += " NOTA: La confianza del sistema es moderada-baja, se recomienda especialmente la validación por especialista."

        return base_interpretation

    def _generate_clinical_recommendations(self, resultado: int, confianza: float, confidence_analysis: Dict) -> List[str]:
        """Genera recomendaciones clínicas específicas"""
        recommendations = []

        # Recomendaciones por severidad
        if resultado == 0:  # Sin retinopatía
            recommendations = [
                "Control oftalmológico anual como mínimo",
                "Mantener control glucémico óptimo (HbA1c < 7%)",
                "Monitoreo de presión arterial",
                "Control de lípidos séricos"
            ]
        elif resultado == 1:  # Leve
            recommendations = [
                "Control oftalmológico cada 6-12 meses",
                "Optimización del control glucémico",
                "Control de factores de riesgo cardiovascular",
                "Educación sobre autocuidado diabético"
            ]
        elif resultado == 2:  # Moderada
            recommendations = [
                "Evaluación oftalmológica cada 3-6 meses",
                "Considerar referencia a oftalmólogo especialista en retina",
                "Control glucémico estricto",
                "Evaluación de necesidad de tratamiento láser"
            ]
        elif resultado == 3:  # Severa
            recommendations = [
                "URGENTE: Referencia inmediata a oftalmólogo especialista",
                "Evaluación para fotocoagulación panretiniana",
                "Control metabólico estricto",
                "Seguimiento oftalmológico cada 2-3 meses"
            ]
        elif resultado == 4:  # Proliferativa
            recommendations = [
                "CRÍTICO: Atención oftalmológica de emergencia",
                "Evaluación inmediata para vitrectomía si necesario",
                "Fotocoagulación panretiniana urgente",
                "Hospitalización si hay hemorragia vítrea"
            ]

        # Recomendaciones adicionales por confianza
        if confianza < 0.75:
            recommendations.append("La confianza del sistema es limitada - Se requiere validación obligatoria por especialista")

        if confidence_analysis.get('confidence_level') == 'Baja':
            recommendations.append("Considerar repetir el estudio con mejores condiciones de imagen")

        return recommendations

    def _get_followup_schedule(self, resultado: int) -> str:
        """Genera cronograma de seguimiento"""
        schedules = {
            0: "Control anual. Próxima evaluación recomendada en 12 meses.",
            1: "Control semestral. Próxima evaluación en 6 meses, con especialista en 12 meses si no hay cambios.",
            2: "Control trimestral. Evaluación por especialista en retina dentro de 1-2 meses.",
            3: "Control mensual. Referencia URGENTE a especialista dentro de 1-2 semanas.",
            4: "Seguimiento inmediato. Atención de emergencia dentro de 24-48 horas."
        }

        return schedules.get(resultado, "Consultar con especialista para determinar seguimiento apropiado.")

# Instancia global para fácil uso
pdf_generator = ProfessionalPDFReport()