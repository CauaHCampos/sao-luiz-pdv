import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, Package, TrendingUp, Calendar, BarChart3 } from 'lucide-react'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Verificar se é admin
  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!funcionario?.is_admin) {
    redirect('/pdv')
  }

  // Buscar estatísticas
  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  // Vendas do dia
  const { data: vendasHoje } = await supabase
    .from('vendas')
    .select('total')
    .gte('data_venda', `${hoje}T00:00:00`)
    .lte('data_venda', `${hoje}T23:59:59`)
    .eq('status', 'concluida')

  // Vendas do mês
  const { data: vendasMes } = await supabase
    .from('vendas')
    .select('total, data_venda')
    .gte('data_venda', `${inicioMes}T00:00:00`)
    .eq('status', 'concluida')

  // Produtos mais vendidos (agrupados)
  const { data: topProdutosRaw } = await supabase
    .from('itens_venda')
    .select('produto_id, produto:produto_id(nome), quantidade')
    .gte('created_at', `${inicioMes}T00:00:00`)

  // Agrupar produtos por ID e somar quantidades
  const produtosAgrupados = topProdutosRaw?.reduce((acc, item) => {
    const produtoId = item.produto_id
    const nomeProduto = (item as any).produto?.nome || 'Produto não encontrado'
    const quantidade = item.quantidade
    
    if (acc[produtoId]) {
      acc[produtoId].quantidade += quantidade
    } else {
      acc[produtoId] = {
        produto_id: produtoId,
        produto: { nome: nomeProduto },
        quantidade: quantidade
      }
    }
    return acc
  }, {} as Record<string, { produto_id: string, produto: { nome: string }, quantidade: number }>)

  // Converter para array, ordenar por quantidade e pegar top 5
  const topProdutos = produtosAgrupados 
    ? Object.values(produtosAgrupados)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5)
    : []

  // Estoque baixo
  const { data: estoqueBaixo } = await supabase
    .from('produtos')
    .select('*')
    .lte('quantidade_estoque', 5)
    .eq('ativo', true)
    .order('quantidade_estoque')

  const totalVendasHoje = vendasHoje?.reduce((acc, v) => acc + (v.total || 0), 0) || 0
  const totalVendasMes = vendasMes?.reduce((acc, v) => acc + (v.total || 0), 0) || 0
  const quantidadeVendasMes = vendasMes?.length || 0

  // Agrupar vendas por dia
  const vendasPorDia = vendasMes?.reduce((acc, venda) => {
    const dia = venda.data_venda.split('T')[0]
    acc[dia] = (acc[dia] || 0) + (venda.total || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-cinza-escuro">Relatórios</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-verde-claro rounded-lg">
              <DollarSign className="w-6 h-6 text-verde-principal" />
            </div>
            <div>
              <p className="text-sm text-cinza-medio">Vendas Hoje</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                R$ {totalVendasHoje.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-cinza-medio">Vendas do Mês</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                R$ {totalVendasMes.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-cinza-medio">Estoque Baixo</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                {estoqueBaixo?.length || 0} produtos
              </p>
            </div>
          </div>
        </div>

        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-cinza-medio">Total Vendas</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                {quantidadeVendasMes}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por dia */}
        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <h2 className="text-lg font-semibold text-cinza-escuro mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-verde-principal" />
            Vendas por Dia - {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          
          {vendasPorDia && Object.keys(vendasPorDia).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(vendasPorDia)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([dia, total]) => (
                  <div key={dia} className="flex justify-between items-center p-3 bg-cinza-claro/50 rounded-lg">
                    <span className="text-cinza-escuro">
                      {new Date(dia).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-bold text-verde-principal">
                      R$ {total.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-cinza-medio text-center py-8">Nenhuma venda neste período</p>
          )}
        </div>

        {/* Produtos mais vendidos */}
        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <h2 className="text-lg font-semibold text-cinza-escuro mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-verde-principal" />
            Produtos Mais Vendidos
          </h2>
          
          {topProdutos && topProdutos.length > 0 ? (
            <div className="space-y-3">
              {topProdutos.map((item, index) => (
                <div key={item.produto_id} className="flex justify-between items-center p-3 bg-cinza-claro/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-verde-principal text-branco rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-cinza-escuro">{(item as any).produto?.nome || 'Produto'}</span>
                  </div>
                  <span className="font-bold text-verde-principal">
                    {item.quantidade} vendidos
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cinza-medio text-center py-8">Nenhuma venda registrada</p>
          )}
        </div>

        {/* Estoque Baixo */}
        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro lg:col-span-2">
          <h2 className="text-lg font-semibold text-cinza-escuro mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-vermelho" />
            Produtos com Estoque Baixo
          </h2>
          
          {estoqueBaixo && estoqueBaixo.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cinza-claro/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Produto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Código</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Estoque</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Mínimo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cinza-claro">
                  {estoqueBaixo.map((produto) => (
                    <tr key={produto.id} className="hover:bg-cinza-claro/30">
                      <td className="px-4 py-3 font-medium text-cinza-escuro">{produto.nome}</td>
                      <td className="px-4 py-3 text-cinza-medio">{produto.codigo_barras || '-'}</td>
                      <td className="px-4 py-3 text-vermelho font-bold">
                        {produto.quantidade_estoque} {produto.unidade_medida}
                      </td>
                      <td className="px-4 py-3 text-cinza-medio">
                        {produto.quantidade_minima} {produto.unidade_medida}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-vermelho/10 text-vermelho rounded text-sm">
                          Repor Urgente
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-cinza-medio text-center py-8">Nenhum produto com estoque baixo</p>
          )}
        </div>
      </div>
    </div>
  )
}
