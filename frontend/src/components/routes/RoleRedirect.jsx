import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";

const RoleRedirect = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === null) return;

    if (user) {
      switch (user.role) {
        case "administrador":
          navigate("/admin", { replace: true });
          break;
        case "especialista":
          navigate("/especialista", { replace: true });
          break;
        case "medico":
          navigate("/medico", { replace: true });
          break;
        default:
          navigate("/login", { replace: true });
      }
    }

    setLoading(false);
  }, [user, navigate]);

  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  return null;
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps)(RoleRedirect);