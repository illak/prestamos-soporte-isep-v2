import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { insumosApi, ubicacionesApi } from '../../services/api';

export default function InsumoForm({ isOpen, onClose, onSuccess, insumo, tipologias, estados }) {
  const [ubicaciones, setUbicaciones] = useState([]);
  const isEditing = !!insumo;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      id_categoria: '',
      condicion: 'Entregable',
      fabricante: '',
      modelo: '',
      serie: '',
      lbl_activo: '',
      id_ubicacion: '',
      id_estado: '',
      notas: '',
    },
  });

  const currentEstadoId = watch('id_estado');
  const estadoAsignadoId = estados.find(e => e.desc === 'Asignado')?.id;

  useEffect(() => {
    if (isOpen) {
      ubicacionesApi.getAll({ activo: '1' })
        .then(r => { if (r.success) setUbicaciones(r.data); })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (insumo) {
      reset({
        id_categoria: insumo.id_categoria ?? '',
        condicion: insumo.condicion ?? 'Entregable',
        fabricante: insumo.fabricante ?? '',
        modelo: insumo.modelo ?? '',
        serie: insumo.serie ?? '',
        lbl_activo: insumo.lbl_activo ?? '',
        id_ubicacion: insumo.id_ubicacion ?? '',
        id_estado: insumo.id_estado ?? '',
        notas: insumo.notas ?? '',
      });
    } else {
      const dispId = estados.find(e => e.desc === 'Disponible')?.id ?? '';
      reset({
        id_categoria: '',
        condicion: 'Entregable',
        fabricante: '',
        modelo: '',
        serie: '',
        lbl_activo: '',
        id_ubicacion: '',
        id_estado: dispId,
        notas: '',
      });
    }
  }, [insumo, reset, estados]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        id_categoria: parseInt(data.id_categoria),
        condicion: data.condicion,
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        serie: data.serie || null,
        lbl_activo: data.lbl_activo || null,
        id_ubicacion: data.id_ubicacion ? parseInt(data.id_ubicacion) : null,
        id_estado: data.id_estado ? parseInt(data.id_estado) : undefined,
        notas: data.notas || null,
      };

      if (isEditing) {
        await insumosApi.update(insumo.id, payload);
        toast.success('Item actualizado correctamente');
      } else {
        await insumosApi.create(payload);
        toast.success('Item creado correctamente');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isAsignado = isEditing && insumo.id_estado === estadoAsignadoId;

  // Estados disponibles para cambio manual (excluir "Asignado")
  const estadosEditables = isEditing
    ? estados.filter(e => e.desc !== 'Asignado')
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Item de Inventario' : 'Nuevo Item de Inventario'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Categoría + Condición */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Categoría *</label>
            <select
              {...register('id_categoria', { required: 'La categoría es requerida' })}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {tipologias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.desc}</option>
              ))}
            </select>
            {errors.id_categoria && (
              <p className="text-red-500 text-sm mt-1">{errors.id_categoria.message}</p>
            )}
          </div>

          <div>
            <label className="label">Condición</label>
            <select {...register('condicion')} className="input">
              <option value="Entregable">Entregable (préstamo diario)</option>
              <option value="Asignable">Asignable (asignación fija)</option>
            </select>
          </div>
        </div>

        {/* Fabricante + Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fabricante</label>
            <input
              type="text"
              {...register('fabricante')}
              className="input"
              placeholder="Ej: Lenovo, HP, Dell..."
            />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input
              type="text"
              {...register('modelo')}
              className="input"
              placeholder="Ej: ThinkPad T14, ProBook 450..."
            />
          </div>
        </div>

        {/* Serie + Etiqueta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Número de Serie</label>
            <input
              type="text"
              {...register('serie')}
              className="input"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="label">Etiqueta (lbl_activo)</label>
            <input
              type="text"
              {...register('lbl_activo')}
              className="input"
              placeholder="Ej: NB-001"
            />
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <label className="label">Ubicación / Piso</label>
          <select {...register('id_ubicacion')} className="input">
            <option value="">Sin ubicación asignada</option>
            {ubicaciones.map((ub) => (
              <option key={ub.id} value={ub.id}>
                {ub.piso ? `${ub.piso} — ${ub.desc}` : ub.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Estado (solo al editar) */}
        {isEditing && (
          <div>
            <label className="label">Estado</label>
            <select
              {...register('id_estado')}
              className="input"
              disabled={isAsignado}
            >
              {estadosEditables.map((e) => (
                <option key={e.id} value={e.id}>{e.desc}</option>
              ))}
            </select>
            {isAsignado && (
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                Estado "Asignado" se gestiona automáticamente con préstamos
              </p>
            )}
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="label">Notas</label>
          <textarea
            {...register('notas')}
            className="input"
            rows={2}
            placeholder="Notas adicionales..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
