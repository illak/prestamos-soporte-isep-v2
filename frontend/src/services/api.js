const API_BASE = '/api';

// Filtra undefined/null/'' antes de pasarlos a URLSearchParams
function buildQuery(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return new URLSearchParams(clean).toString();
}

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
    const queryString = buildQuery(params);
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

// INVENTARIO (antes: insumos)
export const insumosApi = {
  getAll: (params = {}) => {
    const queryString = buildQuery(params);
    return fetchApi(`/inventario${queryString ? `?${queryString}` : ''}`);
  },

  getOne: (id) => fetchApi(`/inventario/${id}`),

  getDisponibles: (busqueda = '') => {
    return fetchApi(`/inventario/disponibles${busqueda ? `?busqueda=${busqueda}` : ''}`);
  },

  // Retorna [{id, desc}] desde /categorias/nombres
  getTipologias: () => fetchApi('/categorias/nombres'),
  getCategorias: () => fetchApi('/categorias/nombres'),

  // Retorna [{id, desc}] desde /inventario/estados
  getEstados: () => fetchApi('/inventario/estados'),

  getHistorial: (id) => fetchApi(`/inventario/${id}/historial`),

  getPrestamoActivo: (id) => fetchApi(`/inventario/${id}/prestamo-activo`),

  create: (data) => fetchApi('/inventario', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchApi(`/inventario/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  updateEstado: (id, id_estado) => fetchApi(`/inventario/${id}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id_estado }),
  }),

  delete: (id) => fetchApi(`/inventario/${id}`, { method: 'DELETE' }),

  asignar: (id, data) => fetchApi(`/inventario/${id}/asignar`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  liberar: (id, data = {}) => fetchApi(`/inventario/${id}/liberar`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  import: (file, modoConflicto = 'saltar') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modoConflicto', modoConflicto);
    return fetchApi('/inventario/import', {
      method: 'POST',
      body: formData,
    });
  },

  export: () => {
    window.location.href = `${API_BASE}/inventario/export`;
  },
};

// PRESTAMOS
export const prestamosApi = {
  getAll: (params = {}) => {
    const queryString = buildQuery(params);
    return fetchApi(`/prestamos${queryString ? `?${queryString}` : ''}`);
  },

  getOne: (id) => fetchApi(`/prestamos/${id}`),

  create: (data) => fetchApi('/prestamos', {
    method: 'POST',
    // acepta inventario_id (nuevo) o insumo_id (compat)
    body: JSON.stringify({ ...data, inventario_id: data.inventario_id ?? data.insumo_id }),
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
    const queryString = buildQuery(params);
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

// CATEGORIAS (antes: tipologias)
export const tipologiasApi = {
  getAll: (params = {}) => {
    const queryString = buildQuery(params);
    return fetchApi(`/categorias${queryString ? `?${queryString}` : ''}`);
  },

  getNombres: () => fetchApi('/categorias/nombres'),

  getOne: (id) => fetchApi(`/categorias/${id}`),

  getInsumos: (id) => fetchApi(`/categorias/${id}/inventario`),

  // body usa {desc} en vez de {nombre}
  create: (data) => fetchApi('/categorias', {
    method: 'POST',
    body: JSON.stringify({ desc: data.nombre ?? data.desc, ...data }),
  }),

  update: (id, data) => fetchApi(`/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ desc: data.nombre ?? data.desc, ...data }),
  }),

  toggle: (id) => fetchApi(`/categorias/${id}/toggle`, { method: 'PUT' }),

  delete: (id) => fetchApi(`/categorias/${id}`, { method: 'DELETE' }),
};

export const categoriasApi = tipologiasApi;

// UBICACIONES
export const ubicacionesApi = {
  getAll: (params = {}) => {
    const queryString = buildQuery(params);
    return fetchApi(`/ubicaciones${queryString ? `?${queryString}` : ''}`);
  },

  create: (data) => fetchApi('/ubicaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchApi(`/ubicaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchApi(`/ubicaciones/${id}`, { method: 'DELETE' }),
};

export default {
  usuarios: usuariosApi,
  insumos: insumosApi,
  prestamos: prestamosApi,
  dashboard: dashboardApi,
  tipologias: tipologiasApi,
};
