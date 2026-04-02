'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push('/pdv')
      } else {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <div className="animate-pulse">
        <p className="text-lg text-zinc-600">Carregando...</p>
      </div>
    </div>
  )
}
