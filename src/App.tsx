import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Certames from './pages/Certames'
import CertameDetalhe from './pages/CertameDetalhe'
import DivisaoPeriodos from './pages/DivisaoPeriodos'
import Locais from './pages/Locais'
import Colaboradores from './pages/Colaboradores'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}