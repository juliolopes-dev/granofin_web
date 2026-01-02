import axios from 'axios'

// Em produção usa /api, em desenvolvimento usa localhost:3333
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL,
})

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@granofin:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@granofin:token')
      localStorage.removeItem('@granofin:user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
