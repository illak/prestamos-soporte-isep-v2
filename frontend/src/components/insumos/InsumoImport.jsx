import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Upload, FileText, AlertCircle, XCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { insumosApi } from '../../services/api';

export default function InsumoImport({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [modoConflicto, setModoConflicto] = useState('saltar');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Solo se permiten archivos CSV');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        toast.error('Solo se permiten archivos CSV');
        return;
      }
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Seleccione un archivo');
      return;
    }

    setImporting(true);
    try {
      const response = await insumosApi.import(file, modoConflicto);
      setResult(response);
      if (response.resumen.procesados > 0) {
        toast.success(`Se importaron ${response.resumen.procesados} insumo(s)`);
      }
      if (response.resumen.errores > 0) {
        toast.warning(`${response.resumen.errores} registro(s) con errores`);
      }
    } catch (error) {
      toast.error('Error al importar: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    if (result && result.resumen.procesados > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Insumos" size="lg">
      <div className="space-y-4">
        {/* Formato esperado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Formato CSV esperado:</h4>
          <code className="text-sm text-blue-700 block bg-blue-100 p-2 rounded">
            tipologia,nombre,descripcion,numero_serie,observaciones
          </code>
          <p className="text-sm text-blue-600 mt-2">
            Todos los insumos importados tendrán estado "Disponible"
          </p>
        </div>

        {/* File drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <FileText className="w-8 h-8" />
              <span className="font-medium">{file.name}</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Arrastra un archivo CSV aquí o haz clic para seleccionar</p>
            </div>
          )}
        </div>

        {/* Modo conflicto */}
        <div>
          <label className="label">Manejo de duplicados (por número de serie)</label>
          <select
            value={modoConflicto}
            onChange={(e) => setModoConflicto(e.target.value)}
            className="input"
          >
            <option value="saltar">Saltar registros duplicados</option>
            <option value="actualizar">Actualizar registros existentes</option>
            <option value="cancelar">Cancelar si hay duplicados</option>
          </select>
        </div>

        {/* Resultados */}
        {result && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Resultado de la importación:</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-gray-700">{result.resumen.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-2xl font-bold text-green-700">{result.resumen.procesados}</p>
                <p className="text-sm text-green-600">Procesados</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <p className="text-2xl font-bold text-yellow-700">{result.resumen.saltados}</p>
                <p className="text-sm text-yellow-600">Saltados</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <p className="text-2xl font-bold text-red-700">{result.resumen.errores}</p>
                <p className="text-sm text-red-600">Errores</p>
              </div>
            </div>

            {result.detalles.errores.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Errores:
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.detalles.errores.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Línea {err.linea}: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.detalles.saltados.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-yellow-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Saltados:
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.detalles.saltados.map((item, idx) => (
                    <p key={idx} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      Línea {item.linea}: {item.motivo}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-outline"
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="btn btn-primary"
            >
              {importing ? 'Importando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
