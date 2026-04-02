import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart,
  Package,
  ClipboardList,
  Table,
  CreditCard,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('nome, is_admin, cargo')
    .eq('user_id', user.id)
    .single()

  // Buscar estatísticas do dia
  const hoje = new Date().toISOString().split('T')[0]
  
  const { data: vendasHoje } = await supabase
    .from('vendas')
    .select('total')
    .gte('data_venda', `${hoje}T00:00:00`)
    .lte('data_venda', `${hoje}T23:59:59`)
    .eq('status', 'concluida')

  const { data: produtosEstoqueBaixo } = await supabase
    .from('produtos')
    .select('id')
    .lte('quantidade_estoque', 5)
    .eq('ativo', true)

  const totalVendas = vendasHoje?.reduce((acc, v) => acc + (v.total || 0), 0) || 0
  const quantidadeVendas = vendasHoje?.length || 0

  const cards = [
    {
      title: 'PDV',
      description: 'Realizar vendas',
      href: '/pdv',
      icon: ShoppingCart,
      color: 'bg-verde-principal',
      public: true
    },
    {
      title: 'Produtos',
      description: 'Cadastrar e gerenciar',
      href: '/produtos',
      icon: Package,
      color: 'bg-verde-medio',
      public: true
    },
    {
      title: 'Estoque',
      description: 'Controle de estoque',
      href: '/estoque',
      icon: ClipboardList,
      color: 'bg-blue-500',
      public: true
    },
    {
      title: 'Mesas',
      description: 'Atendimento de mesas',
      href: '/mesas',
      icon: Table,
      color: 'bg-orange-500',
      public: true
    },
    {
      title: 'Crediário',
      description: 'Contas a receber',
      href: '/crediario',
      icon: CreditCard,
      color: 'bg-purple-500',
      public: true
    },
    {
      title: 'Relatórios',
      description: 'Vendas e estoque',
      href: '/relatorios',
      icon: BarChart3,
      color: 'bg-cinza-escuro',
      public: false
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cinza-escuro">
            Bem-vindo, {funcionario?.nome?.split(' ')[0] || 'Funcionário'}
          </h1>
          <p className="text-cinza-medio mt-1">
            {funcionario?.cargo === 'admin' ? 'Administrador' : 'Atendente'} • Conveniência São Luiz
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-verde-claro rounded-lg">
              <DollarSign className="w-6 h-6 text-verde-principal" />
            </div>
            <div>
              <p className="text-sm text-cinza-medio">Vendas Hoje</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                R$ {totalVendas.toFixed(2)}
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
              <p className="text-sm text-cinza-medio">Quantidade</p>
              <p className="text-2xl font-bold text-cinza-escuro">
                {quantidadeVendas} vendas
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
                {produtosEstoqueBaixo?.length || 0} produtos
              </p>
            </div>
          </div>
        </div>

        {funcionario?.is_admin && (
          <div className="bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-cinza-medio">Funcionários</p>
                <p className="text-2xl font-bold text-cinza-escuro">
                  Gerenciar
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Rápido */}
      <div>
        <h2 className="text-xl font-semibold text-cinza-escuro mb-4">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            if (!card.public && !funcionario?.is_admin) return null
            
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-branco p-6 rounded-xl shadow-sm border border-cinza-claro hover:shadow-md hover:border-verde-principal transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${card.color} text-branco`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-cinza-escuro group-hover:text-verde-principal transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-cinza-medio mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
