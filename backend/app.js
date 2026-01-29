const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./database');
const usuariosRoutes = require('./routes/usuarios');
const insumosRoutes = require('./routes/insumos');
const prestamosRoutes = require('./routes/prestamos');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static files from React build in production
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
db.initialize();

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
