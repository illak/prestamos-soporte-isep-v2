# Sistema de Gestión de Préstamos de Equipos Informáticos

**ISEP - Instituto Superior de Estudios Pedagógicos, Córdoba, Argentina**

Sistema web para gestionar préstamos de equipos informáticos (notebooks, periféricos, etc.) con control de devoluciones, alertas visuales, estadísticas y **bot de Telegram** para gestión remota.

## Características Principales

### Aplicación Web
- **Gestión de Usuarios**: CRUD completo con roles (usuario y soporte_it)
  - Selector de área/equipo con opciones desde la base de datos
  - Posibilidad de agregar nuevas áreas personalizadas
  - Importación/Exportación CSV
- **Gestión de Insumos**: Inventario de equipos con estados (Disponible, En préstamo, En mantenimiento, Dado de baja)
  - Estadísticas por estado con filtros rápidos
  - Historial de préstamos por equipo
  - Importación/Exportación CSV
- **Gestión de Tipologías**: Administración dinámica de tipos de equipamiento
  - Crear, editar, eliminar tipos
  - Activar/desactivar tipologías
  - Contador de insumos por tipo
- **Sistema de Préstamos**:
  - Flujos rápidos de préstamo/devolución desde listado de insumos (2 clics)
  - Alertas visuales por días transcurridos sin devolución
  - Selector de responsable IT
- **Dashboard con Gráficos**:
  - 3 métricas principales: Activos hoy, Pendientes de devolución, Insumos disponibles
  - 6 gráficos: Préstamos por día (tipología), Préstamos por día (área), Distribución por tipología, Insumos más prestados, Usuarios con más préstamos activos, Préstamos más antiguos
- **Tema Oscuro/Claro**: Toggle de tema con preferencia guardada (oscuro por defecto)
- **Branding ISEP**: Logo del instituto en el encabezado

### Bot de Telegram
- Gestión completa de préstamos desde Telegram
- Menú interactivo con botones inline
- Búsqueda de insumos y usuarios
- Registro de préstamos y devoluciones
- Vista de préstamos activos con alertas
- Resumen diario de métricas
- Sistema de autorización por ID de Telegram

## Stack Tecnológico

- **Frontend**: React 18 + Tailwind CSS + Recharts
- **Backend**: Node.js + Express
- **Base de datos**: SQLite (better-sqlite3)
- **Bot**: node-telegram-bot-api
- **Containerización**: Docker + Docker Compose

---

## Instalación y Ejecución

### Opción 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <repo-url>
cd prestamos-soporte-isep-v2

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu token de Telegram (ver sección Bot de Telegram)

# Construir y ejecutar
docker compose up --build

# Acceder a la aplicación
# http://localhost:3000
```

### Opción 2: Desarrollo Local

```bash
# Backend
cd backend
npm install
node seed.js  # Opcional: cargar datos de ejemplo
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev

# Bot de Telegram (en otra terminal, opcional)
cd backend
npm run bot:dev
```

---

## Bot de Telegram

### Configuración

1. **Crear el bot en Telegram:**
   - Abrí Telegram y buscá **@BotFather**
   - Enviá `/newbot` y seguí las instrucciones
   - Copiá el **token** que te proporciona

2. **Obtener tu ID de Telegram:**
   - Buscá **@userinfobot** o **@getmyid_bot** en Telegram
   - Enviá cualquier mensaje
   - Copiá tu **ID numérico**

3. **Configurar variables de entorno:**

```bash
cp .env.example .env
```

Editá el archivo `.env`:

```env
# Token del bot (de @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# IDs autorizados (separados por coma, sin espacios)
TELEGRAM_ALLOWED_IDS=123456789,987654321

# Opcional: Canal para notificaciones
TELEGRAM_ALERT_CHANNEL_ID=-1001234567890
```

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/start` | Iniciar bot y mostrar menú |
| `/menu` | Mostrar menú principal |
| `/prestar` | Registrar nuevo préstamo |
| `/devolver` | Registrar devolución |
| `/activos` | Ver préstamos activos |
| `/resumen` | Resumen del día |
| `/buscar` | Buscar insumo o usuario |
| `/ayuda` | Mostrar ayuda |

### Flujo de Préstamo

```
1. /prestar o botón "Nuevo Préstamo"
2. Escribir nombre del insumo → Seleccionar de la lista
3. Escribir nombre del usuario → Seleccionar de la lista
4. Seleccionar responsable IT
5. Confirmar préstamo
```

### Flujo de Devolución

```
1. /devolver o botón "Devolución"
2. Seleccionar préstamo de la lista de activos
3. Agregar observaciones (opcional)
4. Confirmar devolución
```

### Ejecución del Bot

**Con Docker (junto con la app):**
```bash
docker compose up -d
```

**Solo el bot (desarrollo):**
```bash
cd backend
npm run bot:dev
```

---

## Estructura del Proyecto

```
prestamos-soporte-isep-v2/
├── backend/
│   ├── app.js              # Punto de entrada API
│   ├── database.js         # Configuración SQLite
│   ├── seed.js             # Datos de ejemplo
│   ├── routes/
│   │   ├── usuarios.js     # API de usuarios
│   │   ├── insumos.js      # API de insumos
│   │   ├── prestamos.js    # API de préstamos
│   │   ├── tipologias.js   # API de tipologías
│   │   └── dashboard.js    # API de métricas
│   ├── bot/
│   │   ├── index.js        # Punto de entrada bot
│   │   ├── config.js       # Configuración
│   │   ├── handlers/       # Manejadores de comandos
│   │   ├── keyboards/      # Teclados inline
│   │   ├── services/       # Cliente API
│   │   └── utils/          # Utilidades
│   └── utils/
│       └── helpers.js      # Funciones auxiliares
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Llamadas a API
│   │   └── utils/          # Funciones auxiliares
│   └── ...
├── Dockerfile              # Imagen app principal
├── Dockerfile.bot          # Imagen bot Telegram
├── docker-compose.yml
├── .env.example            # Template de variables
└── README.md
```

---

## Base de Datos

### Tabla: usuarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | PK autoincremental |
| mail | TEXT | Email único |
| nombre | TEXT | Nombre |
| apellido | TEXT | Apellido |
| dni | TEXT | DNI único |
| area_equipo | TEXT | Área/departamento |
| rol | TEXT | 'usuario' o 'soporte_it' |
| activo | BOOLEAN | Soft delete |

### Tabla: insumos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | PK autoincremental |
| tipologia | TEXT | Tipo (Notebook, Mouse, etc.) |
| nombre | TEXT | Nombre descriptivo |
| descripcion | TEXT | Características |
| numero_serie | TEXT | Número de serie único |
| estado | TEXT | Disponible/En préstamo/En mantenimiento/Dado de baja |
| observaciones | TEXT | Notas |

### Tabla: tipologias

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | PK autoincremental |
| nombre | TEXT | Nombre único |
| descripcion | TEXT | Descripción |
| activo | BOOLEAN | Si está disponible para usar |

### Tabla: prestamos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | PK autoincremental |
| usuario_id | INTEGER | FK a usuarios |
| insumo_id | INTEGER | FK a insumos |
| usuario_it_id | INTEGER | FK a usuarios (soporte_it) |
| fecha_hora_prestamo | DATETIME | Fecha del préstamo |
| fecha_hora_devolucion_real | DATETIME | Fecha de devolución |
| estado | TEXT | Activo/Devuelto |
| observaciones_prestamo | TEXT | Notas del préstamo |
| observaciones_devolucion | TEXT | Notas de devolución |

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `DB_PATH` | Ruta a la base de datos | `/app/data/prestamos.db` |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | `123456:ABC...` |
| `TELEGRAM_ALLOWED_IDS` | IDs autorizados (coma) | `123,456,789` |
| `TELEGRAM_ALERT_CHANNEL_ID` | Canal para alertas | `-1001234567890` |
| `API_BASE_URL` | URL de la API (para bot) | `http://app:3000/api` |
| `DIAS_CRITICOS` | Días para alerta crítica | `3` |

---

## Formato CSV para Importación

### Usuarios
```csv
mail,nombre,apellido,dni,area_equipo,rol
juan.perez@isep.edu.ar,Juan,Pérez,12345678,Administración,usuario
carlos.it@isep.edu.ar,Carlos,García,23456789,Soporte IT,soporte_it
```

### Insumos
```csv
tipologia,nombre,descripcion,numero_serie,observaciones
Notebook,Lenovo ThinkPad T14,Intel i5 8GB RAM,LNV-001,
Mouse,Logitech M185,Inalámbrico,,
```

---

## Sistema de Roles

- **usuario**: Puede recibir préstamos de equipos
- **soporte_it**: Puede gestionar préstamos (aparece como responsable IT en el selector)

Un usuario con rol `soporte_it` también puede recibir préstamos.

---

## Sistema de Alertas

Los préstamos activos muestran alertas visuales según los días transcurridos:

| Días | Color | Alerta |
|------|-------|--------|
| 0 | Verde | Activo hoy |
| 1 | Amarillo | Advertencia |
| 2-3 | Naranja | Alerta |
| 4+ | Rojo | Crítico |

---

## API Endpoints

### Usuarios
- `GET /api/usuarios` - Listar (con filtros y paginación)
- `POST /api/usuarios` - Crear
- `PUT /api/usuarios/:id` - Actualizar
- `DELETE /api/usuarios/:id` - Desactivar (soft delete)
- `PUT /api/usuarios/:id/restaurar` - Restaurar usuario
- `GET /api/usuarios/soporte-it` - Listar solo soporte IT
- `GET /api/usuarios/areas` - Listar áreas únicas
- `POST /api/usuarios/import` - Importar CSV
- `GET /api/usuarios/export` - Exportar CSV

### Insumos
- `GET /api/insumos` - Listar (con filtros y paginación)
- `POST /api/insumos` - Crear
- `PUT /api/insumos/:id` - Actualizar
- `DELETE /api/insumos/:id` - Eliminar
- `GET /api/insumos/disponibles` - Listar disponibles
- `GET /api/insumos/:id/historial` - Historial de préstamos
- `GET /api/insumos/:id/prestamo-activo` - Préstamo activo actual
- `GET /api/insumos/tipologias` - Listar tipologías
- `GET /api/insumos/estados` - Listar estados
- `POST /api/insumos/import` - Importar CSV
- `GET /api/insumos/export` - Exportar CSV

### Tipologías
- `GET /api/tipologias` - Listar (con conteo de insumos)
- `GET /api/tipologias/nombres` - Solo nombres (para selects)
- `GET /api/tipologias/:id` - Obtener una
- `POST /api/tipologias` - Crear
- `PUT /api/tipologias/:id` - Actualizar
- `PUT /api/tipologias/:id/toggle` - Activar/Desactivar
- `DELETE /api/tipologias/:id` - Eliminar (si no tiene insumos)

### Préstamos
- `GET /api/prestamos` - Listar (con filtros y paginación)
- `POST /api/prestamos` - Crear préstamo
- `PUT /api/prestamos/:id` - Actualizar (solo activos)
- `PUT /api/prestamos/:id/devolver` - Registrar devolución
- `GET /api/prestamos/export` - Exportar CSV

### Dashboard
- `GET /api/dashboard/metricas` - Métricas principales
- `GET /api/dashboard/graficos` - Datos para gráficos
- `GET /api/dashboard/prestamos-criticos` - Préstamos críticos (4+ días)
- `GET /api/dashboard/prestamos-antiguos` - Top préstamos más antiguos

---

## Docker

### Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `app` | 3000 | Aplicación web (frontend + API) |
| `telegram-bot` | - | Bot de Telegram |

### Comandos Útiles

```bash
# Iniciar todo
docker compose up -d

# Ver logs
docker compose logs -f

# Ver logs del bot
docker compose logs -f telegram-bot

# Reconstruir
docker compose up --build -d

# Detener
docker compose down

# Limpiar todo (incluye volúmenes)
docker compose down -v
```

---

## Licencia

MIT License - ISEP Córdoba, Argentina 2026
