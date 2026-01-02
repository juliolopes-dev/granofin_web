import { useState, useEffect } from 'react'
import { FiTag, FiPlus, FiEdit2, FiTrash2, FiX, FiChevronRight, FiChevronDown } from 'react-icons/fi'
import { api } from '../services/api'

interface Categoria {
  id: string
  nome: string
  tipo: 'DESPESA' | 'RECEITA'
  cor: string
  icone: string
  categoriaPaiId: string | null
  categoriaPai?: Categoria | null
  subcategorias?: Categoria[]
}

const CORES = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'DESPESA' as 'DESPESA' | 'RECEITA',
    cor: '#6366f1',
    categoriaPaiId: null as string | null,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategorias()
  }, [])

  async function loadCategorias() {
    try {
      const response = await api.get('/categorias')
      setCategorias(response.data.categorias)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function openModal(categoria?: Categoria, categoriaPaiId?: string) {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormData({
        nome: categoria.nome,
        tipo: categoria.tipo,
        cor: categoria.cor,
        categoriaPaiId: categoria.categoriaPaiId,
      })
    } else {
      setEditingCategoria(null)
      // Se tem categoria pai, herdar o tipo dela
      const tipoPai = categoriaPaiId ? getCategoriaPai(categoriaPaiId)?.tipo : undefined
      setFormData({
        nome: '',
        tipo: tipoPai || 'DESPESA',
        cor: '#6366f1',
        categoriaPaiId: categoriaPaiId || null,
      })
    }
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingCategoria(null)
    setFormData({ nome: '', tipo: 'DESPESA', cor: '#6366f1', categoriaPaiId: null })
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
      if (editingCategoria) {
        await api.put(`/categorias/${editingCategoria.id}`, {
          nome: formData.nome,
          cor: formData.cor,
        })
      } else {
        await api.post('/categorias', formData)
      }
      closeModal()
      loadCategorias()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar categoria')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      await api.delete(`/categorias/${id}`)
      loadCategorias()
    } catch (err) {
      console.error('Erro ao excluir categoria:', err)
    }
  }

  // Encontrar categoria pai pelo ID para pegar o tipo
  function getCategoriaPai(id: string): Categoria | undefined {
    for (const cat of categorias) {
      if (cat.id === id) return cat
    }
    return undefined
  }

  const despesas = categorias.filter((c) => c.tipo === 'DESPESA')
  const receitas = categorias.filter((c) => c.tipo === 'RECEITA')

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiTag size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FiPlus size={20} />
          Nova Categoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Despesas */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Despesas
            </h2>
            {despesas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma categoria de despesa cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {despesas.map((cat) => (
                  <li key={cat.id}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-center gap-3">
                        {cat.subcategorias && cat.subcategorias.length > 0 ? (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="p-1 hover:bg-gray-200 rounded transition"
                          >
                            {expandedCategories.has(cat.id) ? (
                              <FiChevronDown size={16} className="text-gray-500" />
                            ) : (
                              <FiChevronRight size={16} className="text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        ></span>
                        <span className="font-medium text-gray-700">{cat.nome}</span>
                        {cat.subcategorias && cat.subcategorias.length > 0 && (
                          <span className="text-xs text-gray-400">({cat.subcategorias.length})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(undefined, cat.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition"
                          title="Adicionar subcategoria"
                        >
                          <FiPlus size={16} />
                        </button>
                        <button
                          onClick={() => openModal(cat)}
                          className="p-2 text-gray-500 hover:text-primary-600 transition"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {/* Subcategorias */}
                    {expandedCategories.has(cat.id) && cat.subcategorias && cat.subcategorias.length > 0 && (
                      <ul className="ml-8 mt-2 space-y-1">
                        {cat.subcategorias.map((sub) => (
                          <li
                            key={sub.id}
                            className="flex items-center justify-between p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: sub.cor }}
                              ></span>
                              <span className="text-sm text-gray-600">{sub.nome}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal(sub)}
                                className="p-1 text-gray-400 hover:text-primary-600 transition"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Receitas */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Receitas
            </h2>
            {receitas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma categoria de receita cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {receitas.map((cat) => (
                  <li key={cat.id}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-center gap-3">
                        {cat.subcategorias && cat.subcategorias.length > 0 ? (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="p-1 hover:bg-gray-200 rounded transition"
                          >
                            {expandedCategories.has(cat.id) ? (
                              <FiChevronDown size={16} className="text-gray-500" />
                            ) : (
                              <FiChevronRight size={16} className="text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <span className="w-6" />
                        )}
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        ></span>
                        <span className="font-medium text-gray-700">{cat.nome}</span>
                        {cat.subcategorias && cat.subcategorias.length > 0 && (
                          <span className="text-xs text-gray-400">({cat.subcategorias.length})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(undefined, cat.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition"
                          title="Adicionar subcategoria"
                        >
                          <FiPlus size={16} />
                        </button>
                        <button
                          onClick={() => openModal(cat)}
                          className="p-2 text-gray-500 hover:text-primary-600 transition"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {/* Subcategorias */}
                    {expandedCategories.has(cat.id) && cat.subcategorias && cat.subcategorias.length > 0 && (
                      <ul className="ml-8 mt-2 space-y-1">
                        {cat.subcategorias.map((sub) => (
                          <li
                            key={sub.id}
                            className="flex items-center justify-between p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: sub.cor }}
                              ></span>
                              <span className="text-sm text-gray-600">{sub.nome}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal(sub)}
                                className="p-1 text-gray-400 hover:text-primary-600 transition"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingCategoria
                  ? 'Editar Categoria'
                  : formData.categoriaPaiId
                  ? 'Nova Subcategoria'
                  : 'Nova Categoria'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Indicador de categoria pai */}
            {formData.categoriaPaiId && !editingCategoria && (
              <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <FiTag size={16} />
                <span>
                  Subcategoria de: <strong>{getCategoriaPai(formData.categoriaPaiId)?.nome}</strong>
                </span>
              </div>
            )}

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
                  placeholder={formData.categoriaPaiId ? 'Ex: Alimentação, Pessoal' : 'Ex: Custo de Vida'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Tipo - só mostra se não for subcategoria */}
              {!formData.categoriaPaiId && !editingCategoria?.categoriaPaiId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo"
                        value="DESPESA"
                        checked={formData.tipo === 'DESPESA'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'DESPESA' | 'RECEITA' })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-700">Despesa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo"
                        value="RECEITA"
                        checked={formData.tipo === 'RECEITA'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'DESPESA' | 'RECEITA' })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-700">Receita</span>
                    </label>
                  </div>
                </div>
              )}

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
                  {editingCategoria ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
