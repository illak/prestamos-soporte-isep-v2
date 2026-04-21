import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Package, Clock, AlertTriangle, ArrowRight, RefreshCw
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import { EstadoPrestamoBadge } from '../components/common/Badge';
import { formatearFechaCorta } from '../utils/dateHelpers';

const COLORS = {
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  rojo: '#ef4444',
  azul: '#3b82f6',
  violeta: '#8b5cf6',
  rosa: '#ec4899',
  celeste: '#06b6d4',
  gris: '#6b7280',
};

const TIPOLOGIA_COLORS = [
  COLORS.azul,
  COLORS.verde,
  COLORS.naranja,
  COLORS.violeta,
  COLORS.rosa,
  COLORS.celeste,
  COLORS.amarillo,
  COLORS.rojo,
];

export default function DashboardPage() {
  const [metricas, setMetricas] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [prestamosAntiguos, setPrestamosAntiguos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metRes, grafRes, antRes] = await Promise.all([
        dashboardApi.getMetricas(),
        dashboardApi.getGraficos(),
        dashboardApi.getPrestamosAntiguos(5),
      ]);

      if (metRes.success) setMetricas(metRes.data);
      if (grafRes.success) setGraficos(grafRes.data);
      if (antRes.success) setPrestamosAntiguos(antRes.data);
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Preparar datos para gráfica de items asignados por categoría (actualmente)
  const itemsPorCategoria = graficos?.distribucion_por_categoria || [];
  const pieDataTipo = itemsPorCategoria.map((item, index) => ({
    name: item.categoria,
    value: item.cantidad,
    color: TIPOLOGIA_COLORS[index % TIPOLOGIA_COLORS.length]
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor de préstamos y estadísticas</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* 3 Main metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Préstamos activos hoy */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                {metricas?.prestamos.activos_hoy || 0}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500 font-medium">Préstamos activos hoy</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-800/50 rounded-full">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Pendientes de devolución */}
        <div className={`border rounded-lg p-4 ${
          metricas?.prestamos.pendientes > 0
            ? metricas?.prestamos.desglose.dias_4_plus > 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${
                metricas?.prestamos.pendientes > 0
                  ? metricas?.prestamos.desglose.dias_4_plus > 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-yellow-700 dark:text-yellow-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {metricas?.prestamos.pendientes || 0}
              </p>
              <p className={`text-sm font-medium ${
                metricas?.prestamos.pendientes > 0
                  ? metricas?.prestamos.desglose.dias_4_plus > 0
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-yellow-600 dark:text-yellow-500'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Pendientes de devolución
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              metricas?.prestamos.pendientes > 0
                ? metricas?.prestamos.desglose.dias_4_plus > 0
                  ? 'bg-red-100 dark:bg-red-800/50'
                  : 'bg-yellow-100 dark:bg-yellow-800/50'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                metricas?.prestamos.pendientes > 0
                  ? metricas?.prestamos.desglose.dias_4_plus > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
          </div>
        </div>

        {/* Insumos disponibles */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {metricas?.inventario?.disponibles || 0}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-500 font-medium">Items disponibles</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-full">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 1: Préstamos por día (tipo) y Préstamos por día (área) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cantidad de préstamos por día (por tipo) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Préstamos por día (por categoría)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficos?.prestamos_por_dia_categoria || []}>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(val) => formatearFechaCorta(val).slice(0, 5)}
                  fontSize={11}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  labelFormatter={(val) => formatearFechaCorta(val)}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)'
                  }}
                />
                <Legend />
                {graficos?.categorias_unicas?.map((tipo, index) => (
                  <Bar
                    key={tipo}
                    dataKey={tipo}
                    stackId="a"
                    fill={TIPOLOGIA_COLORS[index % TIPOLOGIA_COLORS.length]}
                    name={tipo}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cantidad de préstamos por día (por área) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Préstamos por día (por área)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graficos?.prestamos_por_dia_area || []}>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(val) => formatearFechaCorta(val).slice(0, 5)}
                  fontSize={11}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  labelFormatter={(val) => formatearFechaCorta(val)}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)'
                  }}
                />
                <Legend />
                {graficos?.areas_unicas?.map((area, index) => (
                  <Line
                    key={area}
                    type="monotone"
                    dataKey={area}
                    stroke={TIPOLOGIA_COLORS[index % TIPOLOGIA_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2: Insumos por tipo (pie) e Insumos más prestados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cantidad de insumos prestados por tipo (actualmente) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Items asignados por categoría</h3>
          {pieDataTipo.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No hay items asignados actualmente
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {pieDataTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="text-center mt-2">
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{metricas?.inventario?.asignados || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total asignados</p>
          </div>
        </div>

        {/* Insumos más prestados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Items más prestados (histórico)</h3>
          {graficos?.items_mas_prestados?.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No hay datos de préstamos
            </div>
          ) : (
            <div className="space-y-3">
              {graficos?.items_mas_prestados?.map((i, idx) => (
                <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center min-w-0">
                    <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-bold mr-3">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {[i.fabricante, i.modelo].filter(Boolean).join(' ') || i.serie || '-'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{i.categoria}</p>
                    </div>
                  </div>
                  <span className="badge bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 ml-2">
                    {i.total_prestamos} préstamos
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row 3: Usuarios con más préstamos y Préstamos más antiguos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuarios con más préstamos activos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Usuarios con más préstamos activos</h3>
          {graficos?.usuarios_pendientes?.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No hay usuarios con préstamos activos
            </div>
          ) : (
            <div className="space-y-3">
              {graficos?.usuarios_pendientes?.map((u, idx) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center min-w-0">
                    <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-full text-sm font-bold mr-3">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{u.nombre_completo}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{u.area || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <span className="badge bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400">
                      {u.prestamos_activos} activo{u.prestamos_activos !== 1 ? 's' : ''}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{u.dias_acumulados} días total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Préstamos más antiguos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Préstamos más antiguos</h3>
            <Link to="/prestamos" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {prestamosAntiguos.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No hay préstamos activos
            </div>
          ) : (
            <div className="space-y-3">
              {prestamosAntiguos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{p.usuario_nombre_completo}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{p.inventario_descripcion || p.insumo_descripcion}</p>
                  </div>
                  <div className="ml-2">
                    <EstadoPrestamoBadge diasTranscurridos={p.dias_transcurridos} animate={p.dias_transcurridos >= 4} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
