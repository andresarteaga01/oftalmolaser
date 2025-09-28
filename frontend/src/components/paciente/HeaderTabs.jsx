import { NavLink } from "react-router-dom";

const HeaderTabs = ({ hideNavigationTabs = false }) => {
  const activeClass =
    "border-b-4 border-blue-600 text-blue-600 font-semibold";
  const inactiveClass =
    "text-gray-500 hover:text-blue-600 transition duration-200";

  if (hideNavigationTabs) {
    return (
      <div className="border-b mb-8">
        {/* Header tabs are hidden when editing patient */}
      </div>
    );
  }

  return (
    <div className="flex justify-center space-x-10 border-b mb-8">
      <NavLink
        to="/pacientes"
        className={({ isActive }) =>
          `py-4 px-2 text-lg ${isActive ? activeClass : inactiveClass}`
        }
      >
        🧾 Registro de pacientes
      </NavLink>

      <NavLink
        to="/pacientes/nuevo"
        className={({ isActive }) =>
          `py-4 px-2 text-lg ${isActive ? activeClass : inactiveClass}`
        }
      >
        ➕ Paciente nuevo
      </NavLink>
    </div>
  );
};

export default HeaderTabs;