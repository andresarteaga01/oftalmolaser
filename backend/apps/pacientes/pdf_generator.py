from reportlab.lib.pagesizes import A4, letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics import renderPDF
from PIL import Image as PILImage
import io
import base64
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

class ProfessionalReportPDF:
    """Generador de PDF profesional para reportes médicos"""

    def __init__(self):
        self.doc = None
        self.story = []
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        """Crear estilos personalizados profesionales"""

        # Título principal
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1e40af'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Subtítulos
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=12,
            textColor=colors.HexColor('#1f2937'),
            fontName='Helvetica-Bold'
        ))

        # Texto de diagnóstico
        self.styles.add(ParagraphStyle(
            name='DiagnosisText',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#dc2626'),
            fontName='Helvetica-Bold',
            spaceBefore=6,
            spaceAfter=6
        ))

        # Texto de confianza alta
        self.styles.add(ParagraphStyle(
            name='HighConfidence',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#059669'),
            fontName='Helvetica-Bold'
        ))

        # Texto de confianza baja
        self.styles.add(ParagraphStyle(
            name='LowConfidence',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#dc2626'),
            fontName='Helvetica-Bold'
        ))

        # Recomendaciones
        self.styles.add(ParagraphStyle(
            name='Recommendations',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceBefore=4,
            spaceAfter=4,
            leftIndent=20,
            bulletIndent=10,
            alignment=TA_JUSTIFY
        ))

    def generate_professional_report(self, reporte_data, output_path=None):
        """Generar reporte PDF profesional completo"""
        try:
            # Configurar documento
            if output_path is None:
                buffer = io.BytesIO()
                self.doc = SimpleDocTemplate(
                    buffer,
                    pagesize=A4,
                    rightMargin=2*cm,
                    leftMargin=2*cm,
                    topMargin=2*cm,
                    bottomMargin=2*cm
                )
            else:
                self.doc = SimpleDocTemplate(
                    output_path,
                    pagesize=A4,
                    rightMargin=2*cm,
                    leftMargin=2*cm,
                    topMargin=2*cm,
                    bottomMargin=2*cm
                )

            self.story = []

            # Construir contenido del reporte
            self._add_header(reporte_data)
            self._add_patient_info(reporte_data['paciente'])
            self._add_diagnosis_section(reporte_data['diagnostico'])
            self._add_images_section(reporte_data['imagenes'])
            self._add_confidence_analysis(reporte_data.get('confidence_analysis', {}))
            self._add_treatment_plan(reporte_data['plan_tratamiento'])
            self._add_recommendations(reporte_data['plan_tratamiento'])
            self._add_footer(reporte_data['metadatos'])

            # Generar PDF
            self.doc.build(self.story, onFirstPage=self._add_page_header, onLaterPages=self._add_page_header)

            if output_path is None:
                pdf_data = buffer.getvalue()
                buffer.close()
                return pdf_data

            logger.info(f"Reporte PDF generado: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error generando PDF: {e}")
            raise

    def _add_page_header(self, canvas, doc):
        """Agregar header profesional a cada página"""
        canvas.saveState()

        # Línea superior
        canvas.setStrokeColor(colors.HexColor('#1e40af'))
        canvas.setLineWidth(3)
        canvas.line(2*cm, A4[1] - 1.5*cm, A4[0] - 2*cm, A4[1] - 1.5*cm)

        # Título del sistema
        canvas.setFont('Helvetica-Bold', 12)
        canvas.setFillColor(colors.HexColor('#1e40af'))
        canvas.drawString(2*cm, A4[1] - 1.2*cm, "Sistema de Diagnóstico de Retinopatía Diabética")

        # Fecha y hora
        canvas.setFont('Helvetica', 10)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.2*cm, f"Generado: {fecha_actual}")

        # Línea inferior del header
        canvas.setStrokeColor(colors.HexColor('#e5e7eb'))
        canvas.setLineWidth(1)
        canvas.line(2*cm, A4[1] - 1.8*cm, A4[0] - 2*cm, A4[1] - 1.8*cm)

        # Footer con número de página
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.HexColor('#9ca3af'))
        canvas.drawCentredText(A4[0] / 2, 1*cm, f"Página {doc.page}")

        canvas.restoreState()

    def _add_header(self, reporte_data):
        """Agregar encabezado del reporte"""
        title = Paragraph("REPORTE MÉDICO DE RETINOPATÍA DIABÉTICA", self.styles['CustomTitle'])
        self.story.append(title)
        self.story.append(Spacer(1, 20))

        # Información del reporte
        report_info = [
            ['ID del Reporte:', reporte_data['metadatos']['reporte_id']],
            ['Fecha de Diagnóstico:', reporte_data['diagnostico']['fecha_diagnostico']],
            ['Versión del Modelo:', reporte_data['diagnostico']['modelo_version']],
            ['Generado por:', reporte_data['metadatos']['generado_por']]
        ]

        info_table = Table(report_info, colWidths=[4*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        self.story.append(info_table)
        self.story.append(Spacer(1, 30))

    def _add_patient_info(self, paciente_data):
        """Sección de información del paciente"""
        title = Paragraph("INFORMACIÓN DEL PACIENTE", self.styles['CustomHeading1'])
        self.story.append(title)

        # Crear tabla de información del paciente
        patient_data = [
            ['Nombre Completo:', f"{paciente_data['nombres']} {paciente_data['apellidos']}"],
            ['CI:', paciente_data['ci']],
            ['Historia Clínica:', paciente_data['historia_clinica']],
            ['Edad:', f"{paciente_data.get('edad', 'No especificada')} años"],
            ['Género:', paciente_data['genero']],
            ['Tipo de Diabetes:', paciente_data.get('tipo_diabetes', 'No especificado')]
        ]

        patient_table = Table(patient_data, colWidths=[4*cm, 10*cm])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
        ]))

        self.story.append(patient_table)
        self.story.append(Spacer(1, 25))

    def _add_diagnosis_section(self, diagnostico_data):
        """Sección de diagnóstico principal"""
        title = Paragraph("DIAGNÓSTICO", self.styles['CustomHeading1'])
        self.story.append(title)

        # Diagnóstico principal destacado
        diagnosis_text = Paragraph(
            f"<b>Resultado:</b> {diagnostico_data['resultado']}",
            self.styles['DiagnosisText']
        )
        self.story.append(diagnosis_text)

        # Análisis de confianza
        confidence_value = float(diagnostico_data['confianza'].replace('%', ''))
        if confidence_value >= 85:
            confidence_style = 'HighConfidence'
            confidence_interpretation = "ALTA CONFIANZA - Diagnóstico confiable"
        elif confidence_value >= 70:
            confidence_style = 'Normal'
            confidence_interpretation = "CONFIANZA MODERADA - Revisar con especialista"
        else:
            confidence_style = 'LowConfidence'
            confidence_interpretation = "BAJA CONFIANZA - Revisión manual requerida"

        confidence_text = Paragraph(
            f"<b>Confianza del Modelo:</b> {diagnostico_data['confianza']}",
            self.styles[confidence_style]
        )
        self.story.append(confidence_text)

        interpretation_text = Paragraph(
            f"<b>Interpretación:</b> {confidence_interpretation}",
            self.styles['Normal']
        )
        self.story.append(interpretation_text)
        self.story.append(Spacer(1, 20))

    def _add_images_section(self, imagenes_data):
        """Sección de imágenes médicas"""
        title = Paragraph("IMÁGENES MÉDICAS", self.styles['CustomHeading1'])
        self.story.append(title)

        # Crear tabla para mostrar imágenes lado a lado
        images_row = []

        # Imagen de retina
        if imagenes_data.get('retina_url'):
            try:
                retina_img = self._process_image_for_pdf(imagenes_data['retina_url'], width=6*cm)
                retina_cell = [
                    Paragraph("<b>Imagen de Retina</b>", self.styles['Normal']),
                    retina_img
                ]
            except:
                retina_cell = [
                    Paragraph("<b>Imagen de Retina</b>", self.styles['Normal']),
                    Paragraph("Imagen no disponible", self.styles['Normal'])
                ]
        else:
            retina_cell = [
                Paragraph("<b>Imagen de Retina</b>", self.styles['Normal']),
                Paragraph("Imagen no disponible", self.styles['Normal'])
            ]

        # Imagen GradCAM
        if imagenes_data.get('gradcam_base64'):
            try:
                gradcam_img = self._process_base64_image_for_pdf(imagenes_data['gradcam_base64'], width=6*cm)
                gradcam_cell = [
                    Paragraph("<b>GradCAM - Análisis IA</b>", self.styles['Normal']),
                    gradcam_img
                ]
            except:
                gradcam_cell = [
                    Paragraph("<b>GradCAM - Análisis IA</b>", self.styles['Normal']),
                    Paragraph("Análisis no disponible", self.styles['Normal'])
                ]
        elif imagenes_data.get('gradcam_url'):
            try:
                gradcam_img = self._process_image_for_pdf(imagenes_data['gradcam_url'], width=6*cm)
                gradcam_cell = [
                    Paragraph("<b>GradCAM - Análisis IA</b>", self.styles['Normal']),
                    gradcam_img
                ]
            except:
                gradcam_cell = [
                    Paragraph("<b>GradCAM - Análisis IA</b>", self.styles['Normal']),
                    Paragraph("Análisis no disponible", self.styles['Normal'])
                ]
        else:
            gradcam_cell = [
                Paragraph("<b>GradCAM - Análisis IA</b>", self.styles['Normal']),
                Paragraph("Análisis no disponible", self.styles['Normal'])
            ]

        # Crear tabla de imágenes
        images_table = Table([[retina_cell, gradcam_cell]], colWidths=[8*cm, 8*cm])
        images_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
        ]))

        self.story.append(images_table)
        self.story.append(Spacer(1, 25))

    def _add_confidence_analysis(self, confidence_data):
        """Sección de análisis de confianza detallado"""
        if not confidence_data:
            return

        title = Paragraph("ANÁLISIS DE CONFIANZA MEJORADO", self.styles['CustomHeading1'])
        self.story.append(title)

        # Métricas de calidad
        if 'quality_metrics' in confidence_data:
            metrics = confidence_data['quality_metrics']

            analysis_data = [
                ['Métrica', 'Valor', 'Interpretación'],
                ['Varianza entre Modelos', f"{metrics.get('variance', 0):.3f}",
                 'Baja varianza indica consenso' if metrics.get('variance', 1) < 0.01 else 'Alta varianza requiere revisión'],
                ['Consenso de Modelos', 'Sí' if metrics.get('consensus', False) else 'No',
                 'Todos los modelos concuerdan' if metrics.get('consensus', False) else 'Modelos en desacuerdo'],
                ['Margen de Confianza', f"{metrics.get('margin', 0):.2f}",
                 'Alto margen indica certeza' if metrics.get('margin', 0) > 0.3 else 'Bajo margen requiere cuidado'],
                ['Calidad General', metrics.get('quality_level', 'No disponible'),
                 'Evaluación integral del diagnóstico']
            ]

            metrics_table = Table(analysis_data, colWidths=[5*cm, 3*cm, 8*cm])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
            ]))

            self.story.append(metrics_table)
            self.story.append(Spacer(1, 20))

    def _add_treatment_plan(self, plan_data):
        """Sección del plan de tratamiento"""
        title = Paragraph("PLAN DE TRATAMIENTO", self.styles['CustomHeading1'])
        self.story.append(title)

        plan_text = Paragraph(
            f"<b>Plan Sugerido:</b> {plan_data['plan_sugerido']}",
            self.styles['Normal']
        )
        self.story.append(plan_text)
        self.story.append(Spacer(1, 15))

    def _add_recommendations(self, plan_data):
        """Sección de recomendaciones"""
        title = Paragraph("RECOMENDACIONES MÉDICAS", self.styles['CustomHeading1'])
        self.story.append(title)

        if plan_data.get('recomendaciones'):
            for rec in plan_data['recomendaciones']:
                if rec.strip():
                    bullet_text = Paragraph(f"• {rec}", self.styles['Recommendations'])
                    self.story.append(bullet_text)

            self.story.append(Spacer(1, 15))

        if plan_data.get('observaciones'):
            obs_title = Paragraph("<b>Observaciones Adicionales:</b>", self.styles['Normal'])
            self.story.append(obs_title)
            obs_text = Paragraph(plan_data['observaciones'], self.styles['Normal'])
            self.story.append(obs_text)

    def _add_footer(self, metadatos):
        """Pie de página con información legal"""
        self.story.append(Spacer(1, 30))

        # Línea separadora
        line = Table([['', '']], colWidths=[16*cm])
        line.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 2, colors.HexColor('#e5e7eb')),
        ]))
        self.story.append(line)
        self.story.append(Spacer(1, 10))

        # Disclaimer médico
        disclaimer = Paragraph(
            "<b>NOTA IMPORTANTE:</b> Este reporte ha sido generado por un sistema de inteligencia artificial "
            "para apoyo al diagnóstico médico. Los resultados deben ser interpretados por un profesional "
            "médico calificado. Este sistema no reemplaza el juicio clínico profesional.",
            ParagraphStyle('Disclaimer', parent=self.styles['Normal'], fontSize=9,
                         textColor=colors.HexColor('#6b7280'), alignment=TA_JUSTIFY)
        )
        self.story.append(disclaimer)

        self.story.append(Spacer(1, 10))

        # Información del sistema
        system_info = Paragraph(
            f"Sistema de Diagnóstico de Retinopatía Diabética v{metadatos.get('version', '1.0')} | "
            f"Reporte ID: {metadatos['reporte_id']}",
            ParagraphStyle('SystemInfo', parent=self.styles['Normal'], fontSize=8,
                         textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)
        )
        self.story.append(system_info)

    def _process_image_for_pdf(self, image_path, width=6*cm):
        """Procesar imagen para inclusión en PDF"""
        try:
            if os.path.exists(image_path):
                img = Image(image_path, width=width, height=width)
                return img
            else:
                return Paragraph("Imagen no encontrada", self.styles['Normal'])
        except Exception as e:
            logger.error(f"Error procesando imagen: {e}")
            return Paragraph("Error cargando imagen", self.styles['Normal'])

    def _process_base64_image_for_pdf(self, base64_data, width=6*cm):
        """Procesar imagen base64 para PDF"""
        try:
            # Decodificar base64
            image_data = base64.b64decode(base64_data)

            # Crear imagen PIL
            pil_image = PILImage.open(io.BytesIO(image_data))

            # Guardar temporalmente
            temp_path = f"/tmp/gradcam_{datetime.now().microsecond}.png"
            pil_image.save(temp_path, 'PNG')

            # Crear objeto Image para ReportLab
            img = Image(temp_path, width=width, height=width)

            # Limpiar archivo temporal
            if os.path.exists(temp_path):
                os.remove(temp_path)

            return img

        except Exception as e:
            logger.error(f"Error procesando imagen base64: {e}")
            return Paragraph("GradCAM no disponible", self.styles['Normal'])

# Instancia global
pdf_generator = ProfessionalReportPDF()