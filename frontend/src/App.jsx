import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import DashboardPage from './pages/DashboardPage';
import UsuariosPage from './pages/UsuariosPage';
import InsumosPage from './pages/InsumosPage';
import PrestamosPage from './pages/PrestamosPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/insumos" element={<InsumosPage />} />
        <Route path="/prestamos" element={<PrestamosPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
