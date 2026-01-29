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

export default function InsumosPage() {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    busqueda: '',
    tipologia: '',
    estado: '',
  });
  const [sortBy, setSortBy] = useState('nombre');
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
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, insumo: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await insumosApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        busqueda: filters.busqueda,
        tipologia: filters.tipologia,
        estado: filters.estado,
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

  const handleExport = () => {
    insumosApi.export(filters.estado);
  };

  const columns = [
    {
      key: 'tipologia',
      label: 'Tipología',
      sortable: true,
    },
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-medium">{value}</span>
          {row.numero_serie && (
            <span className="block text-xs text-gray-500">S/N: {row.numero_serie}</span>
          )}
        </div>
      ),
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value) => (
        <span className="text-gray-600 truncate max-w-xs block" title={value}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <EstadoInsumoBadge estado={value} />
          {row.prestamo_activo && (
            <div className="text-xs">
              <EstadoPrestamoBadge diasTranscurridos={row.prestamo_activo.dias_transcurridos} />
              <p className="text-gray-500 mt-1">
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
          {row.estado === 'Disponible' && (
            <button
              onClick={() => setPrestarInsumo(row)}
              className="btn btn-primary text-xs py-1 px-2"
              title="Prestar este insumo"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Prestar
            </button>
          )}
          {row.estado === 'En préstamo' && (
            <button
              onClick={() => setDevolverInsumo(row)}
              className="btn btn-warning text-xs py-1 px-2"
              title="Registrar devolución"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
              Devolver
            </button>
          )}
          <button
            onClick={() => setHistorialInsumo(row)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Ver historial"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
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
        <h1 className="text-2xl font-bold text-gray-900">Insumos</h1>
        <p className="text-gray-600 mt-1">Gestión de equipos e insumos informáticos</p>
      </div>

      {/* Actions bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <SearchInput
              value={filters.busqueda}
              onChange={handleSearch}
              placeholder="Buscar por nombre, descripción o N° serie..."
              className="sm:w-80"
            />
            <select
              value={filters.tipologia}
              onChange={(e) => handleFilterChange('tipologia', e.target.value)}
              className="input sm:w-40"
            >
              <option value="">Todas las tipologías</option>
              {tipologias.map((tip) => (
                <option key={tip} value={tip}>{tip}</option>
              ))}
            </select>
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="input sm:w-44"
            >
              <option value="">Todos los estados</option>
              {estados.map((est) => (
                <option key={est} value={est}>{est}</option>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {estados.map((estado) => {
          const count = insumos.filter(i => i.estado === estado).length;
          const colors = {
            'Disponible': 'bg-green-50 text-green-700 border-green-200',
            'En préstamo': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'En mantenimiento': 'bg-orange-50 text-orange-700 border-orange-200',
            'Dado de baja': 'bg-red-50 text-red-700 border-red-200',
          };
          return (
            <div
              key={estado}
              className={`border rounded-lg p-3 ${colors[estado] || 'bg-gray-50'} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleFilterChange('estado', filters.estado === estado ? '' : estado)}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm">{estado}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
        message={`¿Está seguro que desea eliminar "${deleteConfirm.insumo?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
