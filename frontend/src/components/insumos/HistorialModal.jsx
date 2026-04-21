import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Package, BarChart3 } from 'lucide-react';
import Modal from '../common/Modal';
import { EstadoPrestamoBadge, EstadoInsumoBadge } from '../common/Badge';
import { formatearFechaArg } from '../../utils/dateHelpers';
import { insumosApi } from '../../services/api';

export default function HistorialModal({ isOpen, onClose, insumo }) {
  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      try {
        const response = await insumosApi.getHistorial(insumo.id);
        if (response.success) {
          setHistorial(response.data);
        }
      } catch (error) {
        toast.error('Error al cargar historial');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && insumo) {
      fetchHistorial();
    }
  }, [isOpen, insumo]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial - ${[insumo?.fabricante, insumo?.modelo].filter(Boolean).join(' ') || insumo?.serie || 'Item'}`}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando historial...</span>
        </div>
      ) : historial ? (
        <div className="space-y-6">
          {/* Info del insumo */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
            <Package className="w-10 h-10 text-gray-400" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {historial.item.categoria_desc} - {[historial.item.fabricante, historial.item.modelo].filter(Boolean).join(' ') || '-'}
              </h3>
              {historial.item.serie && (
                <p className="text-sm text-gray-600 dark:text-gray-300">S/N: {historial.item.serie}</p>
              )}
              <EstadoInsumoBadge estado={historial.item.estado_desc} />
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{historial.estadisticas.total_prestamos}</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">Total de préstamos</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
              <div className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2 flex items-center justify-center font-bold">~</div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{historial.estadisticas.promedio_dias}</p>
              <p className="text-sm text-green-600 dark:text-green-300">Promedio días prestado</p>
            </div>
          </div>

          {/* Lista de préstamos */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Historial de préstamos</h4>
            {historial.prestamos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Este insumo no tiene préstamos registrados
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historial.prestamos.map((prestamo) => (
                  <div
                    key={prestamo.id}
                    className={`border rounded-lg p-4 ${
                      prestamo.estado === 'Activo'
                        ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{prestamo.usuario_nombre_completo}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{prestamo.usuario_area}</p>
                      </div>
                      {prestamo.estado === 'Activo' ? (
                        <EstadoPrestamoBadge diasTranscurridos={prestamo.dias_transcurridos} />
                      ) : (
                        <span className="badge bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                          Devuelto ({prestamo.duracion_dias} día{prestamo.duracion_dias !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Fecha préstamo</p>
                        <p className="text-gray-900 dark:text-white">{formatearFechaArg(prestamo.fecha_hora_prestamo)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Fecha devolución</p>
                        <p className="text-gray-900 dark:text-white">
                          {prestamo.fecha_hora_devolucion_real
                            ? formatearFechaArg(prestamo.fecha_hora_devolucion_real)
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-sm">
                      <p className="text-gray-500 dark:text-gray-400">Responsable IT: <span className="text-gray-700 dark:text-gray-300">{prestamo.it_nombre_completo}</span></p>
                    </div>

                    {(prestamo.observaciones_prestamo || prestamo.observaciones_devolucion) && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-sm">
                        {prestamo.observaciones_prestamo && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Obs. préstamo:</span> {prestamo.observaciones_prestamo}
                          </p>
                        )}
                        {prestamo.observaciones_devolucion && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Obs. devolución:</span> {prestamo.observaciones_devolucion}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={onClose} className="btn btn-outline">
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No se pudo cargar el historial</p>
      )}
    </Modal>
  );
}
