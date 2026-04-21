import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { usuariosApi } from '../../services/api';

export default function UsuarioForm({ isOpen, onClose, onSuccess, usuario }) {
  const isEditing = !!usuario;
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      mail: '',
      nombre: '',
      apellido: '',
      dni: '',
      id_area: '',
      rol: 'usuario',
    },
  });

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
      reset({
        mail: usuario.mail,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        dni: usuario.dni,
        id_area: usuario.id_area ?? '',
        rol: usuario.rol,
      });
    } else {
      reset({ mail: '', nombre: '', apellido: '', dni: '', id_area: '', rol: 'usuario' });
    }
  }, [usuario, reset, areas]);

  const onSubmit = async (data) => {
    const submitData = {
      mail: data.mail,
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      id_area: data.id_area ? parseInt(data.id_area) : null,
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
          <label className="label">Área</label>
          {loadingAreas ? (
            <div className="input bg-gray-100 dark:bg-gray-700 flex items-center">
              <span className="text-gray-500 dark:text-gray-400">Cargando áreas...</span>
            </div>
          ) : (
            <select {...register('id_area')} className="input">
              <option value="">Sin área asignada</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.desc}</option>
              ))}
            </select>
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
