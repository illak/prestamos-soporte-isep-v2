import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Plus, Upload, Download, RefreshCw, History, ArrowUpRight, ArrowDownLeft, Edit } from 'lucide-react';
import { insumosApi } from '../services/api';
import Table, { Pagination } from '../components/common/Table';
import SearchInput from '../components/common/SearchInput';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { EstadoInsumoBadge, EstadoPrestamoBadge } from '../components/common/Badge';
import InsumoForm from '../components/insumos/InsumoForm';
import InsumoImport from '../components/insumos/InsumoImport';
import PrestarModal from '../components/insumos/PrestarModal';
import DevolverModal from '../components/insumos/DevolverModal';
import HistorialModal from '../components/insumos/HistorialModal';
import AsignarModal from '../components/insumos/AsignarModal';

export default function InsumosPage() {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    busqueda: '',
    id_categoria: '',
    id_estado: '',
  });
  const [sortBy, setSortBy] = useState('fecha_creacion');
  const [sortOrder, setSortOrder] = useState('asc');
  const [tipologias, setTipologias] = useState([]);
  const [estados, setEstados] = useState([]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [prestarInsumo, setPrestarInsumo] = useState(null);
  const [devolverInsumo, setDevolverInsumo] = useState(null);
  const [historialInsumo, setHistorialInsumo] = useState(null);
  const [asignarInsumo, setAsignarInsumo] = useState(null);
  const [liberandoId, setLiberandoId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, insumo: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await insumosApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        busqueda: filters.busqueda,
        id_categoria: filters.id_categoria || undefined,
        id_estado: filters.id_estado || undefined,
        orderBy: sortBy,
        order: sortOrder,
      });
      if (response.success) {
        setInsumos(response.data);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      toast.error('Error al cargar insumos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, sortBy, sortOrder]);

  const fetchOptions = async () => {
    try {
      const [tipRes, estRes] = await Promise.all([
        insumosApi.getTipologias(),
        insumosApi.getEstados(),
      ]);
      if (tipRes.success) setTipologias(tipRes.data);
      if (estRes.success) setEstados(estRes.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, [fetchInsumos]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, busqueda: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (key, order) => {
    setSortBy(key);
    setSortOrder(order);
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleEdit = (insumo) => {
    setEditingInsumo(insumo);
    setShowForm(true);
  };

  const handleDelete = (insumo) => {
    setDeleteConfirm({ show: true, insumo });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.insumo) return;
    setDeleteLoading(true);
    try {
      await insumosApi.delete(deleteConfirm.insumo.id);
      toast.success('Insumo eliminado correctamente');
      setDeleteConfirm({ show: false, insumo: null });
      fetchInsumos();
    } catch (error) {
      if (error.message.includes('préstamos asociados')) {
        toast.error(error.message);
      } else {
        toast.error('Error al eliminar insumo: ' + error.message);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingInsumo(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchInsumos();
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    fetchInsumos();
  };

  const handlePrestarSuccess = () => {
    setPrestarInsumo(null);
    fetchInsumos();
  };

  const handleDevolverSuccess = () => {
    setDevolverInsumo(null);
    fetchInsumos();
  };

  const handleAsignarSuccess = () => {
    setAsignarInsumo(null);
    fetchInsumos();
  };

  const handleLiberar = async (insumo) => {
    if (!window.confirm(`¿Liberar la asignación de "${[insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || insumo.serie}"?`)) return;
    setLiberandoId(insumo.id);
    try {
      const result = await insumosApi.liberar(insumo.id, { fecha_devolucion_real: new Date().toISOString() });
      toast.success(result.message || 'Asignación liberada');
      fetchInsumos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLiberandoId(null);
    }
  };

  const handleExport = () => {
    insumosApi.export(filters.estado);
  };

  const columns = [
    {
      key: 'categoria_desc',
      label: 'Categoría',
      sortable: true,
      render: (value) => <span className="text-gray-900 dark:text-gray-100">{value}</span>,
    },
    {
      key: 'modelo',
      label: 'Equipo',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {[row.fabricante, value].filter(Boolean).join(' ') || '-'}
          </span>
          {row.serie && (
            <span className="block text-xs text-gray-500 dark:text-gray-400">S/N: {row.serie}</span>
          )}
          {row.lbl_activo && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">{row.lbl_activo}</span>
          )}
          {row.ubicacion_desc && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">
              📍 {row.ubicacion_piso ? `${row.ubicacion_piso} — ` : ''}{row.ubicacion_desc}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'condicion',
      label: 'Condición',
      render: (value) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${value === 'Asignable' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'estado_desc',
      label: 'Estado',
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <EstadoInsumoBadge estado={value} />
          {row.prestamo_activo && (
            <div className="text-xs">
              <EstadoPrestamoBadge diasTranscurridos={row.prestamo_activo.dias_transcurridos} />
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {row.prestamo_activo.usuario_nombre}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {/* Entregables */}
          {row.estado_desc === 'Disponible' && row.condicion === 'Entregable' && (
            <button
              onClick={() => setPrestarInsumo(row)}
              className="btn btn-primary text-xs py-1 px-2"
              title="Prestar este item"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Prestar
            </button>
          )}
          {row.estado_desc === 'Asignado' && row.condicion === 'Entregable' && (
            <button
              onClick={() => setDevolverInsumo(row)}
              className="btn btn-warning text-xs py-1 px-2"
              title="Registrar devolución"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
              Devolver
            </button>
          )}
          {/* Asignables */}
          {row.estado_desc === 'Disponible' && row.condicion === 'Asignable' && (
            <button
              onClick={() => setAsignarInsumo(row)}
              className="btn btn-primary text-xs py-1 px-2 bg-purple-600 hover:bg-purple-700 border-purple-600"
              title="Asignar a un usuario"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Asignar
            </button>
          )}
          {row.estado_desc === 'Asignado' && row.condicion === 'Asignable' && (
            <div className="space-y-1">
              {row.asignado_nombre && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {row.asignado_nombre} {row.asignado_apellido}
                </p>
              )}
              <button
                onClick={() => handleLiberar(row)}
                disabled={liberandoId === row.id}
                className="btn btn-warning text-xs py-1 px-2"
                title="Liberar asignación"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                {liberandoId === row.id ? 'Liberando...' : 'Liberar'}
              </button>
            </div>
          )}
          <button
            onClick={() => setHistorialInsumo(row)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Ver historial"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insumos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de equipos e insumos informáticos</p>
      </div>

      {/* Actions bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <SearchInput
              value={filters.busqueda}
              onChange={handleSearch}
              placeholder="Buscar por nombre, descripción o N° serie..."
              className="sm:w-80"
            />
            <select
              value={filters.id_categoria}
              onChange={(e) => handleFilterChange('id_categoria', e.target.value)}
              className="input sm:w-40"
            >
              <option value="">Todas las categorías</option>
              {tipologias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.desc}</option>
              ))}
            </select>
            <select
              value={filters.id_estado}
              onChange={(e) => handleFilterChange('id_estado', e.target.value)}
              className="input sm:w-44"
            >
              <option value="">Todos los estados</option>
              {estados.map((est) => (
                <option key={est.id} value={est.id}>{est.desc}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchInsumos()}
              className="btn btn-outline"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="btn btn-outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </button>
            <button
              onClick={handleExport}
              className="btn btn-outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Insumo
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {estados.map((estado) => {
          const count = insumos.filter(i => i.estado_desc === estado.desc).length;
          const colors = {
            'Disponible':    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            'Asignado':      'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
            'En reparación': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
            'Dañado':        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
            'Extraviado':    'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          };
          const isActive = filters.id_estado === String(estado.id);
          return (
            <div
              key={estado.id}
              className={`border rounded-lg p-3 ${colors[estado.desc] || 'bg-gray-50 dark:bg-gray-800'} cursor-pointer hover:shadow-md transition-shadow ${isActive ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleFilterChange('id_estado', isActive ? '' : String(estado.id))}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm">{estado.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <Table
          columns={columns}
          data={insumos}
          loading={loading}
          emptyMessage="No se encontraron insumos"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <InsumoForm
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          insumo={editingInsumo}
          tipologias={tipologias}
          estados={estados}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <InsumoImport
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Prestar Modal */}
      {prestarInsumo && (
        <PrestarModal
          isOpen={!!prestarInsumo}
          onClose={() => setPrestarInsumo(null)}
          onSuccess={handlePrestarSuccess}
          insumo={prestarInsumo}
        />
      )}

      {/* Devolver Modal */}
      {devolverInsumo && (
        <DevolverModal
          isOpen={!!devolverInsumo}
          onClose={() => setDevolverInsumo(null)}
          onSuccess={handleDevolverSuccess}
          insumo={devolverInsumo}
        />
      )}

      {/* Asignar Modal */}
      {asignarInsumo && (
        <AsignarModal
          isOpen={!!asignarInsumo}
          onClose={() => setAsignarInsumo(null)}
          onSuccess={handleAsignarSuccess}
          insumo={asignarInsumo}
        />
      )}

      {/* Historial Modal */}
      {historialInsumo && (
        <HistorialModal
          isOpen={!!historialInsumo}
          onClose={() => setHistorialInsumo(null)}
          insumo={historialInsumo}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, insumo: null })}
        onConfirm={confirmDelete}
        title="Eliminar Insumo"
        message={`¿Está seguro que desea eliminar "${[deleteConfirm.insumo?.fabricante, deleteConfirm.insumo?.modelo].filter(Boolean).join(' ') || deleteConfirm.insumo?.serie || 'este item'}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
