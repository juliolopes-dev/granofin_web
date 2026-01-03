import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { FiHome, FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertCircle, FiCreditCard, FiPieChart, FiChevronLeft, FiChevronRight, FiCalendar, FiEye, FiEyeOff, FiX } from 'react-icons/fi'
import { api } from '../services/api'

interface ContaCarteira {
  id: string
  nome: string
  cor: string
}

interface Conta {
  id: string
  nome: string
  cor: string
  tipo: string
  saldo: number
}

interface ParcelaProxima {
  id: string
  descricao: string
  numero: number
  valor: number
  dataVencimento: string
  naoContabilizar?: boolean
}

interface CategoriaGasto {
  nome: string
  cor: string
  valor: number
}

interface DashboardData {
  saldoTotal: number
  contas: Conta[]
  transacoesMes: {
    entradas: number
    saidas: number
    saldo: number
  }
  contasPagar: {
    totalEmAberto: number
    quantidade: number
  }
  parcelasProximas: ParcelaProxima[]
  parcelasVencidas: ParcelaProxima[]
  orcamento: {
    totalOrcado: number
    totalGasto: number
    percentual: number
  }
  topCategorias: CategoriaGasto[]
  mes: number
  ano: number
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function Dashboard() {
  const { user } = useAuth()
  const hoje = new Date()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mostrarValores, setMostrarValores] = useState(true)
  const [contasCarteira, setContasCarteira] = useState<ContaCarteira[]>([])
  const [isPagamentoOpen, setIsPagamentoOpen] = useState(false)
  const [selectedParcela, setSelectedParcela] = useState<ParcelaProxima | null>(null)
  const [pagamentoData, setPagamentoData] = useState({
    contaId: '',
    valor: 0,
    dataPagamento: new Date().toISOString().split('T')[0],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
    loadContas()
  }, [mes, ano])

  async function loadData() {
    try {
      const response = await api.get('/dashboard', {
        params: { mes, ano }
      })
      setData(response.data)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadContas() {
    try {
      const response = await api.get('/contas')
      setContasCarteira(response.data.contas)
    } catch (err) {
      console.error('Erro ao carregar contas:', err)
    }
  }

  function openPagamento(parcela: ParcelaProxima) {
    setSelectedParcela(parcela)
    setPagamentoData({
      contaId: contasCarteira.length > 0 ? contasCarteira[0].id : '',
      valor: parcela.valor,
      dataPagamento: new Date().toISOString().split('T')[0],
    })
    setError('')
    setIsPagamentoOpen(true)
  }

  function closePagamento() {
    setIsPagamentoOpen(false)
    setSelectedParcela(null)
    setError('')
  }

  async function handlePagamento(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!pagamentoData.contaId) {
      setError('Selecione uma conta')
      return
    }

    if (pagamentoData.valor <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }

    try {
      await api.post('/pagamentos', {
        parcelaId: selectedParcela?.id,
        contaId: pagamentoData.contaId,
        valor: pagamentoData.valor,
        dataPagamento: pagamentoData.dataPagamento,
      })
      closePagamento()
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento')
    }
  }

  function mesAnterior() {
    if (mes === 1) {
      setMes(12)
      setAno(ano - 1)
    } else {
      setMes(mes - 1)
    }
  }

  function mesSeguinte() {
    if (mes === 12) {
      setMes(1)
      setAno(ano + 1)
    } else {
      setMes(mes + 1)
    }
  }

  function irParaHoje() {
    setMes(hoje.getMonth() + 1)
    setAno(hoje.getFullYear())
  }

  function formatCurrency(value: number) {
    if (!mostrarValores) {
      return 'R$ ••••••'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiHome size={28} className="text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 text-sm">Olá, {user?.nome}!</p>
          </div>
        </div>

        {/* Navegação de Mês e Esconder Valores */}
        <div className="flex items-center gap-4">
          {/* Botão Esconder/Mostrar Valores */}
          <button
            onClick={() => setMostrarValores(!mostrarValores)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title={mostrarValores ? 'Esconder valores' : 'Mostrar valores'}
          >
            {mostrarValores ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            <span className="text-sm hidden sm:inline">
              {mostrarValores ? 'Esconder' : 'Mostrar'}
            </span>
          </button>

          {/* Navegação de Mês */}
          <div className="flex items-center gap-2">
            <button
              onClick={mesAnterior}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Mês anterior"
            >
              <FiChevronLeft size={20} className="text-gray-600" />
            </button>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-lg min-w-[180px] justify-center">
              <FiCalendar size={18} className="text-primary-600" />
              <span className="font-semibold text-primary-700">
                {MESES[mes - 1]} {ano}
              </span>
            </div>
            
            <button
              onClick={mesSeguinte}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Próximo mês"
            >
              <FiChevronRight size={20} className="text-gray-600" />
            </button>

            {(mes !== hoje.getMonth() + 1 || ano !== hoje.getFullYear()) && (
              <button
                onClick={irParaHoje}
                className="ml-2 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition"
              >
                Hoje
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Saldo Total</p>
              <p className={`text-2xl font-bold ${(data?.saldoTotal || 0) >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                {formatCurrency(data?.saldoTotal || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <FiDollarSign size={24} className="text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Entradas (Mês)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data?.transacoesMes.entradas || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiTrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Saídas (Mês)</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data?.transacoesMes.saidas || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FiTrendingDown size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Contas a Pagar</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(data?.contasPagar.totalEmAberto || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <FiDollarSign size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de parcelas vencidas */}
      {data?.parcelasVencidas && data.parcelasVencidas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <FiAlertCircle size={20} />
            <span className="font-semibold">Parcelas Vencidas!</span>
          </div>
          <div className="space-y-2">
            {data.parcelasVencidas.map((p) => (
              <div key={p.id} className="flex justify-between text-sm text-red-600">
                <span>{p.descricao} (Parcela {p.numero})</span>
                <span className="font-medium">{formatCurrency(p.valor)} - Venceu em {formatDate(p.dataVencimento)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Carteiras */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCreditCard size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-800">Minhas Carteiras</h2>
          </div>
          {data?.contas && data.contas.length > 0 ? (
            <div className="space-y-3">
              {data.contas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: conta.cor }} />
                    <span className="font-medium text-gray-700">{conta.nome}</span>
                  </div>
                  <span className={`font-bold ${conta.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldo)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhuma carteira cadastrada.</p>
          )}
        </div>

        {/* Próximas contas a vencer */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertCircle size={20} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">Próximos Vencimentos</h2>
          </div>
          {data?.parcelasProximas && data.parcelasProximas.length > 0 ? (
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {data.parcelasProximas.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => openPagamento(p)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition ${p.naoContabilizar ? 'bg-yellow-50 border border-yellow-200' : 'bg-orange-50'}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-700">{p.descricao}</p>
                      {p.naoContabilizar && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">
                          Não contabiliza
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Parcela {p.numero} - {formatDate(p.dataVencimento)}</p>
                  </div>
                  <span className={`font-bold ${p.naoContabilizar ? 'text-yellow-600' : 'text-orange-600'}`}>
                    {formatCurrency(p.valor)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhuma conta próxima do vencimento.</p>
          )}
        </div>

        {/* Orçamento do mês */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPieChart size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-800">Orçamento do Mês</h2>
          </div>
          {data?.orcamento.totalOrcado && data.orcamento.totalOrcado > 0 ? (
            <div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Utilizado</span>
                  <span className={`font-medium ${data.orcamento.percentual > 100 ? 'text-red-600' : data.orcamento.percentual > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {data.orcamento.percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      data.orcamento.percentual > 100 ? 'bg-red-500' : data.orcamento.percentual > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(data.orcamento.percentual, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Orçado</p>
                  <p className="font-bold text-gray-800">{formatCurrency(data.orcamento.totalOrcado)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Gasto</p>
                  <p className="font-bold text-red-600">{formatCurrency(data.orcamento.totalGasto)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhum orçamento configurado para este mês.</p>
          )}
        </div>
      </div>

      {/* Gastos por categoria */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Gastos por Categoria</h2>
        {data?.topCategorias && data.topCategorias.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {data.topCategorias.map((cat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: cat.cor + '20' }}>
                  <span className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.cor }} />
                </div>
                <p className="font-medium text-gray-700 text-sm truncate">{cat.nome}</p>
                <p className="font-bold text-red-600">{formatCurrency(cat.valor)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum gasto registrado neste mês.</p>
        )}
      </div>

      {/* Modal de Pagamento Rápido */}
      {isPagamentoOpen && selectedParcela && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Registrar Pagamento</h2>
              <button onClick={closePagamento} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-500">Conta a Pagar</p>
              <p className="font-medium">{selectedParcela.descricao}</p>
              <p className="text-sm text-gray-500 mt-1">Parcela {selectedParcela.numero} - Vence em {formatDate(selectedParcela.dataVencimento)}</p>
              <p className="text-orange-600 font-bold mt-2">
                Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedParcela.valor)}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handlePagamento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta de Origem
                </label>
                <select
                  value={pagamentoData.contaId}
                  onChange={(e) => setPagamentoData({ ...pagamentoData, contaId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Selecione uma conta</option>
                  {contasCarteira.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Pagamento
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({ ...pagamentoData, valor: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={pagamentoData.dataPagamento}
                  onChange={(e) => setPagamentoData({ ...pagamentoData, dataPagamento: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePagamento}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
