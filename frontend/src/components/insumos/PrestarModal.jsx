import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Package, User, Wrench } from 'lucide-react';
import Modal from '../common/Modal';
import { prestamosApi, usuariosApi } from '../../services/api';

export default function PrestarModal({ isOpen, onClose, onSuccess, insumo }) {
  const [usuariosIt, setUsuariosIt] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoadingUsuarios(true);
      try {
        const [itRes, usRes] = await Promise.all([
          usuariosApi.getSoporteIt(),
          usuariosApi.getAll({ activo: '1', limit: 100 }),
        ]);

        if (itRes.success) setUsuariosIt(itRes.data);
        if (usRes.success) setUsuarios(usRes.data);
      } catch (error) {
        toast.error('Error al cargar usuarios');
      } finally {
        setLoadingUsuarios(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

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
      await prestamosApi.create({
        insumo_id: insumo.id,
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">{insumo.tipologia} - {insumo.nombre}</p>
              {insumo.numero_serie && (
                <p className="text-sm text-blue-700">S/N: {insumo.numero_serie}</p>
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
            disabled={loadingUsuarios}
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
          {selectedUsuario && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
              <p className="font-medium">{selectedUsuario.nombre} {selectedUsuario.apellido}</p>
              <p className="text-gray-600">{selectedUsuario.mail}</p>
              <p className="text-gray-600">Área: {selectedUsuario.area_equipo}</p>
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
          <p className="text-xs text-gray-500 mt-1">
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
