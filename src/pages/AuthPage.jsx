import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';

const AuthPage = ({ onLogin, clinicName, clinicLogo }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('admin@clinica.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.login({ email, password });
      if (response.data.success) {
        onLogin();
      }
    } catch (err) {
      setError('Credenciales inválidas. Intenta con admin@clinica.com / admin123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-teal-200 overflow-hidden">
            {clinicLogo ? (
              <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isLogin ? 'Ingresa tus credenciales para acceder' : `Regístrate para empezar a usar ${clinicName}`}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              placeholder="tu@clinica.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-2"
          >
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-teal-600 font-medium hover:underline"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
