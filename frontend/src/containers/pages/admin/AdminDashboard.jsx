import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const AdminDashboard = () => {
  const user = useSelector(state => state.auth.user);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4 py-10">
      {/* Encabezado */}
      <div className="max-w-6xl w-full mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Bienvenido,{" "}
          <span className="text-indigo-600">
            {user?.username || "usuario"}
          </span>
        </h1>
        <p className="mt-2 text-gray-600 italic">
          Rol: <strong>{user?.role || "Sin rol"}</strong>
        </p>
        <p className="mt-1 text-gray-500">
          Sistema de diagnóstico de retinopatía diabética
        </p>
      </div>

      {/* Opciones del sistema */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        <Card
          title="Registrar Paciente"
          to="/pacientes/nuevo"  
        />
        <Card
          title="Ver Reportes"
          to="/reportes"
        />
        <Card
          title="Gestión de Usuarios"
          to="/usuarios"
        />
      </div>
    </div>
  );
};

const Card = ({ title, description, to, color }) => (
  <NavLink
    to={to}
    className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all border border-gray-100"
  >
    <h3 className={`text-lg font-bold mb-2 ${color}`}>{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </NavLink>
);

export default AdminDashboard;