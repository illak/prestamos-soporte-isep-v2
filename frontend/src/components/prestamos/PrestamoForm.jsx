import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Search, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { prestamosApi, insumosApi, usuariosApi } from '../../services/api';

export default function PrestamoForm({ isOpen, onClose, onSuccess, prestamo }) {
  const isEditing = !!prestamo;
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [usuariosIt, setUsuariosIt] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [searchingUsuarios, setSearchingUsuarios] = useState(false);
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
      inventario_id: '',
      usuario_id: '',
      usuario_it_id: '',
      observaciones_prestamo: '',
    },
  });

  // Cargar opciones iniciales (insumos y usuarios IT)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [insRes, itRes] = await Promise.all([
          insumosApi.getDisponibles(),
          usuariosApi.getSoporteIt(),
        ]);

        if (insRes.success) setInsumosDisponibles(insRes.data);
        if (itRes.success) setUsuariosIt(itRes.data);

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
      setBusquedaUsuario('');
      setUsuarios([]);
    }
  }, [isOpen, prestamo, setValue]);

  // Búsqueda de usuarios con debounce - búsqueda del lado del servidor
  useEffect(() => {
    if (!isOpen || isEditing) return;

    const searchUsuarios = async () => {
      if (!busquedaUsuario || busquedaUsuario.length < 2) {
        setUsuarios([]);
        return;
      }

      setSearchingUsuarios(true);
      try {
        const response = await usuariosApi.getAll({
          activo: '1',
          busqueda: busquedaUsuario,
          limit: 50
        });
        if (response.success) {
          setUsuarios(response.data);
        }
      } catch (error) {
        console.error('Error buscando usuarios:', error);
      } finally {
        setSearchingUsuarios(false);
      }
    };

    const timeoutId = setTimeout(searchUsuarios, 300);
    return () => clearTimeout(timeoutId);
  }, [busquedaUsuario, isOpen, isEditing]);

  const filteredInsumos = insumosDisponibles.filter((i) => {
    if (!busquedaInsumo) return true;
    const search = busquedaInsumo.toLowerCase();
    return (
      (i.modelo || '').toLowerCase().includes(search) ||
      (i.fabricante || '').toLowerCase().includes(search) ||
      (i.categoria_desc || '').toLowerCase().includes(search) ||
      (i.serie && i.serie.toLowerCase().includes(search))
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
          inventario_id: parseInt(data.inventario_id),
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
              {...register('inventario_id', { required: 'Seleccione un item' })}
              className="input"
              disabled={loadingOptions}
            >
              <option value="">Seleccionar item disponible...</option>
              {filteredInsumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.categoria_desc} - {[i.fabricante, i.modelo].filter(Boolean).join(' ') || '-'} {i.serie ? `(S/N: ${i.serie})` : ''}
                </option>
              ))}
            </select>
            {errors.inventario_id && (
              <p className="text-red-500 text-sm mt-1">{errors.inventario_id.message}</p>
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
            <p className="font-medium text-gray-900 dark:text-white">{prestamo.inventario_descripcion || prestamo.insumo_descripcion}</p>
          </div>
        )}

        {/* Selector de usuario (solo para crear) */}
        {!isEditing && (
          <div>
            <label className="label">Usuario que recibe el préstamo *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Escriba al menos 2 caracteres para buscar..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                className="input pl-10 mb-2"
              />
              {searchingUsuarios && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
            <select
              {...register('usuario_id', { required: 'Seleccione un usuario' })}
              className="input"
              disabled={searchingUsuarios}
            >
              <option value="">
                {busquedaUsuario.length < 2
                  ? 'Escriba para buscar usuarios...'
                  : usuarios.length === 0
                    ? 'No se encontraron usuarios'
                    : 'Seleccionar usuario...'}
              </option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre} - DNI: {u.dni} ({u.area_desc || u.area_equipo || '-'})
                </option>
              ))}
            </select>
            {errors.usuario_id && (
              <p className="text-red-500 text-sm mt-1">{errors.usuario_id.message}</p>
            )}
            {busquedaUsuario.length > 0 && busquedaUsuario.length < 2 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Escriba al menos 2 caracteres para buscar
              </p>
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
