import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import { Package, User, Search, Loader2, Calendar, MapPin } from 'lucide-react';
import Modal from '../common/Modal';
import { insumosApi, usuariosApi, ubicacionesApi } from '../../services/api';

export default function AsignarModal({ isOpen, onClose, onSuccess, insumo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [searchingUsuarios, setSearchingUsuarios] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [fechaAsignacion, setFechaAsignacion] = useState(new Date());
  const [fechaDevolucionEsperada, setFechaDevolucionEsperada] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { id_ubicacion: '', usuario_id: '', notas: '' } });

  const selectedUsuarioId = watch('usuario_id');

  useEffect(() => {
    if (!isOpen) return;
    setBusquedaUsuario('');
    setUsuarios([]);
    ubicacionesApi.getAll({ activo: '1' })
      .then(r => { if (r.success) setUbicaciones(r.data); })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const search = async () => {
      if (!busquedaUsuario || busquedaUsuario.length < 2) { setUsuarios([]); return; }
      setSearchingUsuarios(true);
      try {
        const r = await usuariosApi.getAll({ activo: '1', busqueda: busquedaUsuario, limit: 50 });
        if (r.success) setUsuarios(r.data);
      } finally { setSearchingUsuarios(false); }
    };
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [busquedaUsuario, isOpen]);

  const onSubmit = async (data) => {
    try {
      const result = await insumosApi.asignar(insumo.id, {
        id_ubicacion: parseInt(data.id_ubicacion),
        id_asignado: data.usuario_id ? parseInt(data.usuario_id) : null,
        fecha_asignacion: fechaAsignacion.toISOString(),
        fecha_devolucion_esperada: fechaDevolucionEsperada?.toISOString() || null,
        notas: data.notas || null,
      });
      toast.success(result.message || 'Item asignado correctamente');
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const selectedUsuario = usuarios.find(u => u.id === parseInt(selectedUsuarioId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar Item" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Info del item */}
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">
                {insumo.categoria_desc} — {[insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || '-'}
              </p>
              {insumo.serie && <p className="text-sm text-purple-700 dark:text-purple-300">S/N: {insumo.serie}</p>}
            </div>
          </div>
        </div>

        {/* Ubicación (requerida) */}
        <div>
          <label className="label flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Ubicación *
          </label>
          <select
            {...register('id_ubicacion', { required: 'La ubicación es requerida' })}
            className="input"
          >
            <option value="">Seleccionar ubicación...</option>
            {ubicaciones.map((ub) => (
              <option key={ub.id} value={ub.id}>
                {ub.piso ? `${ub.piso} — ${ub.desc}` : ub.desc}
              </option>
            ))}
          </select>
          {errors.id_ubicacion && <p className="text-red-500 text-sm mt-1">{errors.id_ubicacion.message}</p>}
        </div>

        {/* Persona asignada (opcional) */}
        <div>
          <label className="label flex items-center gap-2">
            <User className="w-4 h-4" />
            Persona responsable
            <span className="text-gray-400 text-xs font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              className="input pl-10 mb-2"
            />
            {searchingUsuarios && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
            )}
          </div>
          <select
            {...register('usuario_id')}
            className="input"
            disabled={searchingUsuarios}
          >
            <option value="">Sin persona asignada</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.apellido}, {u.nombre} — DNI: {u.dni} ({u.area_desc || '-'})
              </option>
            ))}
          </select>
          {selectedUsuario && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{selectedUsuario.nombre} {selectedUsuario.apellido}</p>
              <p className="text-gray-500 dark:text-gray-400">{selectedUsuario.mail} · {selectedUsuario.area_desc || '-'}</p>
            </div>
          )}
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha de asignación
            </label>
            <DatePicker
              selected={fechaAsignacion}
              onChange={(d) => setFechaAsignacion(d)}
              dateFormat="dd/MM/yyyy"
              locale={es}
              maxDate={new Date()}
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Devolución esperada (opcional)</label>
            <DatePicker
              selected={fechaDevolucionEsperada}
              onChange={(d) => setFechaDevolucionEsperada(d)}
              dateFormat="dd/MM/yyyy"
              locale={es}
              minDate={fechaAsignacion}
              placeholderText="Sin fecha"
              isClearable
              className="input w-full"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="label">Notas (opcional)</label>
          <textarea {...register('notas')} className="input" rows={2} placeholder="Observaciones..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Asignando...' : 'Confirmar Asignación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
