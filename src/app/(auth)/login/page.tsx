'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Attempting login with:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        setError(`Erro: ${error.message}`)
        setLoading(false)
        return
      }

      console.log('Login successful:', data)
      router.push('/pdv')
      router.refresh()
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-principal to-verde-escuro flex items-center justify-center p-4">
      <div className="bg-branco rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Store className="w-16 h-16 text-verde-principal" />
          </div>
          <h1 className="text-2xl font-bold text-cinza-escuro">
            Conveniência São Luiz
          </h1>
          <p className="text-cinza-medio mt-2">
            Sistema de PDV e Gestão
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-vermelho/10 text-vermelho p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-cinza-escuro mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal focus:border-transparent outline-none transition-all"
              placeholder="funcionario@saoluiz.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cinza-escuro mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-cinza-claro rounded-lg focus:ring-2 focus:ring-verde-principal focus:border-transparent outline-none transition-all pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza-medio hover:text-cinza-escuro"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-verde-principal hover:bg-verde-escuro text-branco font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-cinza-medio mt-6">
          Sistema exclusivo para funcionários
        </p>
      </div>
    </div>
  )
}
