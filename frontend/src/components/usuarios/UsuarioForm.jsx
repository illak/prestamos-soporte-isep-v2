import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { usuariosApi } from '../../services/api';

export default function UsuarioForm({ isOpen, onClose, onSuccess, usuario }) {
  const isEditing = !!usuario;
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [customArea, setCustomArea] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      mail: '',
      nombre: '',
      apellido: '',
      dni: '',
      area_equipo: '',
      area_equipo_custom: '',
      rol: 'usuario',
    },
  });

  const areaSeleccionada = watch('area_equipo');

  // Cargar áreas existentes
  useEffect(() => {
    const fetchAreas = async () => {
      setLoadingAreas(true);
      try {
        const response = await usuariosApi.getAreas();
        if (response.success) {
          setAreas(response.data || []);
        }
      } catch (error) {
        console.error('Error cargando áreas:', error);
      } finally {
        setLoadingAreas(false);
      }
    };

    if (isOpen) {
      fetchAreas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (usuario) {
      // Verificar si el área del usuario está en la lista
      const areaEnLista = areas.includes(usuario.area_equipo);
      setCustomArea(!areaEnLista && areas.length > 0);

      reset({
        mail: usuario.mail,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        dni: usuario.dni,
        area_equipo: areaEnLista ? usuario.area_equipo : '__custom__',
        area_equipo_custom: !areaEnLista ? usuario.area_equipo : '',
        rol: usuario.rol,
      });
    } else {
      setCustomArea(false);
      reset({
        mail: '',
        nombre: '',
        apellido: '',
        dni: '',
        area_equipo: '',
        area_equipo_custom: '',
        rol: 'usuario',
      });
    }
  }, [usuario, reset, areas]);

  // Manejar cambio de área
  useEffect(() => {
    if (areaSeleccionada === '__custom__') {
      setCustomArea(true);
    } else if (areaSeleccionada !== '__custom__' && areaSeleccionada !== '') {
      setCustomArea(false);
      setValue('area_equipo_custom', '');
    }
  }, [areaSeleccionada, setValue]);

  const onSubmit = async (data) => {
    // Determinar el área final
    const areaFinal = data.area_equipo === '__custom__' || customArea
      ? data.area_equipo_custom
      : data.area_equipo;

    if (!areaFinal || areaFinal.trim() === '') {
      toast.error('El área es requerida');
      return;
    }

    const submitData = {
      mail: data.mail,
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      area_equipo: areaFinal.trim(),
      rol: data.rol,
    };

    try {
      if (isEditing) {
        await usuariosApi.update(usuario.id, submitData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuariosApi.create(submitData);
        toast.success('Usuario creado correctamente');
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
      title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              {...register('nombre', {
                required: 'El nombre es requerido',
                pattern: {
                  value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                  message: 'Solo se permiten letras',
                },
              })}
              className="input"
              placeholder="Juan"
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="label">Apellido *</label>
            <input
              type="text"
              {...register('apellido', {
                required: 'El apellido es requerido',
                pattern: {
                  value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                  message: 'Solo se permiten letras',
                },
              })}
              className="input"
              placeholder="Pérez"
            />
            {errors.apellido && (
              <p className="text-red-500 text-sm mt-1">{errors.apellido.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            {...register('mail', {
              required: 'El email es requerido',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email inválido',
              },
            })}
            className="input"
            placeholder="juan.perez@isep.edu.ar"
          />
          {errors.mail && (
            <p className="text-red-500 text-sm mt-1">{errors.mail.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">DNI *</label>
            <input
              type="text"
              {...register('dni', {
                required: 'El DNI es requerido',
                pattern: {
                  value: /^\d+$/,
                  message: 'Solo se permiten números',
                },
              })}
              className="input"
              placeholder="12345678"
            />
            {errors.dni && (
              <p className="text-red-500 text-sm mt-1">{errors.dni.message}</p>
            )}
          </div>

          <div>
            <label className="label">Rol *</label>
            <select
              {...register('rol', { required: 'El rol es requerido' })}
              className="input"
            >
              <option value="usuario">Usuario</option>
              <option value="soporte_it">Soporte IT</option>
            </select>
            {errors.rol && (
              <p className="text-red-500 text-sm mt-1">{errors.rol.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Área/Equipo *</label>
          {loadingAreas ? (
            <div className="input bg-gray-100 dark:bg-gray-700 flex items-center">
              <span className="text-gray-500 dark:text-gray-400">Cargando áreas...</span>
            </div>
          ) : areas.length > 0 ? (
            <>
              <select
                {...register('area_equipo', {
                  required: !customArea ? 'El área es requerida' : false,
                })}
                className="input"
              >
                <option value="">Seleccionar área...</option>
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
                <option value="__custom__">+ Agregar nueva área</option>
              </select>

              {customArea && (
                <div className="mt-2">
                  <input
                    type="text"
                    {...register('area_equipo_custom', {
                      required: customArea ? 'El área personalizada es requerida' : false,
                    })}
                    className="input"
                    placeholder="Escribir nombre del área..."
                  />
                </div>
              )}
            </>
          ) : (
            <input
              type="text"
              {...register('area_equipo_custom', {
                required: 'El área es requerida',
              })}
              className="input"
              placeholder="Ej: Sistemas, Administración, Pedagógico..."
            />
          )}
          {errors.area_equipo && (
            <p className="text-red-500 text-sm mt-1">{errors.area_equipo.message}</p>
          )}
          {errors.area_equipo_custom && (
            <p className="text-red-500 text-sm mt-1">{errors.area_equipo_custom.message}</p>
          )}
          {areas.length === 0 && !loadingAreas && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              No hay áreas cargadas. Ingrese el nombre del área manualmente o importe usuarios con áreas definidas.
            </p>
          )}
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
