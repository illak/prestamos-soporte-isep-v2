const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./database');
const usuariosRoutes = require('./routes/usuarios');
const inventarioRoutes = require('./routes/inventario');
const prestamosRoutes = require('./routes/prestamos');
const dashboardRoutes = require('./routes/dashboard');
const categoriasRoutes = require('./routes/categorias');
const areasRoutes = require('./routes/areas');
const tiposRoutes = require('./routes/tipos');
const estadosRoutes = require('./routes/estados');
const ubicacionesRoutes = require('./routes/ubicaciones');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/tipos', tiposRoutes);
app.use('/api/estados', estadosRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);

// Serve static files from React build in production
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

db.initialize();

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
