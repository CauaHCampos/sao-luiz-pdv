'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, CreditCard, DollarSign, QrCode, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/toast/ToastContext'
import { Skeleton } from '@/components/ui/skeleton'

interface Produto {
  id: string
  nome: string
  codigo_barras: string
  preco_venda: number
  quantidade_estoque: number
}

interface ItemCarrinho extends Produto {
  quantidade: number
  subtotal: number
}

interface ClienteCrediario {
  id: string
  nome: string
  telefone: string
  cpf: string
  limite_credito: number
  saldo_devedor: number
  dia_vencimento: number
}

export default function PDVPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [desconto, setDesconto] = useState(0)
  const [showPagamento, setShowPagamento] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [tipoVenda, setTipoVenda] = useState('normal')
  const [mesaId, setMesaId] = useState('')
  const [mesas, setMesas] = useState<{id: string, numero: number, status: string}[]>([])
  const [clientesCrediario, setClientesCrediario] = useState<ClienteCrediario[]>([])
  const [clienteCrediarioId, setClienteCrediarioId] = useState('')
  const [showSucesso, setShowSucesso] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Buscar itens da mesa quando tipoVenda for 'mesa' e mesaId mudar
  useEffect(() => {
    const buscarItensMesa = async () => {
      if (tipoVenda === 'mesa' && mesaId) {
        const { data, error } = await supabase
          .from('mesa_itens')
          .select(`
            id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            status,
            produtos:produto_id (id, nome, quantidade_estoque, preco_venda)
          `)
          .eq('mesa_id', mesaId)
          .eq('status', 1) // Apenas itens aguardando pagamento

        if (error) {
          console.error('Erro ao buscar itens da mesa:', error)
          return
        }

        if (data) {
          const itensFormatados = data.map((item: any) => ({
            id: item.produto_id,
            mesa_item_id: item.id, // Guardar ID do mesa_itens para atualizar depois
            nome: item.produtos.nome,
            codigo_barras: '',
            preco_venda: Number(item.preco_unitario),
            quantidade_estoque: 999,
            quantidade: item.quantidade,
            subtotal: Number(item.subtotal)
          }))
          setCarrinho(itensFormatados)
        }
      }
    }

    buscarItensMesa()
  }, [tipoVenda, mesaId, supabase])

  // Carregar dados iniciais da mesa via URL params (só uma vez)
  useEffect(() => {
    const mesaParam = searchParams.get('mesa')
    const tipoParam = searchParams.get('tipo')
    const clienteParam = searchParams.get('cliente')
    
    if (mesaParam && tipoParam === 'mesa' && !mesaId) {
      setTipoVenda('mesa')
      setMesaId(mesaParam)
      
      if (clienteParam) {
        setClienteNome(decodeURIComponent(clienteParam))
      }
    }
  }, [searchParams, mesaId])

  // Buscar produtos
  const buscarProdutos = useCallback(async () => {
    if (!busca) {
      setProdutos([])
      return
    }

    const { data } = await supabase
      .from('produtos')
      .select('id, nome, codigo_barras, preco_venda, quantidade_estoque')
      .or(`nome.ilike.%${busca}%,codigo_barras.ilike.%${busca}%`)
      .eq('ativo', true)
      .limit(10)

    setProdutos(data || [])
  }, [busca, supabase])

  // Buscar mesas disponíveis
  const buscarMesas = useCallback(async () => {
    const { data } = await supabase
      .from('mesas')
      .select('id, numero, status')
      .order('numero')

    setMesas(data || [])
  }, [supabase])

  // Buscar clientes do crediário
  const buscarClientesCrediario = useCallback(async () => {
    const { data } = await supabase
      .from('crediario_clientes')
      .select('id, nome, telefone, cpf, limite_credito, saldo_devedor, dia_vencimento')
      .eq('ativo', true)
      .order('nome')

    setClientesCrediario(data || [])
  }, [supabase])

  useEffect(() => {
    const timeout = setTimeout(buscarProdutos, 300)
    return () => clearTimeout(timeout)
  }, [busca, buscarProdutos])

  useEffect(() => {
    buscarMesas()
    buscarClientesCrediario()
  }, [buscarMesas, buscarClientesCrediario])

  const adicionarAoCarrinho = (produto: Produto) => {
    if (produto.quantidade_estoque <= 0) {
      showToast('Produto sem estoque!', 'error')
      return
    }

    // Usar functional update para evitar problemas de estado assíncrono
    setCarrinho(prevCarrinho => {
      const itemExistente = prevCarrinho.find(item => item.id === produto.id)
      
      if (itemExistente) {
        if (itemExistente.quantidade >= produto.quantidade_estoque) {
          showToast('Quantidade máxima em estoque atingida!', 'error')
          return prevCarrinho
        }
        
        return prevCarrinho.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_venda }
            : item
        )
      } else {
        return [...prevCarrinho, { ...produto, quantidade: 1, subtotal: produto.preco_venda }]
      }
    })
    
    setBusca('')
    setProdutos([])
  }

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter(item => item.id !== id))
  }

  const alterarQuantidade = (id: string, delta: number) => {
    setCarrinho(carrinho.map(item => {
      if (item.id === id) {
        const novaQuantidade = Math.max(1, item.quantidade + delta)
        if (novaQuantidade > item.quantidade_estoque) {
          showToast('Quantidade máxima em estoque atingida!', 'error')
          return item
        }
        return { ...item, quantidade: novaQuantidade, subtotal: novaQuantidade * item.preco_venda }
      }
      return item
    }))
  }

  const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0)
  const total = subtotal - desconto

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return
    
    setFinalizando(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Usuário não autenticado')

      // Buscar funcionário
      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!funcionario) throw new Error('Funcionário não encontrado')

      // Criar venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          funcionario_id: funcionario.id,
          tipo_venda: tipoVenda,
          mesa_id: tipoVenda === 'mesa' ? mesaId : null,
          cliente_nome: clienteNome || null,
          cliente_telefone: clienteTelefone || null,
          subtotal,
          desconto,
          total,
          forma_pagamento: formaPagamento,
          status: 'concluida'
        })
        .select()
        .single()

      if (vendaError) throw vendaError

      // Criar itens da venda
      const itens = carrinho.map(item => ({
        venda_id: venda.id,
        produto_id: item.id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_venda,
        subtotal: item.subtotal
      }))

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itens)

      if (itensError) throw itensError

      // Atualizar estoque
      for (const item of carrinho) {
        const { error: estoqueError } = await supabase
          .from('produtos')
          .update({ 
            quantidade_estoque: item.quantidade_estoque - item.quantidade 
          })
          .eq('id', item.id)

        if (estoqueError) throw estoqueError

        // Registrar movimentação
        await supabase
          .from('movimentacao_estoque')
          .insert({
            produto_id: item.id,
            tipo: 'saida',
            quantidade: -item.quantidade,
            quantidade_anterior: item.quantidade_estoque,
            quantidade_nova: item.quantidade_estoque - item.quantidade,
            motivo: 'Venda',
            funcionario_id: funcionario.id,
            venda_id: venda.id
          })
      }

      // Se for crediário, criar registro na nova estrutura
      if (formaPagamento === 'crediario') {
        if (!clienteCrediarioId) {
          throw new Error('Selecione um cliente do crediário')
        }

        const cliente = clientesCrediario.find(c => c.id === clienteCrediarioId)
        if (!cliente) {
          throw new Error('Cliente não encontrado')
        }

        // Verificar limite
        const novoSaldo = cliente.saldo_devedor + total
        if (novoSaldo > cliente.limite_credito) {
          throw new Error(`Limite excedido! Limite: R$ ${cliente.limite_credito.toFixed(2)}, Saldo atual: R$ ${cliente.saldo_devedor.toFixed(2)}, Esta compra: R$ ${total.toFixed(2)}`)
        }

        // Atualizar saldo do cliente
        const { error: updClienteError } = await supabase
          .from('crediario_clientes')
          .update({ saldo_devedor: novoSaldo })
          .eq('id', clienteCrediarioId)

        if (updClienteError) throw updClienteError

        // Salvar itens no crediario_compras
        const itensCrediario = carrinho.map(item => ({
          cliente_id: clienteCrediarioId,
          venda_id: venda.id,
          produto_id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_venda,
          subtotal: item.subtotal
        }))

        const { error: itensCrediarioError } = await supabase
          .from('crediario_compras')
          .insert(itensCrediario)

        if (itensCrediarioError) throw itensCrediarioError

        // Calcular data de vencimento baseada no dia_vencimento do cliente
        const hoje = new Date()
        const mesAtual = hoje.getMonth()
        const anoAtual = hoje.getFullYear()
        let dataVencimento = new Date(anoAtual, mesAtual, cliente.dia_vencimento)
        
        // Se a data já passou, vencer no próximo mês
        if (dataVencimento < hoje) {
          dataVencimento = new Date(anoAtual, mesAtual + 1, cliente.dia_vencimento)
        }
        
        const dataVencimentoStr = dataVencimento.toISOString().split('T')[0]

        // Também criar registro na tabela crediario antiga para compatibilidade
        await supabase
          .from('crediario')
          .insert({
            cliente_nome: cliente.nome,
            cliente_telefone: cliente.telefone,
            cliente_cpf: cliente.cpf,
            venda_id: venda.id,
            valor_total: total,
            valor_pago: 0,
            saldo: total,
            status: 'ativo',
            data_vencimento: dataVencimentoStr
          })
      }

      // Se for mesa, atualizar status dos itens para 'pago' (2) e liberar mesa
      if (tipoVenda === 'mesa' && mesaId) {
        // Atualizar status dos itens da mesa para pago (2)
        await supabase
          .from('mesa_itens')
          .update({ status: 2 })
          .eq('mesa_id', mesaId)
          .eq('status', 1) // Apenas itens aguardando pagamento

        // Liberar mesa
        await supabase
          .from('mesas')
          .update({
            status: 'livre',
            total_atual: 0,
            hora_fechamento: new Date().toISOString()
          })
          .eq('id', mesaId)
      }

      // Limpar carrinho
      setCarrinho([])
      setShowPagamento(false)
      setDesconto(0)
      setClienteNome('')
      setClienteTelefone('')
      setTipoVenda('normal')
      setMesaId('')
      setClienteCrediarioId('')
      
      // Mostrar modal de sucesso
      setVendaFinalizada(venda.id)
      setShowSucesso(true)
      showToast('Venda concluída com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao finalizar venda:', error)
      showToast('Erro ao finalizar venda. Tente novamente.', 'error')
    } finally {
      setFinalizando(false)
    }
  }

  const imprimirNota = (vendaId: string) => {
    const nota = `
      CONVENIÊNCIA SÃO LUIZ
      =====================
      
      Venda #${vendaId.slice(0, 8)}
      Data: ${new Date().toLocaleString('pt-BR')}
      
      ${carrinho.map(item => 
        `${item.nome}
        ${item.quantidade} x R$ ${item.preco_venda.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}`
      ).join('\n')}
      
      ---------------------
      Subtotal: R$ ${subtotal.toFixed(2)}
      Desconto: R$ ${desconto.toFixed(2)}
      TOTAL: R$ ${total.toFixed(2)}
      
      Pagamento: ${formaPagamento.toUpperCase()}
      
      Obrigado pela preferência!
    `
    
    console.log(nota)
    // Aqui você integraria com impressora térmica
  }

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold text-cinza-escuro mb-4">PDV - Ponto de Venda</h1>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Lado esquerdo - Busca e produtos */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cinza-medio" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto por nome ou código de barras..."
              className="w-full pl-10 pr-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
              autoFocus
            />
          </div>

          {/* Resultados da busca */}
          {loading ? (
            <div className="bg-branco rounded-lg shadow-lg border border-cinza-claro p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : produtos.length > 0 && (
            <div className="bg-branco rounded-lg shadow-lg border border-cinza-claro max-h-64 overflow-auto">
              {produtos.map(produto => (
                <button
                  key={produto.id}
                  onClick={() => adicionarAoCarrinho(produto)}
                  className="w-full px-4 py-3 text-left hover:bg-verde-claro border-b border-cinza-claro last:border-0 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-cinza-escuro">{produto.nome}</p>
                    <p className="text-sm text-cinza-medio">Código: {produto.codigo_barras}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-verde-principal">R$ {produto.preco_venda.toFixed(2)}</p>
                    <p className="text-xs text-cinza-medio">Estoque: {produto.quantidade_estoque}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Configurações da venda */}
          <div className="bg-branco p-4 rounded-lg border border-cinza-claro space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Tipo de Venda</label>
                <select
                  value={tipoVenda}
                  onChange={(e) => setTipoVenda(e.target.value)}
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="mesa">Mesa</option>
                </select>
              </div>

              {tipoVenda === 'mesa' && (
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Mesa</label>
                  <select
                    value={mesaId}
                    onChange={(e) => setMesaId(e.target.value)}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  >
                    <option value="">Selecione...</option>
                    {mesas.filter(m => m.status === 'ocupada').map(mesa => (
                      <option key={mesa.id} value={mesa.id}>Mesa {mesa.numero}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {tipoVenda === 'crediario' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">Telefone</label>
                  <input
                    type="text"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  />
                </div>
              </div>
            )}

            {tipoVenda === 'mesa' && (
              <div>
                <label className="block text-sm font-medium text-cinza-escuro mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Lado direito - Carrinho */}
        <div className="w-full lg:w-96 bg-branco rounded-lg border border-cinza-claro flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="p-4 border-b border-cinza-claro">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-verde-principal" />
              <h2 className="font-semibold text-cinza-escuro">Carrinho</h2>
              <span className="ml-auto text-sm text-cinza-medio">
                {carrinho.length} item(s)
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {carrinho.length === 0 ? (
              <p className="text-center text-cinza-medio py-8">
                Carrinho vazio
              </p>
            ) : (
              carrinho.map((item, index) => (
                <div key={`${item.id}-${index}`} className="bg-cinza-claro/50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-cinza-escuro text-sm">{item.nome}</p>
                    <button
                      onClick={() => removerDoCarrinho(item.id)}
                      className="text-vermelho hover:bg-vermelho/10 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alterarQuantidade(item.id, -1)}
                        className="p-1 bg-cinza-claro rounded hover:bg-cinza-medio/20"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(item.id, 1)}
                        className="p-1 bg-cinza-claro rounded hover:bg-cinza-medio/20"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-bold text-verde-principal">
                      R$ {item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-cinza-claro space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-cinza-medio">Subtotal</span>
              <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cinza-medio">Desconto</span>
              <input
                type="number"
                value={desconto}
                onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-1 text-right border border-cinza-claro rounded text-sm"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-cinza-claro pt-2">
              <span className="text-cinza-escuro">TOTAL</span>
              <span className="text-verde-principal">R$ {total.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setShowPagamento(true)}
              disabled={carrinho.length === 0}
              className="w-full bg-verde-principal hover:bg-verde-escuro disabled:bg-cinza-claro disabled:cursor-not-allowed text-branco font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Modal de pagamento */}
      {showPagamento && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-branco rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cinza-escuro">Forma de Pagamento</h2>
              <button
                onClick={() => setShowPagamento(false)}
                className="text-cinza-medio hover:text-cinza-escuro"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
                { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
                { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard },
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'crediario', label: 'Crediário', icon: ShoppingCart },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFormaPagamento(id)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    formaPagamento === id
                      ? 'border-verde-principal bg-verde-claro'
                      : 'border-cinza-claro hover:border-verde-principal/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${formaPagamento === id ? 'text-verde-principal' : 'text-cinza-medio'}`} />
                  <span className={`text-sm font-medium ${formaPagamento === id ? 'text-verde-principal' : 'text-cinza-escuro'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-cinza-claro/50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-cinza-escuro font-medium">Total a pagar</span>
                <span className="text-2xl font-bold text-verde-principal">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Seleção de cliente do crediário */}
            {formaPagamento === 'crediario' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-cinza-escuro mb-1">
                    Cliente do Crediário *
                  </label>
                  <select
                    value={clienteCrediarioId}
                    onChange={(e) => setClienteCrediarioId(e.target.value)}
                    className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                    required
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientesCrediario.map(cliente => {
                      const disponivel = cliente.limite_credito - cliente.saldo_devedor
                      return (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} (Disp: R$ {disponivel.toFixed(2)})
                        </option>
                      )
                    })}
                  </select>
                  {clienteCrediarioId && (
                    <div className="mt-2 text-sm">
                      {(() => {
                        const cliente = clientesCrediario.find(c => c.id === clienteCrediarioId)
                        if (!cliente) return null
                        const disponivel = cliente.limite_credito - cliente.saldo_devedor
                        // Calcular próxima data de vencimento
                        const hoje = new Date()
                        const mesAtual = hoje.getMonth()
                        const anoAtual = hoje.getFullYear()
                        let dataVenc = new Date(anoAtual, mesAtual, cliente.dia_vencimento)
                        if (dataVenc < hoje) {
                          dataVenc = new Date(anoAtual, mesAtual + 1, cliente.dia_vencimento)
                        }
                        return (
                          <div className="bg-blue-50 p-2 rounded">
                            <p><strong>Limite:</strong> R$ {cliente.limite_credito.toFixed(2)}</p>
                            <p><strong>Saldo Devedor:</strong> R$ {cliente.saldo_devedor.toFixed(2)}</p>
                            <p className={disponivel >= total ? 'text-verde-principal' : 'text-vermelho'}>
                              <strong>Disponível:</strong> R$ {disponivel.toFixed(2)}
                            </p>
                            <p className="text-cinza-medio mt-1">
                              <strong>Vencimento:</strong> Dia {cliente.dia_vencimento} ({dataVenc.toLocaleDateString('pt-BR')})
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPagamento(false)}
                className="flex-1 px-4 py-3 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarVenda}
                disabled={finalizando || (formaPagamento === 'crediario' && !clienteCrediarioId)}
                className="flex-1 bg-verde-principal hover:bg-verde-escuro disabled:opacity-50 text-branco font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                {finalizando ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSucesso && vendaFinalizada && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-branco rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-sm text-center max-h-[90vh] overflow-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-verde-claro rounded-full flex items-center justify-center mx-auto mb-3">
                <Printer className="w-8 h-8 text-verde-principal" />
              </div>
              <h2 className="text-xl font-bold text-cinza-escuro">Venda Finalizada!</h2>
              <p className="text-cinza-medio mt-1">Deseja imprimir o cupom?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSucesso(false)
                  setVendaFinalizada(null)
                }}
                className="flex-1 px-4 py-3 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
              >
                Não, obrigado
              </button>
              <button
                onClick={() => {
                  window.open(`/cupom?venda=${vendaFinalizada}`, '_blank')
                }}
                className="flex-1 bg-verde-principal hover:bg-verde-escuro text-branco font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
