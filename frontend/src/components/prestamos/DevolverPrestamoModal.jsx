import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Package, User, Wrench, Calendar, Clock } from 'lucide-react';
import Modal from '../common/Modal';
import { EstadoPrestamoBadge } from '../common/Badge';
import { formatearFechaArg } from '../../utils/dateHelpers';
import { prestamosApi } from '../../services/api';

export default function DevolverPrestamoModal({ isOpen, onClose, onSuccess, prestamo }) {
  const [fechaDevolucion, setFechaDevolucion] = useState(new Date());

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      observaciones_devolucion: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const result = await prestamosApi.devolver(prestamo.id, {
        fecha_hora_devolucion: fechaDevolucion.toISOString(),
        observaciones_devolucion: data.observaciones_devolucion || null,
      });
      toast.success(result.message || 'Devolución registrada correctamente');
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Devolución" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Resumen del préstamo */}
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Insumo</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.inventario_descripcion || prestamo.insumo_descripcion}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuario</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.usuario_nombre_completo}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{prestamo.usuario_area}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de préstamo</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatearFechaArg(prestamo.fecha_hora_prestamo)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Días transcurridos</p>
              <EstadoPrestamoBadge
                diasTranscurridos={prestamo.dias_transcurridos}
                animate={prestamo.dias_transcurridos >= 4}
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Responsable IT</p>
              <p className="font-medium text-gray-900 dark:text-white">{prestamo.it_nombre_completo}</p>
            </div>
          </div>
        </div>

        {/* Fecha de devolución */}
        <div>
          <label className="label">Fecha y hora de devolución</label>
          <DatePicker
            selected={fechaDevolucion}
            onChange={(date) => setFechaDevolucion(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd/MM/yyyy HH:mm"
            locale={es}
            maxDate={new Date()}
            minDate={new Date(prestamo.fecha_hora_prestamo)}
            className="input w-full"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="label">Observaciones de devolución (opcional)</label>
          <textarea
            {...register('observaciones_devolucion')}
            className="input"
            rows={2}
            placeholder="Estado del equipo al momento de la devolución..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-warning"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar Devolución'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
