import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { ZoneDetailPage } from './pages/ZoneDetailPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}

export default App;
