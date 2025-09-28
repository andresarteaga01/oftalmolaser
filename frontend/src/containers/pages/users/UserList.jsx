import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api  from "utils/axiosConfig";
import BackToHomeButton from "components/ui/BackToHomeButton";
import {
  ExclamationCircleIcon,
  UserPlusIcon as UserAddIcon,
  UsersIcon,
  TrashIcon,
  PencilSquareIcon as PencilAltIcon,
  HomeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import FullWidthLayout from "hocs/layouts/FullWidthLayout";

const UserList = () => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({ email: "", username: "", password: "", role: "medico" });
  const [editMode, setEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const cargarUsuarios = async () => {
    try {
      const res = await api.get(`${process.env.REACT_APP_API_URL}/api/user/admin/users/`, {
        headers: { Authorization: `JWT ${localStorage.getItem("access")}` },
      });

      setUsuarios(Array.isArray(res.data.results) ? res.data.results : []);
    } catch (err) {
      setUsuarios([]);
      console.error("Error al cargar usuarios:", err);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOpenModal = (usuario = null) => {
    if (usuario) {
      setFormData({ email: usuario.email, password: "", role: usuario.role });
      setEditMode(true);
      setSelectedUserId(usuario.id);
    } else {
      setFormData({ email: "", password: "", role: "medico" });
      setEditMode(false);
      setSelectedUserId(null);
    }
    setModalOpen(true);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Correo electrónico no válido.");
      return;
    }
    if (!formData.role) {
      setError("Selecciona un rol.");
      return;
    }
    if (!formData.username) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }
    if (!editMode && !formData.password) {
      setError("La contraseña es obligatoria.");
      return;
    }

    setIsCreating(true);
    setError("");
    
    try {
      if (editMode) {
        await api.put(
          `${process.env.REACT_APP_API_URL}/api/user/admin/users/${selectedUserId}/`,
          formData,
          {
            headers: {
              Authorization: `JWT ${localStorage.getItem("access")}`,
              "Content-Type": "application/json",
            },
          }
        );
        setSuccess("✅ Usuario actualizado exitosamente.");
      } else {
        await api.post(
          `${process.env.REACT_APP_API_URL}/api/user/admin/create-user/`,
          formData,
          {
            headers: {
              Authorization: `JWT ${localStorage.getItem("access")}`,
              "Content-Type": "application/json",
            },
          }
        );
        setSuccess("✅ Usuario creado exitosamente.");
      }

      setTimeout(() => {
        setModalOpen(false);
        setIsCreating(false);
        cargarUsuarios();
      }, 1500);
      
    } catch (err) {
      setError(editMode ? "Error al actualizar el usuario." : "Error al crear el usuario.");
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (usuario) => {
    setUserToDelete(usuario);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    setError("");
    
    console.log("=== DEBUG ELIMINACIÓN ===");
    console.log("Usuario a eliminar:", userToDelete);
    console.log("Token de acceso:", localStorage.getItem("access") ? "✅ Presente" : "❌ No encontrado");
    console.log("URL endpoint:", `${process.env.REACT_APP_API_URL}/api/user/admin/users/${userToDelete.id}/`);
    
    try {
      const response = await api.delete(`${process.env.REACT_APP_API_URL}/api/user/admin/users/${userToDelete.id}/`, {
        headers: { 
          Authorization: `JWT ${localStorage.getItem("access")}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log("Usuario eliminado exitosamente:", response);
      console.log("Response data:", response.data);
      setSuccess(`✅ Usuario "${userToDelete.username || userToDelete.email}" eliminado exitosamente.`);
      cargarUsuarios();
      
      // Cerrar modal y limpiar
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setIsDeleting(false);
      
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => setSuccess(""), 4000);
      
    } catch (err) {
      console.error("Error completo al eliminar:", err);
      console.error("Response data:", err.response?.data);
      console.error("Status:", err.response?.status);
      
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.error || 
                          err.response?.data?.message ||
                          "Error al eliminar el usuario.";
      setError(errorMessage);
      setIsDeleting(false);
      
      // Limpiar mensaje después de 6 segundos
      setTimeout(() => setError(""), 6000);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
    setIsDeleting(false);
  };

  return (
    <FullWidthLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Mensajes globales */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
              <UsersIcon className="w-8 h-8 text-blue-700" />
              Gestión de Usuarios
            </h1>
            <BackToHomeButton variant="primary" size="md" />
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <UserAddIcon className="w-5 h-5" />
            Crear Usuario
          </button>
        </div>

        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-blue-600 text-white text-left">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length > 0 ? (
                usuarios.map((usuario, i) => (
                  <tr key={usuario.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{usuario.first_name || usuario.username}</td>
                    <td className="px-4 py-2">{usuario.email}</td>
                    <td className="px-4 py-2 capitalize">{usuario.role}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button 
                        onClick={() => handleOpenModal(usuario)} 
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <PencilAltIcon className="w-4 h-4" /> 
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(usuario)} 
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <TrashIcon className="w-4 h-4" /> 
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <Transition appear show={modalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={() => setModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-center justify-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
                <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                  {editMode ? "Editar Usuario" : "Crear Usuario"}
                </Dialog.Title>

                {isCreating && (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                      <ArrowPathIcon className="w-6 h-6 animate-spin" />
                      <span className="text-lg font-medium">
                        {editMode ? "Actualizando usuario..." : "Creando usuario..."}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Por favor espera un momento
                    </div>
                  </div>
                )}

                {success && (
                  <div className="text-center py-4">
                    <div className="text-green-600 text-lg font-medium flex items-center justify-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {success}
                    </div>
                  </div>
                )}

                {error && !isCreating && (
                  <div className="text-sm text-red-600 flex items-center gap-2 mb-2">
                    <ExclamationCircleIcon className="w-5 h-5" />
                    {error}
                  </div>
                )}

                {!isCreating && !success && (
                  <form className="space-y-4">
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Correo electrónico"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Nombre de usuario"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {!editMode && (
                      <input
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Contraseña"
                        type="password"
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="medico">Médico</option>
                      <option value="especialista">Especialista</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </form>
                )}

                {!isCreating && !success && (
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <UserAddIcon className="w-4 h-4" />
                      {editMode ? "Actualizar" : "Crear Usuario"}
                    </button>
                  </div>
                )}

                {success && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => {
                        setModalOpen(false);
                        setSuccess("");
                        setIsCreating(false);
                      }}
                      className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </div>
          </Dialog>
        </Transition>

        {/* Modal de confirmación de eliminación */}
        <Transition appear show={deleteModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={() => !isDeleting && handleCancelDelete()}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-40" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl border">
                
                {isDeleting ? (
                  // Estado de eliminando
                  <div className="text-center py-6">
                    <div className="mb-4">
                      <ArrowPathIcon className="w-12 h-12 animate-spin text-red-500 mx-auto" />
                    </div>
                    <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
                      Eliminando Usuario
                    </Dialog.Title>
                    <p className="text-gray-600">
                      Por favor espera mientras eliminamos el usuario "{userToDelete?.username || userToDelete?.email}"...
                    </p>
                  </div>
                ) : (
                  // Estado de confirmación
                  <>
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                        <TrashIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <Dialog.Title className="text-xl font-semibold text-gray-900">
                          Confirmar Eliminación
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 mt-1">
                          Esta acción no se puede deshacer
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className="text-gray-700">
                        ¿Estás seguro de que quieres eliminar al usuario{" "}
                        <span className="font-semibold text-gray-900">
                          "{userToDelete?.username || userToDelete?.email}"
                        </span>
                        ?
                      </p>
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Advertencia:</strong> Se perderán todos los datos asociados con este usuario.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleCancelDelete}
                        className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Eliminar Usuario
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </div>
          </Dialog>
        </Transition>
      </div>
    </FullWidthLayout>
  );
};

export default UserList;
