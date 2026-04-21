import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, MapPin, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { ubicacionesApi } from '../services/api';
import Modal from '../components/common/Modal';

function UbicacionForm({ isOpen, onClose, onSuccess, ubicacion }) {
  const isEditing = !!ubicacion;
  const [formData, setFormData] = useState({ desc: '', piso: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ desc: ubicacion?.desc || '', piso: ubicacion?.piso || '' });
      setError(null);
    }
  }, [isOpen, ubicacion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.desc.trim()) { setError('La descripción es requerida'); return; }
    setLoading(true);
    setError(null);
    try {
      if (isEditing) {
        await ubicacionesApi.update(ubicacion.id, { desc: formData.desc.trim(), piso: formData.piso.trim() || null });
      } else {
        await ubicacionesApi.create({ desc: formData.desc.trim(), piso: formData.piso.trim() || null });
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Ubicación' : 'Nueva Ubicación'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        <div>
          <label className="label">Descripción *</label>
          <input
            type="text"
            value={formData.desc}
            onChange={(e) => setFormData(p => ({ ...p, desc: e.target.value }))}
            className="input"
            placeholder="Ej: Sala de Reuniones A, Depósito Central..."
            required
          />
        </div>
        <div>
          <label className="label">Piso / Planta (opcional)</label>
          <input
            type="text"
            value={formData.piso}
            onChange={(e) => setFormData(p => ({ ...p, piso: e.target.value }))}
            className="input"
            placeholder="Ej: PB, 1° Piso, 2° Piso..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function UbicacionesPage() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showInactivas, setShowInactivas] = useState(false);
  const [formModal, setFormModal] = useState({ isOpen: false, ubicacion: null });
  const [deletingId, setDeletingId] = useState(null);

  const fetchUbicaciones = useCallback(async () => {
    setLoading(true);
    try {
      const activo = showInactivas ? '0' : '1';
      const r = await ubicacionesApi.getAll({ activo });
      if (r.success) setUbicaciones(r.data);
    } catch (err) {
      toast.error('Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  }, [showInactivas]);

  useEffect(() => { fetchUbicaciones(); }, [fetchUbicaciones]);

  const handleDelete = async (ub) => {
    if (!window.confirm(`¿Eliminar "${ub.desc}"?`)) return;
    setDeletingId(ub.id);
    try {
      await ubicacionesApi.delete(ub.id);
      toast.success('Ubicación eliminada');
      fetchUbicaciones();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = ubicaciones.filter(u =>
    !busqueda ||
    u.desc.toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.piso || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ubicaciones</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestión de pisos y locaciones del inventario</p>
        </div>
        <button onClick={() => setFormModal({ isOpen: true, ubicacion: null })} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Ubicación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ubicaciones</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{ubicaciones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Items asignados</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {ubicaciones.reduce((s, u) => s + (u.cantidad_items || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o piso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showInactivas}
                onChange={(e) => setShowInactivas(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${showInactivas ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-4 h-4 mt-1 ml-1 bg-white rounded-full transition-transform ${showInactivas ? 'translate-x-4' : ''}`} />
              </div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Ver inactivas</span>
            </label>
            <button onClick={fetchUbicaciones} className="btn btn-outline p-2" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Piso / Planta</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center">
                <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  {busqueda ? 'No se encontraron ubicaciones' : 'No hay ubicaciones registradas'}
                </p>
              </td></tr>
            ) : (
              filtered.map((ub) => (
                <tr key={ub.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!ub.activo ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{ub.desc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ub.piso || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {ub.cantidad_items || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ub.activo ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}>
                      {ub.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setFormModal({ isOpen: true, ubicacion: ub })}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {(ub.cantidad_items || 0) === 0 && (
                        <button
                          onClick={() => handleDelete(ub)}
                          disabled={deletingId === ub.id}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
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

      <UbicacionForm
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, ubicacion: null })}
        onSuccess={() => { setFormModal({ isOpen: false, ubicacion: null }); fetchUbicaciones(); }}
        ubicacion={formModal.ubicacion}
      />
    </div>
  );
}
