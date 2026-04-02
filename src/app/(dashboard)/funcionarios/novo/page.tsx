'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/toast/ToastContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Mail, Phone, Shield } from 'lucide-react'

export default function NovoFuncionarioPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    cargo: 'atendente',
    is_admin: false,
    senha: ''
  })
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome
          }
        }
      })

      if (authError) {
        showToast('Erro ao criar usuário: ' + authError.message, 'error')
        setLoading(false)
        return
      }

      if (!authData.user) {
        showToast('Erro ao criar usuário', 'error')
        setLoading(false)
        return
      }

      // 2. Criar registro na tabela funcionarios
      const { error: funcError } = await supabase
        .from('funcionarios')
        .insert({
          user_id: authData.user.id,
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          cpf: formData.cpf,
          cargo: formData.cargo,
          is_admin: formData.is_admin,
          ativo: true
        })

      if (funcError) {
        showToast('Erro ao cadastrar funcionário: ' + funcError.message, 'error')
        setLoading(false)
        return
      }

      showToast('Funcionário cadastrado com sucesso!', 'success')
      router.push('/funcionarios')
    } catch (error) {
      console.error('Erro:', error)
      showToast('Erro ao cadastrar funcionário', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/funcionarios"
          className="p-2 hover:bg-cinza-claro rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-cinza-medio" />
        </Link>
        <h1 className="text-2xl font-bold text-cinza-escuro">Novo Funcionário</h1>
      </div>

      <div className="bg-branco rounded-xl shadow-sm border border-cinza-claro p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza-medio" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza-medio" />
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                CPF
              </label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                Cargo *
              </label>
              <select
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
              >
                <option value="atendente">Atendente</option>
                <option value="gerente">Gerente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-cinza-escuro mb-1">
                Senha *
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full px-3 py-2 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal outline-none"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-cinza-claro/50 rounded-lg">
            <input
              type="checkbox"
              id="is_admin"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="w-4 h-4 text-verde-principal rounded focus:ring-verde-principal"
            />
            <label htmlFor="is_admin" className="text-sm text-cinza-escuro flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Acesso Administrativo (pode ver relatórios e gerenciar funcionários)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/funcionarios"
              className="flex-1 px-4 py-2 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-verde-principal hover:bg-verde-escuro disabled:opacity-50 text-branco font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? 'Cadastrando...' : 'Cadastrar Funcionário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
