import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Users, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { ubicacionesApi } from '../services/api';
import Modal from '../components/common/Modal';

// Reutilizamos ubicacionesApi como base pero apuntamos a /areas
const areasApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== ''))).toString();
    return fetch(`/api/areas${qs ? `?${qs}` : ''}`).then(r => r.json());
  },
  create: (data) => fetch('/api/areas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id, data) => fetch(`/api/areas/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
  delete: (id) => fetch(`/api/areas/${id}`, { method: 'DELETE' }).then(r => r.json()),
};

function AreaForm({ isOpen, onClose, onSuccess, area }) {
  const isEditing = !!area;
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) { setDesc(area?.desc || ''); setError(null); }
  }, [isOpen, area]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!desc.trim()) { setError('El nombre del área es requerido'); return; }
    setLoading(true); setError(null);
    try {
      const r = isEditing ? await areasApi.update(area.id, { desc: desc.trim() }) : await areasApi.create({ desc: desc.trim() });
      if (!r.success) throw new Error(r.error || 'Error');
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Área' : 'Nueva Área'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3"><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
        <div>
          <label className="label">Nombre del Área *</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="input"
            placeholder="Ej: Administración, Pedagógico, Dirección..."
            required
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

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [formModal, setFormModal] = useState({ isOpen: false, area: null });
  const [deletingId, setDeletingId] = useState(null);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await areasApi.getAll({ activo: '1' });
      if (r.success) setAreas(r.data);
    } catch { toast.error('Error al cargar áreas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const handleDelete = async (area) => {
    if (!window.confirm(`¿Eliminar el área "${area.desc}"?`)) return;
    setDeletingId(area.id);
    try {
      const r = await areasApi.delete(area.id);
      if (!r.success) throw new Error(r.error);
      toast.success('Área eliminada');
      fetchAreas();
    } catch (err) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  const filtered = areas.filter(a => !busqueda || a.desc.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Áreas</h1>
          <p className="text-gray-500 dark:text-gray-400">Sectores y equipos de la institución</p>
        </div>
        <button onClick={() => setFormModal({ isOpen: true, area: null })} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />Nueva Área
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Áreas</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{areas.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Users className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total usuarios</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{areas.reduce((s, a) => s + (a.cantidad_usuarios || 0), 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar área..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input pl-10 w-full" />
        </div>
        <button onClick={fetchAreas} className="btn btn-outline p-2" title="Actualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Área</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuarios</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="3" className="px-6 py-12 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="3" className="px-6 py-12 text-center">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{busqueda ? 'No se encontraron áreas' : 'No hay áreas registradas'}</p>
              </td></tr>
            ) : filtered.map((area) => (
              <tr key={area.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                    <span className="font-medium text-gray-900 dark:text-white">{area.desc}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {area.cantidad_usuarios || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setFormModal({ isOpen: true, area })} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {(area.cantidad_usuarios || 0) === 0 && (
                      <button onClick={() => handleDelete(area)} disabled={deletingId === area.id} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AreaForm
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, area: null })}
        onSuccess={() => { setFormModal({ isOpen: false, area: null }); fetchAreas(); }}
        area={formModal.area}
      />
    </div>
  );
}
