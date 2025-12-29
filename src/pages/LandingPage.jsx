import React from 'react';
import { Calendar, MessageSquare, Settings, ShieldCheck, Clock, Sparkles } from 'lucide-react';

const LandingPage = ({ onStart, clinicName, clinicLogo }) => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-b from-clinic-teal to-white pt-16 pb-32">
        <nav className="container mx-auto px-6 flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            {clinicLogo ? (
              <img src={clinicLogo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Sparkles className="text-teal-500" />
            )}
            <span className="text-xl font-bold text-slate-800">{clinicName}</span>
          </div>
          <button
            onClick={onStart}
            className="bg-teal-500 text-white px-6 py-2 rounded-full font-medium hover:bg-teal-600 transition-colors"
          >
            Acceder
          </button>
        </nav>

        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
            <span className="text-teal-500">Automatizada con {clinicName}</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Gestiona tus citas por WhatsApp de forma inteligente. {clinicName} atiende a tus pacientes 24/7, agenda citas y envía recordatorios automáticos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onStart}
              className="bg-teal-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-200 hover:scale-105 transition-transform"
            >
              Comenzar Ahora
            </button>
            <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors">
              Ver Demo
            </button>
          </div>
        </div>
      </header>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                <MessageSquare className="text-teal-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Chat Inteligente</h3>
              <p className="text-slate-600">{clinicName} responde dudas y gestiona conversaciones naturales por WhatsApp.</p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                <Calendar className="text-teal-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Agenda Automática</h3>
              <p className="text-slate-600">Sincronización en tiempo real con tu disponibilidad para evitar traslapes.</p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="text-teal-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">Recordatorios</h3>
              <p className="text-slate-600">Reduce el ausentismo con mensajes automáticos de confirmación.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
