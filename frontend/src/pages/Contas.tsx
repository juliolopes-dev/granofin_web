import { useState, useEffect } from 'react'
import { FiCreditCard, FiPlus, FiEdit2, FiTrash2, FiX, FiDollarSign } from 'react-icons/fi'
import { api } from '../services/api'

interface Conta {
  id: string
  nome: string
  tipo: 'CORRENTE' | 'POUPANCA' | 'CARTEIRA' | 'INVESTIMENTO'
  saldoInicial: number
  saldo: number
  cor: string
}

const TIPOS_CONTA = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'CARTEIRA', label: 'Carteira' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
]

const CORES = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

export function Contas() {
  const [contas, setContas] = useState<Conta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConta, setEditingConta] = useState<Conta | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'CORRENTE' as Conta['tipo'],
    saldoInicial: 0,
    cor: '#22c55e',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadContas()
  }, [])

  async function loadContas() {
    try {
      const response = await api.get('/contas')
      setContas(response.data.contas)
    } catch (err) {
      console.error('Erro ao carregar contas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function openModal(conta?: Conta) {
    if (conta) {
      setEditingConta(conta)
      setFormData({
        nome: conta.nome,
        tipo: conta.tipo,
        saldoInicial: Number(conta.saldoInicial),
        cor: conta.cor,
      })
    } else {
      setEditingConta(null)
      setFormData({ nome: '', tipo: 'CORRENTE', saldoInicial: 0, cor: '#22c55e' })
    }
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingConta(null)
    setFormData({ nome: '', tipo: 'CORRENTE', saldoInicial: 0, cor: '#22c55e' })
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    try {
      if (editingConta) {
        await api.put(`/contas/${editingConta.id}`, formData)
      } else {
        await api.post('/contas', formData)
      }
      closeModal()
      loadContas()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar conta')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      await api.delete(`/contas/${id}`)
      loadContas()
    } catch (err) {
      console.error('Erro ao excluir conta:', err)
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function getTipoLabel(tipo: string) {
    return TIPOS_CONTA.find((t) => t.value === tipo)?.label || tipo
  }

  const totalSaldo = contas.reduce((acc, conta) => acc + Number(conta.saldo), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiCreditCard size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Contas</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FiPlus size={20} />
          Nova Conta
        </button>
      </div>

      {/* Card de saldo total */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Saldo Total</p>
            <p className={`text-3xl font-bold ${totalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalSaldo)}
            </p>
          </div>
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
            <FiDollarSign size={28} className="text-primary-600" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : contas.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiCreditCard size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma conta cadastrada.</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Cadastrar primeira conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map((conta) => (
            <div
              key={conta.id}
              className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: conta.cor + '20' }}
                  >
                    <FiCreditCard size={20} style={{ color: conta.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{conta.nome}</h3>
                    <p className="text-sm text-gray-500">{getTipoLabel(conta.tipo)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(conta)}
                    className="p-2 text-gray-400 hover:text-primary-600 transition"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(conta.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Saldo</p>
                <p className={`text-xl font-bold ${Number(conta.saldo) >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                  {formatCurrency(Number(conta.saldo))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Nubank, Itaú, Carteira"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Conta['tipo'] })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  {TIPOS_CONTA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.saldoInicial}
                  onChange={(e) => setFormData({ ...formData, saldoInicial: Number(e.target.value) })}
                  placeholder="0,00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {CORES.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormData({ ...formData, cor })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.cor === cor ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  {editingConta ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
