import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Package, Users, Clock, AlertTriangle, TrendingUp, ArrowRight, RefreshCw
} from 'lucide-react';
import { dashboardApi, prestamosApi } from '../services/api';
import { EstadoPrestamoBadge } from '../components/common/Badge';
import { formatearFechaArg, formatearFechaCorta } from '../utils/dateHelpers';

const COLORS = {
  disponible: '#22c55e',
  enPrestamo: '#eab308',
  enMantenimiento: '#f97316',
  dadoDeBaja: '#ef4444',
  verde: '#22c55e',
  amarillo: '#eab308',
  naranja: '#f97316',
  rojo: '#ef4444',
  azul: '#3b82f6',
  gris: '#6b7280',
};

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
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pieData = graficos?.distribucion_insumos.map(item => ({
    name: item.estado,
    value: item.cantidad,
    color: item.estado === 'Disponible' ? COLORS.disponible :
           item.estado === 'En préstamo' ? COLORS.enPrestamo :
           item.estado === 'En mantenimiento' ? COLORS.enMantenimiento :
           COLORS.dadoDeBaja
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor de préstamos y estadísticas</p>
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

      {/* Main metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-700">
                {metricas?.prestamos.activos_hoy || 0}
              </p>
              <p className="text-sm text-green-600 font-medium">Préstamos activos hoy</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          metricas?.prestamos.pendientes > 0
            ? metricas?.prestamos.desglose.dias_4_plus > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${
                metricas?.prestamos.desglose.dias_4_plus > 0 ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {metricas?.prestamos.pendientes || 0}
              </p>
              <p className={`text-sm font-medium ${
                metricas?.prestamos.desglose.dias_4_plus > 0 ? 'text-red-600' : 'text-yellow-600'
              }`}>
                Pendientes de devolución
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              metricas?.prestamos.desglose.dias_4_plus > 0 ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                metricas?.prestamos.desglose.dias_4_plus > 0 ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-700">
                {metricas?.insumos.disponibles || 0}
              </p>
              <p className="text-sm text-blue-600 font-medium">Insumos disponibles</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-700">
                {metricas?.usuarios.activos || 0}
              </p>
              <p className="text-sm text-gray-600 font-medium">Usuarios activos</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert breakdown */}
      {metricas?.prestamos.pendientes > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Desglose de alertas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{metricas.prestamos.desglose.dia_1}</p>
              <p className="text-sm text-yellow-600">1 día sin devolver</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">{metricas.prestamos.desglose.dias_2_3}</p>
              <p className="text-sm text-orange-600">2-3 días sin devolver</p>
            </div>
            <div className={`text-center p-3 bg-red-50 rounded-lg ${metricas.prestamos.desglose.dias_4_plus > 0 ? 'animate-pulse-alert' : ''}`}>
              <p className="text-2xl font-bold text-red-700">{metricas.prestamos.desglose.dias_4_plus}</p>
              <p className="text-sm text-red-600">4+ días sin devolver</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart - Distribución de insumos */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución de insumos por estado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-2xl font-bold text-gray-700">{metricas?.insumos.total || 0}</p>
            <p className="text-sm text-gray-500">Total de insumos</p>
          </div>
        </div>

        {/* Timeline chart */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Préstamos y devoluciones (últimos 30 días)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graficos?.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(val) => formatearFechaCorta(val).slice(0, 5)}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(val) => formatearFechaCorta(val)}
                />
                <Legend />
                <Line type="monotone" dataKey="prestamos" stroke={COLORS.azul} name="Préstamos" strokeWidth={2} />
                <Line type="monotone" dataKey="devoluciones" stroke={COLORS.verde} name="Devoluciones" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second row of charts/tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Préstamos más antiguos */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Préstamos más antiguos</h3>
            <Link to="/prestamos" className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {prestamosAntiguos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay préstamos activos</p>
          ) : (
            <div className="space-y-3">
              {prestamosAntiguos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{p.usuario_nombre_completo}</p>
                    <p className="text-sm text-gray-600">{p.insumo_descripcion}</p>
                  </div>
                  <EstadoPrestamoBadge diasTranscurridos={p.dias_transcurridos} animate={p.dias_transcurridos >= 4} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estadísticas adicionales */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Estadísticas de eficiencia</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Devoluciones el mismo día</p>
                <p className="text-xs text-gray-500">(último mes)</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{graficos?.porcentaje_mismo_dia || 0}%</p>
            </div>

            {/* Tiempo promedio por tipología */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Tiempo promedio por tipología</p>
              <div className="space-y-2">
                {graficos?.tiempo_promedio_tipologia?.slice(0, 5).map((t) => (
                  <div key={t.tipologia} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t.tipologia}</span>
                    <span className="text-sm font-medium">{t.promedio_dias} días</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart - Por área */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Préstamos por área</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graficos?.prestamos_por_area || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area_equipo" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="activos_hoy" fill={COLORS.verde} name="Activos hoy" stackId="a" />
              <Bar dataKey="pendientes" fill={COLORS.amarillo} name="Pendientes" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Insumos más prestados */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Insumos más prestados</h3>
          <div className="space-y-2">
            {graficos?.insumos_mas_prestados?.map((i, idx) => (
              <div key={i.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-medium mr-2">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{i.tipologia} - {i.nombre}</span>
                </div>
                <span className="badge bg-blue-100 text-blue-700">{i.total_prestamos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsables IT */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Responsables IT más activos</h3>
          <div className="space-y-2">
            {graficos?.responsables_it?.map((r, idx) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full text-xs font-medium mr-2">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{r.nombre_completo}</span>
                </div>
                <span className="badge bg-purple-100 text-purple-700">{r.total_prestamos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Usuarios con más pendientes */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Usuarios con más préstamos activos</h3>
          <div className="space-y-2">
            {graficos?.usuarios_pendientes?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Sin préstamos activos</p>
            ) : (
              graficos?.usuarios_pendientes?.map((u, idx) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full text-xs font-medium mr-2">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm">{u.nombre_completo}</span>
                      <p className="text-xs text-gray-500">{u.area_equipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge bg-orange-100 text-orange-700">{u.prestamos_activos}</span>
                    <p className="text-xs text-gray-500">{u.dias_acumulados} días total</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
