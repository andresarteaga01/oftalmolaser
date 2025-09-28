import { Navigate } from "react-router-dom";
import { connect } from "react-redux";

const RoleRoute = ({ children, user, allowedRoles }) => {
  // Si no hay usuario cargado aún
  if (!user) return <Navigate to="/login" replace />;

  // Si el usuario no tiene rol permitido
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Si está permitido, renderiza el contenido
  return children;
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps)(RoleRoute);