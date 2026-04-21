import { Package, User, Wrench, Calendar, Clock, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import { EstadoPrestamoBadge } from '../common/Badge';
import { formatearFechaArg } from '../../utils/dateHelpers';

export default function PrestamoDetail({ isOpen, onClose, prestamo }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Préstamo #${prestamo.id}`} size="md">
      <div className="space-y-4">
        {/* Estado actual */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <span className="text-gray-600 dark:text-gray-300">Estado</span>
          {prestamo.estado === 'Activo' ? (
            <EstadoPrestamoBadge
              diasTranscurridos={prestamo.dias_transcurridos}
              animate={prestamo.dias_transcurridos >= 4}
            />
          ) : (
            <span className="badge bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
              Devuelto ({prestamo.duracion_dias} día{prestamo.duracion_dias !== 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Detalles */}
        <div className="space-y-4">
          {/* Insumo */}
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Insumo</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.inventario_descripcion || prestamo.insumo_descripcion}</p>
              {prestamo.inventario_serie || prestamo.insumo_numero_serie && (
                <p className="text-sm text-gray-600 dark:text-gray-300">S/N: {prestamo.inventario_serie || prestamo.insumo_numero_serie}</p>
              )}
            </div>
          </div>

          {/* Usuario */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuario</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.usuario_nombre_completo}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">DNI: {prestamo.usuario_dni}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Área: {prestamo.usuario_area}</p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fecha préstamo</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatearFechaArg(prestamo.fecha_hora_prestamo)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fecha devolución</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {prestamo.fecha_hora_devolucion_real
                    ? formatearFechaArg(prestamo.fecha_hora_devolucion_real)
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Responsable IT */}
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Responsable IT</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.it_nombre_completo}</p>
            </div>
          </div>

          {/* Observaciones */}
          {(prestamo.observaciones_prestamo || prestamo.observaciones_devolucion) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 space-y-2">
                  {prestamo.observaciones_prestamo && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Observaciones del préstamo</p>
                      <p className="text-gray-700 dark:text-gray-300">{prestamo.observaciones_prestamo}</p>
                    </div>
                  )}
                  {prestamo.observaciones_devolucion && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Observaciones de devolución</p>
                      <p className="text-gray-700 dark:text-gray-300">{prestamo.observaciones_devolucion}</p>
                    </div>
                  )}
                </div>
              </div>
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
    </Modal>
  );
}
