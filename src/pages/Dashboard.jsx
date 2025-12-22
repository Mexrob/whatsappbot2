import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Search,
  MoreVertical,
  Send,
  CheckCheck,
  Clock,
  User,
  Plus
} from 'lucide-react';

const SidebarItem = ({ id, iconComponent: Icon, label, activeTab, onClick }) => ( // eslint-disable-line no-unused-vars
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
      ? 'bg-teal-500 text-white shadow-lg shadow-teal-200'
      : 'text-slate-500 hover:bg-slate-100'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="font-bold text-slate-800 leading-tight">
            {settings?.clinic_name || 'Erika AI'}
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem id="messages" iconComponent={MessageSquare} label="Mensajes" activeTab={activeTab} onClick={setActiveTab} />
          <SidebarItem id="appointments" iconComponent={Calendar} label="Citas" activeTab={activeTab} onClick={setActiveTab} />
          <SidebarItem id="settings" iconComponent={Settings} label="Configuración" activeTab={activeTab} onClick={setActiveTab} />
        </nav>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-500 transition-colors mt-auto"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={fetchSettings} />}
      </main>
    </div>
  );
};

const MessagesTab = () => {
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [selectedChat?.phone_number]); // Re-run if selected chat changes to ensure sync

  const fetchMessages = async () => {
    try {
      const response = await api.getMessages();
      // Group messages by phone number for the chat list
      const groups = response.data.reduce((acc, msg) => {
        if (!acc[msg.phone_number]) {
          acc[msg.phone_number] = {
            phone_number: msg.phone_number,
            lastMessage: msg.message_content,
            lastTime: new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: []
          };
        }
        acc[msg.phone_number].messages.push(msg);
        return acc;
      }, {});
      const chatList = Object.values(groups);
      setMessages(chatList);

      if (chatList.length > 0) {
        if (!selectedChat) {
          setSelectedChat(chatList[0]);
        } else {
          // Update current selected chat with new messages
          const updatedSelected = chatList.find(c => c.phone_number === selectedChat.phone_number);
          if (updatedSelected && updatedSelected.messages.length !== selectedChat.messages.length) {
            setSelectedChat(updatedSelected);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await api.sendMessage({
        phone_number: selectedChat.phone_number,
        message_content: newMessage,
        sender: 'assistant'
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Chat List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar chat..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {messages.map((chat) => (
            <div
              key={chat.phone_number}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 flex gap-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 ${selectedChat?.phone_number === chat.phone_number ? 'bg-slate-50' : ''}`}
            >
              <div className="w-12 h-12 bg-teal-100 rounded-full flex-shrink-0 flex items-center justify-center text-teal-600 font-bold">
                {chat.phone_number.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-800 truncate">{chat.phone_number}</h4>
                  <span className="text-xs text-slate-400">{chat.lastTime}</span>
                </div>
                <p className="text-sm text-slate-500 truncate">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#F0F2F5]">
          <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {selectedChat.phone_number.slice(-2)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{selectedChat.phone_number}</h4>
                <span className="text-xs text-green-500 font-medium">En línea</span>
              </div>
            </div>
            <MoreVertical className="text-slate-400 cursor-pointer" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {[...selectedChat.messages].reverse().map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`${msg.sender === 'user' ? 'bg-white text-slate-800' : 'bg-teal-500 text-white'} p-3 rounded-2xl ${msg.sender === 'user' ? 'rounded-tl-none' : 'rounded-tr-none'} shadow-sm max-w-md`}>
                  <p>{msg.message_content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-[10px] ${msg.sender === 'user' ? 'text-slate-400' : 'text-teal-100'}`}>
                      {new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'assistant' && <CheckCheck size={12} className="text-teal-100" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-slate-100 rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="submit"
                className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
          Selecciona un chat para empezar
        </div>
      )}
    </div>
  );
};

const AppointmentsTab = () => {
  const [appointments, setAppointments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    phone_number: '',
    appointment_date: '',
    appointment_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.getAppointments();
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createAppointment(formData);
      setIsModalOpen(false);
      setFormData({
        patient_name: '',
        phone_number: '',
        appointment_date: '',
        appointment_type: ''
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateAppointment(id, { status });
      setActiveMenu(null);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cita?')) {
      try {
        await api.deleteAppointment(id);
        setActiveMenu(null);
        fetchAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  const stats = [
    { label: 'Citas totales', value: appointments.length.toString(), color: 'bg-blue-500' },
    { label: 'Pendientes', value: appointments.filter(a => a.status === 'pending').length.toString(), color: 'bg-amber-500' },
    { label: 'Confirmadas', value: appointments.filter(a => a.status === 'confirmed').length.toString(), color: 'bg-green-500' },
  ];

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Citas</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200"
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-slate-800">{stat.value}</span>
              <div className={`w-2 h-2 rounded-full mb-2 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm relative">
        {activeMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setActiveMenu(null)}
          />
        )}
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Paciente</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Servicio</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Fecha y Hora</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Estado</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {appointments.map((appt) => (
              <tr key={appt.id} className={`hover:bg-slate-50 transition-colors ${activeMenu === appt.id ? 'relative z-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs">
                      {appt.patient_name[0]}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800 block">{appt.patient_name}</span>
                      <span className="text-[10px] text-slate-400">{appt.phone_number}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{appt.appointment_type}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(appt.appointment_date).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${appt.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                    appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                    {appt.status === 'confirmed' ? 'Confirmada' :
                      appt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-6 py-4 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === appt.id ? null : appt.id);
                    }}
                    className={`p-2 rounded-lg transition-colors relative z-50 ${activeMenu === appt.id ? 'bg-slate-100 text-teal-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {activeMenu === appt.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-[60] py-2 animate-in fade-in zoom-in duration-150 origin-top-right">
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Confirmar Cita
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Cancelar Cita
                      </button>
                      <div className="h-[1px] bg-slate-100 my-1" />
                      <button
                        onClick={() => handleDelete(appt.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        Eliminar Registro
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No hay citas registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {
        isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-50">
                <h3 className="text-xl font-bold text-slate-800">Nueva Cita</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Nombre del Paciente</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Teléfono</label>
                  <input
                    required
                    type="tel"
                    placeholder="Ej. 1234567890"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Fecha y Hora</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Servicio / Tipo</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Limpieza Dental"
                    value={formData.appointment_type}
                    onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Crear Cita'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

const SettingsTab = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState({
    clinic_name: '',
    clinic_phone: '',
    clinic_address: '',
    services: '',
    whatsapp_webhook_url: '',
    timezone: 'America/Mexico_City'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        clinic_name: settings.clinic_name || '',
        clinic_phone: settings.clinic_phone || '',
        clinic_address: settings.clinic_address || '',
        services: settings.services || '',
        whatsapp_webhook_url: settings.whatsapp_webhook_url || '',
        timezone: settings.timezone || 'America/Mexico_City'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.updateSettings(formData);
      setMessage('Configuración guardada correctamente');
      onUpdate();
    } catch (error) {
      console.error('Error updating settings:', error);
      const errorMsg = error.response?.data?.error || error.message;
      setMessage(`Error al guardar: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Configuración de la Clínica</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <User size={20} className="text-teal-500" /> Información General
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Nombre de la Clínica</label>
              <input
                type="text"
                value={formData.clinic_name}
                onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Teléfono WhatsApp</label>
              <input
                type="text"
                value={formData.clinic_phone}
                onChange={(e) => setFormData({ ...formData, clinic_phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-600">Dirección</label>
              <input
                type="text"
                value={formData.clinic_address}
                onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-teal-500" /> Horarios y Servicios
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Servicios (Separados por coma)</label>
              <textarea
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20 h-24"
              ></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Webhook URL (Twilio)</label>
              <input
                type="text"
                value={formData.whatsapp_webhook_url}
                onChange={(e) => setFormData({ ...formData, whatsapp_webhook_url: e.target.value })}
                placeholder="https://tu-url-ngrok.ngrok-free.dev/api/webhook/whatsapp"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Zona Horaria</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="America/Mexico_City">Ciudad de México</option>
                <option value="America/Bogota">Bogotá</option>
                <option value="America/Madrid">Madrid</option>
                <option value="America/New_York">New York</option>
              </select>
            </div>
          </div>
        </section>

        {message && (
          <p className={`text-sm text-center font-medium ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;
