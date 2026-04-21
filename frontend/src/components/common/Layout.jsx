import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Menu,
  X,
  AlertTriangle,
  Moon,
  Sun,
  Tag,
  MapPin
} from 'lucide-react';
import { dashboardApi } from '../../services/api';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Usuarios', href: '/usuarios', icon: Users },
  { name: 'Inventario', href: '/insumos', icon: Package },
  { name: 'Categorías', href: '/tipologias', icon: Tag },
  { name: 'Áreas', href: '/areas', icon: Users },
  { name: 'Ubicaciones', href: '/ubicaciones', icon: MapPin },
  { name: 'Préstamos', href: '/prestamos', icon: ClipboardList },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertas, setAlertas] = useState({ pendientes: 0, criticos: 0 });
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or default to dark
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const location = useLocation();

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const response = await dashboardApi.getMetricas();
        if (response.success) {
          setAlertas({
            pendientes: response.data.prestamos.pendientes,
            criticos: response.data.prestamos.desglose.dias_4_plus
          });
        }
      } catch (error) {
        console.error('Error fetching alertas:', error);
      }
    };

    fetchAlertas();
    const interval = setInterval(fetchAlertas, 60000);

    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-opacity-90 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">ISEP Préstamos</span>
          </div>
          <button
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-4 px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400'}`} />
                {item.name}
                {item.name === 'Préstamos' && alertas.pendientes > 0 && (
                  <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                    alertas.criticos > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                  }`}>
                    {alertas.pendientes}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Alert box at bottom of sidebar */}
        {alertas.criticos > 0 && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <div>
                  <p className="text-xs font-medium text-red-800 dark:text-red-400">
                    {alertas.criticos} préstamo(s) crítico(s)
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">4+ días sin devolver</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white lg:hidden">ISEP Préstamos</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              {/* Logo del instituto */}
              <div className="hidden sm:block dark:bg-white/90 dark:rounded-lg dark:px-2 dark:py-1">
                <img
                  src="https://isep-cba.edu.ar/web/wp-content/uploads/2017/08/Isologo_ISEP_Encabezado.png"
                  alt="ISEP - Instituto Superior de Estudios Pedagógicos"
                  className="h-10"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
