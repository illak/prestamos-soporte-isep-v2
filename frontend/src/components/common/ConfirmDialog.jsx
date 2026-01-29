import Modal from './Modal';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // warning, danger, info
  loading = false,
}) {
  const icons = {
    warning: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
    danger: <Trash2 className="w-12 h-12 text-red-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />,
  };

  const buttonClasses = {
    warning: 'btn-warning',
    danger: 'btn-danger',
    info: 'btn-primary',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center mb-4">
          {icons[type]}
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-outline"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${buttonClasses[type]}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
