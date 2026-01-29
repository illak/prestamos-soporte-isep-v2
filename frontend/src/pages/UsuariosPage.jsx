import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Plus, Upload, Download, RefreshCw } from 'lucide-react';
import { usuariosApi } from '../services/api';
import Table, { Pagination } from '../components/common/Table';
import SearchInput from '../components/common/SearchInput';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { RolBadge } from '../components/common/Badge';
import UsuarioForm from '../components/usuarios/UsuarioForm';
import UsuarioImport from '../components/usuarios/UsuarioImport';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    busqueda: '',
    activo: '1',
    area: '',
    rol: 'todos',
  });
  const [sortBy, setSortBy] = useState('apellido');
  const [sortOrder, setSortOrder] = useState('asc');
  const [areas, setAreas] = useState([]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, usuario: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usuariosApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        busqueda: filters.busqueda,
        activo: filters.activo,
        area: filters.area,
        rol: filters.rol,
        orderBy: sortBy,
        order: sortOrder,
      });
      if (response.success) {
        setUsuarios(response.data);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      toast.error('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, sortBy, sortOrder]);

  const fetchAreas = async () => {
    try {
      const response = await usuariosApi.getAreas();
      if (response.success) {
        setAreas(response.data);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    fetchAreas();
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

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setShowForm(true);
  };

  const handleDelete = (usuario) => {
    setDeleteConfirm({ show: true, usuario });
  };

  const handleRestore = async (usuario) => {
    try {
      await usuariosApi.restore(usuario.id);
      toast.success('Usuario restaurado correctamente');
      fetchUsuarios();
    } catch (error) {
      toast.error('Error al restaurar usuario: ' + error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.usuario) return;
    setDeleteLoading(true);
    try {
      await usuariosApi.delete(deleteConfirm.usuario.id);
      toast.success('Usuario desactivado correctamente');
      setDeleteConfirm({ show: false, usuario: null });
      fetchUsuarios();
    } catch (error) {
      toast.error('Error al desactivar usuario: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUsuario(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchUsuarios();
    fetchAreas();
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    fetchUsuarios();
    fetchAreas();
  };

  const handleExport = () => {
    usuariosApi.export(filters.activo !== '1');
  };

  const columns = [
    {
      key: 'apellido',
      label: 'Apellido',
      sortable: true,
      render: (value) => <span className="text-gray-900 dark:text-gray-100">{value}</span>,
    },
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      render: (value) => <span className="text-gray-900 dark:text-gray-100">{value}</span>,
    },
    {
      key: 'dni',
      label: 'DNI',
      sortable: true,
      render: (value) => <span className="text-gray-900 dark:text-gray-100">{value}</span>,
    },
    {
      key: 'mail',
      label: 'Email',
      render: (value) => (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs block"
          title={value}
        >
          {value}
        </a>
      ),
    },
    {
      key: 'area_equipo',
      label: 'Área',
      sortable: true,
      render: (value) => <span className="text-gray-900 dark:text-gray-100">{value}</span>,
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (value) => <RolBadge rol={value} />,
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (value) => (
        <span className={`badge ${value ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
          >
            Editar
          </button>
          {row.activo ? (
            <button
              onClick={() => handleDelete(row)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
            >
              Desactivar
            </button>
          ) : (
            <button
              onClick={() => handleRestore(row)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium"
            >
              Restaurar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de usuarios del instituto</p>
      </div>

      {/* Actions bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 space-y-4">
        {/* Primera fila: Buscador y botones de acción */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <SearchInput
            value={filters.busqueda}
            onChange={handleSearch}
            placeholder="Buscar por nombre, apellido, DNI..."
            className="w-full sm:max-w-md"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => fetchUsuarios()}
              className="btn btn-outline"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="btn btn-outline"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={handleExport}
              className="btn btn-outline"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Segunda fila: Filtros */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.activo}
            onChange={(e) => handleFilterChange('activo', e.target.value)}
            className="input w-auto"
          >
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
          <select
            value={filters.area}
            onChange={(e) => handleFilterChange('area', e.target.value)}
            className="input w-auto min-w-[160px]"
          >
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <select
            value={filters.rol}
            onChange={(e) => handleFilterChange('rol', e.target.value)}
            className="input w-auto"
          >
            <option value="todos">Todos los roles</option>
            <option value="usuario">Usuario</option>
            <option value="soporte_it">Soporte IT</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <Table
          columns={columns}
          data={usuarios}
          loading={loading}
          emptyMessage="No se encontraron usuarios"
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
        <UsuarioForm
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          usuario={editingUsuario}
          areas={areas}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <UsuarioImport
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, usuario: null })}
        onConfirm={confirmDelete}
        title="Desactivar Usuario"
        message={`¿Está seguro que desea desactivar a ${deleteConfirm.usuario?.nombre} ${deleteConfirm.usuario?.apellido}? El usuario no podrá recibir nuevos préstamos.`}
        confirmText="Desactivar"
        type="warning"
        loading={deleteLoading}
      />
    </div>
  );
}
