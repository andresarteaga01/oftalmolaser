import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { login } from "redux/actions/auth";
import { useNavigate } from "react-router-dom";

const Login = ({ login, isAuthenticated, user }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError("⚠️ Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      // Todos los roles van al dashboard unificado
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-no-repeat bg-center relative"
      style={{ backgroundImage: "url('/static/imagen/login_bg.webp')" }}
    >
      {/* Capa oscura de fondo */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

      {/* Contenedor principal del formulario */}
      <div className="relative z-10 w-[90%] max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl animate-fade-in">
        <div className="text-center mb-6">
          <img
            src="/static/imagen/logo_oftalmoslaser.jpg"
            alt="Clínica Santa Lucía"
            className="mx-auto mb-4 w-28"
          />
          <h2 className="text-white text-2xl font-bold">Iniciar Sesión</h2>
          <p className="text-gray-200 text-sm">
            Sistema de gestión de retinopatía diabética
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-700 p-2 rounded text-sm text-center">
              {error}
            </div>
          )}

          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={onChange}
            className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={password}
            onChange={onChange}
            className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full transition-all duration-200 text-white py-2 rounded font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth?.isAuthenticated || false,
  user: state.auth?.user || null,
});

export default connect(mapStateToProps, { login })(Login);