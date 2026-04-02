'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, Store, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ItemVenda {
  id: string
  produto: { nome: string }
  quantidade: number
  preco_unitario: number
  subtotal: number
}

interface Venda {
  id: string
  numero_venda: number
  total: number
  desconto: number
  subtotal: number
  forma_pagamento: string
  cliente_nome: string
  data_venda: string
  tipo_venda: string
}

export default function CupomPage() {
  const searchParams = useSearchParams()
  const vendaId = searchParams.get('venda')
  const [venda, setVenda] = useState<Venda | null>(null)
  const [itens, setItens] = useState<ItemVenda[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!vendaId) return
    buscarVenda()
  }, [vendaId])

  const buscarVenda = async () => {
    const { data: vendaData } = await supabase
      .from('vendas')
      .select('*')
      .eq('id', vendaId)
      .single()

    if (vendaData) {
      setVenda(vendaData)
      const { data: itensData } = await supabase
        .from('itens_venda')
        .select('*, produto:produto_id(nome)')
        .eq('venda_id', vendaId)
      setItens(itensData || [])
    }
    setLoading(false)
  }

  const imprimir = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Botões skeleton */}
          <div className="mb-4 flex gap-2 print:hidden">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
          
          {/* Cupom skeleton */}
          <div className="bg-white p-6 shadow-lg space-y-4">
            {/* Cabeçalho */}
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 space-y-3">
              <Skeleton className="h-12 w-12 mx-auto rounded-full" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
            
            {/* Info da venda */}
            <div className="border-b-2 border-dashed border-gray-300 pb-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            
            {/* Itens */}
            <div className="border-b-2 border-dashed border-gray-300 pb-4 space-y-3">
              <Skeleton className="h-4 w-24 mx-auto" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totais */}
            <div className="border-b-2 border-dashed border-gray-300 pb-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            
            {/* Rodapé */}
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-8 mx-auto rounded-full" />
              <Skeleton className="h-4 w-40 mx-auto" />
              <Skeleton className="h-3 w-48 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!venda) {
    return <div className="flex items-center justify-center h-screen">Venda não encontrada</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Botão de imprimir - só aparece na tela, não na impressão */}
      <div className="max-w-md mx-auto mb-4 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={imprimir}
            className="flex-1 bg-verde-principal hover:bg-verde-escuro text-branco font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-5 h-5" />
            Imprimir Cupom
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-3 border border-cinza-claro rounded-lg hover:bg-cinza-claro transition-colors"
          >
            Fechar
          </button>
        </div>
        <p className="text-sm text-cinza-medio text-center mt-2">
          Use Ctrl+P ou clique no botão acima para imprimir
        </p>
      </div>

      {/* Cupom */}
      <div className="max-w-md mx-auto bg-white p-6 shadow-lg">
        {/* Cabeçalho */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-center mb-2">
            <Store className="w-12 h-12 text-verde-principal" />
          </div>
          <h1 className="text-xl font-bold text-cinza-escuro">CONVENIÊNCIA SÃO LUIZ</h1>
          <p className="text-sm text-cinza-medio">CNPJ: 00.000.000/0000-00</p>
          <p className="text-sm text-cinza-medio">Tel: (00) 00000-0000</p>
        </div>

        {/* Info da venda */}
        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-cinza-medio">Cupom:</span>
            <span className="font-bold text-cinza-escuro">#{venda.numero_venda}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-cinza-medio">Data:</span>
            <span className="text-cinza-escuro">
              {new Date(venda.data_venda).toLocaleString('pt-BR')}
            </span>
          </div>
          {venda.cliente_nome && (
            <div className="flex justify-between text-sm">
              <span className="text-cinza-medio">Cliente:</span>
              <span className="text-cinza-escuro">{venda.cliente_nome}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-cinza-medio">Tipo:</span>
            <span className="text-cinza-escuro capitalize">{venda.tipo_venda}</span>
          </div>
        </div>

        {/* Itens */}
        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <p className="text-center font-bold text-cinza-escuro mb-2">*** ITENS ***</p>
          {itens.map((item, index) => (
            <div key={item.id} className="mb-2">
              <p className="text-sm font-medium text-cinza-escuro">
                {index + 1}. {(item as any).produto?.nome}
              </p>
              <div className="flex justify-between text-sm text-cinza-medio">
                <span>{item.quantidade} x R$ {item.preco_unitario.toFixed(2)}</span>
                <span className="font-medium">R$ {item.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-cinza-medio">Subtotal:</span>
            <span className="text-cinza-escuro">R$ {venda.subtotal?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-cinza-medio">Desconto:</span>
            <span className="text-cinza-escuro">R$ {venda.desconto?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2">
            <span className="text-cinza-escuro">TOTAL:</span>
            <span className="text-verde-principal">R$ {venda.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-cinza-medio">Forma de Pagamento:</span>
            <span className="font-medium text-cinza-escuro uppercase">
              {venda.forma_pagamento === 'crediario' ? 'CREDIÁRIO' : 
               venda.forma_pagamento === 'cartao_credito' ? 'CARTÃO CRÉDITO' :
               venda.forma_pagamento === 'cartao_debito' ? 'CARTÃO DÉBITO' :
               venda.forma_pagamento === 'pix' ? 'PIX' : 'DINHEIRO'}
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="w-8 h-8 text-verde-principal" />
          </div>
          <p className="text-sm text-cinza-medio">Obrigado pela preferência!</p>
          <p className="text-xs text-cinza-medio mt-2">
            Volte sempre à Conveniência São Luiz
          </p>
          <p className="text-xs text-cinza-medio mt-1">
            --- Documento não fiscal ---
          </p>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @page {
          margin: 0;
          size: auto;
        }
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Remover cabeçalho e rodapé do navegador */
          @page {
            margin: 0mm;
            margin-top: 0mm;
            margin-bottom: 0mm;
            margin-left: 0mm;
            margin-right: 0mm;
          }
          /* Esconder menu lateral e elementos de navegação */
          nav, aside, header, footer, .sidebar, .menu, .navigation,
          [class*="sidebar"], [class*="menu"], [class*="nav"],
          [class*="drawer"], [class*="rail"],
          button[class*="hamburger"], button[class*="menu"] {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          /* Esconder botões de ação */
          .print\\:hidden {
            display: none !important;
          }
          /* Ajustar container principal */
          main, .main-content, [class*="main"], 
          [class*="content"], .content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Ajustar cupom para ocupar toda largura */
          .max-w-md {
            max-width: 80mm !important;
            width: 80mm !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 10px !important;
          }
          /* Esconder URLs e títulos do navegador */
          a[href]:after {
            content: none !important;
          }
        }
      `}</style>
    </div>
  )
}
