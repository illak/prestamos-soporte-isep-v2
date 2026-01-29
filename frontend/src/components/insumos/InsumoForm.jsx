import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { insumosApi } from '../../services/api';

export default function InsumoForm({ isOpen, onClose, onSuccess, insumo, tipologias, estados }) {
  const isEditing = !!insumo;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      tipologia: '',
      nombre: '',
      descripcion: '',
      numero_serie: '',
      estado: 'Disponible',
      observaciones: '',
    },
  });

  const currentEstado = watch('estado');

  useEffect(() => {
    if (insumo) {
      reset({
        tipologia: insumo.tipologia,
        nombre: insumo.nombre,
        descripcion: insumo.descripcion || '',
        numero_serie: insumo.numero_serie || '',
        estado: insumo.estado,
        observaciones: insumo.observaciones || '',
      });
    } else {
      reset({
        tipologia: '',
        nombre: '',
        descripcion: '',
        numero_serie: '',
        estado: 'Disponible',
        observaciones: '',
      });
    }
  }, [insumo, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await insumosApi.update(insumo.id, data);
        toast.success('Insumo actualizado correctamente');
      } else {
        await insumosApi.create(data);
        toast.success('Insumo creado correctamente');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Estados permitidos para cambio manual
  const estadosPermitidos = isEditing
    ? estados.filter(e => {
        // No permitir cambiar a "En préstamo" manualmente
        if (e === 'En préstamo' && insumo.estado !== 'En préstamo') return false;
        // No permitir cambiar de "En préstamo" a "Disponible" directamente
        if (e === 'Disponible' && insumo.estado === 'En préstamo') return false;
        return true;
      })
    : ['Disponible'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Insumo' : 'Nuevo Insumo'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipología *</label>
            <select
              {...register('tipologia', { required: 'La tipología es requerida' })}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {tipologias.map((tip) => (
                <option key={tip} value={tip}>{tip}</option>
              ))}
            </select>
            {errors.tipologia && (
              <p className="text-red-500 text-sm mt-1">{errors.tipologia.message}</p>
            )}
          </div>

          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              {...register('nombre', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Ej: Lenovo ThinkPad T14"
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            {...register('descripcion')}
            className="input"
            rows={2}
            placeholder="Características técnicas adicionales..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Número de Serie</label>
            <input
              type="text"
              {...register('numero_serie')}
              className="input"
              placeholder="Opcional"
            />
          </div>

          {isEditing && (
            <div>
              <label className="label">Estado</label>
              <select
                {...register('estado')}
                className="input"
                disabled={insumo.estado === 'En préstamo'}
              >
                {estadosPermitidos.map((est) => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
              {insumo.estado === 'En préstamo' && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  El estado se cambiará automáticamente al registrar la devolución
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea
            {...register('observaciones')}
            className="input"
            rows={2}
            placeholder="Notas adicionales..."
          />
        </div>

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
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
