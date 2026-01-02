import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  FiHome,
  FiPieChart,
  FiFileText,
  FiRepeat,
  FiCreditCard,
  FiLogOut,
  FiChevronRight,
  FiUser,
  FiTag,
} from 'react-icons/fi'

const menuItems = [
  { path: '/', icon: FiHome, label: 'Dashboard' },
  { path: '/orcamento', icon: FiPieChart, label: 'Orçamento' },
  { path: '/contas-pagar', icon: FiFileText, label: 'Contas a Pagar' },
  { path: '/transacoes', icon: FiRepeat, label: 'Transações' },
  { path: '/contas', icon: FiCreditCard, label: 'Contas' },
  { path: '/categorias', icon: FiTag, label: 'Categorias' },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out z-50 flex flex-col ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-xl">
            G
          </div>
          <span
            className={`font-bold text-xl transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            GranoFin
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon size={24} className="min-w-[24px]" />
                <span
                  className={`whitespace-nowrap transition-opacity duration-300 ${
                    isExpanded ? 'opacity-100' : 'opacity-0 w-0'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User & Logout */}
      <div className="border-t border-gray-800 p-3">
        <div
          className={`flex items-center gap-3 px-3 py-2 mb-2 ${
            isExpanded ? '' : 'justify-center'
          }`}
        >
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <FiUser size={20} />
          </div>
          <div
            className={`transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'
            }`}
          >
            <p className="font-medium text-sm truncate max-w-[140px]">
              {user?.nome}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
        >
          <FiLogOut size={24} className="min-w-[24px]" />
          <span
            className={`whitespace-nowrap transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            Sair
          </span>
        </button>
      </div>

      {/* Toggle indicator */}
      <div
        className={`absolute top-1/2 -right-3 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700 transition-opacity ${
          isExpanded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <FiChevronRight size={14} className="text-gray-400" />
      </div>
    </aside>
  )
}
