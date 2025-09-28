import { Fragment } from "react";
import { connect } from "react-redux";
import { MegaphoneIcon as SpeakerphoneIcon } from "@heroicons/react/24/solid";

// Componente visual de alerta
function Alert({ alert }) {
  // Mapear colores por tipo de alerta
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  }[alert?.alertType] || "bg-gray-600"; // por defecto gris

  // Si no hay alerta activa, no mostrar nada
  if (!alert) return <Fragment />;

  return (
    <div className="fixed z-50 bottom-4 inset-x-0 flex justify-center">
      <div className={`w-full max-w-md mx-auto px-4`}>
        <div className={`flex items-center gap-3 text-white ${bgColor} px-4 py-3 rounded-lg shadow-lg animate-fade-in`}>
          <SpeakerphoneIcon className="h-6 w-6" />
          <p className="text-sm font-medium">{alert.msg}</p>
        </div>
      </div>
    </div>
  );
}

// Conectar al estado global
const mapStateToProps = (state) => ({
  alert: state.alert.alert, // ✅ ¡esta es la corrección clave!
});

export default connect(mapStateToProps)(Alert);