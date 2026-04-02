import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Buscar informações do funcionário
  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!funcionario) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-cinza-claro">
      <Sidebar isAdmin={funcionario.is_admin} />
      <main className="flex-1 p-4 lg:p-6 overflow-auto pt-20 lg:pt-6">
        {children}
      </main>
    </div>
  )
}
