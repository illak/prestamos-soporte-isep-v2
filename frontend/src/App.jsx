import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import DashboardPage from './pages/DashboardPage';
import UsuariosPage from './pages/UsuariosPage';
import InsumosPage from './pages/InsumosPage';
import PrestamosPage from './pages/PrestamosPage';
import TipologiasPage from './pages/TipologiasPage';
import UbicacionesPage from './pages/UbicacionesPage';
import AreasPage from './pages/AreasPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/insumos" element={<InsumosPage />} />
        <Route path="/tipologias" element={<TipologiasPage />} />
        <Route path="/prestamos" element={<PrestamosPage />} />
        <Route path="/ubicaciones" element={<UbicacionesPage />} />
        <Route path="/areas" element={<AreasPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
