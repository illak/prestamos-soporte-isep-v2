import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Package,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw
} from 'lucide-react';
import { tipologiasApi } from '../services/api';
import TipologiaForm from '../components/tipologias/TipologiaForm';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function TipologiasPage() {
  const [tipologias, setTipologias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal states
  const [formModal, setFormModal] = useState({ isOpen: false, tipologia: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, tipologia: null, loading: false });
  const [toggleModal, setToggleModal] = useState({ isOpen: false, tipologia: null, loading: false });

  const fetchTipologias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (busqueda) params.busqueda = busqueda;
      if (showInactivos) params.activo = '0';
      const response = await tipologiasApi.getAll(params);
      if (response.success) {
        setTipologias(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [busqueda, showInactivos]);

  useEffect(() => {
    fetchTipologias();
  }, [fetchTipologias]);

  const handleSearch = (e) => {
    setBusqueda(e.target.value);
  };

  const handleCreate = () => {
    setFormModal({ isOpen: true, tipologia: null });
  };

  const handleEdit = (tipologia) => {
    setFormModal({ isOpen: true, tipologia });
  };

  const handleFormClose = () => {
    setFormModal({ isOpen: false, tipologia: null });
  };

  const handleFormSuccess = () => {
    setFormModal({ isOpen: false, tipologia: null });
    fetchTipologias();
  };

  const handleDeleteClick = (tipologia) => {
    setDeleteModal({ isOpen: true, tipologia, loading: false });
  };

  const handleDeleteConfirm = async () => {
    const { tipologia } = deleteModal;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await tipologiasApi.delete(tipologia.id);
      setDeleteModal({ isOpen: false, tipologia: null, loading: false });
      fetchTipologias();
    } catch (err) {
      alert(err.message);
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleToggleClick = (tipologia) => {
    setToggleModal({ isOpen: true, tipologia, loading: false });
  };

  const handleToggleConfirm = async () => {
    const { tipologia } = toggleModal;
    setToggleModal(prev => ({ ...prev, loading: true }));
    try {
      await tipologiasApi.toggle(tipologia.id);
      setToggleModal({ isOpen: false, tipologia: null, loading: false });
      fetchTipologias();
    } catch (err) {
      alert(err.message);
      setToggleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Stats
  const totalTipologias = tipologias.length;
  const totalInsumos = tipologias.reduce((sum, t) => sum + (t.cantidad_insumos || 0), 0);
  const totalDisponibles = tipologias.reduce((sum, t) => sum + (t.cantidad_disponibles || 0), 0);
  const totalPrestados = tipologias.reduce((sum, t) => sum + (t.cantidad_prestados || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tipologias</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestiona los tipos de equipamiento</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tipologia
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tipologias</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalTipologias}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Insumos</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalInsumos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponibles</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalDisponibles}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">En Prestamo</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalPrestados}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tipologia..."
              value={busqueda}
              onChange={handleSearch}
              className="input pl-10 w-full"
            />
          </div>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showInactivos}
                onChange={(e) => setShowInactivos(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${showInactivos ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-4 h-4 mt-1 ml-1 bg-white rounded-full transition-transform ${showInactivos ? 'translate-x-4' : ''}`} />
              </div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Ver inactivos</span>
            </label>
            <button onClick={fetchTipologias} className="btn btn-outline p-2" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Descripcion
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Insumos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Disponibles
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  En Prestamo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
                  </td>
                </tr>
              ) : tipologias.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {busqueda ? 'No se encontraron tipologias' : 'No hay tipologias registradas'}
                    </p>
                  </td>
                </tr>
              ) : (
                tipologias.map((tipologia) => (
                  <tr key={tipologia.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!tipologia.activo ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                          <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{tipologia.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                      {tipologia.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {tipologia.cantidad_insumos || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {tipologia.cantidad_disponibles || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        {tipologia.cantidad_prestados || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tipologia.activo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(tipologia)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleClick(tipologia)}
                          className={`p-2 rounded-lg transition-colors ${
                            tipologia.activo
                              ? 'text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                              : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                          title={tipologia.activo ? 'Desactivar' : 'Activar'}
                        >
                          {tipologia.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        {tipologia.cantidad_insumos === 0 && (
                          <button
                            onClick={() => handleDeleteClick(tipologia)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <TipologiaForm
        isOpen={formModal.isOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        tipologia={formModal.tipologia}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, tipologia: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Tipologia"
        message={`¿Estas seguro de eliminar la tipologia "${deleteModal.tipologia?.nombre}"? Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleteModal.loading}
      />

      {/* Toggle Confirmation */}
      <ConfirmDialog
        isOpen={toggleModal.isOpen}
        onClose={() => setToggleModal({ isOpen: false, tipologia: null, loading: false })}
        onConfirm={handleToggleConfirm}
        title={toggleModal.tipologia?.activo ? 'Desactivar Tipologia' : 'Activar Tipologia'}
        message={
          toggleModal.tipologia?.activo
            ? `¿Estas seguro de desactivar la tipologia "${toggleModal.tipologia?.nombre}"? No aparecera en los selectores de nuevos insumos.`
            : `¿Estas seguro de activar la tipologia "${toggleModal.tipologia?.nombre}"?`
        }
        confirmText={toggleModal.tipologia?.activo ? 'Desactivar' : 'Activar'}
        type="warning"
        loading={toggleModal.loading}
      />
    </div>
  );
}
