import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../services/api'

interface User {
  id: string
  nome: string
  email: string
}

interface AuthContextData {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, senha: string) => Promise<void>
  register: (nome: string, email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('@granofin:token')
    const storedUser = localStorage.getItem('@granofin:user')

    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    setIsLoading(false)
  }, [])

  async function login(email: string, senha: string) {
    const response = await api.post('/auth/login', { email, senha })
    const { usuario, token } = response.data

    localStorage.setItem('@granofin:token', token)
    localStorage.setItem('@granofin:user', JSON.stringify(usuario))

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(usuario)
  }

  async function register(nome: string, email: string, senha: string) {
    const response = await api.post('/auth/register', { nome, email, senha })
    const { usuario, token } = response.data

    localStorage.setItem('@granofin:token', token)
    localStorage.setItem('@granofin:user', JSON.stringify(usuario))

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(usuario)
  }

  function logout() {
    localStorage.removeItem('@granofin:token')
    localStorage.removeItem('@granofin:user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
