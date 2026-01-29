import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Plus, Download, RefreshCw, ArrowDownLeft, Eye, Edit, Filter } from 'lucide-react';
import { prestamosApi, insumosApi, usuariosApi } from '../services/api';
import Table, { Pagination } from '../components/common/Table';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import { EstadoPrestamoBadge } from '../components/common/Badge';
import { formatearFechaArg } from '../utils/dateHelpers';
import PrestamoForm from '../components/prestamos/PrestamoForm';
import DevolverPrestamoModal from '../components/prestamos/DevolverPrestamoModal';
import PrestamoDetail from '../components/prestamos/PrestamoDetail';

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    estado: 'todos',
    usuario_id: '',
    tipologia: '',
    usuario_it_id: '',
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [tipologias, setTipologias] = useState([]);
  const [usuariosIt, setUsuariosIt] = useState([]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [devolverPrestamo, setDevolverPrestamo] = useState(null);
  const [viewPrestamo, setViewPrestamo] = useState(null);
  const [editPrestamo, setEditPrestamo] = useState(null);

  const fetchPrestamos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        estado: filters.estado,
      };

      if (filters.usuario_id) params.usuario_id = filters.usuario_id;
      if (filters.tipologia) params.tipologia = filters.tipologia;
      if (filters.usuario_it_id) params.usuario_it_id = filters.usuario_it_id;
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;

      const response = await prestamosApi.getAll(params);
      if (response.success) {
        setPrestamos(response.data);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      toast.error('Error al cargar préstamos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchOptions = async () => {
    try {
      const [tipRes, itRes] = await Promise.all([
        insumosApi.getTipologias(),
        usuariosApi.getSoporteIt(),
      ]);
      if (tipRes.success) setTipologias(tipRes.data);
      if (itRes.success) setUsuariosIt(itRes.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  useEffect(() => {
    fetchPrestamos();
  }, [fetchPrestamos]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditPrestamo(null);
    fetchPrestamos();
  };

  const handleDevolverSuccess = () => {
    setDevolverPrestamo(null);
    fetchPrestamos();
  };

  const handleExport = () => {
    const params = {};
    if (filters.estado !== 'todos') params.estado = filters.estado;
    if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
    if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
    prestamosApi.export(params);
  };

  const clearFilters = () => {
    setFilters({
      estado: 'todos',
      usuario_id: '',
      tipologia: '',
      usuario_it_id: '',
      fecha_desde: '',
      fecha_hasta: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span className="text-gray-500">#{value}</span>,
    },
    {
      key: 'usuario_nombre_completo',
      label: 'Usuario',
      render: (value, row) => (
        <div>
          <span className="font-medium">{value}</span>
          <span className="block text-xs text-gray-500">{row.usuario_area}</span>
        </div>
      ),
    },
    {
      key: 'insumo_descripcion',
      label: 'Insumo',
      render: (value, row) => (
        <div>
          <span>{value}</span>
          {row.insumo_numero_serie && (
            <span className="block text-xs text-gray-500">S/N: {row.insumo_numero_serie}</span>
          )}
        </div>
      ),
    },
    {
      key: 'fecha_hora_prestamo',
      label: 'Fecha Préstamo',
      render: (value) => formatearFechaArg(value),
    },
    {
      key: 'dias_transcurridos',
      label: 'Días',
      render: (value, row) => (
        row.estado === 'Activo' ? (
          <EstadoPrestamoBadge diasTranscurridos={value} animate={value >= 4} />
        ) : (
          <span className="text-gray-500">{row.duracion_dias} día(s)</span>
        )
      ),
    },
    {
      key: 'it_nombre_completo',
      label: 'Responsable IT',
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value) => (
        <span className={`badge ${value === 'Activo' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.estado === 'Activo' && (
            <button
              onClick={() => setDevolverPrestamo(row)}
              className="btn btn-warning text-xs py-1 px-2"
              title="Registrar devolución"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
              Devolver
            </button>
          )}
          <button
            onClick={() => setViewPrestamo(row)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Ver detalle"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.estado === 'Activo' && (
            <button
              onClick={() => setEditPrestamo(row)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Count active loans by days
  const prestamosActivos = prestamos.filter(p => p.estado === 'Activo');
  const countByDays = {
    hoy: prestamosActivos.filter(p => p.dias_transcurridos === 0).length,
    dia1: prestamosActivos.filter(p => p.dias_transcurridos === 1).length,
    dias2_3: prestamosActivos.filter(p => p.dias_transcurridos >= 2 && p.dias_transcurridos <= 3).length,
    dias4_plus: prestamosActivos.filter(p => p.dias_transcurridos >= 4).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
        <p className="text-gray-600 mt-1">Gestión de préstamos de equipos</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-green-700">{countByDays.hoy}</p>
          <p className="text-sm text-green-600">Activos hoy</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-700">{countByDays.dia1}</p>
          <p className="text-sm text-yellow-600">1 día sin devolver</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-orange-700">{countByDays.dias2_3}</p>
          <p className="text-sm text-orange-600">2-3 días sin devolver</p>
        </div>
        <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${countByDays.dias4_plus > 0 ? 'animate-pulse-alert' : ''}`}>
          <p className="text-2xl font-bold text-red-700">{countByDays.dias4_plus}</p>
          <p className="text-sm text-red-600">4+ días sin devolver</p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="input sm:w-40"
            >
              <option value="todos">Todos los estados</option>
              <option value="Activo">Activos</option>
              <option value="Devuelto">Devueltos</option>
            </select>
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Más filtros
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPrestamos()}
              className="btn btn-outline"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
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
              Nuevo Préstamo
            </button>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Responsable IT</label>
              <select
                value={filters.usuario_it_id}
                onChange={(e) => handleFilterChange('usuario_it_id', e.target.value)}
                className="input"
              >
                <option value="">Todos</option>
                {usuariosIt.map((u) => (
                  <option key={u.id} value={u.id}>{u.apellido}, {u.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha desde</label>
              <input
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fecha hasta</label>
              <input
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn btn-outline w-full"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Table
          columns={columns}
          data={prestamos}
          loading={loading}
          emptyMessage="No se encontraron préstamos"
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editPrestamo) && (
        <PrestamoForm
          isOpen={showForm || !!editPrestamo}
          onClose={() => {
            setShowForm(false);
            setEditPrestamo(null);
          }}
          onSuccess={handleFormSuccess}
          prestamo={editPrestamo}
        />
      )}

      {/* Devolver Modal */}
      {devolverPrestamo && (
        <DevolverPrestamoModal
          isOpen={!!devolverPrestamo}
          onClose={() => setDevolverPrestamo(null)}
          onSuccess={handleDevolverSuccess}
          prestamo={devolverPrestamo}
        />
      )}

      {/* View Detail Modal */}
      {viewPrestamo && (
        <PrestamoDetail
          isOpen={!!viewPrestamo}
          onClose={() => setViewPrestamo(null)}
          prestamo={viewPrestamo}
        />
      )}
    </div>
  );
}
