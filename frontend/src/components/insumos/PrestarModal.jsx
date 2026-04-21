import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Package, User, Wrench, Search, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { prestamosApi, usuariosApi } from '../../services/api';

export default function PrestarModal({ isOpen, onClose, onSuccess, insumo }) {
  const [usuariosIt, setUsuariosIt] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [searchingUsuarios, setSearchingUsuarios] = useState(false);
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
      usuario_id: '',
      usuario_it_id: '',
      observaciones_prestamo: '',
    },
  });

  const selectedUsuarioId = watch('usuario_id');

  // Cargar usuarios IT inicialmente
  useEffect(() => {
    const fetchUsuariosIt = async () => {
      try {
        const itRes = await usuariosApi.getSoporteIt();
        if (itRes.success) setUsuariosIt(itRes.data);
      } catch (error) {
        toast.error('Error al cargar usuarios IT');
      }
    };

    if (isOpen) {
      fetchUsuariosIt();
      setBusquedaUsuario('');
      setUsuarios([]);
      setLoadingUsuarios(false);
    }
  }, [isOpen]);

  // Búsqueda de usuarios con debounce - búsqueda del lado del servidor
  useEffect(() => {
    if (!isOpen) return;

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
  }, [busquedaUsuario, isOpen]);

  const onSubmit = async (data) => {
    try {
      await prestamosApi.create({
        inventario_id: insumo.id,
        usuario_id: parseInt(data.usuario_id),
        usuario_it_id: parseInt(data.usuario_it_id),
        fecha_hora_prestamo: fechaPrestamo.toISOString(),
        observaciones_prestamo: data.observaciones_prestamo || null,
      });
      toast.success('Préstamo registrado correctamente');
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const selectedUsuario = usuarios.find(u => u.id === parseInt(selectedUsuarioId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Préstamo" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Insumo (pre-cargado y no editable) */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {insumo.categoria_desc} - {[insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || '-'}
              </p>
              {insumo.serie && (
                <p className="text-sm text-blue-700 dark:text-blue-300">S/N: {insumo.serie}</p>
              )}
            </div>
          </div>
        </div>

        {/* Selector de usuario */}
        <div>
          <label className="label flex items-center gap-2">
            <User className="w-4 h-4" />
            Usuario que recibe el préstamo *
          </label>
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
          {selectedUsuario && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{selectedUsuario.nombre} {selectedUsuario.apellido}</p>
              <p className="text-gray-600 dark:text-gray-300">{selectedUsuario.mail}</p>
              <p className="text-gray-600 dark:text-gray-300">Área: {selectedUsuario.area_desc || selectedUsuario.area_equipo || '-'}</p>
            </div>
          )}
        </div>

        {/* Selector de responsable IT */}
        <div>
          <label className="label flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Responsable IT *
          </label>
          <select
            {...register('usuario_it_id', { required: 'Seleccione un responsable' })}
            className="input"
            disabled={loadingUsuarios}
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Por defecto: ahora. Puede modificarse para correcciones.
          </p>
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
            disabled={isSubmitting || loadingUsuarios}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar Préstamo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
