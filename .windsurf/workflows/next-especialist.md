---
description: Configuração completa de Supabase em projeto Next.js com autenticação, RLS, tipos e clientes
---

# Supabase Setup Workflow

## 1. Instalação de Dependências

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

## 2. Variáveis de Ambiente

Crie `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key  # Apenas server-side
```

## 3. Estrutura de Arquivos

```
lib/
  supabase/
    server.ts    # Cliente para Server Components/Actions
    client.ts    # Cliente para Client Components
    middleware.ts # Cliente para Middleware
types/
  supabase.ts    # Tipos gerados do banco
```

## 4. Server Client

`lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignorado se chamado de Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignorado se chamado de Server Component
          }
        },
      },
    }
  )
}
```

## 5. Browser Client

`lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## 6. Middleware de Autenticação

`middleware.ts` (na raiz do projeto):

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getSession()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

## 7. Geração de Tipos

```bash
npx supabase login
npx supabase gen types typescript --project-id "seu-project-id" --schema public > types/supabase.ts
```

## 8. Hook de Autenticação

`hooks/use-auth.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

## 9. Server Action Exemplo

`app/actions/posts.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  const { error } = await supabase
    .from('posts')
    .insert({ title, content, user_id: user.id })

  if (error) throw new Error(error.message)

  revalidatePath('/posts')
}
```

## 10. RLS Policies Template

```sql
-- Habilitar RLS na tabela
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT para usuários autenticados
CREATE POLICY "Allow select for authenticated users" 
ON posts FOR SELECT 
TO authenticated 
USING (true);

-- Permitir INSERT apenas para o próprio usuário
CREATE POLICY "Allow insert for own user" 
ON posts FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Permitir UPDATE/DELETE apenas para o próprio usuário
CREATE POLICY "Allow update for own user" 
ON posts FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow delete for own user" 
ON posts FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```

## 11. Realtime Subscription

`hooks/use-realtime.ts`:

```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimePosts(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, onChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onChange])
}
```

## Checklist

- [ ] Instalar dependências
- [ ] Configurar variáveis de ambiente
- [ ] Criar clients server/browser
- [ ] Configurar middleware
- [ ] Gerar tipos TypeScript
- [ ] Criar hook de autenticação
- [ ] Implementar Server Actions
- [ ] Configurar RLS policies
- [ ] Adicionar realtime (se necessário)
