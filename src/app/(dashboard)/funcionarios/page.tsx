'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/toast/ToastContext'
import { Plus, UserCog, Mail, Phone, Shield, UserX, UserCheck, Pencil, Trash2 } from 'lucide-react'

interface Funcionario {
  id: string
  nome: string
  email: string
  telefone: string
  cpf: string
  cargo: string
  is_admin: boolean
  ativo: boolean
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    verificarPermissaoEbuscarFuncionarios()
  }, [])

  const verificarPermissaoEbuscarFuncionarios = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: funcionarioAtual } = await supabase
        .from('funcionarios')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!funcionarioAtual?.is_admin) {
        router.push('/pdv')
        return
      }

      setIsAdmin(true)
      await buscarFuncionarios()
    } catch (error) {
      console.error(error)
      showToast('Erro ao verificar permissões', 'error')
    } finally {
      setLoading(false)
    }
  }

  const buscarFuncionarios = async () => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome')

      if (error) {
        showToast('Erro ao buscar funcionários', 'error')
        return
      }

      setFuncionarios(data || [])
    } catch (error) {
      console.error(error)
      showToast('Erro ao carregar funcionários', 'error')
    }
  }

  const excluirFuncionario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id)

      if (error) {
        showToast('Erro ao excluir funcionário: ' + error.message, 'error')
        return
      }

      showToast('Funcionário excluído com sucesso!', 'success')
      setFuncionarioParaExcluir(null)
      buscarFuncionarios()
    } catch (error) {
      console.error(error)
      showToast('Erro ao excluir funcionário', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cinza-escuro">Cadastro de Funcionários</h1>
        </div>
        <div className="bg-branco rounded-lg shadow-sm border border-cinza-claro p-8 text-center">
          <p className="text-cinza-medio">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/funcionarios/${func.id}`}
                          className="text-verde-principal hover:bg-verde-claro p-2 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setFuncionarioParaExcluir(func.id)}
                          className="text-vermelho hover:bg-vermelho/10 p-2 rounded-lg transition-colors"
                          title="Excluir"
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
      </div>
      {/* Modal de confirmação de exclusão */}
      {funcionarioParaExcluir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-branco rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-cinza-escuro mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-cinza-medio mb-6">
              Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setFuncionarioParaExcluir(null)}
                className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirFuncionario(funcionarioParaExcluir)}
                className="flex-1 bg-vermelho hover:bg-vermelho/90 text-branco font-semibold py-2 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
