import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { usuariosApi } from '../../services/api';

export default function UsuarioForm({ isOpen, onClose, onSuccess, usuario, areas }) {
  const isEditing = !!usuario;

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
      area_equipo: '',
      rol: 'usuario',
    },
  });

  useEffect(() => {
    if (usuario) {
      reset({
        mail: usuario.mail,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        dni: usuario.dni,
        area_equipo: usuario.area_equipo,
        rol: usuario.rol,
      });
    } else {
      reset({
        mail: '',
        nombre: '',
        apellido: '',
        dni: '',
        area_equipo: '',
        rol: 'usuario',
      });
    }
  }, [usuario, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await usuariosApi.update(usuario.id, data);
        toast.success('Usuario actualizado correctamente');
      } else {
        await usuariosApi.create(data);
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
          <input
            type="text"
            list="areas-list"
            {...register('area_equipo', {
              required: 'El área es requerida',
            })}
            className="input"
            placeholder="Sistemas, Administración, Pedagógico..."
          />
          <datalist id="areas-list">
            {areas.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
          {errors.area_equipo && (
            <p className="text-red-500 text-sm mt-1">{errors.area_equipo.message}</p>
          )}
        </div>

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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
