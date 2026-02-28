"use client"

import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, AlertCircle, CheckCircle, Mail } from 'lucide-react';

// Mock organization database
const mockOrganizations = [
  { email: 'contacto@esperanza.org', password: 'demo123', name: 'Fundación Esperanza', id: 1 },
  { email: 'info@educacionglobal.org', password: 'demo123', name: 'ONG Educación Global', id: 2 },
  { email: 'contacto@saludtodos.org', password: 'demo123', name: 'Asociación Salud para Todos', id: 3 },
];

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if it's an organization login
    const organization = mockOrganizations.find(
      org => org.email === email && org.password === password
    );

    if (organization) {
      // Organization login
      localStorage.setItem('appleseed_auth', 'true');
      localStorage.setItem('user_type', 'organization');
      localStorage.setItem('organization_id', organization.id.toString());
      localStorage.setItem('organization_name', organization.name);
      navigate('/organization');
    } else if (email === 'admin@appleseed.org' && password === 'admin123') {
      // Admin login
      localStorage.setItem('appleseed_auth', 'true');
      localStorage.setItem('user_type', 'admin');
      navigate('/');
    } else if (email && password) {
      setError('Credenciales incorrectas');
    } else {
      setError('Por favor ingrese correo electrónico y contraseña');
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate password recovery
    setTimeout(() => {
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecovery(false);
        setRecoverySuccess(false);
        setRecoveryEmail('');
      }, 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Appleseed México
            </h1>
            <p className="text-gray-600">
              Portal de Prevención de Lavado de Dinero
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition duration-200 shadow-lg shadow-emerald-600/30"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 text-center flex items-center justify-center gap-4">
            <button
              onClick={() => setShowRecovery(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <span className="text-gray-400">•</span>
            <Link
              to="/register"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Registrar Organización
            </Link>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">Credenciales de prueba:</p>
            <p className="text-xs text-blue-700 mb-1">
              <strong>Admin:</strong> admin@appleseed.org / admin123
            </p>
            <p className="text-xs text-blue-700">
              <strong>Organización:</strong> contacto@esperanza.org / demo123
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Sistema seguro de gestión y prevención de lavado de dinero
        </p>
      </div>

      {/* Password Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            {!recoverySuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Recuperar Contraseña
                  </h2>
                  <p className="text-gray-600">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleRecovery} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="tu@correo.com"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecovery(false);
                        setRecoveryEmail('');
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
                    >
                      Enviar Enlace
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Correo Enviado!
                </h2>
                <p className="text-gray-600">
                  Hemos enviado un enlace de recuperación a <strong>{recoveryEmail}</strong>. 
                  Revisa tu bandeja de entrada y spam.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}