'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/toast/ToastContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Minus, History, AlertTriangle, Package, ChevronLeft, ChevronRight } from 'lucide-react'

interface Produto {
  id: string
  nome: string
  codigo_barras: string
  quantidade_estoque: number
  quantidade_minima: number
  preco_venda: number
  unidade_medida: string
}

interface Movimentacao {
  id: string
  produto: Produto
  tipo: string
  quantidade: number
  quantidade_anterior: number
  quantidade_nova: number
  motivo: string
  created_at: string
  funcionario: { nome: string }
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'estoque' | 'movimentacoes' | 'alertas'>('estoque')
  const [showModal, setShowModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida' | 'ajuste'>('entrada')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const ITENS_POR_PAGINA = 10

  const supabase = createClient()
  const { showToast } = useToast()

  const buscarDados = async () => {
    try {
      setLoading(true)
      
      if (aba === 'estoque') {
        // Contar total primeiro
        let countQuery = supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
        
        if (busca) {
          countQuery = countQuery.ilike('nome', `%${busca}%`)
        }
        
        const { count } = await countQuery
        setTotalProdutos(count || 0)
        
        // Buscar dados paginados
        let query = supabase
          .from('produtos')
          .select('*')
          .eq('ativo', true)
          .order('nome')
          .range((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA - 1)

        if (busca) {
          query = query.ilike('nome', `%${busca}%`)
        }

        const { data: produtosData, error: prodError } = await query
        if (prodError) throw prodError
        setProdutos(produtosData || [])
      }

      const { data: movData, error: movError } = await supabase
        .from('movimentacao_estoque')
        .select('*, produto:produto_id(*), funcionario:funcionario_id(nome)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (movError) throw movError

      setMovimentacoes(movData || [])
    } catch (err) {
      showToast('Erro ao carregar dados', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscarDados()
  }, [busca, paginaAtual, aba])

  const registrarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!produtoSelecionado) return

    const qtd = parseInt(quantidade)
    if (!qtd || qtd <= 0) {
      showToast('Quantidade inválida', 'error')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: funcionario } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!funcionario) return

    let novaQuantidade = produtoSelecionado.quantidade_estoque
    let qtdMovimentacao = qtd

    if (tipoMovimentacao === 'entrada') {
      novaQuantidade += qtd
    } else if (tipoMovimentacao === 'saida') {
      if (qtd > produtoSelecionado.quantidade_estoque) {
        showToast('Quantidade insuficiente em estoque', 'error')
        return
      }
      novaQuantidade -= qtd
      qtdMovimentacao = -qtd
    } else {
      // ajuste
      novaQuantidade = qtd
      qtdMovimentacao = qtd - produtoSelecionado.quantidade_estoque
    }

    // Atualizar produto
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ quantidade_estoque: novaQuantidade })
      .eq('id', produtoSelecionado.id)

    if (updateError) {
      showToast('Erro ao atualizar estoque', 'error')
      return
    }

    // Registrar movimentação
    const { error: movError } = await supabase
      .from('movimentacao_estoque')
      .insert({
        produto_id: produtoSelecionado.id,
        tipo: tipoMovimentacao,
        quantidade: qtdMovimentacao,
        quantidade_anterior: produtoSelecionado.quantidade_estoque,
        quantidade_nova: novaQuantidade,
        motivo: motivo || 'Ajuste de estoque',
        funcionario_id: funcionario.id
      })

    if (movError) {
      showToast('Erro ao registrar movimentação', 'error')
      return
    }

    setShowModal(false)
    setQuantidade('')
    setMotivo('')
    setProdutoSelecionado(null)
    buscarDados()
  }

  const produtosAlerta = produtos.filter(
    p => p.quantidade_estoque <= p.quantidade_minima
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cinza-escuro">Gerenciamento de Estoque</h1>
        {produtosAlerta.length > 0 && (
          <div className="bg-vermelho/10 text-vermelho px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {produtosAlerta.length} produto(s) com estoque baixo
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-cinza-claro">
        {[
          { id: 'estoque', label: 'Estoque Atual', icon: Package },
          { id: 'movimentacoes', label: 'Movimentações', icon: History },
          { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              aba === id
                ? 'border-verde-principal text-verde-principal'
                : 'border-transparent text-cinza-medio hover:text-cinza-escuro'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'estoque' && (
        <>
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

          <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {/* Header skeleton */}
                <div className="flex gap-2 p-3 bg-cinza-claro/30 rounded">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                {/* Rows skeleton */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-2 p-3 border-b border-cinza-claro">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-16 rounded-full" />
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Produto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Código</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Estoque Atual</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Mínimo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cinza-claro">
                    {produtos.map((produto) => (
                      <tr key={produto.id} className="hover:bg-cinza-claro/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-cinza-escuro">{produto.nome}</p>
                        </td>
                        <td className="px-4 py-3 text-cinza-medio">{produto.codigo_barras || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            {produto.quantidade_estoque} {produto.unidade_medida}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-cinza-medio">
                          {produto.quantidade_minima} {produto.unidade_medida}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm ${
                            produto.quantidade_estoque <= produto.quantidade_minima
                              ? 'bg-vermelho/10 text-vermelho'
                              : produto.quantidade_estoque <= produto.quantidade_minima * 2
                              ? 'bg-amarelo/20 text-orange-600'
                              : 'bg-verde-claro text-verde-principal'
                          }`}>
                            {produto.quantidade_estoque <= produto.quantidade_minima
                              ? 'Crítico'
                              : produto.quantidade_estoque <= produto.quantidade_minima * 2
                              ? 'Atenção'
                              : 'OK'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setProdutoSelecionado(produto)
                                setTipoMovimentacao('entrada')
                                setShowModal(true)
                              }}
                              className="p-2 text-verde-principal hover:bg-verde-claro rounded transition-colors"
                              title="Entrada"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setProdutoSelecionado(produto)
                                setTipoMovimentacao('saida')
                                setShowModal(true)
                              }}
                              className="p-2 text-vermelho hover:bg-vermelho/10 rounded transition-colors"
                              title="Saída"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Paginação - somente na aba estoque */}
      {aba === 'estoque' && !loading && totalProdutos > 0 && (
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

      {aba === 'movimentacoes' && (
        <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cinza-claro/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Produto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Quantidade</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Anterior → Novo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Funcionário</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cinza-claro">
                {movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-cinza-claro/30">
                    <td className="px-4 py-3 text-sm text-cinza-medio">
                      {new Date(mov.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-cinza-escuro">
                      {mov.produto?.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        mov.tipo === 'entrada'
                          ? 'bg-verde-claro text-verde-principal'
                          : mov.tipo === 'saida'
                          ? 'bg-vermelho/10 text-vermelho'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'saida' ? 'Saída' : 'Ajuste'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={mov.quantidade > 0 ? 'text-verde-principal' : 'text-vermelho'}>
                        {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cinza-medio">
                      {mov.quantidade_anterior} → {mov.quantidade_nova}
                    </td>
                    <td className="px-4 py-3 text-cinza-medio">
                      {mov.funcionario?.nome}
                    </td>
                    <td className="px-4 py-3 text-cinza-medio text-sm">
                      {mov.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'alertas' && (
        <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro overflow-hidden">
          {produtosAlerta.length === 0 ? (
            <div className="p-8 text-center text-cinza-medio">
              <Package className="w-12 h-12 mx-auto mb-4 text-verde-principal" />
              <p className="text-lg font-medium">Tudo certo!</p>
              <p>Nenhum produto com estoque baixo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-vermelho/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-vermelho">Produto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-vermelho">Estoque Atual</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-vermelho">Mínimo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-vermelho">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cinza-claro">
                  {produtosAlerta.map((produto) => (
                    <tr key={produto.id} className="hover:bg-cinza-claro/30">
                      <td className="px-4 py-3 font-medium text-cinza-escuro">{produto.nome}</td>
                      <td className="px-4 py-3 text-vermelho font-bold">
                        {produto.quantidade_estoque} {produto.unidade_medida}
                      </td>
                      <td className="px-4 py-3 text-cinza-medio">
                        {produto.quantidade_minima} {produto.unidade_medida}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setProdutoSelecionado(produto)
                            setTipoMovimentacao('entrada')
                            setShowModal(true)
                          }}
                          className="bg-verde-principal hover:bg-verde-escuro text-branco px-3 py-1 rounded text-sm transition-colors"
                        >
                          Repor Estoque
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de movimentação */}
      {showModal && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">
              {tipoMovimentacao === 'entrada' ? 'Entrada de Estoque' : 
               tipoMovimentacao === 'saida' ? 'Saída de Estoque' : 'Ajuste de Estoque'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-cinza-medio">Produto</p>
              <p className="font-medium text-cinza-escuro">{produtoSelecionado.nome}</p>
              <p className="text-sm text-cinza-medio">
                Estoque atual: <span className="font-medium">{produtoSelecionado.quantidade_estoque} {produtoSelecionado.unidade_medida}</span>
              </p>
            </div>

            <form onSubmit={registrarMovimentacao} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  placeholder={tipoMovimentacao === 'entrada' ? 'Compra, devolução...' : 'Venda, perda, avaria...'}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
