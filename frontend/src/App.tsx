import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/dashboard/DashboardPage'
import CustomerListPage from './pages/customers/CustomerListPage'
import TicketListPage from './pages/tickets/TicketListPage'
import KBListPage from './pages/knowledge-base/KBListPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import AICopilotPage from './pages/ai/AICopilotPage'
import BIPage from './pages/bi/BIPage'
import WorkflowsPage from './pages/workflows/WorkflowsPage'
import IntelligencePage from './pages/intelligence/IntelligencePage'
import SettingsPage from './pages/settings/SettingsPage'

function App() {
  const token = localStorage.getItem('token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={token ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="tickets" element={<TicketListPage />} />
          <Route path="knowledge-base" element={<KBListPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="copilot" element={<AICopilotPage />} />
          <Route path="bi" element={<BIPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="intelligence" element={<IntelligencePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
