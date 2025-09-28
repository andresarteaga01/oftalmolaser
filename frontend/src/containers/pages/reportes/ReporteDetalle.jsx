import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "utils/axiosConfig";
import LightboxViewer from "components/LightboxViewer";
import {
  UserIcon,
  IdentificationIcon,
  CalendarIcon,
  EyeIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowLeftIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  BeakerIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  StarIcon,
  ClipboardDocumentCheckIcon,
  ComputerDesktopIcon,
  CameraIcon,
  MapPinIcon,
  GlobeAmericasIcon
} from "@heroicons/react/24/outline";

const ReporteDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [subIndex, setSubIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/pacientes/${id}/`);
        setPaciente(res.data);
      } catch (err) {
        console.error("Error al cargar paciente:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getSeverityColor = (resultado) => {
    switch (resultado) {
      case 0: return "bg-green-100 text-green-800 border-green-200";
      case 1: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 2: return "bg-orange-100 text-orange-800 border-orange-200";
      case 3: return "bg-red-100 text-red-800 border-red-200";
      case 4: return "bg-red-200 text-red-900 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (resultado) => {
    switch (resultado) {
      case 0: return <CheckCircleIcon className="h-5 w-5" />;
      case 1: return <ClockIcon className="h-5 w-5" />;
      case 2: return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 3: return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 4: return <HeartIcon className="h-5 w-5" />;
      default: return <MagnifyingGlassIcon className="h-5 w-5" />;
    }
  };

  const getDetailedFindings = (resultado, confianza) => {
    const findingsByGrade = {
      0: {
        microaneurismas: "Ausentes",
        hemorragias: "No observadas",
        exudados: "No presentes",
        neovasos: "Ausentes",
        alteracionesVenosas: "No significativas",
        edema: "No presente",
        irma: "Ausentes",
        manchasAlgodonosas: "No presentes"
      },
      1: {
        microaneurismas: "Presentes (<20 por campo)",
        hemorragias: "Escasas o ausentes",
        exudados: "Ausentes o mínimos",
        neovasos: "Ausentes",
        alteracionesVenosas: "Leves",
        edema: "No presente",
        irma: "Ausentes",
        manchasAlgodonosas: "Escasas"
      },
      2: {
        microaneurismas: "Múltiples (>20 por campo)",
        hemorragias: "Presentes, en llama y puntiformes",
        exudados: "Duros presentes, manchas algodonosas ocasionales",
        neovasos: "Ausentes",
        alteracionesVenosas: "Moderadas (dilatación, tortuosidad)",
        edema: "Leve a moderado en zona macular",
        irma: "Pueden estar presentes",
        manchasAlgodonosas: "Múltiples"
      },
      3: {
        microaneurismas: "Numerosos en múltiples campos",
        hemorragias: "Extensas, múltiples morfologías",
        exudados: "Abundantes duros y blandos",
        neovasos: "Ausentes pero alto riesgo",
        alteracionesVenosas: "Severas (arrosariamiento, duplicación)",
        edema: "Moderado a severo, puede afectar centro macular",
        irma: "Múltiples presentes",
        manchasAlgodonosas: "Numerosas"
      },
      4: {
        microaneurismas: "Presentes con componente proliferativo",
        hemorragias: "Múltiples + prerretinianas/vítreas",
        exudados: "Variables según actividad",
        neovasos: "PRESENTES (disco óptico o retina)",
        alteracionesVenosas: "Severas con oclusiones posibles",
        edema: "Variable, puede ser severo",
        irma: "Presentes y extensos",
        manchasAlgodonosas: "Variables"
      }
    };

    return {
      hallazgos: findingsByGrade[resultado] || findingsByGrade[0],
      interpretacionIA: {
        confianza: confianza,
        interpretacion: confianza >= 0.9 ? "Alta confianza diagnóstica" :
                      confianza >= 0.7 ? "Confianza moderada - revisar hallazgos" :
                      "Baja confianza - requiere evaluación especializada"
      },
      factoresRiesgo: [
        "Duración de diabetes mellitus",
        "Control glucémico (HbA1c)",
        "Presión arterial",
        "Función renal",
        "Embarazo (si aplica)"
      ]
    };
  };

  const getDifferentialDiagnosis = (resultado) => {
    return {
      diagnosticoDiferencial: [
        "Retinopatía hipertensiva",
        "Oclusión venosa retiniana",
        "Degeneración macular relacionada con edad",
        "Retinopatía por radiación",
        "Vasculitis retiniana",
        "Retinopatía de Purtscher"
      ],
      complicacionesAsociadas: {
        edemaClínicamenteSignificativo: resultado >= 2,
        riesgoNeovasculización: resultado >= 3,
        hemorragiaVítrea: resultado === 4,
        desprendimientoRetina: resultado === 4,
        glaucomaNeovascular: resultado === 4
      },
      pronóstico: {
        visualCortoPlayzo: resultado < 3 ? "Bueno con tratamiento adecuado" : "Variable, depende de intervención temprana",
        visualLargoPlayzo: "Directamente relacionado con control metabólico y adherencia al tratamiento",
        progresión: resultado < 2 ? "Lenta con buen control" : "Rápida si no se interviene"
      }
    };
  };

  const getComprehensiveTreatmentPlan = (resultado, paciente) => {
    const plansByGrade = {
      0: {
        oftalmológico: "No requiere tratamiento específico",
        sistémico: "Optimización control metabólico",
        derivaciones: "Endocrinología si HbA1c >7%"
      },
      1: {
        oftalmológico: "Observación estrecha, educación paciente",
        sistémico: "Control glucémico intensivo (HbA1c <7%)",
        derivaciones: "Endocrinología para optimización"
      },
      2: {
        oftalmológico: "Considerar anti-VEGF si edema macular clínicamente significativo",
        sistémico: "Control multifactorial intensivo",
        derivaciones: "Retinólogo para evaluación, Endocrinología"
      },
      3: {
        oftalmológico: "Fotocoagulación panretiniana indicada, anti-VEGF si edema",
        sistémico: "Manejo conjunto especializado",
        derivaciones: "Retinólogo URGENTE, Endocrinología, Nefrología"
      },
      4: {
        oftalmológico: "PRP urgente + anti-VEGF. Considerar vitrectomía",
        sistémico: "Hospitalización si inestabilidad metabólica",
        derivaciones: "Retinólogo INMEDIATO, UCI si compromiso sistémico"
      }
    };

    return {
      planInmediato: plansByGrade[resultado] || plansByGrade[0],
      metasMetabolicas: {
        glucemia: {
          ayunas: "80-130 mg/dL",
          postprandial: "<180 mg/dL",
          hba1c: resultado >= 3 ? "<6.5%" : "<7%"
        },
        presionArterial: "<140/90 mmHg (óptimo <130/80 mmHg)",
        lipidos: "LDL <100 mg/dL, HDL >40 mg/dL (H) >50 mg/dL (M)"
      },
      cronogramaSeguimiento: {
        proximaConsulta: getSeverityDetails(resultado).seguimiento,
        examenes: [
          "Agudeza visual con cartilla Snellen",
          "Presión intraocular",
          "Biomicroscopía del segmento anterior",
          "Oftalmoscopía indirecta con dilatación",
          "OCT macular si edema sospechado",
          "Angiografía fluoresceínica si indicada"
        ],
        laboratorios: [
          "HbA1c cada 3 meses",
          "Glucosa en ayunas",
          "Perfil lipídico completo",
          "Función renal (creatinina, BUN)",
          "Microalbuminuria",
          "Hemograma completo"
        ]
      }
    };
  };

  const getPatientEducation = (resultado) => {
    return {
      puntosClaveEducacion: [
        "Importancia del control glucémico estricto para prevenir progresión",
        "Adherencia estricta al tratamiento antidiabético prescrito",
        "Reconocimiento inmediato de síntomas visuales de alarma",
        "Importancia de controles oftalmológicos regulares",
        "Modificaciones del estilo de vida como pilar del tratamiento"
      ],
      sintomasAlarma: [
        "Pérdida súbita de visión",
        "Visión borrosa persistente o progresiva",
        "Moscas volantes súbitas y numerosas",
        "Destellos de luz (fotopsias)",
        "Sombras o cortinas en el campo visual",
        "Dolor ocular intenso asociado a náuseas"
      ],
      modificacionesEstiloVida: {
        dieta: "Dieta diabética balanceada supervisada por nutricionista",
        ejercicio: "Actividad física aeróbica 150 minutos/semana (autorizada por médico)",
        tabaco: "Cesación tabáquica obligatoria - derivar a programa antitabaco",
        alcohol: "Evitar o consumo muy moderado bajo supervisión médica",
        estrés: "Técnicas de manejo del estrés y apoyo psicológico si necesario"
      }
    };
  };

  const getSeverityDetails = (resultado) => {
    switch (resultado) {
      case 0:
        return {
          grado: "Grado 0",
          clasificacion: "Sin Retinopatía Diabética",
          descripcion: "No se observan signos de retinopatía diabética en el fondo de ojo",
          plan: "Control oftalmológico anual",
          recomendaciones: [
            "Mantener control glucémico óptimo (HbA1c < 7%)",
            "Control de presión arterial (< 140/90 mmHg)",
            "Mantener niveles de colesterol adecuados",
            "Ejercicio regular y dieta balanceada",
            "No fumar"
          ],
          seguimiento: "12 meses",
          urgencia: "Rutina"
        };
      case 1:
        return {
          grado: "Grado 1",
          clasificacion: "Retinopatía Diabética No Proliferativa Leve",
          descripcion: "Presencia de microaneurismas únicamente",
          plan: "Seguimiento oftalmológico cada 6-12 meses",
          recomendaciones: [
            "Control glucémico estricto (HbA1c < 7%)",
            "Monitoreo de presión arterial",
            "Control de lípidos séricos",
            "Educación sobre síntomas de alarma",
            "Adherencia al tratamiento antidiabético"
          ],
          seguimiento: "6-12 meses",
          urgencia: "No urgente"
        };
      case 2:
        return {
          grado: "Grado 2",
          clasificacion: "Retinopatía Diabética No Proliferativa Moderada",
          descripcion: "Microaneurismas, hemorragias en llama, exudados duros y manchas algodonosas",
          plan: "Evaluación oftalmológica cada 3-6 meses",
          recomendaciones: [
            "Control glucémico intensivo",
            "Consideración de derivación a endocrinología",
            "Control estricto de presión arterial",
            "Monitoreo de función renal",
            "Evaluación cardiovascular"
          ],
          seguimiento: "3-6 meses",
          urgencia: "Moderada"
        };
      case 3:
        return {
          grado: "Grado 3",
          clasificacion: "Retinopatía Diabética No Proliferativa Severa",
          descripcion: "Múltiples hemorragias retinianas, microaneurismas, IRMA, alteraciones venosas",
          plan: "Evaluación oftalmológica cada 2-3 meses - Consideración de tratamiento láser",
          recomendaciones: [
            "Derivación urgente a retinólogo",
            "Control multidisciplinario",
            "Optimización del control metabólico",
            "Fotocoagulación panretiniana si es necesario",
            "Seguimiento estrecho"
          ],
          seguimiento: "2-3 meses",
          urgencia: "Alta"
        };
      case 4:
        return {
          grado: "Grado 4",
          clasificacion: "Retinopatía Diabética Proliferativa",
          descripcion: "Neovascularización del disco óptico o en otros sectores de la retina",
          plan: "Tratamiento inmediato - Derivación urgente a retinólogo",
          recomendaciones: [
            "Fotocoagulación panretiniana inmediata",
            "Posible vitrectomía si hay hemorragia vítrea",
            "Control metabólico intensivo",
            "Manejo multidisciplinario urgente",
            "Seguimiento muy estrecho"
          ],
          seguimiento: "Inmediato - 1 mes",
          urgencia: "Crítica"
        };
      default:
        return {
          grado: "Sin clasificar",
          clasificacion: "Evaluación pendiente",
          descripcion: "Requiere evaluación médica especializada",
          plan: "Seguimiento según criterio médico",
          recomendaciones: ["Mantener controles regulares"],
          seguimiento: "A definir",
          urgencia: "A evaluar"
        };
    }
  };

  const getClinicInfo = () => {
    return {
      nombre: "Centro Médico de Diagnóstico Oftalmológico",
      direccion: "Av. Principal 123, Lima, Perú",
      telefono: "+51 1 234-5678",
      email: "contacto@centrooftalmologico.pe",
      web: "www.centrooftalmologico.pe",
      director: "Dr. Juan Carlos Mendoza",
      especialidad: "Oftalmología - Retina y Vítreo",
      registro: "RNE: 12345 - MINSA"
    };
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    });
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Generando reporte médico...</p>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-medium">Error al cargar el reporte</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const imagen = paciente.imagenes?.[0];
  const severityDetails = imagen ? getSeverityDetails(imagen.resultado) : null;
  const detailedFindings = imagen ? getDetailedFindings(imagen.resultado, imagen.confianza) : null;
  const differentialDiagnosis = imagen ? getDifferentialDiagnosis(imagen.resultado) : null;
  const treatmentPlan = imagen ? getComprehensiveTreatmentPlan(imagen.resultado, paciente) : null;
  const patientEducation = imagen ? getPatientEducation(imagen.resultado) : null;
  const clinicInfo = getClinicInfo();

  const sets = imagen
    ? [{
        original: `${process.env.REACT_APP_API_URL}${imagen.imagen}`,
        procesada: imagen.imagen_procesada
          ? `${process.env.REACT_APP_API_URL}${imagen.imagen_procesada}`
          : null,
        gradcam: imagen.gradcam
          ? `${process.env.REACT_APP_API_URL}${imagen.gradcam}`
          : null,
      }]
    : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block border-b-2 border-blue-600 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{clinicInfo.nombre}</h1>
            <p className="text-sm text-gray-600">{clinicInfo.especialidad}</p>
            <p className="text-xs text-gray-500">{clinicInfo.registro}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{clinicInfo.direccion}</p>
            <p>Tel: {clinicInfo.telefono}</p>
            <p>{clinicInfo.email}</p>
          </div>
        </div>
      </div>

      {/* Screen Header - Hidden when printing */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reporte Médico Oftalmológico</h1>
                <p className="text-sm text-gray-500 mt-1">Análisis de Retinopatía Diabética con IA</p>
              </div>
            </div>
            <button
              onClick={printReport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:px-0 print:py-4">
        
        {/* Medical Report Header */}
        <div className="text-center mb-8 print:mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">REPORTE MÉDICO OFTALMOLÓGICO</h2>
          <p className="text-lg text-gray-600 print:text-base">Evaluación de Retinopatía Diabética</p>
          <div className="mt-4 flex justify-center items-center space-x-8 text-sm text-gray-500 print:text-xs">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Fecha: {getCurrentDate()}
            </div>
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" />
              Reporte N°: RD-{paciente.id.toString().padStart(6, '0')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 print:space-y-6">
            
            {/* Patient Information */}
            <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                <h3 className="text-lg font-bold flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  DATOS DEL PACIENTE
                </h3>
              </div>
              
              <div className="p-6 print:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
                  <div className="space-y-4 print:space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre Completo</p>
                      <p className="text-lg font-bold text-gray-900 print:text-base">
                        {paciente.nombres} {paciente.apellidos}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento de Identidad</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">CI: {paciente.ci}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historia Clínica</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">HC: {paciente.historia_clinica}</p>
                    </div>
                  </div>

                  <div className="space-y-4 print:space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edad</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        {new Date().getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear()} años
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Género</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        {paciente.genero === "M" ? "Masculino" : "Femenino"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de Diabetes</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        {paciente.tipo_diabetes === 'tipo1' ? 'Diabetes Mellitus Tipo 1' : 
                         paciente.tipo_diabetes === 'tipo2' ? 'Diabetes Mellitus Tipo 2' : 'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Examination Details */}
            {imagen && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-green-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <CameraIcon className="h-5 w-5 mr-2" />
                    DATOS DEL EXAMEN
                  </h3>
                </div>
                
                <div className="p-6 print:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha de Examen</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        {new Date(imagen.fecha_creacion).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long', 
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 print:text-xs">
                        {new Date(imagen.fecha_creacion).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} hrs
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo Utilizado</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        {paciente.camara_retinal}
                      </p>
                      <p className="text-sm text-gray-600 print:text-xs capitalize">
                        {paciente.estado_dilatacion?.replace('_', ' ')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Método de Análisis</p>
                      <p className="text-base font-semibold text-gray-900 print:text-sm">
                        Inteligencia Artificial
                      </p>
                      <p className="text-sm text-gray-600 print:text-xs">
                        ResNet50 Deep Learning
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis Results */}
            {imagen && severityDetails && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-red-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <EyeIcon className="h-5 w-5 mr-2" />
                    DIAGNÓSTICO PRINCIPAL
                  </h3>
                </div>

                <div className="p-6 print:p-4">
                  {/* Main Diagnosis */}
                  <div className="mb-6 print:mb-4">
                    <div className={`inline-flex items-center px-6 py-4 rounded-lg border-2 ${getSeverityColor(imagen.resultado)} print:border print:border-gray-400`}>
                      {getSeverityIcon(imagen.resultado)}
                      <div className="ml-4">
                        <p className="text-sm font-bold uppercase tracking-wide">{severityDetails.grado}</p>
                        <p className="text-xl font-bold print:text-lg">{severityDetails.clasificacion}</p>
                        <div className="mt-2 print:mt-1">
                          <p className="text-sm print:text-xs">
                            Análisis generado por IA - {detailedFindings.interpretacionIA.interpretacion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Description */}
                  <div className="mb-6 print:mb-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-3 print:text-base">DESCRIPCIÓN CLÍNICA</h4>
                    <p className="text-gray-700 leading-relaxed print:text-sm">
                      {severityDetails.descripcion}
                    </p>
                  </div>

                  {/* Urgency Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 print:border print:border-gray-400">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 mr-2" />
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Nivel de Urgencia</p>
                          <p className="text-base font-bold text-gray-900 print:text-sm">{severityDetails.urgencia}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 print:border print:border-gray-400">
                      <div className="flex items-center">
                        <ClockIcon className="h-6 w-6 text-blue-500 mr-2" />
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Próximo Control</p>
                          <p className="text-base font-bold text-gray-900 print:text-sm">{severityDetails.seguimiento}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Clinical Findings */}
            {imagen && detailedFindings && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-indigo-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <BeakerIcon className="h-5 w-5 mr-2" />
                    HALLAZGOS CLÍNICOS DETALLADOS
                  </h3>
                </div>

                <div className="p-6 print:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
                    <div className="space-y-4 print:space-y-3">
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Microaneurismas:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.microaneurismas}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Hemorragias:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.hemorragias}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Exudados:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.exudados}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Manchas Algodonosas:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.manchasAlgodonosas}</p>
                      </div>
                    </div>
                    <div className="space-y-4 print:space-y-3">
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Neovascularización:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.neovasos}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Alteraciones Venosas:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.alteracionesVenosas}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Edema Macular:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.edema}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">IRMA:</p>
                        <p className="text-gray-900 print:text-sm">{detailedFindings.hallazgos.irma}</p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="mt-6 print:mt-4 pt-6 print:pt-4 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Factores de Riesgo a Evaluar:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {detailedFindings.factoresRiesgo.map((factor, index) => (
                        <div key={index} className="flex items-center text-gray-700 print:text-sm">
                          <StarIcon className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Differential Diagnosis */}
            {imagen && differentialDiagnosis && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-teal-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    DIAGNÓSTICO DIFERENCIAL Y PRONÓSTICO
                  </h3>
                </div>

                <div className="p-6 print:p-4 space-y-6 print:space-y-4">
                  {/* Differential Diagnosis */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Considerar en Diagnóstico Diferencial:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {differentialDiagnosis.diagnosticoDiferencial.map((dx, index) => (
                        <div key={index} className="flex items-center text-gray-700 print:text-sm">
                          <MagnifyingGlassIcon className="h-4 w-4 text-teal-500 mr-2 flex-shrink-0" />
                          <span>{dx}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Complications Risk */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Riesgo de Complicaciones:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Edema Macular</p>
                        <p className={`text-sm font-bold ${differentialDiagnosis.complicacionesAsociadas.edemaClínicamenteSignificativo ? 'text-red-600' : 'text-green-600'}`}>
                          {differentialDiagnosis.complicacionesAsociadas.edemaClínicamenteSignificativo ? 'Alto Riesgo' : 'Bajo Riesgo'}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Neovascularización</p>
                        <p className={`text-sm font-bold ${differentialDiagnosis.complicacionesAsociadas.riesgoNeovasculización ? 'text-red-600' : 'text-green-600'}`}>
                          {differentialDiagnosis.complicacionesAsociadas.riesgoNeovasculización ? 'Alto Riesgo' : 'Bajo Riesgo'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prognosis */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Pronóstico:</h4>
                    <div className="space-y-3 print:space-y-2">
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Corto Plazo (6-12 meses):</p>
                        <p className="text-gray-900 print:text-sm">{differentialDiagnosis.pronóstico.visualCortoPlayzo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Largo Plazo:</p>
                        <p className="text-gray-900 print:text-sm">{differentialDiagnosis.pronóstico.visualLargoPlayzo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 print:text-xs">Velocidad de Progresión:</p>
                        <p className="text-gray-900 print:text-sm">{differentialDiagnosis.pronóstico.progresión}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Treatment Plan */}
            {imagen && treatmentPlan && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-amber-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                    PLAN TERAPÉUTICO INTEGRAL
                  </h3>
                </div>

                <div className="p-6 print:p-4 space-y-6 print:space-y-4">
                  {/* Immediate Management */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4 print:text-base flex items-center">
                      <HeartIcon className="h-5 w-5 mr-2 text-red-500" />
                      Manejo Inmediato
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 print:bg-white print:border print:border-red-400">
                        <p className="text-sm font-bold text-red-700 mb-2 print:text-xs">Oftalmológico:</p>
                        <p className="text-gray-800 text-sm print:text-xs">{treatmentPlan.planInmediato.oftalmológico}</p>
                      </div>
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 print:bg-white print:border print:border-blue-400">
                        <p className="text-sm font-bold text-blue-700 mb-2 print:text-xs">Sistémico:</p>
                        <p className="text-gray-800 text-sm print:text-xs">{treatmentPlan.planInmediato.sistémico}</p>
                      </div>
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 print:bg-white print:border print:border-green-400">
                        <p className="text-sm font-bold text-green-700 mb-2 print:text-xs">Derivaciones:</p>
                        <p className="text-gray-800 text-sm print:text-xs">{treatmentPlan.planInmediato.derivaciones}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metabolic Goals */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4 print:text-base flex items-center">
                      <BuildingOffice2Icon className="h-5 w-5 mr-2 text-purple-500" />
                      Metas Metabólicas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2">
                      <div className="bg-white p-4 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Control Glucémico:</p>
                        <ul className="text-sm text-gray-800 space-y-1 print:text-xs print:space-y-0">
                          <li>• Ayunas: {treatmentPlan.metasMetabolicas.glucemia.ayunas}</li>
                          <li>• Post-prandial: {treatmentPlan.metasMetabolicas.glucemia.postprandial}</li>
                          <li>• HbA1c: {treatmentPlan.metasMetabolicas.glucemia.hba1c}</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Presión Arterial:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{treatmentPlan.metasMetabolicas.presionArterial}</p>
                      </div>
                      <div className="bg-white p-4 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Perfil Lipídico:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{treatmentPlan.metasMetabolicas.lipidos}</p>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Schedule */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4 print:text-base flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                      Cronograma de Seguimiento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
                      <div>
                        <p className="text-base font-bold text-gray-900 mb-3 print:text-sm">Exámenes Oftalmológicos:</p>
                        <div className="bg-blue-50 p-4 rounded border border-blue-200 print:bg-white print:border-blue-400">
                          <ul className="space-y-2 print:space-y-1">
                            {treatmentPlan.cronogramaSeguimiento.examenes.map((examen, index) => (
                              <li key={index} className="flex items-start text-gray-800 print:text-sm">
                                <EyeIcon className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                                <span className="text-sm print:text-xs">{examen}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900 mb-3 print:text-sm">Laboratorios de Control:</p>
                        <div className="bg-green-50 p-4 rounded border border-green-200 print:bg-white print:border-green-400">
                          <ul className="space-y-2 print:space-y-1">
                            {treatmentPlan.cronogramaSeguimiento.laboratorios.map((lab, index) => (
                              <li key={index} className="flex items-start text-gray-800 print:text-sm">
                                <BeakerIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                <span className="text-sm print:text-xs">{lab}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Recommendations - Keep original for compatibility */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3 print:text-base flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-2 text-green-500" />
                      Recomendaciones Generales
                    </h4>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 print:bg-white print:border print:border-green-400">
                      <ul className="space-y-2 print:space-y-1">
                        {severityDetails.recomendaciones.map((rec, index) => (
                          <li key={index} className="flex items-start text-gray-800 print:text-sm">
                            <StarIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Patient Education Section */}
            {imagen && patientEducation && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
                <div className="bg-pink-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                  <h3 className="text-lg font-bold flex items-center">
                    <AcademicCapIcon className="h-5 w-5 mr-2" />
                    EDUCACIÓN DEL PACIENTE Y FAMILIA
                  </h3>
                </div>

                <div className="p-6 print:p-4 space-y-6 print:space-y-4">
                  {/* Education Points */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Puntos Clave de Educación:</h4>
                    <div className="bg-blue-50 p-4 rounded border border-blue-200 print:bg-white print:border-blue-400">
                      <ul className="space-y-2 print:space-y-1">
                        {patientEducation.puntosClaveEducacion.map((punto, index) => (
                          <li key={index} className="flex items-start text-gray-800 print:text-sm">
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                            <span className="text-sm print:text-xs">{punto}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Warning Signs */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Síntomas de Alarma - Consultar INMEDIATAMENTE:</h4>
                    <div className="bg-red-50 p-4 rounded border border-red-200 print:bg-white print:border-red-400">
                      <ul className="space-y-2 print:space-y-1">
                        {patientEducation.sintomasAlarma.map((sintoma, index) => (
                          <li key={index} className="flex items-start text-gray-800 print:text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                            <span className="text-sm print:text-xs">{sintoma}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Lifestyle Modifications */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-3 print:text-sm">Modificaciones del Estilo de Vida:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Dieta:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{patientEducation.modificacionesEstiloVida.dieta}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Ejercicio:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{patientEducation.modificacionesEstiloVida.ejercicio}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Tabaco:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{patientEducation.modificacionesEstiloVida.tabaco}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="text-sm font-bold text-gray-700 mb-2 print:text-xs">Manejo del Estrés:</p>
                        <p className="text-sm text-gray-800 print:text-xs">{patientEducation.modificacionesEstiloVida.estrés}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Images and Additional Info */}
          <div className="space-y-6 print:space-y-4">
            
            {/* Medical Images */}
            <div className="bg-gray-50 rounded-lg border-2 border-gray-200 print:bg-white print:border print:border-gray-400">
              <div className="bg-purple-600 text-white px-6 py-3 rounded-t-lg print:bg-gray-100 print:text-gray-900 print:border-b print:border-gray-400">
                <h3 className="text-lg font-bold flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  IMÁGENES MÉDICAS
                </h3>
              </div>
              
              <div className="p-6 print:p-4">
                {!imagen?.imagen ? (
                  <div className="text-center py-8">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No hay imágenes disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-6 print:space-y-4">
                    
                    {/* GradCAM Analysis */}
                    {imagen?.gradcam && (
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-3 print:text-xs">
                          ANÁLISIS DE GRADCAM
                        </p>
                        <div
                          className="cursor-pointer group print:cursor-default"
                          onClick={() => {
                            setSubIndex(2);
                            setLightboxOpen(true);
                          }}
                        >
                          <img
                            src={`${process.env.REACT_APP_API_URL}${imagen.gradcam}`}
                            alt="Análisis GradCAM"
                            className="w-full h-48 object-cover rounded-lg border-2 border-blue-300 group-hover:opacity-90 transition-opacity print:h-32 print:border print:border-blue-400"
                          />
                          <p className="text-xs text-gray-500 text-center mt-2 print:hidden">Zonas de interés resaltadas</p>
                        </div>
                      </div>
                    )}

                    {/* Processed Image */}
                    {imagen?.imagen_procesada && (
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-3 print:text-xs">
                          IMAGEN PROCESADA PARA ANÁLISIS
                        </p>
                        <div
                          className="cursor-pointer group print:cursor-default"
                          onClick={() => {
                            setSubIndex(1);
                            setLightboxOpen(true);
                          }}
                        >
                          <img
                            src={`${process.env.REACT_APP_API_URL}${imagen.imagen_procesada}`}
                            alt="Retina Procesada"
                            className="w-full h-48 object-cover rounded-lg border-2 border-green-300 group-hover:opacity-90 transition-opacity print:h-32 print:border print:border-green-400"
                          />
                          <p className="text-xs text-gray-500 text-center mt-2 print:hidden">Optimizada para análisis de IA</p>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

            {/* Medical Professional Info - Print Only */}
            <div className="hidden print:block bg-white border border-gray-400">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-400">
                <h3 className="text-base font-bold text-gray-900">MÉDICO RESPONSABLE</h3>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-bold">{clinicInfo.director}</p>
                <p className="text-xs text-gray-600">{clinicInfo.especialidad}</p>
                <p className="text-xs text-gray-600">CMP: 12345 - RNE: 6789</p>
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-xs text-gray-500">Firma:</p>
                  <div className="h-12 border-b border-gray-300 mt-2"></div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 print:bg-white print:border print:border-yellow-400">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-bold text-yellow-800 print:text-xs">IMPORTANTE</p>
                  <p className="text-sm text-yellow-700 mt-1 print:text-xs">
                    Este reporte ha sido generado por un sistema de inteligencia artificial como herramienta de apoyo diagnóstico. 
                    El diagnóstico final y las decisiones terapéuticas deben ser siempre validadas por un médico oftalmólogo especialista.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Print Only */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Este reporte fue generado el {getCurrentDate()} mediante sistema de análisis automatizado con IA</p>
          <p className="mt-1">{clinicInfo.nombre} - {clinicInfo.telefono} - {clinicInfo.email}</p>
        </div>
      </div>

      {/* Lightbox - Hidden when printing */}
      {lightboxOpen && sets.length > 0 && (
        <div className="print:hidden">
          <LightboxViewer
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            sets={sets}
            index={0}
            subIndex={subIndex}
            setSubIndex={setSubIndex}
          />
        </div>
      )}
    </div>
  );
};

export default ReporteDetalle;