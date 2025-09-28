import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { load_user } from 'redux/actions/auth';

import PrivateRoute from 'components/routes/PrivateRoute';
import RoleRoute from 'components/routes/RoleRoute';

import Navbar from 'components/navigation/Navbar';
import Footer from 'components/navigation/Footer';
import Alert from 'components/alert';

import UnifiedDashboard from 'containers/UnifiedDashboard';
import Login from 'containers/pages/Login';
import UserList from 'containers/pages/users/UserList';
import PacienteList from 'containers/pages/pacientes/PacienteList';
import RegistrarPaciente from 'containers/pages/pacientes/RegistrarPaciente';
import EditarPaciente from 'containers/pages/pacientes/EditarPaciente';
import BuscarPaciente from 'containers/pages/pacientes/BuscarPaciente';
import Reportes from 'containers/pages/reportes/Reportes';
import ReportePaciente from 'containers/pages/reportes/ReportePaciente';
import PrediccionPaciente from 'containers/pages/pacientes/PrediccionPaciente';
import Diagnostico from 'containers/pages/pacientes/Diagnostico';
import Estadisticas from 'containers/pages/estadisticas/Estadisticas';
import PatientDetail from 'components/PatientDetail';
import Error404 from 'containers/errors/Error404';
import RoleRedirect from 'components/routes/RoleRedirect';
import './asset/styles/index.css';

const AppWrapper = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {!isLoginPage && <Navbar />}
      <Alert />
      <div className="min-h-screen flex flex-col justify-between">
        <main className="flex-grow">
          <Routes>

            {/* Públicas */}
            <Route path="/login" element={<Login />} />

            {/* Dashboard Principal Unificado */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <UnifiedDashboard />
                </PrivateRoute>
              }
            />
            
            {/* Detalle de paciente */}
            <Route
              path="/patient/:id"
              element={
                <PrivateRoute>
                  <PatientDetail />
                </PrivateRoute>
              }
            />

            {/* Los dashboards por rol ya no son necesarios - todo está unificado en "/" */}
            <Route
              path="/usuarios"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador']}>
                    <UserList />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Pacientes */}
            <Route
              path="/pacientes"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista', 'medico']}>
                    <PacienteList />
                  </RoleRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/pacientes/nuevo"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista', 'medico']}>
                    <RegistrarPaciente />
                  </RoleRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/pacientes/editar/:id"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista', 'medico']}>
                    <EditarPaciente />
                  </RoleRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/pacientes/buscar"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'medico', 'especialista']}>
                    <BuscarPaciente />
                  </RoleRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/pacientes/prediccion"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista', 'medico']}>
                    <PrediccionPaciente />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Reportes */}
            <Route
              path="/reportes"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista']}>
                    <Reportes />
                  </RoleRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/reportes/:id"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista']}>
                    <ReportePaciente />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Diagnóstico */}
            <Route
              path="/diagnostico"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'medico', 'especialista']}>
                    <Diagnostico />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Estadísticas */}
            <Route
              path="/estadisticas"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRoles={['administrador', 'especialista', 'medico']}>
                    <Estadisticas />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<Error404 />} />
          </Routes>
        </main>

        {!isLoginPage && <Footer />}
      </div>
    </>
  );
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(load_user());
  }, [dispatch]);

  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
