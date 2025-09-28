import React, { useState } from "react";
import api  from "utils/axiosConfig";
import BackToHomeButton from "components/ui/BackToHomeButton";

const Diagnostico = () => {
  const [imagen, setImagen] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    setImagen(e.target.files[0]);
    setResultado(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imagen) return;

    const formData = new FormData();
    formData.append("imagen", imagen);

    setLoading(true);
    setError(null);

    try {
      const res = await api.post(
        "/api/pacientes/predecir/", 
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResultado(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error al hacer la predicción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Diagnóstico de Retinopatía</h1>
        <BackToHomeButton variant="secondary" size="sm" />
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Analizando..." : "Enviar Imagen"}
        </button>
      </form>

      {resultado && (
        <div className="mt-6 p-4 bg-green-100 rounded">
          <h2 className="font-semibold text-green-800">Resultado:</h2>
          <p>
            <strong>Clase:</strong> {resultado.prediccion}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-100 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default Diagnostico;