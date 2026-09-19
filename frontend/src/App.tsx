import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ZoneDetailPage } from './pages/ZoneDetailPage';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Facility Health Dashboard</h1>
        <p className="app-header__subtitle">HVAC fault detection across your buildings</p>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
