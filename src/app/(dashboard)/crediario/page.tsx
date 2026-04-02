'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/toast/ToastContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, User, History, ShoppingBag, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  telefone: string
  cpf: string
  limite_credito: number
  saldo_devedor: number
  dia_vencimento: number
  ativo: boolean
}

interface Compra {
  id: string
  produto: { nome: string }
  quantidade: number
  preco_unitario: number
  subtotal: number
  data_compra: string
}

export default function CrediarioPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [aba, setAba] = useState<'clientes' | 'compras'>('clientes')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalClientes, setTotalClientes] = useState(0)
  const ITENS_POR_PAGINA = 10
  
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    limite_credito: '',
    dia_vencimento: '5',
    observacoes: ''
  })

  const [showPagamento, setShowPagamento] = useState(false)
  const [valorPagamento, setValorPagamento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [obsPagamento, setObsPagamento] = useState('')

  const [showEditarCliente, setShowEditarCliente] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [editarForm, setEditarForm] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    limite_credito: '',
    dia_vencimento: '5'
  })

  const supabase = createClient()
  const { showToast } = useToast()

  const buscarClientes = async () => {
    try {
      setLoading(true)
      
      // Contar total primeiro
      let countQuery = supabase
        .from('crediario_clientes')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
      
      if (busca) {
        countQuery = countQuery.ilike('nome', `%${busca}%`)
      }
      
      const { count } = await countQuery
      setTotalClientes(count || 0)
      
      // Buscar dados paginados
      let query = supabase
        .from('crediario_clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
        .range((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA - 1)

      if (busca) {
        query = query.ilike('nome', `%${busca}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setClientes(data || [])
    } catch (err) {
      showToast('Erro ao buscar clientes', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buscarCompras = async (clienteId: string) => {
    const { data } = await supabase
      .from('crediario_compras')
      .select('*, produto:produto_id(nome)')
      .eq('cliente_id', clienteId)
      .order('data_compra', { ascending: false })
    setCompras(data || [])
  }

  useEffect(() => {
    buscarClientes()
  }, [busca, paginaAtual])

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    const limite = parseFloat(novoCliente.limite_credito)
    if (!limite || limite <= 0) {
      showToast('Limite inválido', 'error')
      return
    }
    const diaVencimento = parseInt(novoCliente.dia_vencimento)
    if (diaVencimento < 1 || diaVencimento > 31) {
      showToast('Dia de vencimento deve ser entre 1 e 31', 'error')
      return
    }
    const { error } = await supabase.from('crediario_clientes').insert({
      nome: novoCliente.nome,
      telefone: novoCliente.telefone,
      cpf: novoCliente.cpf,
      limite_credito: limite,
      saldo_devedor: 0,
      dia_vencimento: diaVencimento,
      ativo: true
    })
    if (error) {
      showToast('Erro: ' + error.message, 'error')
      return
    }
    setShowNovoCliente(false)
    setNovoCliente({ nome: '', telefone: '', cpf: '', limite_credito: '', dia_vencimento: '5', observacoes: '' })
    buscarClientes()
  }

  const registrarPagamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSelecionado) return
    const valor = parseFloat(valorPagamento)
    if (!valor || valor <= 0 || valor > clienteSelecionado.saldo_devedor) {
      showToast('Valor inválido', 'error')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: funcionario } = await supabase.from('funcionarios').select('id').eq('user_id', user.id).single()
    if (!funcionario) return

    const novoSaldo = clienteSelecionado.saldo_devedor - valor
    await supabase.from('crediario_clientes').update({ saldo_devedor: novoSaldo }).eq('id', clienteSelecionado.id)
    await supabase.from('crediario_pagamentos').insert({
      cliente_id: clienteSelecionado.id,
      funcionario_id: funcionario.id,
      valor,
      forma_pagamento: formaPagamento,
      observacoes: obsPagamento
    })
    setShowPagamento(false)
    setValorPagamento('')
    buscarClientes()
    setClienteSelecionado({ ...clienteSelecionado, saldo_devedor: novoSaldo })
  }

  const abrirEditar = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setEditarForm({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      cpf: cliente.cpf || '',
      limite_credito: cliente.limite_credito.toString(),
      dia_vencimento: cliente.dia_vencimento?.toString() || '5'
    })
    setShowEditarCliente(true)
  }

  const atualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteEditando) return
    
    const limite = parseFloat(editarForm.limite_credito)
    if (!limite || limite <= 0) {
      showToast('Limite inválido', 'error')
      return
    }
    const diaVencimento = parseInt(editarForm.dia_vencimento)
    if (diaVencimento < 1 || diaVencimento > 31) {
      showToast('Dia de vencimento deve ser entre 1 e 31', 'error')
      return
    }
    
    const { error } = await supabase
      .from('crediario_clientes')
      .update({
        nome: editarForm.nome,
        telefone: editarForm.telefone,
        cpf: editarForm.cpf,
        limite_credito: limite,
        dia_vencimento: diaVencimento
      })
      .eq('id', clienteEditando.id)
    
    if (error) {
      showToast('Erro ao atualizar: ' + error.message, 'error')
      return
    }
    setShowEditarCliente(false)
    setClienteEditando(null)
    buscarClientes()
  }
  const totalReceber = clientes.reduce((acc, c) => acc + c.saldo_devedor, 0)
  const totalLimite = clientes.reduce((acc, c) => acc + c.limite_credito, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cinza-escuro">Crediário - Controle de Clientes</h1>
        <div className="flex gap-4">
          <button onClick={() => setShowNovoCliente(true)} className="bg-verde-principal hover:bg-verde-escuro text-branco px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-5 h-5" />Novo Cliente
          </button>
          <div className="bg-verde-claro px-4 py-2 rounded-lg">
            <p className="text-xs text-cinza-medio">Total a Receber</p>
            <p className="font-bold text-verde-principal">R$ {totalReceber.toFixed(2)}</p>
          </div>
          <div className="bg-blue-100 px-4 py-2 rounded-lg">
            <p className="text-xs text-cinza-medio">Limite Total</p>
            <p className="font-bold text-blue-600">R$ {totalLimite.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-cinza-claro">
        {[{ id: 'clientes', label: 'Clientes', icon: User }, { id: 'compras', label: 'Histórico', icon: ShoppingBag }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setAba(id as any); if (id === 'clientes') setClienteSelecionado(null) }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${aba === id ? 'border-verde-principal text-verde-principal' : 'border-transparent text-cinza-medio'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {aba === 'clientes' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cinza-medio" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-10 pr-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none" />
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
                </div>
                {/* Rows skeleton */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-2 p-3 border-b border-cinza-claro items-center">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <div className="w-32 space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clientes.length === 0 ? (
              <div className="p-8 text-center text-cinza-medio"><User className="w-12 h-12 mx-auto mb-4 text-cinza-claro" />Nenhum cliente encontrado</div>
            ) : (
              <table className="w-full">
                <thead className="bg-cinza-claro/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Limite</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Saldo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Disponível</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cinza-claro">
                  {clientes.map((cliente) => {
                    const disponivel = cliente.limite_credito - cliente.saldo_devedor
                    const percentual = (cliente.saldo_devedor / cliente.limite_credito) * 100
                    return (
                      <tr key={cliente.id} className="hover:bg-cinza-claro/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-cinza-escuro">{cliente.nome}</p>
                          {cliente.telefone && <p className="text-sm text-cinza-medio">{cliente.telefone}</p>}
                        </td>
                        <td className="px-4 py-3 font-medium">R$ {cliente.limite_credito.toFixed(2)}</td>
                        <td className="px-4 py-3 text-vermelho font-medium">R$ {cliente.saldo_devedor.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${disponivel > 0 ? 'text-verde-principal' : 'text-vermelho'}`}>R$ {disponivel.toFixed(2)}</span>
                          <div className="w-full bg-cinza-claro rounded-full h-2 mt-1">
                            <div className={`h-2 rounded-full ${percentual > 90 ? 'bg-vermelho' : percentual > 70 ? 'bg-amarelo' : 'bg-verde-principal'}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setClienteSelecionado(cliente); buscarCompras(cliente.id); setAba('compras') }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Ver histórico"><History className="w-4 h-4" /></button>
                            <button onClick={() => abrirEditar(cliente)} className="p-2 text-amarelo hover:bg-amarelo/10 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                            {cliente.saldo_devedor > 0 && <button onClick={() => { setClienteSelecionado(cliente); setValorPagamento(cliente.saldo_devedor.toString()); setShowPagamento(true) }} className="bg-verde-principal text-branco px-3 py-1 rounded text-sm">Receber</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Paginação - somente na aba clientes */}
      {aba === 'clientes' && !loading && totalClientes > 0 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-branco border border-cinza-claro rounded-lg">
          <div className="text-sm text-cinza-medio">
            Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} a {Math.min(paginaAtual * ITENS_POR_PAGINA, totalClientes)} de {totalClientes} clientes
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
              disabled={paginaAtual * ITENS_POR_PAGINA >= totalClientes}
              className="px-3 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {aba === 'compras' && clienteSelecionado && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-cinza-escuro">{clienteSelecionado.nome}</h2>
              <p className="text-cinza-medio">Limite: R$ {clienteSelecionado.limite_credito.toFixed(2)} | Saldo: R$ {clienteSelecionado.saldo_devedor.toFixed(2)}</p>
            </div>
            <button onClick={() => setAba('clientes')} className="px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro">Voltar</button>
          </div>
          <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro">
            {compras.length === 0 ? <div className="p-8 text-center text-cinza-medio"><ShoppingBag className="w-12 h-12 mx-auto mb-4 text-cinza-claro" />Nenhuma compra</div> : (
              <table className="w-full">
                <thead className="bg-cinza-claro/50">
                  <tr><th className="px-4 py-3 text-left text-sm font-semibold">Data</th><th className="px-4 py-3 text-left text-sm font-semibold">Produto</th><th className="px-4 py-3 text-left text-sm font-semibold">Qtd</th><th className="px-4 py-3 text-left text-sm font-semibold">Subtotal</th></tr>
                </thead>
                <tbody className="divide-y divide-cinza-claro">
                  {compras.map((compra) => (
                    <tr key={compra.id} className="hover:bg-cinza-claro/30">
                      <td className="px-4 py-3 text-cinza-medio">{new Date(compra.data_compra).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 font-medium">{(compra as any).produto?.nome || 'Produto'}</td>
                      <td className="px-4 py-3">{compra.quantidade}</td>
                      <td className="px-4 py-3 font-bold text-verde-principal">R$ {compra.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showNovoCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">Novo Cliente</h2>
            <form onSubmit={criarCliente} className="space-y-4">
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Nome *</label><input type="text" value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Telefone</label><input type="text" value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" placeholder="(00) 00000-0000" /></div>
                <div><label className="block text-sm font-medium text-cinza-escuro mb-1">CPF</label><input type="text" value={novoCliente.cpf} onChange={(e) => setNovoCliente({ ...novoCliente, cpf: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" placeholder="000.000.000-00" /></div>
              </div>
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Limite de Crédito *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza-medio">R$</span><input type="number" step="0.01" value={novoCliente.limite_credito} onChange={(e) => setNovoCliente({ ...novoCliente, limite_credito: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-cinza-claro rounded-lg" required /></div></div>
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Dia de Vencimento *</label><input type="number" min="1" max="31" value={novoCliente.dia_vencimento} onChange={(e) => setNovoCliente({ ...novoCliente, dia_vencimento: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" required /><p className="text-xs text-cinza-medio mt-1">Dia do mês (1-31)</p></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNovoCliente(false)} className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro">Cancelar</button>
                <button type="submit" className="flex-1 bg-verde-principal text-branco font-semibold py-2 rounded-lg">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditarCliente && clienteEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">Editar Cliente - {clienteEditando.nome}</h2>
            <form onSubmit={atualizarCliente} className="space-y-4">
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Nome *</label><input type="text" value={editarForm.nome} onChange={(e) => setEditarForm({ ...editarForm, nome: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Telefone</label><input type="text" value={editarForm.telefone} onChange={(e) => setEditarForm({ ...editarForm, telefone: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" placeholder="(00) 00000-0000" /></div>
                <div><label className="block text-sm font-medium text-cinza-escuro mb-1">CPF</label><input type="text" value={editarForm.cpf} onChange={(e) => setEditarForm({ ...editarForm, cpf: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" placeholder="000.000.000-00" /></div>
              </div>
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Limite de Crédito *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza-medio">R$</span><input type="number" step="0.01" value={editarForm.limite_credito} onChange={(e) => setEditarForm({ ...editarForm, limite_credito: e.target.value })} className="w-full pl-10 pr-3 py-2 border border-cinza-claro rounded-lg" required /></div></div>
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Dia de Vencimento *</label><input type="number" min="1" max="31" value={editarForm.dia_vencimento} onChange={(e) => setEditarForm({ ...editarForm, dia_vencimento: e.target.value })} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" required /><p className="text-xs text-cinza-medio mt-1">Dia do mês (1-31)</p></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditarCliente(false); setClienteEditando(null) }} className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro">Cancelar</button>
                <button type="submit" className="flex-1 bg-verde-principal text-branco font-semibold py-2 rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPagamento && clienteSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-cinza-escuro mb-4">Receber - {clienteSelecionado?.nome}</h2>
            <div className="mb-4 bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-cinza-medio">Saldo Devedor</p>
              <p className="text-2xl font-bold text-verde-principal">R$ {clienteSelecionado?.saldo_devedor.toFixed(2)}</p>
            </div>
            <form onSubmit={registrarPagamento} className="space-y-4">
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Valor *</label><input type="number" step="0.01" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} className="w-full px-3 py-2 border border-cinza-claro rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-cinza-escuro mb-1">Forma</label><select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full px-3 py-2 border border-cinza-claro rounded-lg"><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="cartao">Cartão</option></select></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPagamento(false)} className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro">Cancelar</button>
                <button type="submit" className="flex-1 bg-verde-principal text-branco font-semibold py-2 rounded-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}