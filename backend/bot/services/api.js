/**
 * Cliente API para consumir el backend desde el bot
 */

const config = require('../config');

/**
 * Realiza una petición a la API
 * @param {string} endpoint - Endpoint de la API (sin /api)
 * @param {object} options - Opciones de fetch
 * @returns {Promise<object>}
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${config.apiBaseUrl}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }

  return data;
}

/**
 * API de Insumos
 */
const insumosApi = {
  /**
   * Obtener insumos disponibles
   * @param {string} busqueda - Término de búsqueda (opcional)
   * @returns {Promise<object>}
   */
  async getDisponibles(busqueda = '') {
    const params = new URLSearchParams();
    if (busqueda) params.append('busqueda', busqueda);
    return fetchApi(`/inventario/disponibles?${params}`);
  },

  /**
   * Obtener un insumo por ID
   * @param {number} id
   * @returns {Promise<object>}
   */
  async getOne(id) {
    return fetchApi(`/inventario/${id}`);
  },

  /**
   * Obtener todos los insumos
   * @param {object} params - Parámetros de búsqueda
   * @returns {Promise<object>}
   */
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/inventario?${queryString}`);
  },

  /**
   * Obtener items asignables disponibles (condicion=Asignable, estado=Disponible)
   */
  async getAsignablesDisponibles(busqueda = '') {
    const params = new URLSearchParams({ condicion: 'Asignable', estado_desc: 'Disponible', limit: '50' });
    if (busqueda) params.append('busqueda', busqueda);
    return fetchApi(`/inventario?${params}`);
  },

  /**
   * Obtener items asignados actualmente (condicion=Asignable, estado=Asignado)
   */
  async getAsignados(busqueda = '') {
    const params = new URLSearchParams({ condicion: 'Asignable', estado_desc: 'Asignado', limit: '50' });
    if (busqueda) params.append('busqueda', busqueda);
    return fetchApi(`/inventario?${params}`);
  },

  /**
   * Asignar un item a una ubicación (y opcionalmente a una persona)
   */
  async asignar(id, data) {
    return fetchApi(`/inventario/${id}/asignar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Liberar un item asignado
   */
  async liberar(id, data = {}) {
    return fetchApi(`/inventario/${id}/liberar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * API de Ubicaciones
 */
const ubicacionesApi = {
  async getAll() {
    return fetchApi('/ubicaciones?activo=1');
  },
  async getOne(id) {
    return fetchApi(`/ubicaciones/${id}`);
  },
};

/**
 * API de Usuarios
 */
const usuariosApi = {
  /**
   * Buscar usuarios activos
   * @param {string} busqueda - Término de búsqueda
   * @param {number} limit - Límite de resultados
   * @returns {Promise<object>}
   */
  async buscar(busqueda, limit = 10) {
    const params = new URLSearchParams({
      activo: '1',
      busqueda,
      limit: String(limit),
    });
    return fetchApi(`/usuarios?${params}`);
  },

  /**
   * Obtener usuarios de soporte IT
   * @returns {Promise<object>}
   */
  async getSoporteIt() {
    return fetchApi('/usuarios/soporte-it');
  },

  /**
   * Obtener un usuario por ID
   * @param {number} id
   * @returns {Promise<object>}
   */
  async getOne(id) {
    return fetchApi(`/usuarios/${id}`);
  },
};

/**
 * API de Préstamos
 */
const prestamosApi = {
  /**
   * Obtener préstamos activos
   * @returns {Promise<object>}
   */
  async getActivos() {
    return fetchApi('/prestamos?estado=Activo&limit=100');
  },

  /**
   * Obtener préstamos críticos (más de X días)
   * @returns {Promise<object>}
   */
  async getCriticos() {
    return fetchApi('/dashboard/prestamos-criticos');
  },

  /**
   * Crear un nuevo préstamo
   * @param {object} data - Datos del préstamo
   * @returns {Promise<object>}
   */
  async crear(data) {
    return fetchApi('/prestamos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Registrar devolución
   * @param {number} id - ID del préstamo
   * @param {object} data - Datos de la devolución
   * @returns {Promise<object>}
   */
  async devolver(id, data = {}) {
    return fetchApi(`/prestamos/${id}/devolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener un préstamo por ID
   * @param {number} id
   * @returns {Promise<object>}
   */
  async getOne(id) {
    return fetchApi(`/prestamos/${id}`);
  },
};

/**
 * API de Dashboard
 */
const dashboardApi = {
  /**
   * Obtener métricas generales
   * @returns {Promise<object>}
   */
  async getMetricas() {
    return fetchApi('/dashboard/metricas');
  },

  /**
   * Obtener préstamos críticos
   * @returns {Promise<object>}
   */
  async getPrestamosCriticos() {
    return fetchApi('/dashboard/prestamos-criticos');
  },

  /**
   * Obtener resumen para gráficos
   * @returns {Promise<object>}
   */
  async getGraficos() {
    return fetchApi('/dashboard/graficos');
  },
};

module.exports = {
  fetchApi,
  insumosApi,
  usuariosApi,
  prestamosApi,
  dashboardApi,
  ubicacionesApi,
};
