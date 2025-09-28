import { useState } from "react";
import api from "utils/axiosConfig";
import { toast } from "react-toastify";

const PacienteForm = ({ onPacienteRegistrado }) => {
  const [formData, setFormData] = useState({
    historia_clinica: "",
    ci: "",
    nombres: "",
    apellidos: "",
    fecha_nacimiento: "",
    genero: "M",
    tipo_diabetes: "tipo1",
    estado_dilatacion: "dilatado",
    camara_retinal: "",
  });

  const [imagenes, setImagenes] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const archivos = Array.from(e.target.files);
    const validas = archivos.filter((f) => f.type.startsWith("image/"));

    if (validas.length !== archivos.length) {
      toast.warning("⚠️ Algunos archivos no son imágenes.");
    }

    setImagenes(validas);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Crear paciente
      const res = await api.post(`/api/pacientes/`, formData);
      const pacienteId = res.data.id;

      // Si hay imágenes, subirlas
      if (imagenes.length > 0) {
        const formDataImg = new FormData();
        formDataImg.append("paciente_id", pacienteId);
        imagenes.forEach((img) => formDataImg.append("imagenes", img));

        await api.post(`/api/pacientes/predecir/`, formDataImg, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("✅ Paciente registrado exitosamente");
      if (onPacienteRegistrado) onPacienteRegistrado();
    } catch (error) {
      toast.error("❌ Error al registrar paciente");
      console.error("Error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4 max-w-2xl mx-auto">
      <input name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Nombres" required className="w-full border px-4 py-2 rounded" />
      <input name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Apellidos" required className="w-full border px-4 py-2 rounded" />
      <input name="ci" value={formData.ci} onChange={handleChange} placeholder="CI" required className="w-full border px-4 py-2 rounded" />
      <input name="historia_clinica" value={formData.historia_clinica} onChange={handleChange} placeholder="Historia Clínica" required className="w-full border px-4 py-2 rounded" />
      <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full border px-4 py-2 rounded" />

      <select name="genero" value={formData.genero} onChange={handleChange} className="w-full border px-4 py-2 rounded">
        <option value="M">Masculino</option>
        <option value="F">Femenino</option>
      </select>

      <select name="tipo_diabetes" value={formData.tipo_diabetes} onChange={handleChange} className="w-full border px-4 py-2 rounded">
        <option value="tipo1">Tipo 1</option>
        <option value="tipo2">Tipo 2</option>
        <option value="desconocido">Desconocido</option>
      </select>

      <select name="estado_dilatacion" value={formData.estado_dilatacion} onChange={handleChange} className="w-full border px-4 py-2 rounded">
        <option value="dilatado">Dilatado</option>
        <option value="no_dilatado">No dilatado</option>
      </select>

      <input name="camara_retinal" value={formData.camara_retinal} onChange={handleChange} placeholder="Cámara retinal" className="w-full border px-4 py-2 rounded" />

      <input type="file" name="imagenes" multiple accept="image/*" onChange={handleImageChange} className="w-full border px-4 py-2 rounded" />

      {imagenes.length > 0 && (
        <ul className="text-sm text-gray-700 list-disc ml-5">
          {imagenes.map((img, i) => (
            <li key={i}>{img.name}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800">
        Registrar
      </button>
    </form>
  );
};

export default PacienteForm;