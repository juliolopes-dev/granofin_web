import { useState, useEffect } from 'react'
import { FiPieChart, FiPlus, FiTrash2, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { api } from '../services/api'

interface Categoria {
  id: string
  nome: string
  cor: string
  tipo: 'DESPESA' | 'RECEITA'
}

interface OrcamentoItem {
  id: string
  categoriaId: string
  valorLimite: number | null
  valorLimiteCalculado: number
  percentual: number | null
  mes: number
  ano: number
  categoria: Categoria
  gasto: number
  disponivel: number
  percentualUsado: number
  tipoLimite: 'VALOR' | 'PERCENTUAL'
}

interface Resumo {
  totalOrcado: number
  totalGasto: number
  totalEntradas: number
  saldo: number
  percentualGasto: number
  disponivel: number
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function Orcamento() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [totalEntradas, setTotalEntradas] = useState(0)
  const [formData, setFormData] = useState({
    categoriaId: '',
    tipoLimite: 'VALOR' as 'VALOR' | 'PERCENTUAL',
    valorLimite: 0,
    percentual: 0,
    mesSelecionado: new Date().getMonth() + 1,
    anoSelecionado: new Date().getFullYear(),
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [mes, ano])

  async function loadData() {
    try {
      const [orcRes, catRes, resumoRes] = await Promise.all([
        api.get('/orcamento', { params: { mes, ano } }),
        api.get('/categorias?flat=true'),
        api.get('/orcamento/resumo', { params: { mes, ano } }),
      ])
      setOrcamentos(orcRes.data.orcamentos)
      // Pega todas as categorias (flat=true retorna lista plana)
      const todasCategorias = catRes.data.categorias || []
      // Filtra apenas categorias de DESPESA para orçamento
      const categoriasDespesa = todasCategorias.filter((c: { tipo: string }) => c.tipo === 'DESPESA')
      setCategorias(categoriasDespesa)
      setResumo(resumoRes.data)
      setTotalEntradas(orcRes.data.totalEntradas || 0)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function openModal() {
    const categoriasDisponiveis = categorias.filter(
      (c) => !orcamentos.find((o) => o.categoriaId === c.id)
    )
    setFormData({
      categoriaId: categoriasDisponiveis.length > 0 ? categoriasDisponiveis[0].id : '',
      tipoLimite: 'VALOR',
      valorLimite: 0,
      percentual: 0,
      mesSelecionado: mes,
      anoSelecionado: ano,
    })
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.categoriaId) {
      setError('Selecione uma categoria')
      return
    }

    if (formData.tipoLimite === 'VALOR' && formData.valorLimite <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }

    if (formData.tipoLimite === 'PERCENTUAL' && formData.percentual <= 0) {
      setError('Percentual deve ser maior que zero')
      return
    }

    try {
      await api.post('/orcamento', {
        categoriaId: formData.categoriaId,
        tipoLimite: formData.tipoLimite,
        valorLimite: formData.tipoLimite === 'VALOR' ? formData.valorLimite : null,
        percentual: formData.tipoLimite === 'PERCENTUAL' ? formData.percentual : null,
        mes: formData.mesSelecionado,
        ano: formData.anoSelecionado,
      })
      closeModal()
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar orçamento')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return

    try {
      await api.delete(`/orcamento/${id}`)
      loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function prevMonth() {
    if (mes === 1) {
      setMes(12)
      setAno(ano - 1)
    } else {
      setMes(mes - 1)
    }
  }

  function nextMonth() {
    if (mes === 12) {
      setMes(1)
      setAno(ano + 1)
    } else {
      setMes(mes + 1)
    }
  }

  const categoriasDisponiveis = categorias.filter(
    (c) => !orcamentos.find((o) => o.categoriaId === c.id)
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiPieChart size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Orçamento</h1>
        </div>
        <button
          onClick={openModal}
          disabled={categoriasDisponiveis.length === 0}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPlus size={20} />
          Adicionar Categoria
        </button>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <FiChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 min-w-[200px] text-center">
          {MESES[mes - 1]} {ano}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <FiChevronRight size={24} />
        </button>
      </div>

      {/* Cards de resumo */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Total Orçado</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumo.totalOrcado)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Total Gasto</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(resumo.totalGasto)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Disponível</p>
            <p className={`text-xl font-bold ${resumo.disponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(resumo.disponivel)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">% Utilizado</p>
            <p className={`text-xl font-bold ${resumo.percentualGasto > 100 ? 'text-red-600' : resumo.percentualGasto > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
              {resumo.percentualGasto.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Lista de orçamentos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiPieChart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhum orçamento configurado para este mês.</p>
          <button
            onClick={openModal}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Configurar orçamento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orcamentos.map((orc) => (
            <div key={orc.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: orc.categoria.cor }}
                  />
                  <span className="font-medium text-gray-800">{orc.categoria.nome}</span>
                </div>
                <button
                  onClick={() => handleDelete(orc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition"
                  title="Excluir"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>

              {/* Barra de progresso */}
              <div className="mb-2">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      orc.percentualUsado > 100
                        ? 'bg-red-500'
                        : orc.percentualUsado > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(orc.percentualUsado, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Gasto: <span className="font-medium text-gray-800">{formatCurrency(orc.gasto)}</span>
                </span>
                <span className="text-gray-500">
                  Limite: <span className="font-medium text-gray-800">
                    {formatCurrency(orc.valorLimiteCalculado)}
                    {orc.tipoLimite === 'PERCENTUAL' && (
                      <span className="text-xs text-primary-600 ml-1">({orc.percentual}%)</span>
                    )}
                  </span>
                </span>
                <span className={`font-medium ${orc.disponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {orc.disponivel >= 0 ? 'Disponível' : 'Excedido'}: {formatCurrency(Math.abs(orc.disponivel))}
                </span>
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
              <h2 className="text-xl font-semibold text-gray-800">Adicionar ao Orçamento</h2>
              <button onClick={closeModal} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mês/Ano do Orçamento</label>
                <div className="flex gap-3">
                  <select
                    value={formData.mesSelecionado}
                    onChange={(e) => setFormData({ ...formData, mesSelecionado: Number(e.target.value) })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {MESES.map((nomeMes, index) => (
                      <option key={index} value={index + 1}>{nomeMes}</option>
                    ))}
                  </select>
                  <select
                    value={formData.anoSelecionado}
                    onChange={(e) => setFormData({ ...formData, anoSelecionado: Number(e.target.value) })}
                    className="w-28 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {categoriasDisponiveis.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Limite</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${formData.tipoLimite === 'VALOR' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="tipoLimite"
                      value="VALOR"
                      checked={formData.tipoLimite === 'VALOR'}
                      onChange={() => setFormData({ ...formData, tipoLimite: 'VALOR' })}
                      className="sr-only"
                    />
                    <span>R$ Valor Fixo</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${formData.tipoLimite === 'PERCENTUAL' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="tipoLimite"
                      value="PERCENTUAL"
                      checked={formData.tipoLimite === 'PERCENTUAL'}
                      onChange={() => setFormData({ ...formData, tipoLimite: 'PERCENTUAL' })}
                      className="sr-only"
                    />
                    <span>% das Entradas</span>
                  </label>
                </div>
              </div>

              {formData.tipoLimite === 'VALOR' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Limite</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorLimite}
                    onChange={(e) => setFormData({ ...formData, valorLimite: Number(e.target.value) })}
                    placeholder="Ex: 500.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Percentual das Entradas</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.percentual}
                      onChange={(e) => setFormData({ ...formData, percentual: Number(e.target.value) })}
                      placeholder="Ex: 10"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  {totalEntradas > 0 && formData.percentual > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      = {formatCurrency((formData.percentual / 100) * totalEntradas)} (baseado em {formatCurrency(totalEntradas)} de entradas)
                    </p>
                  )}
                  {totalEntradas === 0 && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Nenhuma entrada registrada neste mês. O limite será R$ 0,00 até haver entradas.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
