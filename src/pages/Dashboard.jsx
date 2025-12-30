import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  List,
  Plus,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause, Edit2,
  Moon,
  Sun,
  Trash2,
  Trash,
  Phone,
  LayoutGrid
} from 'lucide-react';

const SidebarItem = ({ id, iconComponent: Icon, label, activeTab, onClick }) => ( // eslint-disable-line no-unused-vars
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
      ? 'bg-teal-500 text-white shadow-lg shadow-teal-200'
      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [settings, setSettings] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Load user from session
    const session = localStorage.getItem('erika_session');
    if (session) {
      const { user } = JSON.parse(session);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetchSettings();
  }, []);



  const fetchSettings = async () => {
    try {
      const response = await api.getSettings();
      setSettings(response.data);
      if (response.data && response.data.clinic_name) {
        document.title = response.data.clinic_name;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const hasPermission = (permission) => {
    if (!currentUser) return true; // Show all items while loading
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions?.[permission] || false;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative transition-colors duration-200">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col p-4 transition-transform duration-300 md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200 overflow-hidden shrink-0">
            {settings?.clinic_logo ? (
              <img src={settings.clinic_logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xl">{(settings?.clinic_name || 'E')[0]}</span>
            )}
          </div>
          <h1 className="font-bold text-slate-800 dark:text-white leading-tight">
            {settings?.clinic_name || 'Clinic AI'}
          </h1>
        </div>

        <nav className="flex-1 space-y-2 mt-8 md:mt-0">
          {hasPermission('can_manage_messages') && (
            <SidebarItem
              id="messages"
              iconComponent={MessageSquare}
              label="Mensajes"
              activeTab={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          )}
          {hasPermission('can_manage_appointments') && (
            <SidebarItem
              id="appointments"
              iconComponent={List}
              label="Citas"
              activeTab={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          )}
          {hasPermission('can_manage_appointments') && (
            <SidebarItem
              id="calendar"
              iconComponent={Calendar}
              label="Agenda"
              activeTab={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          )}
          {hasPermission('can_view_settings') && (
            <SidebarItem
              id="settings"
              iconComponent={Settings}
              label="Configuración"
              activeTab={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          )}
          {(currentUser?.role === 'admin' || !currentUser) && (
            <SidebarItem
              id="users"
              iconComponent={Users}
              label="Usuarios"
              activeTab={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 pb-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-2 mb-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <p className="text-[10px] text-slate-400 px-4 mb-2 uppercase tracking-widest font-bold">Versión Sistema</p>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl mx-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Build: 29/12-12:00 Features++</p>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Auto-Sync: Activado</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              Refrescar Ahora
            </button>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-500 transition-colors mt-2"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full pt-16 md:pt-0">
        {(() => {
          switch (activeTab) {
            case 'messages':
              return <MessagesTab />;
            case 'appointments': // Citas List View
              return <AppointmentsTab />;
            case 'calendar': // Agenda Grid View
              return <CalendarTab />;
            case 'settings':
              return <SettingsTab settings={settings} onUpdate={fetchSettings} />;
            case 'users':
              return <UsersTab />;
            default:
              return <MessagesTab />;
          }
        })()}
      </main>
    </div>
  );
};

const MessagesTab = () => {
  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const selectedPhoneRef = useRef(selectedPhone);

  // Track selectedPhone in a ref to avoid stale closures in setInterval
  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []); // Poll independently of selection

  // Separate effect for default selection on desktop
  useEffect(() => {
    if (messages.length > 0 && !selectedPhone && window.innerWidth >= 768) {
      setSelectedPhone(messages[0].phone_number);
    }
  }, [messages, selectedPhone]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const utcStr = dateStr.includes('T') ? (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z') : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  };

  const fetchMessages = async () => {
    try {
      const response = await api.getMessages();
      const groups = response.data.reduce((acc, msg) => {
        if (!acc[msg.phone_number]) {
          acc[msg.phone_number] = {
            phone_number: msg.phone_number,
            patient_name: msg.patient_name,
            lastMessage: msg.message_content,
            lastTime: formatTime(msg.received_at),
            messages: []
          };
        }
        acc[msg.phone_number].messages.push(msg);
        return acc;
      }, {});
      const chatList = Object.values(groups);
      setMessages(chatList);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPhone) return;

    try {
      await api.sendMessage({
        phone_number: selectedPhone,
        message_content: newMessage,
        sender: 'assistant'
      });
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-800">
      {/* Chat List */}
      <div className={`
        flex-col border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out
        ${selectedPhone ? 'hidden md:flex' : 'flex'}
        w-full md:w-80 h-full overflow-hidden
      `}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar chat..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-800 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay mensajes aún
            </div>
          ) : (
            messages.map((chat) => (
              <div
                key={chat.phone_number}
                onClick={() => setSelectedPhone(chat.phone_number)}
                className={`p-4 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-all ${selectedPhone === chat.phone_number
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-r-4 border-r-teal-500'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold truncate pr-2 ${selectedPhone === chat.phone_number ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {chat.patient_name || chat.phone_number}
                  </h4>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{chat.lastTime}</span>
                </div>
                {chat.patient_name && <p className="text-[10px] text-slate-400 -mt-1 mb-1">{chat.phone_number}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{chat.lastMessage}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`
        flex-1 flex-col h-full bg-slate-50 dark:bg-slate-950 transition-all duration-300 ease-in-out overflow-hidden
        ${selectedPhone ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedPhone ? (
          (() => {
            const activeChat = messages.find(c => c.phone_number === selectedPhone);
            if (!activeChat) return (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>Cargando conversación...</p>
              </div>
            );

            return <ChatWindow
              activeChat={activeChat}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              onBack={() => setSelectedPhone(null)}
            />;
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-lg font-medium">Selecciona un chat para empezar</p>
            <p className="text-sm opacity-60">Toca cualquier conversación a la izquierda</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted ChatWindow for better state/scroll management
const ChatWindow = ({ activeChat, newMessage, setNewMessage, handleSendMessage, onBack }) => {
  const scrollRef = useRef(null);
  const [isAiPaused, setIsAiPaused] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getChatStatus(activeChat.phone_number);
        setIsAiPaused(res.data.is_ai_paused === 1);
      } catch (error) {
        console.error('Error fetching chat status:', error);
      }
    };
    fetchStatus();
  }, [activeChat.phone_number]);

  const togglePause = async () => {
    try {
      await api.toggleAiPause({
        phone_number: activeChat.phone_number,
        is_ai_paused: !isAiPaused
      });
      setIsAiPaused(!isAiPaused);
    } catch (error) {
      console.error('Error toggling AI pause:', error);
      alert('Error al cambiar el estado de la IA');
    }
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    setTempName(activeChat.patient_name || '');
  }, [activeChat]);

  const handleUpdateName = async () => {
    if (!tempName.trim()) {
      setIsEditingName(false);
      return;
    }
    try {
      await api.updateChatName({
        phone_number: activeChat.phone_number,
        name: tempName
      });
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error al actualizar nombre');
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat.messages.length]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F0F2F5] dark:bg-slate-950 transition-colors">
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
            {activeChat.phone_number.slice(-2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                  className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded outline-none font-bold text-slate-800 dark:text-white text-sm"
                />
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <h4 className="font-bold text-slate-800 dark:text-white">{activeChat.patient_name || activeChat.phone_number}</h4>
                  <Edit2 size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isAiPaused && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold border border-amber-200 shadow-sm">
                      IA PAUSADA
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              {activeChat.patient_name ? activeChat.phone_number : 'En línea'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${isAiPaused
              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
          >
            {isAiPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            {isAiPaused ? 'Reactivar IA' : 'Pausar IA'}
          </button>
          <MoreVertical className="text-slate-400 cursor-pointer" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {[...activeChat.messages].reverse().map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`${msg.sender === 'user' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'bg-teal-500 text-white'} p-3 rounded-2xl ${msg.sender === 'user' ? 'rounded-tl-none' : 'rounded-tr-none'} shadow-sm max-w-[85%] md:max-w-md transition-all`}>
              <p className="text-sm md:text-base break-words">{msg.message_content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className={`text-[10px] ${msg.sender === 'user' ? 'text-slate-400 dark:text-slate-500' : 'text-teal-100'}`}>
                  {(() => {
                    const dateStr = msg.received_at;
                    const utcStr = dateStr.includes('T') ? (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z') : dateStr.replace(' ', 'T') + 'Z';
                    return new Date(utcStr).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Mexico_City'
                    });
                  })()}
                </span>
                {msg.sender === 'assistant' && <CheckCheck size={12} className="text-teal-100" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-4 md:px-6 py-2 md:py-3 outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white dark:placeholder-slate-400 text-sm md:text-base"
          />
          <button
            type="submit"
            className="w-10 h-10 md:w-12 md:h-12 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 transition-colors shrink-0"
          >
            <Send size={18} className="md:hidden" />
            <Send size={20} className="hidden md:block" />
          </button>
        </div>
      </form>
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
    const interval = setInterval(fetchAppointments, 2000); // Poll every 2 seconds
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Citas</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200"
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</span>
              <div className={`w-2 h-2 rounded-full mb-2 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        {activeMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setActiveMenu(null)}
          />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Paciente</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Servicio</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Fecha y Hora</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {appointments.map((appt) => (
                <tr key={appt.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${activeMenu === appt.id ? 'relative z-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">
                        {appt.patient_name[0]}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800 dark:text-white block">{appt.patient_name}</span>
                        <span className="text-[10px] text-slate-400">{appt.phone_number}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{appt.appointment_type}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(appt.appointment_date).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</td>
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
                      <div className="absolute right-full mr-2 top-0 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-[60] py-2 animate-in fade-in zoom-in duration-150 origin-top-right">
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500" /> Confirmar Cita
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500" /> Cancelar Cita
                        </button>
                        <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                        <button
                          onClick={() => handleDelete(appt.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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

// Calendar Component
function CalendarTab() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - d.getDay() + i); // Start from Sunday
    return d;
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [currentWeek]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slots, appts] = await Promise.all([
        api.getAvailability(),
        api.getAppointments()
      ]);
      setAvailability(slots);
      setAppointments(appts.data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = async (date, hour) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const startStr = start.toISOString();

    const existingSlot = availability.find(s => {
      const sTime = new Date(s.start_time).getTime();
      return Math.abs(sTime - start.getTime()) < 1000;
    });

    if (existingSlot) {
      await api.deleteAvailability(existingSlot.id);
    } else {
      const end = new Date(start);
      end.setHours(hour + 1);
      await api.addAvailability({
        start_time: startStr,
        end_time: end.toISOString()
      });
    }
    loadData();
  };

  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };

  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda de Disponibilidad</h2>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={prevWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-slate-800 dark:text-white min-w-[150px] text-center">
            {days[0].toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
        <div className="grid grid-cols-8 min-w-[800px] border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="p-4 border-r border-slate-200 dark:border-slate-700"></div>
          {days.map(d => (
            <div key={d} className="p-4 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0">
              <span className="block text-xs font-bold text-slate-400 uppercase">{d.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
              <span className={`block text-lg font-bold ${d.getDate() === new Date().getDate() ? 'text-teal-500' : 'text-slate-800 dark:text-white'}`}>
                {d.getDate()}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 min-w-[800px]">
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="p-4 text-xs font-semibold text-slate-400 border-r border-b border-slate-200 dark:border-slate-700 text-right sticky left-0 bg-white dark:bg-slate-800 z-10">
                {hour}:00
              </div>
              {days.map(d => {
                const cellTime = new Date(d);
                cellTime.setHours(hour, 0, 0, 0);

                // Check if slot is available
                const isAvailable = availability.some(s => {
                  const sTime = new Date(s.start_time).getTime();
                  return Math.abs(sTime - cellTime.getTime()) < 1000;
                });

                // Check if there is an appointment (booked)
                const appointment = appointments.find(a => {
                  const aTime = new Date(a.appointment_date).getTime();
                  // Check if appt is within this hour slot
                  return aTime >= cellTime.getTime() && aTime < cellTime.getTime() + 3600000 && a.status !== 'cancelled';
                });

                return (
                  <div
                    key={d.toISOString() + hour}
                    onClick={() => toggleSlot(d, hour)}
                    className={`
                      border-r border-b border-slate-200 dark:border-slate-700 h-20 p-1 transition-all cursor-pointer relative group
                      ${isAvailable
                        ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                    `}
                  >
                    {isAvailable && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" />
                    )}

                    {!isAvailable && (
                      <div className="hidden group-hover:flex items-center justify-center h-full text-slate-300 dark:text-slate-600">
                        <Plus size={16} />
                      </div>
                    )}

                    {appointment && (
                      <div className="absolute inset-1 bg-teal-100 dark:bg-teal-900/80 rounded-lg p-2 text-[10px] overflow-hidden border border-teal-200 dark:border-teal-700 shadow-sm z-10">
                        <span className="font-bold text-teal-700 dark:text-teal-200 block truncate">{appointment.patient_name}</span>
                        <span className="text-teal-600 dark:text-teal-300 block truncate">{appointment.appointment_type}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const SettingsTab = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState({
    clinic_name: '',
    clinic_phone: '',
    clinic_address: '',
    services: '',
    whatsapp_webhook_url: '',
    timezone: 'America/Mexico_City',
    clinic_logo: '',
    bot_name: ''
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
        timezone: settings.timezone || 'America/Mexico_City',
        clinic_logo: settings.clinic_logo || '',
        bot_name: settings.bot_name || ''
      });
    }
  }, [settings]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, clinic_logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

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
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">Configuración de la Clínica</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <User size={20} className="text-teal-500" /> Información General
          </h3>
          <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Logo de la Clínica</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                  {formData.clinic_logo ? (
                    <img src={formData.clinic_logo} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Plus className="text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    Subir Imagen
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                  </label>
                  {formData.clinic_logo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, clinic_logo: '' })}
                      className="text-red-500 text-xs font-bold hover:underline"
                    >
                      Eliminar Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nombre de la empresa</label>
                <input
                  type="text"
                  value={formData.clinic_name}
                  onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nombre del Asistente (Bot)</label>
                <input
                  type="text"
                  value={formData.bot_name}
                  onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                  placeholder="Ej. AI Assistant"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Teléfono WhatsApp</label>
                <input
                  type="text"
                  value={formData.clinic_phone}
                  onChange={(e) => setFormData({ ...formData, clinic_phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Dirección</label>
                <input
                  type="text"
                  value={formData.clinic_address}
                  onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Clock size={20} className="text-teal-500" /> Horarios y Servicios
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Servicios (Separados por coma)</label>
              <textarea
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 h-24"
              ></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Webhook URL (Twilio)</label>
              <input
                type="text"
                value={formData.whatsapp_webhook_url}
                onChange={(e) => setFormData({ ...formData, whatsapp_webhook_url: e.target.value })}
                placeholder="https://tu-url-ngrok.ngrok-free.dev/api/webhook/whatsapp"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Zona Horaria</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
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

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'staff', permissions: {} });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
      } else {
        await api.createUser(formData);
      }
      setFormData({ email: '', password: '', role: 'staff', permissions: {} });
      setEditingUser(null);
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar usuario?')) {
      try {
        await api.deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.message || 'Error al eliminar usuario');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions || {}
    });
    setShowModal(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'staff', permissions: {} });
    setShowModal(true);
  };

  const togglePermission = (key) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  return (
    <div className="p-8 overflow-y-auto h-full max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Usuarios</h2>
        <button
          onClick={handleNewUser}
          className="bg-teal-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-600 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Email</th>
              <th className="text-left px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Rol</th>
              <th className="text-left px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Permisos</th>
              <th className="text-right px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">
                      {user.email[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                    {user.role === 'admin' ? 'Administrador' : 'Personal'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.role === 'admin' ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Acceso Total</span>
                    ) : (
                      Object.keys(user.permissions || {}).filter(k => user.permissions[k]).length > 0 ? (
                        Object.keys(user.permissions || {}).filter(k => user.permissions[k]).map(key => (
                          <span key={key} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                            {key.replace('can_', '').replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Sin permisos</span>
                      )
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-slate-400 hover:text-teal-500 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Contraseña {editingUser && '(dejar vacío para no cambiar)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="staff">Personal</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.role === 'staff' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Permisos</label>
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_manage_appointments || false}
                        onChange={() => togglePermission('can_manage_appointments')}
                        className="w-4 h-4 text-teal-500 rounded focus:ring-2 focus:ring-teal-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Gestionar Citas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_view_settings || false}
                        onChange={() => togglePermission('can_view_settings')}
                        className="w-4 h-4 text-teal-500 rounded focus:ring-2 focus:ring-teal-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Ver Configuración</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.can_manage_messages || false}
                        onChange={() => togglePermission('can_manage_messages')}
                        className="w-4 h-4 text-teal-500 rounded focus:ring-2 focus:ring-teal-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Gestionar Mensajes</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
