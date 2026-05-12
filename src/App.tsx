import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { useColaboradorAuth } from './store/colaboradorAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Certames from './pages/Certames'
import CertameDetalhe from './pages/CertameDetalhe'
import DivisaoPeriodos from './pages/DivisaoPeriodos'
import Locais from './pages/Locais'
import Colaboradores from './pages/Colaboradores'
import ColaboradorLogin from './pages/portal/ColaboradorLogin'
import CompletarCadastro from './pages/portal/CompletarCadastro'
import ColaboradorPortal from './pages/portal/ColaboradorPortal'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" />
}

function PortalPrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useColaboradorAuth((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/portal/colaborador/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sistema principal */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        >
          <Route index element={<div />} />
          <Route path="certames" element={<Certames />} />
          <Route path="certames/:id" element={<CertameDetalhe />} />
          <Route path="divisao-periodos" element={<DivisaoPeriodos />} />
          <Route path="locais" element={<Locais />} />
          <Route path="colaboradores" element={<Colaboradores />} />
        </Route>

        {/* Portal do colaborador */}
        <Route path="/portal/colaborador/login" element={<ColaboradorLogin />} />
        <Route path="/portal/colaborador/completar-cadastro/:token" element={<CompletarCadastro />} />
        <Route
          path="/portal/colaborador"
          element={
            <PortalPrivateRoute>
              <ColaboradorPortal />
            </PortalPrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}