import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Clock,
  FileText,
  User,
  Building,
  Briefcase,
  Tag,
  UserCheck,
  Filter,
  Download,
  Upload,
  ChevronRight,
  Pin,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Activity,
  Paperclip,
  StickyNote,
  BarChart3,
  Eye
} from 'lucide-react';

// Category badge component
const CategoryBadge = ({ category }) => {
  const styles = {
    prospect: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    client: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    contact: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };
  
  const labels = {
    prospect: 'Prospecto',
    client: 'Cliente',
    contact: 'Contacto'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category] || styles.contact}`}>
      {labels[category] || category}
    </span>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const labels = {
    active: 'Activo',
    inactive: 'Inactivo',
    archived: 'Archivado'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
};

// Opportunity Stage Badge
const StageBadge = ({ stage }) => {
  const styles = {
    lead: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
    qualified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    proposal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const labels = {
    lead: 'Lead',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    won: 'Ganado',
    lost: 'Perdido'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[stage] || styles.lead}`}>
      {labels[stage] || stage}
    </span>
  );
};

const CRM = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('contacts'); // contacts, pipeline, stats
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailTab, setDetailTab] = useState('info'); // info, notes, attachments, opportunities
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'contact',
    status: 'active',
    company: '',
    position: '',
    tags: '',
    source: '',
    notes: ''
  });

  // Queries
  const { data: customers = [], isLoading: loadingCustomers, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.fetchCustomers(),
    refetchInterval: 5000
  });

  const { data: opportunities = [], isLoading: loadingOpps, refetch: refetchOpportunities } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.fetchOpportunities(),
    enabled: activeTab === 'pipeline'
  });

  const { data: pipelineStats, isLoading: loadingStats } = useQuery({
    queryKey: ['pipelineStats'],
    queryFn: () => api.getPipelineStats(),
    enabled: activeTab === 'stats'
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data) => api.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseCustomerModal();
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      handleCloseCustomerModal();
      if (selectedCustomer) {
        setSelectedCustomer(prev => ({ ...prev, ...formData }));
      }
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    }
  });

  // Filtered customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || customer.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const stats = {
    total: customers.length,
    prospects: customers.filter(c => c.category === 'prospect').length,
    clients: customers.filter(c => c.category === 'client').length,
    contacts: customers.filter(c => c.category === 'contact').length
  };

  const handleOpenCustomerModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        category: customer.category || 'contact',
        status: customer.status || 'active',
        company: customer.company || '',
        position: customer.position || '',
        tags: customer.tags || '',
        source: customer.source || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        category: 'contact',
        status: 'active',
        company: '',
        position: '',
        tags: '',
        source: '',
        notes: ''
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createCustomerMutation.mutate(formData);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      deleteCustomerMutation.mutate(id);
    }
  };

  const handleOpenDetail = (customer) => {
    setSelectedCustomer(customer);
    setDetailTab('info');
    setIsDetailModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">CRM Avanzado</h2>
        <button
          onClick={() => handleOpenCustomerModal()}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'contacts'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Contactos
          </div>
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'pipeline'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Target size={18} />
            Pipeline
          </div>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'stats'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} />
            Estadísticas
          </div>
        </button>
      </div>

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</span>
                <Activity className="text-slate-400 mb-1" size={16} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Prospectos</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.prospects}</span>
                <TrendingUp className="text-yellow-400 mb-1" size={16} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Clientes</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.clients}</span>
                <UserCheck className="text-green-400 mb-1" size={16} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Contactos</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.contacts}</span>
                <Users className="text-blue-400 mb-1" size={16} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white"
            >
              <option value="all">Todas las categorías</option>
              <option value="prospect">Prospectos</option>
              <option value="client">Clientes</option>
              <option value="contact">Contactos</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>

          {/* Customer Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Cliente</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Contacto</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Categoría</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Empresa</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Última Int.</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {loadingCustomers ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                        Cargando...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <User size={48} className="mb-4 opacity-20" />
                          <p className="text-lg font-medium">No se encontraron clientes</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold">
                              {customer.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 dark:text-white">{customer.name}</div>
                              {customer.position && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">{customer.position}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Phone size={12} className="text-slate-400" />
                                <span className="text-xs">{customer.phone}</span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Mail size={12} className="text-slate-400" />
                                <span className="text-xs">{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <CategoryBadge category={customer.category} />
                            <StatusBadge status={customer.status} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {customer.company ? (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <Building size={12} className="text-slate-400" />
                              <span className="text-sm">{customer.company}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-xs">{formatDate(customer.last_interaction)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenDetail(customer)}
                              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-all"
                              title="Ver Detalles"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenCustomerModal(customer)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PIPELINE TAB */}
      {activeTab === 'pipeline' && (
        <PipelineView 
          opportunities={opportunities} 
          loading={loadingOpps}
          refetch={refetchOpportunities}
        />
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <StatsView 
          stats={pipelineStats}
          customers={customers}
          loading={loadingStats}
        />
      )}

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={handleCloseCustomerModal}
          customer={editingCustomer}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmitCustomer}
          loading={createCustomerMutation.isPending || updateCustomerMutation.isPending}
        />
      )}

      {/* Customer Detail Modal */}
      {isDetailModalOpen && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          activeTab={detailTab}
          setActiveTab={setDetailTab}
          onEdit={() => {
            setIsDetailModalOpen(false);
            handleOpenCustomerModal(selectedCustomer);
          }}
          refetchCustomers={refetchCustomers}
        />
      )}
    </div>
  );
};

// Customer Modal Component
const CustomerModal = ({ isOpen, onClose, customer, formData, setFormData, onSubmit, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-teal-50 dark:bg-teal-900/20">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nombre *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Teléfono *</label>
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="contact">Contacto</option>
                <option value="prospect">Prospecto</option>
                <option value="client">Cliente</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Empresa</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Posición</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Fuente</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="WhatsApp, referido, web..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Tags (separados por comas)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="VIP, Frecuente, Importante..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
            ></textarea>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors shadow-lg shadow-teal-200"
            >
              {loading ? 'Guardando...' : (customer ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Customer Detail Modal with Tabs
const CustomerDetailModal = ({ customer, isOpen, onClose, activeTab, setActiveTab, onEdit, refetchCustomers }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                {customer.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{customer.name}</h3>
                <div className="flex gap-2">
                  <CategoryBadge category={customer.category} />
                  <StatusBadge status={customer.status} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                title="Editar"
              >
                <Edit2 size={20} />
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone size={14} className="text-slate-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.company && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Building size={14} className="text-slate-400" />
                <span>{customer.company}</span>
              </div>
            )}
            {customer.position && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase size={14} className="text-slate-400" />
                <span>{customer.position}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'info'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={16} />
              Info
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'notes'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <StickyNote size={16} />
              Notas
            </div>
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'attachments'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Paperclip size={16} />
              Archivos
            </div>
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'opportunities'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target size={16} />
              Oportunidades
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && <InfoTab customer={customer} />}
          {activeTab === 'notes' && <NotesTab customerId={customer.id} />}
          {activeTab === 'attachments' && <AttachmentsTab customerId={customer.id} />}
          {activeTab === 'opportunities' && <OpportunitiesTab customerId={customer.id} customer={customer} />}
        </div>
      </div>
    </div>
  );
};

// Info Tab
const InfoTab = ({ customer }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300">Información de Contacto</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Teléfono</label>
              <p className="text-slate-800 dark:text-white">{customer.phone || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
              <p className="text-slate-800 dark:text-white">{customer.email || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Empresa</label>
              <p className="text-slate-800 dark:text-white">{customer.company || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Posición</label>
              <p className="text-slate-800 dark:text-white">{customer.position || '—'}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300">Detalles Adicionales</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Fuente</label>
              <p className="text-slate-800 dark:text-white">{customer.source || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Tags</label>
              <p className="text-slate-800 dark:text-white">{customer.tags || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Última Interacción</label>
              <p className="text-slate-800 dark:text-white">
                {customer.last_interaction ? new Date(customer.last_interaction).toLocaleString('es-MX') : '—'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Creado</label>
              <p className="text-slate-800 dark:text-white">
                {customer.created_at ? new Date(customer.created_at).toLocaleString('es-MX') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {customer.notes && (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300">Notas Generales</h4>
          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}
    </div>
  );
};

// Notes Tab (placeholder - will be implemented with backend)
const NotesTab = ({ customerId }) => {
  return (
    <div className="text-center py-12">
      <StickyNote size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400 mb-2">Sistema de notas</p>
      <p className="text-sm text-slate-400">Funcionalidad disponible cuando el backend esté implementado</p>
    </div>
  );
};

// Attachments Tab (placeholder)
const AttachmentsTab = ({ customerId }) => {
  return (
    <div className="text-center py-12">
      <Paperclip size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400 mb-2">Archivos adjuntos</p>
      <p className="text-sm text-slate-400">Funcionalidad disponible cuando el backend esté implementado</p>
    </div>
  );
};

// Opportunities Tab (placeholder)
const OpportunitiesTab = ({ customerId, customer }) => {
  return (
    <div className="text-center py-12">
      <Target size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400 mb-2">Oportunidades de venta</p>
      <p className="text-sm text-slate-400">Funcionalidad disponible cuando el backend esté implementado</p>
    </div>
  );
};

// Pipeline View Component
const PipelineView = ({ opportunities, loading, refetch }) => {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  
  const stageLabels = {
    lead: 'Lead',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    won: 'Ganado',
    lost: 'Perdido'
  };

  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage] = opportunities.filter(opp => opp.stage === stage);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Cargando pipeline...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Pipeline de Ventas</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Vista de oportunidades por etapa</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stages.map(stage => (
          <div key={stage} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300">{stageLabels[stage]}</h4>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {opportunitiesByStage[stage]?.length || 0}
              </span>
            </div>
            <div className="space-y-2">
              {opportunitiesByStage[stage]?.length > 0 ? (
                opportunitiesByStage[stage].map(opp => (
                  <div key={opp.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                    <p className="font-medium text-slate-800 dark:text-white mb-1">{opp.title}</p>
                    {opp.value && (
                      <p className="text-slate-600 dark:text-slate-400">${opp.value} {opp.currency}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Sin oportunidades</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Funcionalidad completa de pipeline (arrastrar y soltar, crear oportunidades) disponible cuando el backend esté implementado
        </p>
      </div>
    </div>
  );
};

// Stats View Component
const StatsView = ({ stats, customers, loading }) => {
  if (loading) {
    return <div className="text-center py-12 text-slate-400">Cargando estadísticas...</div>;
  }

  const categoryStats = {
    prospects: customers.filter(c => c.category === 'prospect').length,
    clients: customers.filter(c => c.category === 'client').length,
    contacts: customers.filter(c => c.category === 'contact').length
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Estadísticas del CRM</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Vista general del rendimiento</p>
      </div>

      {/* Customer Stats */}
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Distribución de Clientes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-6 rounded-2xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-yellow-600 dark:text-yellow-400" size={24} />
              <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{categoryStats.prospects}</span>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 font-medium">Prospectos</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="text-green-600 dark:text-green-400" size={24} />
              <span className="text-3xl font-bold text-green-700 dark:text-green-300">{categoryStats.clients}</span>
            </div>
            <p className="text-green-700 dark:text-green-300 font-medium">Clientes</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
              <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">{categoryStats.contacts}</span>
            </div>
            <p className="text-blue-700 dark:text-blue-300 font-medium">Contactos</p>
          </div>
        </div>
      </div>

      {/* Pipeline Stats Placeholder */}
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Pipeline de Ventas</h4>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">Estadísticas de pipeline</p>
            <p className="text-sm text-slate-400">Gráficos y métricas detalladas disponibles cuando el backend esté implementado</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRM;
