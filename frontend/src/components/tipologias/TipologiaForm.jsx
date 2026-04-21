import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import Modal from '../common/Modal';
import { tipologiasApi } from '../../services/api';

export default function TipologiaForm({ isOpen, onClose, onSuccess, tipologia }) {
  const [formData, setFormData] = useState({ nombre: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!tipologia;

  useEffect(() => {
    if (isOpen) {
      if (tipologia) {
        setFormData({ nombre: tipologia.desc || tipologia.nombre || '' });
      } else {
        setFormData({ nombre: '' });
      }
      setError(null);
    }
  }, [isOpen, tipologia]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await tipologiasApi.update(tipologia.id, formData);
      } else {
        await tipologiasApi.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Tipologia' : 'Nueva Tipologia'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Icon preview */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Tag className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            placeholder="Ej: Notebook, Mouse, Proyector..."
            className="input w-full"
          />
        </div>

        {/* Info card for editing */}
        {isEditing && tipologia.cantidad_items > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Esta categoría tiene <strong>{tipologia.cantidad_items}</strong> item(s) asociado(s).
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !formData.nombre?.trim()}
            className="btn btn-primary"
          >
            {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Tipologia'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
