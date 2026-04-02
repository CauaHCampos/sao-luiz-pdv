'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  Table,
  CreditCard,
  BarChart3,
  UserCog,
  LogOut,
  Store,
  Menu,
  X
} from 'lucide-react'

interface SidebarProps {
  isAdmin: boolean
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { href: '/pdv', label: 'PDV', icon: ShoppingCart, public: true },
    { href: '/produtos', label: 'Produtos', icon: Package, public: true },
    { href: '/estoque', label: 'Estoque', icon: ClipboardList, public: true },
    { href: '/mesas', label: 'Mesas', icon: Table, public: true },
    { href: '/crediario', label: 'Crediário', icon: CreditCard, public: true },
    { href: '/relatorios', label: 'Relatórios', icon: BarChart3, public: false },
    { href: '/funcionarios', label: 'Funcionários', icon: UserCog, public: false },
  ]

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-verde-principal text-branco z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Store className="w-6 h-6 text-white" />
          <div>
            <h1 className="font-bold text-sm">Conveniência</h1>
            <p className="text-xs text-verde-claro">São Luiz</p>
          </div>
        </div>
        <button
          onClick={toggleMenu}
          className="p-2 rounded-lg hover:bg-verde-escuro transition-colors"
          aria-label="Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide from left */}
      <aside className={`
        bg-verde-principal text-branco min-h-screen flex flex-col
        fixed lg:static top-0 left-0 z-50 w-64
        transform transition-transform duration-300 ease-in-out
        lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-verde-escuro">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-xl font-bold">Conveniência</h1>
              <p className="text-sm text-verde-claro">São Luiz</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={closeMenu}
            className="lg:hidden absolute top-6 right-4 p-2 rounded-lg hover:bg-verde-escuro transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              if (!item.public && !isAdmin) return null
              
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-verde-escuro text-branco'
                        : 'hover:bg-verde-escuro/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-verde-escuro">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-verde-escuro transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-16" />
    </>
  )
}
