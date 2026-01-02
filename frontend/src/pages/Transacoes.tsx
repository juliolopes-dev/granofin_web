import { useState, useEffect } from 'react'
import { FiRepeat, FiPlus, FiEdit2, FiTrash2, FiX, FiArrowUpCircle, FiArrowDownCircle, FiChevronLeft, FiChevronRight, FiCalendar, FiShuffle } from 'react-icons/fi'
import { api } from '../services/api'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface Categoria {
  id: string
  nome: string
  cor: string
  tipo: 'DESPESA' | 'RECEITA'
}

interface Conta {
  id: string
  nome: string
  cor: string
}

interface Transacao {
  id: string
  descricao: string
  valor: number
  tipo: 'ENTRADA' | 'SAIDA'
  data: string
  categoria: Categoria | null
  conta: Conta
}

export function Transacoes() {
  const hoje = new Date()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '' as number | '',
    tipo: 'SAIDA' as 'ENTRADA' | 'SAIDA',
    data: new Date().toISOString().split('T')[0],
    contaId: '',
    categoriaId: '',
  })
  const [error, setError] = useState('')
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferData, setTransferData] = useState({
    valor: '' as number | '',
    data: new Date().toISOString().split('T')[0],
    contaOrigemId: '',
    contaDestinoId: '',
    descricao: '',
  })

  useEffect(() => {
    loadData()
  }, [filtroTipo, mes, ano])

  async function loadData() {
    try {
      // Calcular primeiro e último dia do mês
      const primeiroDia = `${ano}-${String(mes).padStart(2, '0')}-01`
      const ultimoDia = new Date(ano, mes, 0).getDate()
      const ultimoDiaStr = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      const [transacoesRes, categoriasRes, contasRes] = await Promise.all([
        api.get('/transacoes', {
          params: {
            tipo: filtroTipo || undefined,
            dataInicio: primeiroDia,
            dataFim: ultimoDiaStr,
          },
        }),
        api.get('/categorias?flat=true'),
        api.get('/contas'),
      ])
      setTransacoes(transacoesRes.data.transacoes)
      setCategorias(categoriasRes.data.categorias)
      setContas(contasRes.data.contas)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setIsLoading(false)
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

  function openModal(transacao?: Transacao) {
    if (transacao) {
      setEditingId(transacao.id)
      setFormData({
        descricao: transacao.descricao,
        valor: Number(transacao.valor),
        tipo: transacao.tipo,
        data: transacao.data.split('T')[0],
        contaId: transacao.conta.id,
        categoriaId: transacao.categoria?.id || '',
      })
    } else {
      setEditingId(null)
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'SAIDA',
        data: new Date().toISOString().split('T')[0],
        contaId: contas.length > 0 ? contas[0].id : '',
        categoriaId: '',
      })
    }
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.descricao.trim()) {
      setError('Descrição é obrigatória')
      return
    }

    if (!formData.valor || Number(formData.valor) <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }

    if (!formData.contaId) {
      setError('Selecione uma conta')
      return
    }

    try {
      const payload = {
        ...formData,
        valor: Number(formData.valor),
        categoriaId: formData.categoriaId || null,
      }

      if (editingId) {
        await api.put(`/transacoes/${editingId}`, payload)
      } else {
        await api.post('/transacoes', payload)
      }
      closeModal()
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar transação')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    try {
      await api.delete(`/transacoes/${id}`)
      loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  function openTransferModal() {
    setTransferData({
      valor: '',
      data: new Date().toISOString().split('T')[0],
      contaOrigemId: contas.length > 0 ? contas[0].id : '',
      contaDestinoId: contas.length > 1 ? contas[1].id : '',
      descricao: '',
    })
    setError('')
    setIsTransferModalOpen(true)
  }

  function closeTransferModal() {
    setIsTransferModalOpen(false)
    setError('')
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!transferData.valor || Number(transferData.valor) <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }

    if (!transferData.contaOrigemId || !transferData.contaDestinoId) {
      setError('Selecione as contas de origem e destino')
      return
    }

    if (transferData.contaOrigemId === transferData.contaDestinoId) {
      setError('As contas de origem e destino devem ser diferentes')
      return
    }

    try {
      await api.post('/transacoes/transferencia', {
        valor: Number(transferData.valor),
        data: transferData.data,
        contaOrigemId: transferData.contaOrigemId,
        contaDestinoId: transferData.contaDestinoId,
        descricao: transferData.descricao || undefined,
      })
      closeTransferModal()
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao realizar transferência')
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const categoriasFiltradas = categorias.filter((c) => {
    if (formData.tipo === 'ENTRADA') return c.tipo === 'RECEITA'
    return c.tipo === 'DESPESA'
  })

  const totalEntradas = transacoes
    .filter((t) => t.tipo === 'ENTRADA')
    .reduce((acc, t) => acc + Number(t.valor), 0)

  const totalSaidas = transacoes
    .filter((t) => t.tipo === 'SAIDA')
    .reduce((acc, t) => acc + Number(t.valor), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiRepeat size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Transações</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openTransferModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <FiShuffle size={20} />
            Transferir
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
          >
            <FiPlus size={20} />
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3">
            <FiArrowUpCircle size={24} className="text-green-500" />
            <div>
              <p className="text-gray-500 text-sm">Entradas</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3">
            <FiArrowDownCircle size={24} className="text-red-500" />
            <div>
              <p className="text-gray-500 text-sm">Saídas</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalSaidas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Saldo</p>
          <p className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalEntradas - totalSaidas)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
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

          {/* Filtro de Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : transacoes.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiRepeat size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma transação em {MESES[mes - 1]} de {ano}.</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Cadastrar primeira transação
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transacoes.map((transacao) => (
                <tr key={transacao.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(transacao.data)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {transacao.tipo === 'ENTRADA' ? (
                        <FiArrowUpCircle className="text-green-500" />
                      ) : (
                        <FiArrowDownCircle className="text-red-500" />
                      )}
                      <span className="font-medium text-gray-800">{transacao.descricao}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {transacao.categoria ? (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: transacao.categoria.cor }} />
                        <span className="text-sm text-gray-600">{transacao.categoria.nome}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: transacao.conta.cor }} />
                      <span className="text-sm text-gray-600">{transacao.conta.nome}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${transacao.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {transacao.tipo === 'ENTRADA' ? '+' : '-'} {formatCurrency(Number(transacao.valor))}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(transacao)} className="p-2 text-gray-400 hover:text-primary-600 transition" title="Editar">
                        <FiEdit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(transacao.id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Excluir">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">{editingId ? 'Editar Transação' : 'Nova Transação'}</h2>
              <button onClick={closeModal} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${formData.tipo === 'ENTRADA' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="tipo" value="ENTRADA" checked={formData.tipo === 'ENTRADA'} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'ENTRADA' | 'SAIDA', categoriaId: '' })} className="sr-only" />
                    <FiArrowUpCircle size={20} />
                    <span>Entrada</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${formData.tipo === 'SAIDA' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="tipo" value="SAIDA" checked={formData.tipo === 'SAIDA'} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'ENTRADA' | 'SAIDA', categoriaId: '' })} className="sr-only" />
                    <FiArrowDownCircle size={20} />
                    <span>Saída</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Salário, Supermercado" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                  <input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0,00" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                  <input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conta</label>
                <select value={formData.contaId} onChange={(e) => setFormData({ ...formData, contaId: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">Selecione uma conta</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">Sem categoria</option>
                  {categoriasFiltradas.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className={`flex-1 px-4 py-3 text-white rounded-lg ${formData.tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FiShuffle size={24} className="text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Transferência entre Contas</h2>
              </div>
              <button onClick={closeTransferModal} className="p-2 text-gray-500 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conta de Origem</label>
                <select
                  value={transferData.contaOrigemId}
                  onChange={(e) => setTransferData({ ...transferData, contaOrigemId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione a conta de origem</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <div className="bg-blue-100 p-2 rounded-full">
                  <FiArrowDownCircle size={24} className="text-blue-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conta de Destino</label>
                <select
                  value={transferData.contaDestinoId}
                  onChange={(e) => setTransferData({ ...transferData, contaDestinoId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione a conta de destino</option>
                  {contas.filter(c => c.id !== transferData.contaOrigemId).map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transferData.valor}
                    onChange={(e) => setTransferData({ ...transferData, valor: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0,00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    value={transferData.data}
                    onChange={(e) => setTransferData({ ...transferData, data: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={transferData.descricao}
                  onChange={(e) => setTransferData({ ...transferData, descricao: e.target.value })}
                  placeholder="Ex: Transferência para poupança"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeTransferModal} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  Transferir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
