import { useAuthStore } from '../store/auth'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

export default function Dashboard({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Certames', path: '/certames' },
    { label: 'Divisão de Períodos', path: '/divisao-periodos' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">GLC</h1>
          <p className="text-xs text-gray-500">Gestão e Logística de Certames</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.nome}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-52 bg-white border-r border-gray-200 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-700 font-medium border-r-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 px-8 py-8">
        <Outlet />
        </main>
      </div>
    </div>
  )
}