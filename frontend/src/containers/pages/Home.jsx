import { NavLink, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import { logout } from "redux/actions/auth";
import FullWidthLayout from "hocs/layouts/FullWidthLayout";

function Home({ user, logout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <FullWidthLayout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Botón de cierre de sesión */}
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 text-sm text-red-600 hover:underline"
        >
          Cerrar sesión
        </button>

        {/* Bienvenida */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {user?.first_name || user?.username || "usuario"} 👁️
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-300 italic">
            Rol: <strong>{user?.role}</strong>
          </p>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Sistema de diagnóstico de retinopatía diabética
          </p>
        </div>

        {/* Opciones según rol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Especialista y Administrador: Registrar Paciente */}
          {["especialista", "administrador"].includes(user?.role) && (
            <NavLink
              to="/pacientes/nuevo"
              className="block p-6 bg-white dark:bg-dark-second rounded-xl shadow-md hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                Registrar Paciente
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Crea un nuevo paciente en el sistema.
              </p>
            </NavLink>
          )}

          {/* Médico y Administrador: Buscar Pacientes */}
          {["medico", "administrador"].includes(user?.role) && (
            <NavLink
              to="/pacientes/buscar"
              className="block p-6 bg-white dark:bg-dark-second rounded-xl shadow-md hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                Buscar por DNI
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Encuentra pacientes registrados.
              </p>
            </NavLink>
          )}

          {/* Médico y Administrador: Ver Reportes */}
          {["medico", "administrador"].includes(user?.role) && (
            <NavLink
              to="/reportes"
              className="block p-6 bg-white dark:bg-dark-second rounded-xl shadow-md hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Ver Reportes
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Consulta resultados y predicciones.
              </p>
            </NavLink>
          )}

          {/* Administrador exclusivo: Gestión de usuarios */}
          {user?.role === "administrador" && (
            <NavLink
              to="/admin/usuarios"
              className="block p-6 bg-white dark:bg-dark-second rounded-xl shadow-md hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                Gestión de Usuarios
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Crear, editar y asignar roles a usuarios.
              </p>
            </NavLink>
          )}
        </div>
      </div>
    </FullWidthLayout>
  );
}

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps, { logout })(Home);