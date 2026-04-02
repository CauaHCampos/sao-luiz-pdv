'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Minus, Table, User, DollarSign, ShoppingCart, X, Trash2, PlusCircle, MinusCircle } from 'lucide-react'
import { useToast } from '@/components/toast/ToastContext'
import { Skeleton } from '@/components/ui/skeleton'

interface Mesa {
  id: string
  numero: number
  nome: string
  cliente_nome?: string
  status: 'livre' | 'ocupada' | 'reservada' | 'fechamento'
  capacidade: number
  total_atual: number
  hora_abertura: string | null
  observacoes: string
}

interface Produto {
  id: string
  nome: string
  preco_venda: number
  quantidade_estoque: number
}

interface ItemMesa {
  id: string
  produto_id: string
  produto: Produto
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [itensMesa, setItensMesa] = useState<ItemMesa[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [showNovaMesa, setShowNovaMesa] = useState(false)
  const [showGerenciarMesa, setShowGerenciarMesa] = useState(false)
  const [nomeCliente, setNomeCliente] = useState('')
  const [numeroPessoas, setNumeroPessoas] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [modoGerenciarMesas, setModoGerenciarMesas] = useState(false)
  const [showConfirmarCancelamento, setShowConfirmarCancelamento] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()
  const { showToast } = useToast()

  const buscarMesas = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .order('numero')
    
    setMesas(data || [])
    setLoading(false)
  }

  const buscarItensMesa = async (mesaId: string) => {
    const { data } = await supabase
      .from('mesa_itens')
      .select('*, produto:produto_id(*)')
      .eq('mesa_id', mesaId)
      .eq('status', 1)
    setItensMesa(data || [])
  }

  const buscarProdutos = async () => {
    if (!buscaProduto) {
      setProdutos([])
      return
    }

    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco_venda, quantidade_estoque')
      .ilike('nome', `%${buscaProduto}%`)
      .eq('ativo', true)
      .limit(10)

    setProdutos(data || [])
  }

  useEffect(() => {
    buscarMesas()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(buscarProdutos, 300)
    return () => clearTimeout(timeout)
  }, [buscaProduto])

  const abrirMesa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mesaSelecionada) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: funcionario } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('mesas')
      .update({
        status: 'ocupada',
        observacoes: `Cliente: ${nomeCliente}, Pessoas: ${numeroPessoas}. ${observacoes}`,
        hora_abertura: new Date().toISOString()
      })
      .eq('id', mesaSelecionada.id)

    if (error) {
      showToast('Erro ao abrir mesa', 'error')
      return
    }

    showToast('Mesa aberta com sucesso!', 'success')
    setShowNovaMesa(false)
    
    // Abrir modal de gerenciamento
    await buscarItensMesa(mesaSelecionada.id)
    setShowGerenciarMesa(true)
    
    // Limpar campos
    setNomeCliente('')
    setNumeroPessoas('')
    setObservacoes('')
    buscarMesas()
  }

  const adicionarProduto = async (produto: Produto) => {
    if (!mesaSelecionada) return

    // Verificar se produto já existe na mesa
    const itemExistente = itensMesa.find(item => item.produto_id === produto.id)
    
    if (itemExistente) {
      // Atualizar quantidade
      const novaQuantidade = itemExistente.quantidade + 1
      const novoSubtotal = novaQuantidade * produto.preco_venda
      
      const { error } = await supabase
        .from('mesa_itens')
        .update({ quantidade: novaQuantidade, subtotal: novoSubtotal })
        .eq('id', itemExistente.id)

      if (error) {
        showToast('Erro ao atualizar produto', 'error')
        return
      }
    } else {
      // Inserir novo item
      const { error } = await supabase
        .from('mesa_itens')
        .insert({
          mesa_id: mesaSelecionada.id,
          produto_id: produto.id,
          quantidade: 1,
          preco_unitario: produto.preco_venda,
          subtotal: produto.preco_venda
        })

      if (error) {
        showToast('Erro ao adicionar produto', 'error')
        return
      }
    }

    // Atualizar total da mesa
    const novoTotal = mesaSelecionada.total_atual + produto.preco_venda
    await supabase
      .from('mesas')
      .update({ total_atual: novoTotal })
      .eq('id', mesaSelecionada.id)

    showToast(`${produto.nome} adicionado à mesa`, 'success')

    setBuscaProduto('')
    setProdutos([])
    
    // Recarregar itens da mesa do banco
    await buscarItensMesa(mesaSelecionada.id)
    buscarMesas()
    setMesaSelecionada({ ...mesaSelecionada, total_atual: novoTotal })
  }

  const removerProduto = async (itemId: string, subtotal: number) => {
    if (!mesaSelecionada) return

    const { error } = await supabase
      .from('mesa_itens')
      .delete()
      .eq('id', itemId)

    if (error) {
      showToast('Erro ao remover produto', 'error')
      return
    }

    const novoTotal = mesaSelecionada.total_atual - subtotal
    await supabase
      .from('mesas')
      .update({ total_atual: novoTotal })
      .eq('id', mesaSelecionada.id)

    showToast('Produto removido da mesa', 'success')

    // Recarregar itens da mesa do banco
    await buscarItensMesa(mesaSelecionada.id)
    buscarMesas()
    setMesaSelecionada({ ...mesaSelecionada, total_atual: novoTotal })
  }

  const fecharMesa = async () => {
    if (!mesaSelecionada) return
    
    // Verificar se tem itens na mesa (pela lista ou pelo total)
    if (itensMesa.length === 0 && mesaSelecionada.total_atual === 0) {
      showToast('Adicione produtos à mesa antes de fechar', 'error')
      return
    }
    
    // Se itensMesa estiver vazio mas tem total, buscar os itens primeiro e depois redirecionar
    if (itensMesa.length === 0 && mesaSelecionada.total_atual > 0) {
      const { data } = await supabase
        .from('mesa_itens')
        .select('*, produto:produto_id(*)')
        .eq('mesa_id', mesaSelecionada.id)
      
      if (!data || data.length === 0) {
        showToast('Erro ao carregar itens da mesa', 'error')
        return
      }
    }
    
    // Extrair nome do cliente das observações
    const clienteNomeMatch = mesaSelecionada.observacoes?.match(/Cliente:\s*([^,]+)/)
    const clienteNome = clienteNomeMatch ? clienteNomeMatch[1].trim() : ''
    
    // Fechar modal de gerenciamento
    setShowGerenciarMesa(false)
    
    // Redirecionar para o PDV
    window.location.href = `/pdv?mesa=${mesaSelecionada.id}&tipo=mesa&numero=${mesaSelecionada.numero}&cliente=${encodeURIComponent(clienteNome)}`
  }

  const cancelarMesa = () => {
    if (!mesaSelecionada) return
    setShowConfirmarCancelamento(true)
  }

  const confirmarCancelamento = async () => {
    if (!mesaSelecionada) return
    
    // Atualizar status dos itens da mesa para 3 (cancelado)
    const { error: errorItens } = await supabase
      .from('mesa_itens')
      .update({ status: 3 })
      .eq('mesa_id', mesaSelecionada.id)
    
    if (errorItens) {
      showToast('Erro ao cancelar itens da mesa', 'error')
      return
    }
    
    // Liberar a mesa
    const { error: errorMesa } = await supabase
      .from('mesas')
      .update({
        status: 'livre',
        total_atual: 0,
        observacoes: '',
        hora_abertura: null
      })
      .eq('id', mesaSelecionada.id)
    
    if (errorMesa) {
      showToast('Erro ao liberar mesa', 'error')
      return
    }
    
    showToast('Mesa cancelada com sucesso!', 'success')
    setShowConfirmarCancelamento(false)
    setShowGerenciarMesa(false)
    buscarMesas()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre': return 'bg-verde-claro border-verde-principal'
      case 'ocupada': return 'bg-orange-100 border-orange-500'
      case 'reservada': return 'bg-blue-100 border-blue-500'
      case 'fechamento': return 'bg-amarelo/20 border-amarelo'
      default: return 'bg-cinza-claro border-cinza-medio'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'livre': return 'Livre'
      case 'ocupada': return 'Ocupada'
      case 'reservada': return 'Reservada'
      case 'fechamento': return 'Fechamento'
      default: return status
    }
  }

  const handleMesaClick = async (mesa: Mesa) => {
    setMesaSelecionada(mesa)
    
    if (mesa.status === 'livre') {
      setShowNovaMesa(true)
    } else if (mesa.status === 'ocupada') {
      // Buscar itens sempre do banco
      await buscarItensMesa(mesa.id)
      setShowGerenciarMesa(true)
    }
  }

  const adicionarMesa = async () => {
    // Encontrar o maior número de mesa atual
    const maxNumero = mesas.length > 0 ? Math.max(...mesas.map(m => m.numero)) : 0
    const novoNumero = maxNumero + 1

    const { error } = await supabase
      .from('mesas')
      .insert({
        numero: novoNumero,
        nome: `Mesa ${novoNumero}`,
        status: 'livre',
        capacidade: 4,
        total_atual: 0
      })

    if (error) {
      showToast('Erro ao adicionar mesa', 'error')
      return
    }

    showToast(`Mesa ${novoNumero} adicionada com sucesso!`, 'success')
    buscarMesas()
  }

  const removerMesa = async (mesa: Mesa) => {
    if (mesa.status !== 'livre') {
      showToast('Só é possível remover mesas livres', 'error')
      return
    }

    const { error } = await supabase
      .from('mesas')
      .delete()
      .eq('id', mesa.id)

    if (error) {
      showToast('Erro ao remover mesa', 'error')
      return
    }

    showToast(`Mesa ${mesa.numero} removida com sucesso!`, 'success')
    buscarMesas()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cinza-escuro">Atendimento de Mesas</h1>
        <button
          onClick={() => setModoGerenciarMesas(!modoGerenciarMesas)}
          className="px-4 py-2 bg-cinza-claro hover:bg-cinza-medio/20 text-cinza-escuro rounded-lg transition-colors text-sm font-medium"
        >
          {modoGerenciarMesas ? 'Concluir' : 'Gerenciar Mesas'}
        </button>
      </div>

      {modoGerenciarMesas && (
        <div className="flex gap-3 p-4 bg-verde-claro/50 rounded-xl border border-verde-principal/20">
          <button
            onClick={adicionarMesa}
            className="flex items-center gap-2 px-4 py-2 bg-verde-principal hover:bg-verde-escuro text-branco rounded-lg transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Adicionar Mesa
          </button>
          <p className="text-sm text-cinza-escuro self-center">
            Clique no X vermelho nas mesas livres para remover
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mesas.map((mesa) => (
          <div key={mesa.id} className="relative">
            {modoGerenciarMesas && mesa.status === 'livre' && (
              <button
                onClick={() => removerMesa(mesa)}
                className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-vermelho hover:bg-vermelho/80 text-branco rounded-full flex items-center justify-center shadow-lg transition-colors"
                title="Remover mesa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => !modoGerenciarMesas && handleMesaClick(mesa)}
              disabled={modoGerenciarMesas}
              className={`w-full p-4 rounded-xl border-2 transition-all ${getStatusColor(mesa.status)} ${
                mesaSelecionada?.id === mesa.id ? 'ring-2 ring-verde-principal ring-offset-2' : ''
              } ${modoGerenciarMesas ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
            <div className="flex items-center justify-between mb-2">
              <Table className="w-5 h-5" />
              <span className={`text-xs px-2 py-1 rounded ${
                mesa.status === 'livre' ? 'bg-verde-principal text-branco' : 'bg-cinza-escuro text-branco'
              }`}>
                {getStatusText(mesa.status)}
              </span>
            </div>
            <p className="text-2xl font-bold text-cinza-escuro">Mesa {mesa.numero}</p>
            {mesa.nome && <p className="text-sm text-cinza-medio">{mesa.nome}</p>}
            {mesa.status === 'ocupada' && (
              <div className="mt-2 pt-2 border-t border-cinza-claro">
                <p className="text-lg font-bold text-verde-principal">
                  R$ {mesa.total_atual.toFixed(2)}
                </p>
                {mesa.hora_abertura && (
                  <p className="text-xs text-cinza-medio">
                    {new Date(mesa.hora_abertura).toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            )}
            </button>
          </div>
        ))}
      </div>
      )}

      {/* Modal Nova Mesa */}
      {showNovaMesa && mesaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-branco rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">
              Abrir Mesa {mesaSelecionada.numero}
            </h2>
            <form onSubmit={abrirMesa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Nome do Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cinza-medio" />
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                    placeholder="Nome do cliente"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Número de Pessoas</label>
                <input
                  type="number"
                  value={numeroPessoas}
                  onChange={(e) => setNumeroPessoas(e.target.value)}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  rows={2}
                  placeholder="Observações especiais..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNovaMesa(false)}
                  className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-verde-principal hover:bg-verde-escuro text-branco font-semibold py-2 rounded-lg transition-colors"
                >
                  Abrir Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Mesa (Adicionar/Visualizar Produtos) */}
      {showGerenciarMesa && mesaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-branco rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-cinza-escuro">Mesa {mesaSelecionada.numero}</h2>
                <p className="text-sm text-cinza-medio">{mesaSelecionada.observacoes}</p>
              </div>
              <button
                onClick={() => setShowGerenciarMesa(false)}
                className="p-2 hover:bg-cinza-claro rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca de Produtos */}
            <div className="mb-4">
              <div className="relative">
                <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cinza-medio" />
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Buscar produto para adicionar..."
                  className="w-full pl-10 pr-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                />
              </div>
              
              {produtos.length > 0 && (
                <div className="mt-2 bg-branco rounded-lg shadow-lg border border-cinza-claro max-h-48 overflow-auto">
                  {produtos.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarProduto(produto)}
                      className="w-full px-4 py-3 text-left hover:bg-verde-claro border-b border-cinza-claro last:border-0 flex justify-between items-center"
                    >
                      <span className="font-medium text-cinza-escuro">{produto.nome}</span>
                      <span className="font-bold text-verde-principal">
                        R$ {produto.preco_venda.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Produtos da Mesa */}
            <div className="mb-4">
              <h3 className="font-semibold text-cinza-escuro mb-2">Produtos na Mesa</h3>
              {itensMesa.length === 0 ? (
                <p className="text-cinza-medio text-center py-4 bg-cinza-claro/30 rounded-lg">
                  Nenhum produto adicionado
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {itensMesa.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-cinza-claro/30 rounded-lg">
                      <div>
                        <p className="font-medium text-cinza-escuro">{item.produto.nome}</p>
                        <p className="text-sm text-cinza-medio">
                          {item.quantidade} x R$ {item.preco_unitario.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-verde-principal">
                          R$ {item.subtotal.toFixed(2)}
                        </p>
                        <button
                          onClick={() => removerProduto(item.id, item.subtotal)}
                          className="p-2 text-vermelho hover:bg-vermelho/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total e Botão Finalizar */}
            <div className="border-t border-cinza-claro pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-cinza-escuro">Total:</span>
                <span className="text-2xl font-bold text-verde-principal">
                  R$ {mesaSelecionada.total_atual.toFixed(2)}
                </span>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmarCancelamento(true)}
                  className="flex-1 bg-vermelho hover:bg-vermelho/80 text-branco font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancelar Mesa
                </button>
                <button
                  onClick={fecharMesa}
                  disabled={itensMesa.length === 0}
                  className="flex-1 bg-verde-principal hover:bg-verde-escuro disabled:bg-cinza-claro disabled:cursor-not-allowed text-branco font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Cancelamento */}
      {showConfirmarCancelamento && mesaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-branco rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">
              Confirmar Cancelamento
            </h2>
            <p className="text-cinza-medio mb-6">
              Tem certeza que deseja cancelar a Mesa {mesaSelecionada.numero}? Todos os itens serão marcados como cancelados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmarCancelamento(false)}
                className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
              >
                Não, Voltar
              </button>
              <button
                onClick={confirmarCancelamento}
                className="flex-1 bg-vermelho hover:bg-vermelho/80 text-branco font-semibold py-2 rounded-lg transition-colors"
              >
                Sim, Cancelar Mesa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
