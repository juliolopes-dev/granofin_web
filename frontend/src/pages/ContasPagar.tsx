import { useState, useEffect } from 'react'
import { FiFileText, FiPlus, FiEye, FiTrash2, FiX, FiCalendar } from 'react-icons/fi'
import { api } from '../services/api'

interface Categoria {
  id: string
  nome: string
  cor: string
}

interface Parcela {
  id: string
  numero: number
  valor: number
  valorPago: number
  dataVencimento: string | null
  status: 'PENDENTE' | 'PARCIAL' | 'PAGA'
}

interface Conta {
  id: string
  nome: string
  cor: string
}

interface ContaPagar {
  id: string
  descricao: string
  valorTotal: number
  tipo: 'PARCELADA' | 'AVULSA'
  totalParcelas: number | null
  status: 'ABERTA' | 'QUITADA'
  observacao: string | null
  naoContabilizar: boolean
  categoria: Categoria | null
  parcelas: Parcela[]
  valorPago: number
  valorPendente: number
  parcelasPagas: number
  parcelasPendentes: number
  createdAt: string
}

export function ContasPagar() {
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [formData, setFormData] = useState({
    descricao: '',
    valorTotal: 0,
    tipo: 'PARCELADA' as 'PARCELADA' | 'AVULSA',
    categoriaId: '',
    totalParcelas: 1,
    dataVencimento: '',
    observacao: '',
    parcelaFixa: false,
    valorParcela: 0,
    naoContabilizar: false,
  })
  const [error, setError] = useState('')
  const [contas, setContas] = useState<Conta[]>([])
  const [isPagamentoOpen, setIsPagamentoOpen] = useState(false)
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null)
  const [pagamentoData, setPagamentoData] = useState({
    contaId: '',
    valor: 0,
    dataPagamento: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadData()
  }, [filtroStatus, filtroTipo])

  async function loadData() {
    try {
      const [contasRes, categoriasRes, contasCarteirasRes] = await Promise.all([
        api.get('/contas-pagar', {
          params: {
            status: filtroStatus || undefined,
            tipo: filtroTipo || undefined,
          },
        }),
        api.get('/categorias?flat=true'),
        api.get('/contas'),
      ])
      setContasPagar(contasRes.data.contasPagar)
      setCategorias(categoriasRes.data.categorias.filter((c: Categoria & { tipo: string }) => c.tipo === 'DESPESA'))
      setContas(contasCarteirasRes.data.contas)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function openModal() {
    setFormData({
      descricao: '',
      valorTotal: 0,
      tipo: 'PARCELADA',
      categoriaId: '',
      totalParcelas: 1,
      dataVencimento: new Date().toISOString().split('T')[0],
      observacao: '',
      parcelaFixa: false,
      valorParcela: 0,
      naoContabilizar: false,
    })
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setError('')
  }

  async function openDetail(conta: ContaPagar) {
    try {
      const response = await api.get(`/contas-pagar/${conta.id}`)
      setSelectedConta(response.data.contaPagar)
      setIsDetailOpen(true)
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    }
  }

  function closeDetail() {
    setIsDetailOpen(false)
    setSelectedConta(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.descricao.trim()) {
      setError('Descrição é obrigatória')
      return
    }

    if (formData.valorTotal <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }

    try {
      await api.post('/contas-pagar', {
        ...formData,
        categoriaId: formData.categoriaId || null,
        totalParcelas: formData.tipo === 'PARCELADA' ? formData.totalParcelas : null,
      })
      closeModal()
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta a pagar')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conta a pagar?')) return

    try {
      await api.delete(`/contas-pagar/${id}`)
      loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  function openPagamento(parcela: Parcela) {
    const valorRestante = Number(parcela.valor) - Number(parcela.valorPago)
    setSelectedParcela(parcela)
    setPagamentoData({
      contaId: contas.length > 0 ? contas[0].id : '',
      valor: valorRestante,
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
      // Recarregar detalhes da conta
      if (selectedConta) {
        const response = await api.get(`/contas-pagar/${selectedConta.id}`)
        setSelectedConta(response.data.contaPagar)
      }
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento')
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(date: string | null) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Filtra contas que devem ser contabilizadas nos totais
  const contasContabilizadas = contasPagar.filter((c) => !c.naoContabilizar)
  const totalAberto = contasContabilizadas.reduce((acc, c) => acc + c.valorPendente, 0)
  const totalPago = contasContabilizadas.reduce((acc, c) => acc + c.valorPago, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiFileText size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Contas a Pagar</h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FiPlus size={20} />
          Nova Conta
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Total em Aberto</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAberto)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Total Pago</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Quantidade</p>
          <p className="text-2xl font-bold text-gray-800">{contasPagar.length} contas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os status</option>
            <option value="ABERTA">Abertas</option>
            <option value="QUITADA">Quitadas</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="PARCELADA">Parceladas</option>
            <option value="AVULSA">Avulsas</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : contasPagar.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiFileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma conta a pagar cadastrada.</p>
          <button
            onClick={openModal}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Cadastrar primeira conta
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pendente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contasPagar.map((conta) => (
                <tr key={conta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {conta.categoria && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: conta.categoria.cor }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{conta.descricao}</p>
                          {conta.naoContabilizar && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                              Não contabiliza
                            </span>
                          )}
                        </div>
                        {conta.categoria && (
                          <p className="text-xs text-gray-500">{conta.categoria.nome}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      conta.tipo === 'PARCELADA'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {conta.tipo === 'PARCELADA'
                        ? `${conta.parcelasPagas}/${conta.totalParcelas} parcelas`
                        : 'Avulsa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(Number(conta.valorTotal))}</td>
                  <td className="px-6 py-4 text-green-600">{formatCurrency(conta.valorPago)}</td>
                  <td className="px-6 py-4 text-orange-600">{formatCurrency(conta.valorPendente)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      conta.status === 'ABERTA'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {conta.status === 'ABERTA' ? 'Aberta' : 'Quitada'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(conta)}
                        className="p-2 text-gray-400 hover:text-primary-600 transition"
                        title="Ver detalhes"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(conta.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition"
                        title="Excluir"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Nova Conta a Pagar</h2>
              <button onClick={closeModal} className="p-2 text-gray-500 hover:text-gray-700">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Aluguel, Netflix, Empréstimo"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="PARCELADA"
                      checked={formData.tipo === 'PARCELADA'}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'PARCELADA' | 'AVULSA' })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span>Parcelada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="AVULSA"
                      checked={formData.tipo === 'AVULSA'}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'PARCELADA' | 'AVULSA' })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span>Avulsa (aportes)</span>
                  </label>
                </div>
              </div>

              {formData.tipo === 'PARCELADA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Parcela</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${!formData.parcelaFixa ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="parcelaFixa"
                        checked={!formData.parcelaFixa}
                        onChange={() => setFormData({ ...formData, parcelaFixa: false, valorParcela: 0 })}
                        className="sr-only"
                      />
                      <span>Dividir Valor</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${formData.parcelaFixa ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="parcelaFixa"
                        checked={formData.parcelaFixa}
                        onChange={() => setFormData({ ...formData, parcelaFixa: true })}
                        className="sr-only"
                      />
                      <span>Parcela Fixa</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {!formData.parcelaFixa ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor Total</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorTotal}
                      onChange={(e) => setFormData({ ...formData, valorTotal: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Parcela</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorParcela}
                      onChange={(e) => {
                        const valorParcela = Number(e.target.value)
                        setFormData({ 
                          ...formData, 
                          valorParcela,
                          valorTotal: valorParcela * formData.totalParcelas
                        })
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
                {formData.tipo === 'PARCELADA' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nº Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalParcelas}
                      onChange={(e) => {
                        const totalParcelas = Number(e.target.value)
                        if (formData.parcelaFixa) {
                          setFormData({ 
                            ...formData, 
                            totalParcelas,
                            valorTotal: formData.valorParcela * totalParcelas
                          })
                        } else {
                          setFormData({ ...formData, totalParcelas })
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {formData.tipo === 'PARCELADA' && formData.totalParcelas > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {formData.parcelaFixa ? (
                      <>
                        <strong>{formData.totalParcelas}x</strong> de{' '}
                        <strong>{formatCurrency(formData.valorParcela)}</strong>
                        {' '}= Total: <strong>{formatCurrency(formData.valorTotal)}</strong>
                      </>
                    ) : (
                      formData.valorTotal > 0 && (
                        <>
                          <strong>{formData.totalParcelas}x</strong> de{' '}
                          <strong>{formatCurrency(formData.valorTotal / formData.totalParcelas)}</strong>
                        </>
                      )
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.tipo === 'PARCELADA' ? 'Vencimento 1ª Parcela' : 'Data de Vencimento'}
                </label>
                <input
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observação</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input
                  type="checkbox"
                  id="naoContabilizar"
                  checked={formData.naoContabilizar}
                  onChange={(e) => setFormData({ ...formData, naoContabilizar: e.target.checked })}
                  className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <label htmlFor="naoContabilizar" className="text-sm text-yellow-800 cursor-pointer">
                  <strong>Não contabilizar no total</strong>
                  <p className="text-xs text-yellow-600 mt-1">
                    Esta conta aparecerá na lista, mas não será somada nos totais a pagar
                  </p>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {isDetailOpen && selectedConta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">{selectedConta.descricao}</h2>
              <button onClick={closeDetail} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency(Number(selectedConta.valorTotal))}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Pago</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(selectedConta.valorPago)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Pendente</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedConta.valorPendente)}</p>
              </div>
            </div>

            {/* Parcelas */}
            <h3 className="font-semibold text-gray-800 mb-3">
              {selectedConta.tipo === 'PARCELADA' ? 'Parcelas' : 'Aportes'}
            </h3>
            <div className="space-y-2">
              {selectedConta.parcelas.map((parcela) => (
                <div
                  key={parcela.id}
                  className={`p-4 rounded-lg border ${
                    parcela.status === 'PAGA'
                      ? 'bg-green-50 border-green-200'
                      : parcela.status === 'PARCIAL'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {selectedConta.tipo === 'PARCELADA'
                          ? `Parcela ${parcela.numero}/${selectedConta.totalParcelas}`
                          : 'Valor'}
                      </span>
                      {parcela.dataVencimento && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <FiCalendar size={14} />
                          {formatDate(parcela.dataVencimento)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(Number(parcela.valor))}</p>
                        {Number(parcela.valorPago) > 0 && (
                          <p className="text-sm text-green-600">
                            Pago: {formatCurrency(Number(parcela.valorPago))}
                          </p>
                        )}
                      </div>
                      {parcela.status !== 'PAGA' && (
                        <button
                          onClick={() => openPagamento(parcela)}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition"
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={closeDetail}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {isPagamentoOpen && selectedParcela && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Registrar Pagamento</h2>
              <button onClick={closePagamento} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-500">Parcela</p>
              <p className="font-medium">
                {selectedConta?.tipo === 'PARCELADA'
                  ? `Parcela ${selectedParcela.numero}/${selectedConta?.totalParcelas}`
                  : selectedConta?.descricao}
              </p>
              <div className="flex justify-between mt-2 text-sm">
                <span>Valor: {formatCurrency(Number(selectedParcela.valor))}</span>
                <span className="text-green-600">
                  Pago: {formatCurrency(Number(selectedParcela.valorPago))}
                </span>
              </div>
              <p className="text-orange-600 font-medium mt-1">
                Restante: {formatCurrency(Number(selectedParcela.valor) - Number(selectedParcela.valorPago))}
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
                  {contas.map((conta) => (
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
                  max={Number(selectedParcela.valor) - Number(selectedParcela.valorPago)}
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({ ...pagamentoData, valor: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {formatCurrency(Number(selectedParcela.valor) - Number(selectedParcela.valorPago))}
                </p>
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
