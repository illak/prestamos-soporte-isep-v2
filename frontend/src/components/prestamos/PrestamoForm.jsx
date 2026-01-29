import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import Modal from '../common/Modal';
import { prestamosApi, insumosApi, usuariosApi } from '../../services/api';

export default function PrestamoForm({ isOpen, onClose, onSuccess, prestamo }) {
  const isEditing = !!prestamo;
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [usuariosIt, setUsuariosIt] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [fechaPrestamo, setFechaPrestamo] = useState(new Date());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      insumo_id: '',
      usuario_id: '',
      usuario_it_id: '',
      observaciones_prestamo: '',
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [insRes, itRes, usRes] = await Promise.all([
          insumosApi.getDisponibles(),
          usuariosApi.getSoporteIt(),
          usuariosApi.getAll({ activo: '1', limit: 100 }),
        ]);

        if (insRes.success) setInsumosDisponibles(insRes.data);
        if (itRes.success) setUsuariosIt(itRes.data);
        if (usRes.success) setUsuarios(usRes.data);

        if (prestamo) {
          setValue('usuario_it_id', prestamo.usuario_it_id.toString());
          setValue('observaciones_prestamo', prestamo.observaciones_prestamo || '');
          setFechaPrestamo(new Date(prestamo.fecha_hora_prestamo));
        }
      } catch (error) {
        toast.error('Error al cargar opciones');
      } finally {
        setLoadingOptions(false);
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, prestamo, setValue]);

  const filteredInsumos = insumosDisponibles.filter((i) => {
    if (!busquedaInsumo) return true;
    const search = busquedaInsumo.toLowerCase();
    return (
      i.nombre.toLowerCase().includes(search) ||
      i.tipologia.toLowerCase().includes(search) ||
      (i.numero_serie && i.numero_serie.toLowerCase().includes(search))
    );
  });

  const filteredUsuarios = usuarios.filter((u) => {
    if (!busquedaUsuario) return true;
    const search = busquedaUsuario.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(search) ||
      u.apellido.toLowerCase().includes(search) ||
      u.dni.includes(search)
    );
  });

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await prestamosApi.update(prestamo.id, {
          usuario_it_id: parseInt(data.usuario_it_id),
          fecha_hora_prestamo: fechaPrestamo.toISOString(),
          observaciones_prestamo: data.observaciones_prestamo || null,
        });
        toast.success('Préstamo actualizado correctamente');
      } else {
        await prestamosApi.create({
          insumo_id: parseInt(data.insumo_id),
          usuario_id: parseInt(data.usuario_id),
          usuario_it_id: parseInt(data.usuario_it_id),
          fecha_hora_prestamo: fechaPrestamo.toISOString(),
          observaciones_prestamo: data.observaciones_prestamo || null,
        });
        toast.success('Préstamo registrado correctamente');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Préstamo' : 'Nuevo Préstamo'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Selector de insumo (solo para crear) */}
        {!isEditing && (
          <div>
            <label className="label">Insumo *</label>
            <input
              type="text"
              placeholder="Buscar por nombre, tipología o N° serie..."
              value={busquedaInsumo}
              onChange={(e) => setBusquedaInsumo(e.target.value)}
              className="input mb-2"
            />
            <select
              {...register('insumo_id', { required: 'Seleccione un insumo' })}
              className="input"
              disabled={loadingOptions}
            >
              <option value="">Seleccionar insumo disponible...</option>
              {filteredInsumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.tipologia} - {i.nombre} {i.numero_serie ? `(S/N: ${i.numero_serie})` : ''}
                </option>
              ))}
            </select>
            {errors.insumo_id && (
              <p className="text-red-500 text-sm mt-1">{errors.insumo_id.message}</p>
            )}
            {filteredInsumos.length === 0 && !loadingOptions && (
              <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">No hay insumos disponibles</p>
            )}
          </div>
        )}

        {/* Info del insumo si está editando */}
        {isEditing && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Insumo</p>
            <p className="font-medium text-gray-900 dark:text-white">{prestamo.insumo_descripcion}</p>
          </div>
        )}

        {/* Selector de usuario (solo para crear) */}
        {!isEditing && (
          <div>
            <label className="label">Usuario que recibe el préstamo *</label>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              className="input mb-2"
            />
            <select
              {...register('usuario_id', { required: 'Seleccione un usuario' })}
              className="input"
              disabled={loadingOptions}
            >
              <option value="">Seleccionar usuario...</option>
              {filteredUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre} - DNI: {u.dni} ({u.area_equipo})
                </option>
              ))}
            </select>
            {errors.usuario_id && (
              <p className="text-red-500 text-sm mt-1">{errors.usuario_id.message}</p>
            )}
          </div>
        )}

        {/* Info del usuario si está editando */}
        {isEditing && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Usuario</p>
            <p className="font-medium text-gray-900 dark:text-white">{prestamo.usuario_nombre_completo}</p>
          </div>
        )}

        {/* Selector de responsable IT */}
        <div>
          <label className="label">Responsable IT *</label>
          <select
            {...register('usuario_it_id', { required: 'Seleccione un responsable' })}
            className="input"
            disabled={loadingOptions}
          >
            <option value="">Seleccionar responsable...</option>
            {usuariosIt.map((u) => (
              <option key={u.id} value={u.id}>
                {u.apellido}, {u.nombre}
              </option>
            ))}
          </select>
          {errors.usuario_it_id && (
            <p className="text-red-500 text-sm mt-1">{errors.usuario_it_id.message}</p>
          )}
        </div>

        {/* Fecha y hora */}
        <div>
          <label className="label">Fecha y hora del préstamo</label>
          <DatePicker
            selected={fechaPrestamo}
            onChange={(date) => setFechaPrestamo(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd/MM/yyyy HH:mm"
            locale={es}
            maxDate={new Date()}
            className="input w-full"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="label">Observaciones (opcional)</label>
          <textarea
            {...register('observaciones_prestamo')}
            className="input"
            rows={2}
            placeholder="Notas sobre el préstamo..."
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
            className="btn btn-primary"
            disabled={isSubmitting || loadingOptions}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Registrar Préstamo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
