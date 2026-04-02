'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/toast/ToastContext'
import { Html5Qrcode } from 'html5-qrcode'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Edit2, Trash2, Package, ChevronLeft, ChevronRight, Camera, X } from 'lucide-react'

interface Produto {
  id: string
  codigo_barras: string
  nome: string
  descricao: string
  preco_custo: number
  preco_venda: number
  quantidade_estoque: number
  quantidade_minima: number
  unidade_medida: string
  categoria: string
  ativo: boolean
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null)
  const [busca, setBusca] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const ITENS_POR_PAGINA = 10

  // Scanner de código de barras
  const [showScanner, setShowScanner] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    codigo_barras: '',
    nome: '',
    descricao: '',
    preco_custo: '',
    preco_venda: '',
    quantidade_estoque: '',
    quantidade_minima: '5',
    unidade_medida: 'un',
    categoria: '',
    ativo: true
  })

  const buscarProdutos = async () => {
    try {
      setLoading(true)
      
      // Contar total primeiro
      let countQuery = supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
      
      if (busca) {
        countQuery = countQuery.or(`nome.ilike.%${busca}%,codigo_barras.ilike.%${busca}%`)
      }
      
      const { count } = await countQuery
      setTotalProdutos(count || 0)
      
      // Buscar dados paginados
      let query = supabase
        .from('produtos')
        .select('*')
        .order('nome')
        .range((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA - 1)

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,codigo_barras.ilike.%${busca}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setProdutos(data || [])
    } catch (err) {
      showToast('Erro ao buscar produtos', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscarProdutos()
  }, [busca, paginaAtual])

  // Resetar página quando busca mudar
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const produtoData = {
      ...formData,
      preco_custo: parseFloat(formData.preco_custo) || 0,
      preco_venda: parseFloat(formData.preco_venda) || 0,
      quantidade_estoque: parseInt(formData.quantidade_estoque) || 0,
      quantidade_minima: parseInt(formData.quantidade_minima) || 5,
    }

    if (produtoEditando) {
      const { error } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', produtoEditando.id)

      if (error) {
        showToast('Erro ao atualizar produto', 'error')
        return
      }
    } else {
      const { error } = await supabase
        .from('produtos')
        .insert(produtoData)

      if (error) {
        showToast('Erro ao cadastrar produto', 'error')
        return
      }
    }

    setShowModal(false)
    setProdutoEditando(null)
    resetForm()
    buscarProdutos()
  }

  const resetForm = () => {
    setFormData({
      codigo_barras: '',
      nome: '',
      descricao: '',
      preco_custo: '',
      preco_venda: '',
      quantidade_estoque: '',
      quantidade_minima: '5',
      unidade_medida: 'un',
      categoria: '',
      ativo: true
    })
  }

  const editarProduto = (produto: Produto) => {
    setProdutoEditando(produto)
    setFormData({
      codigo_barras: produto.codigo_barras || '',
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco_custo: produto.preco_custo.toString(),
      preco_venda: produto.preco_venda.toString(),
      quantidade_estoque: produto.quantidade_estoque.toString(),
      quantidade_minima: produto.quantidade_minima.toString(),
      unidade_medida: produto.unidade_medida,
      categoria: produto.categoria || '',
      ativo: produto.ativo
    })
    setShowModal(true)
  }

  const excluirProduto = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return

    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      showToast('Erro ao excluir produto', 'error')
      return
    }

    buscarProdutos()
  }

  // Funções do scanner de código de barras
  const iniciarScanner = async () => {
    try {
      setIsScanning(true)
      setShowScanner(true)

      // Aguardar o modal abrir
      setTimeout(async () => {
        if (!scannerContainerRef.current) return

        const scannerId = 'barcode-scanner'
        scannerContainerRef.current.id = scannerId

        html5QrCodeRef.current = new Html5Qrcode(scannerId)

        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Código detectado
            setFormData(prev => ({ ...prev, codigo_barras: decodedText }))
            showToast(`Código detectado: ${decodedText}`, 'success')
            pararScanner()
          },
          (errorMessage) => {
            // Erros silenciosos durante scanning
          }
        )
      }, 300)
    } catch (err) {
      showToast('Erro ao acessar câmera', 'error')
      console.error(err)
      setIsScanning(false)
    }
  }

  const pararScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.error('Erro ao parar scanner:', err)
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
    setShowScanner(false)
  }

  // Lista de categorias fixas para o select do formulário

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cinza-escuro">Cadastro de Produtos</h1>
        <button
          onClick={() => {
            setProdutoEditando(null)
            resetForm()
            setShowModal(true)
          }}
          className="bg-verde-principal hover:bg-verde-escuro text-branco px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cinza-medio" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full pl-10 pr-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
        />
      </div>

      {/* Tabela */}
      <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {/* Header skeleton */}
            <div className="flex gap-2 p-3 bg-cinza-claro/30 rounded">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Rows skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2 p-3 border-b border-cinza-claro">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <div className="p-8 text-center text-cinza-medio">
            <Package className="w-12 h-12 mx-auto mb-4 text-cinza-claro" />
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cinza-claro/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Estoque</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cinza-claro">
                {produtos.map((produto) => (
                  <tr key={produto.id} className="hover:bg-cinza-claro/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-cinza-escuro">{produto.nome}</p>
                      {produto.descricao && (
                        <p className="text-xs text-cinza-medio">{produto.descricao}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cinza-medio">{produto.codigo_barras || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-verde-principal">
                        R$ {produto.preco_venda.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        produto.quantidade_estoque <= produto.quantidade_minima
                          ? 'bg-vermelho/10 text-vermelho'
                          : 'bg-verde-claro text-verde-principal'
                      }`}>
                        {produto.quantidade_estoque} {produto.unidade_medida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cinza-medio">{produto.categoria || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editarProduto(produto)}
                          className="p-2 text-cinza-medio hover:text-verde-principal hover:bg-verde-claro rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluirProduto(produto.id)}
                          className="p-2 text-cinza-medio hover:text-vermelho hover:bg-vermelho/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && totalProdutos > 0 && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-branco border border-cinza-claro rounded-lg">
            <div className="text-sm text-cinza-medio">
              Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} a {Math.min(paginaAtual * ITENS_POR_PAGINA, totalProdutos)} de {totalProdutos} produtos
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="px-4 py-2 bg-verde-principal text-branco rounded-lg font-medium">
                {paginaAtual}
              </span>
              <button
                onClick={() => setPaginaAtual(p => p + 1)}
                disabled={paginaAtual * ITENS_POR_PAGINA >= totalProdutos}
                className="px-3 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-branco rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-auto mx-2 sm:mx-4">
            <h2 className="text-xl font-bold text-cinza-escuro mb-6">
              {produtoEditando ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Código de Barras</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                      className="flex-1 px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                      placeholder="Digite ou escaneie..."
                    />
                    <button
                      type="button"
                      onClick={iniciarScanner}
                      className="px-3 py-2 bg-verde-principal hover:bg-verde-escuro text-branco rounded-lg transition-colors"
                      title="Escanear com câmera"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Preço de Custo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco_custo}
                    onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Preço de Venda *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    value={formData.quantidade_estoque}
                    onChange={(e) => setFormData({ ...formData, quantidade_estoque: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={formData.quantidade_minima}
                    onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Unidade</label>
                  <select
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  >
                    <option value="un">Unidade</option>
                    <option value="kg">Kg</option>
                    <option value="g">g</option>
                    <option value="l">Litro</option>
                    <option value="ml">ml</option>
                    <option value="cx">Caixa</option>
                    <option value="pct">Pacote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  >
                    <option value="">Selecione...</option>
                    {['Bebidas', 'Alimentos', 'Limpeza', 'Higiene', 'Outros'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-verde-principal rounded focus:ring-verde-principal"
                />
                <label htmlFor="ativo" className="text-sm text-cinza-escuro">Produto ativo</label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-verde-principal hover:bg-verde-escuro text-branco font-semibold py-2 rounded-lg transition-colors"
                >
                  {produtoEditando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal do Scanner de Código de Barras */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cinza-escuro">Escanear Código de Barras</h3>
              <button
                type="button"
                onClick={pararScanner}
                className="p-2 hover:bg-cinza-claro rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              ref={scannerContainerRef}
              className="relative bg-black rounded-lg overflow-hidden aspect-video"
            >
              {/* O scanner será injetado aqui pelo html5-qrcode */}
            </div>

            <p className="text-sm text-cinza-medio mt-4 text-center">
              Posicione o código de barras dentro da área de scan
            </p>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={pararScanner}
                className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
