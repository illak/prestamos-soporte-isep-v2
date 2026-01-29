import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Package, User, Wrench, Calendar, Clock } from 'lucide-react';
import Modal from '../common/Modal';
import { EstadoPrestamoBadge } from '../common/Badge';
import { formatearFechaArg } from '../../utils/dateHelpers';
import { prestamosApi, insumosApi } from '../../services/api';

export default function DevolverModal({ isOpen, onClose, onSuccess, insumo }) {
  const [prestamoActivo, setPrestamoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchPrestamo = async () => {
      setLoading(true);
      try {
        const response = await insumosApi.getPrestamoActivo(insumo.id);
        if (response.success) {
          setPrestamoActivo(response.data);
        }
      } catch (error) {
        toast.error('Error al cargar información del préstamo');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && insumo) {
      fetchPrestamo();
    }
  }, [isOpen, insumo, onClose]);

  const onSubmit = async (data) => {
    if (!prestamoActivo) return;

    try {
      const result = await prestamosApi.devolver(prestamoActivo.id, {
        fecha_hora_devolucion: fechaDevolucion.toISOString(),
        observaciones_devolucion: data.observaciones_devolucion || null,
      });
      toast.success(result.message || 'Devolución registrada correctamente');
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Registrar Devolución" size="md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando información...</span>
        </div>
      </Modal>
    );
  }

  if (!prestamoActivo) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Devolución" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Resumen del préstamo */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {/* Insumo */}
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Insumo</p>
              <p className="font-medium">{prestamoActivo.insumo_descripcion}</p>
              {prestamoActivo.insumo_numero_serie && (
                <p className="text-sm text-gray-600">S/N: {prestamoActivo.insumo_numero_serie}</p>
              )}
            </div>
          </div>

          {/* Usuario */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Usuario</p>
              <p className="font-medium">{prestamoActivo.usuario_nombre_completo}</p>
              <p className="text-sm text-gray-600">{prestamoActivo.usuario_area}</p>
            </div>
          </div>

          {/* Fecha préstamo */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Fecha de préstamo</p>
              <p className="font-medium">{formatearFechaArg(prestamoActivo.fecha_hora_prestamo)}</p>
            </div>
          </div>

          {/* Días transcurridos */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Días transcurridos</p>
              <EstadoPrestamoBadge
                diasTranscurridos={prestamoActivo.dias_transcurridos}
                animate={prestamoActivo.dias_transcurridos >= 4}
              />
            </div>
          </div>

          {/* Responsable IT */}
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Responsable IT</p>
              <p className="font-medium">{prestamoActivo.it_nombre_completo}</p>
            </div>
          </div>

          {/* Observaciones del préstamo */}
          {prestamoActivo.observaciones_prestamo && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500">Observaciones del préstamo:</p>
              <p className="text-sm text-gray-700">{prestamoActivo.observaciones_prestamo}</p>
            </div>
          )}
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
            minDate={new Date(prestamoActivo.fecha_hora_prestamo)}
            className="input w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Por defecto: ahora. Puede modificarse para correcciones.
          </p>
        </div>

        {/* Observaciones de devolución */}
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
        <div className="flex justify-end gap-3 pt-4 border-t">
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
