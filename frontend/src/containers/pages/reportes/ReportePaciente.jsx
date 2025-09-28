import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "utils/axiosConfig";

const labelMap = {
  0: "Sin retinopatía",
  1: "Leve",
  2: "Moderada",
  3: "Severa",
  4: "Proliferativa",
};

const recomendaciones = {
  0: {
    plan: "Examen de retina anual.",
    consejo: "Mantener un buen control de glucosa, presión y colesterol.",
  },
  1: {
    plan: "Monitoreo cada 6-12 meses.",
    consejo: "Evitar tabaco, dieta balanceada, y control de glucemia.",
  },
  2: {
    plan: "Revisión por oftalmólogo cada 6 meses.",
    consejo: "Posible necesidad de tratamiento en el futuro cercano.",
  },
  3: {
    plan: "Referir a especialista en retina. Evaluar tratamiento.",
    consejo: "Iniciar manejo activo con láser u otros tratamientos.",
  },
  4: {
    plan: "Tratamiento inmediato (láser, vitrectomía).",
    consejo: "Urgente: Riesgo alto de pérdida visual.",
  },
};

const calcularEdad = (fechaNac) => {
  const nacimiento = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const ReportePaciente = () => {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);

  useEffect(() => {
    const obtenerPaciente = async () => {
      try {
        const res = await api.get(`/api/pacientes/${id}/`);
        setPaciente(res.data);
      } catch (error) {
        console.error("Error al obtener paciente:", error);
      }
    };

    obtenerPaciente();
  }, [id]);

  if (!paciente) return <div className="p-6 text-center">Cargando reporte...</div>;

  const imagen = paciente.imagenes?.[0];
  const edad = calcularEdad(paciente.fecha_nacimiento);
  const resultado = imagen?.resultado;
  const fecha = new Date(imagen?.fecha_creacion).toLocaleString();

  const { plan, consejo } = recomendaciones[resultado] || {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-4xl">
        <h2 className="text-xl font-bold text-center text-blue-800 mb-4">Detalle del Reporte</h2>

        <div className="mb-4">
          <p className="text-lg font-semibold text-blue-700">{paciente.nombres} {paciente.apellidos}</p>
          <p className="text-sm text-gray-600">CI: {paciente.ci} | HC: {paciente.historia_clinica}</p>
          <p className="text-sm text-gray-600">Edad: {edad} años | Género: {paciente.genero === "M" ? "Masculino" : "Femenino"}</p>
        </div>

        {imagen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <img src={imagen.imagen_procesada || imagen.imagen} alt="Imagen Procesada" className="w-full h-auto rounded border" />
              <p className="text-center text-xs text-gray-500 mt-1">Imagen Procesada</p>
            </div>
            <div>
              <img src={imagen.gradcam} alt="GradCAM" className="w-full h-auto rounded border" />
              <p className="text-center text-xs text-gray-500 mt-1">GradCAM</p>
            </div>
          </div>
        )}

        <div className="bg-gray-100 rounded p-4 border mb-4">
          <p className="text-md font-semibold text-gray-700">
            Diagnóstico:{" "}
            <span className={`font-bold ${
              resultado >= 3 ? "text-red-600" :
              resultado === 2 ? "text-orange-500" :
              resultado === 1 ? "text-yellow-600" :
              "text-green-700"
            }`}>
              {labelMap[resultado] || "Desconocido"}
            </span>
          </p>
          <p className="text-sm text-gray-600">Fecha del diagnóstico: {fecha}</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <p className="text-sm text-blue-900">
            <strong>Plan sugerido:</strong> {plan}
          </p>
          <p className="text-sm text-blue-900">
            <strong>Recomendación:</strong> {consejo}
          </p>
        </div>

        {paciente.imagenes?.length > 1 && (
          <div className="mt-4">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Historial de imágenes:</h3>
            <ul className="space-y-2">
              {paciente.imagenes.map((img) => (
                <li key={img.id} className="border p-2 rounded bg-white shadow-sm">
                  <p className="text-sm">
                    <strong>Fecha:</strong> {new Date(img.fecha_creacion).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <strong>Resultado:</strong> {labelMap[img.resultado]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportePaciente;