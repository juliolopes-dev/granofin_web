import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Orcamento } from './pages/Orcamento'
import { ContasPagar } from './pages/ContasPagar'
import { Transacoes } from './pages/Transacoes'
import { Contas } from './pages/Contas'
import { Categorias } from './pages/Categorias'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="/contas-pagar" element={<ContasPagar />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/categorias" element={<Categorias />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
