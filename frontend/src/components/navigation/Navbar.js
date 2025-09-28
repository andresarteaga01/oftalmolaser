import { Fragment, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Bars3Icon as MenuIcon, XMarkIcon as XIcon } from "@heroicons/react/24/outline";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { NavLink } from "react-router-dom";
import { connect } from "react-redux";
import DarkModeSwitch from "components/darkmode";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Navbar({ my_user }) {
  const [effectLogin, setEffectLogin] = useState(false);

  const logoutHandler = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  const getDashboardPath = (role) => {
    // Todos los roles van al dashboard unificado
    return "/";
  };

  return (
    <Popover as="header" className="bg-white dark:bg-dark-main shadow-sm">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              {/* Logo + Nombre */}
              <NavLink to={getDashboardPath(my_user?.role)} className="flex items-center gap-2">
                <img
                  src="/static/imagen/logo_oftalmoslaser.jpg"
                  alt="Logo Clínica"
                  className="h-10 w-auto object-contain"
                />
                <span className="text-lg font-bold text-blue-900 whitespace-nowrap">
                  Clínica <br className="hidden sm:block" /> Oftalmolaser
                </span>
              </NavLink>

              {/* Dark mode + Auth */}
              <div className="flex items-center gap-4">
                <DarkModeSwitch />

                {my_user ? (
                  <>
                    {my_user.picture ? (
                      <img
                        src={my_user.picture}
                        alt="Usuario"
                        className="h-9 w-9 rounded-full border shadow-sm object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-9 w-9 text-gray-500 dark:text-white" />
                    )}
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {my_user.username}
                    </span>
                    <button
                      onClick={logoutHandler}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <NavLink
                    to="/login"
                    className="px-4 py-2 rounded-md text-sm font-medium bg-white border shadow hover:bg-gray-200"
                  >
                    Acceder
                  </NavLink>
                )}

                {/* Menú móvil */}
                <Popover.Button className="lg:hidden p-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                  {open ? (
                    <XIcon className="h-6 w-6" />
                  ) : (
                    <MenuIcon className="h-6 w-6" />
                  )}
                </Popover.Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Popover>
  );
}

const mapStateToProps = (state) => ({
  my_user: state.auth.user,
});

export default connect(mapStateToProps)(Navbar);