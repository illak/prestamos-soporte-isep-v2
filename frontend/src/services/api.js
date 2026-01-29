const API_BASE = '/api';

// Utility function for API calls
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

// USUARIOS
export const usuariosApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/usuarios${queryString ? `?${queryString}` : ''}`);
  },

  getOne: (id) => fetchApi(`/usuarios/${id}`),

  getSoporteIt: () => fetchApi('/usuarios/soporte-it'),

  getAreas: () => fetchApi('/usuarios/areas'),

  create: (data) => fetchApi('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchApi(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchApi(`/usuarios/${id}`, { method: 'DELETE' }),

  restore: (id) => fetchApi(`/usuarios/${id}/restaurar`, { method: 'PUT' }),

  import: (file, modoConflicto = 'saltar') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modoConflicto', modoConflicto);
    return fetchApi('/usuarios/import', {
      method: 'POST',
      body: formData,
    });
  },

  export: (incluirInactivos = false) => {
    window.location.href = `${API_BASE}/usuarios/export?incluirInactivos=${incluirInactivos ? '1' : '0'}`;
  },
};

// INSUMOS
export const insumosApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/insumos${queryString ? `?${queryString}` : ''}`);
  },

  getOne: (id) => fetchApi(`/insumos/${id}`),

  getDisponibles: (busqueda = '') => {
    return fetchApi(`/insumos/disponibles${busqueda ? `?busqueda=${busqueda}` : ''}`);
  },

  getTipologias: () => fetchApi('/insumos/tipologias'),

  getEstados: () => fetchApi('/insumos/estados'),

  getHistorial: (id) => fetchApi(`/insumos/${id}/historial`),

  getPrestamoActivo: (id) => fetchApi(`/insumos/${id}/prestamo-activo`),

  create: (data) => fetchApi('/insumos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchApi(`/insumos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  updateEstado: (id, estado) => fetchApi(`/insumos/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado }),
  }),

  delete: (id) => fetchApi(`/insumos/${id}`, { method: 'DELETE' }),

  import: (file, modoConflicto = 'saltar') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modoConflicto', modoConflicto);
    return fetchApi('/insumos/import', {
      method: 'POST',
      body: formData,
    });
  },

  export: (estado = '') => {
    window.location.href = `${API_BASE}/insumos/export${estado ? `?estado=${estado}` : ''}`;
  },
};

// PRESTAMOS
export const prestamosApi = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/prestamos${queryString ? `?${queryString}` : ''}`);
  },

  getOne: (id) => fetchApi(`/prestamos/${id}`),

  create: (data) => fetchApi('/prestamos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchApi(`/prestamos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  devolver: (id, data = {}) => fetchApi(`/prestamos/${id}/devolver`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  export: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    window.location.href = `${API_BASE}/prestamos/export${queryString ? `?${queryString}` : ''}`;
  },
};

// DASHBOARD
export const dashboardApi = {
  getMetricas: () => fetchApi('/dashboard/metricas'),

  getPrestamosCriticos: () => fetchApi('/dashboard/prestamos-criticos'),

  getPrestamosAntiguos: (limit = 10) => fetchApi(`/dashboard/prestamos-antiguos?limit=${limit}`),

  getGraficos: () => fetchApi('/dashboard/graficos'),
};

export default {
  usuarios: usuariosApi,
  insumos: insumosApi,
  prestamos: prestamosApi,
  dashboard: dashboardApi,
};
