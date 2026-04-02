import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, UserCog, Mail, Phone, Shield, UserX, UserCheck } from 'lucide-react'

export default async function FuncionariosPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Verificar se é admin
  const { data: funcionarioAtual } = await supabase
    .from('funcionarios')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!funcionarioAtual?.is_admin) {
    redirect('/pdv')
  }

  // Buscar todos os funcionários
  const { data: funcionarios } = await supabase
    .from('funcionarios')
    .select('*')
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cinza-escuro">Cadastro de Funcionários</h1>
        <Link
          href="/funcionarios/novo"
          className="bg-verde-principal hover:bg-verde-escuro text-branco px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Funcionário
        </Link>
      </div>

      <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro overflow-hidden">
        {!funcionarios || funcionarios.length === 0 ? (
          <div className="p-8 text-center text-cinza-medio">
            <UserCog className="w-12 h-12 mx-auto mb-4 text-cinza-claro" />
            <p className="text-lg font-medium">Nenhum funcionário cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Funcionário" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cinza-claro/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Contato</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Cargo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-cinza-escuro">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cinza-claro">
                {funcionarios.map((func) => (
                  <tr key={func.id} className="hover:bg-cinza-claro/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-verde-principal text-branco rounded-full flex items-center justify-center font-semibold">
                          {func.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-cinza-escuro">{func.nome}</p>
                          <p className="text-xs text-cinza-medio">{func.cpf || 'Sem CPF'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm text-cinza-medio flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {func.email}
                        </p>
                        {func.telefone && (
                          <p className="text-sm text-cinza-medio flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {func.telefone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-cinza-claro rounded text-sm capitalize">
                          {func.cargo}
                        </span>
                        {func.is_admin && (
                          <span className="px-2 py-1 bg-verde-claro text-verde-principal rounded text-sm flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                        func.ativo
                          ? 'bg-verde-claro text-verde-principal'
                          : 'bg-vermelho/10 text-vermelho'
                      }`}>
                        {func.ativo ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            Inativo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/funcionarios/${func.id}`}
                        className="text-verde-principal hover:underline text-sm"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
