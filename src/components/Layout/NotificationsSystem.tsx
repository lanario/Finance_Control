/**
 * Sistema de notificações para alertas financeiros
 * Calcula e retorna notificações relevantes para o usuário
 */

import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  message: string
  link?: string
}

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const notifications: Notification[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  try {
    // 1. Verificar faturas próximas ao vencimento (3 dias)
    const { data: cartoes } = await supabase
      .from('cartoes')
      .select('id, nome, vencimento, fechamento')
      .eq('user_id', userId)

    if (cartoes) {
      for (const cartao of cartoes) {
        // Calcular data de vencimento da fatura atual
        const anoAtual = hoje.getFullYear()
        const mesAtual = hoje.getMonth() + 1
        
        // Data de fechamento já passou? Se sim, fatura do mês atual, senão do mês anterior
        const dataFechamento = new Date(anoAtual, mesAtual - 1, cartao.fechamento)
        const mesFechamento = dataFechamento <= hoje ? mesAtual : mesAtual - 1
        
        // Calcular data de vencimento
        const dataVencimento = new Date(anoAtual, mesFechamento - 1, cartao.vencimento)
        if (mesFechamento === 12 && cartao.vencimento < cartao.fechamento) {
          dataVencimento.setFullYear(anoAtual + 1)
        }
        
        const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        
        // Verificar se já foi paga
        const { data: faturaPaga } = await supabase
          .from('faturas_pagas')
          .select('id')
          .eq('cartao_id', cartao.id)
          .eq('mes_referencia', mesFechamento)
          .eq('ano_referencia', anoAtual)
          .single()

        if (!faturaPaga) {
          if (diasRestantes < 0) {
            notifications.push({
              id: `fatura-vencida-${cartao.id}`,
              type: 'error',
              title: 'Fatura Vencida',
              message: `A fatura do cartão ${cartao.nome} está vencida há ${Math.abs(diasRestantes)} dia(s)`,
              link: '/cartoes',
            })
          } else if (diasRestantes <= 3) {
            notifications.push({
              id: `fatura-proxima-${cartao.id}`,
              type: 'warning',
              title: 'Fatura Próxima do Vencimento',
              message: `A fatura do cartão ${cartao.nome} vence em ${diasRestantes} dia(s)`,
              link: '/cartoes',
            })
          }
        }
      }
    }

    // 2. Verificar parcelas próximas ao vencimento (5 dias)
    const dataLimite = new Date(hoje)
    dataLimite.setDate(dataLimite.getDate() + 5)
    
    const { data: parcelas } = await supabase
      .from('parcelas')
      .select('id, descricao, data_vencimento, valor, cartao_id, paga')
      .eq('user_id', userId)
      .eq('paga', false)
      .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
      .gte('data_vencimento', hoje.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(5)

    if (parcelas && parcelas.length > 0) {
      parcelas.forEach((parcela) => {
        const dataVenc = new Date(parcela.data_vencimento)
        const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        
        notifications.push({
          id: `parcela-proxima-${parcela.id}`,
          type: 'warning',
          title: 'Parcela Próxima do Vencimento',
          message: `${parcela.descricao} - R$ ${parcela.valor.toFixed(2)} vence em ${diasRestantes} dia(s)`,
          link: '/compras',
        })
      })
    }

    // 3. Verificar parcelas vencidas
    const { data: parcelasVencidas } = await supabase
      .from('parcelas')
      .select('id, descricao, data_vencimento, valor')
      .eq('user_id', userId)
      .eq('paga', false)
      .lt('data_vencimento', hoje.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(5)

    if (parcelasVencidas && parcelasVencidas.length > 0) {
      parcelasVencidas.forEach((parcela) => {
        const dataVenc = new Date(parcela.data_vencimento)
        const diasVencidos = Math.ceil((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24))
        
        notifications.push({
          id: `parcela-vencida-${parcela.id}`,
          type: 'error',
          title: 'Parcela Vencida',
          message: `${parcela.descricao} - R$ ${parcela.valor.toFixed(2)} está vencida há ${diasVencidos} dia(s)`,
          link: '/compras',
        })
      })
    }

    // 4. Verificar despesas vs receitas do mês atual
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()

    const { data: receitas } = await supabase
      .from('receitas')
      .select('valor')
      .eq('user_id', userId)
      .eq('mes_referencia', mesAtual)
      .eq('ano_referencia', anoAtual)

    const totalReceitas = receitas?.reduce((sum, r) => sum + Number(r.valor), 0) || 0

    // Calcular despesas do mês (compras + parcelas)
    const { data: compras } = await supabase
      .from('compras')
      .select('valor, data, parcelada')
      .eq('user_id', userId)
      .gte('data', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`)
      .lte('data', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-31`)

    const comprasMes = compras?.filter(c => !c.parcelada).reduce((sum, c) => sum + Number(c.valor), 0) || 0

    const { data: parcelasMes } = await supabase
      .from('parcelas')
      .select('valor')
      .eq('user_id', userId)
      .gte('data_vencimento', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`)
      .lte('data_vencimento', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-31`)

    const parcelasMesTotal = parcelasMes?.reduce((sum, p) => sum + Number(p.valor), 0) || 0

    const totalDespesas = comprasMes + parcelasMesTotal
    const percentual = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0

    if (percentual >= 90 && percentual < 100) {
      notifications.push({
        id: 'despesas-proximas-receitas',
        type: 'warning',
        title: 'Atenção: Despesas Próximas das Receitas',
        message: `Suas despesas do mês (R$ ${totalDespesas.toFixed(2)}) representam ${percentual.toFixed(1)}% das suas receitas (R$ ${totalReceitas.toFixed(2)})`,
        link: '/dashboard',
      })
    } else if (percentual >= 100) {
      notifications.push({
        id: 'despesas-excedem-receitas',
        type: 'error',
        title: 'Atenção: Despesas Excedem Receitas',
        message: `Suas despesas do mês (R$ ${totalDespesas.toFixed(2)}) excedem suas receitas (R$ ${totalReceitas.toFixed(2)}) em R$ ${(totalDespesas - totalReceitas).toFixed(2)}`,
        link: '/dashboard',
      })
    }

    // 5. Verificar limite de cartão próximo (80% do limite) - apenas para faturas não pagas
    if (cartoes) {
      for (const cartao of cartoes) {
        // Buscar limite do cartão
        const { data: cartaoCompleto } = await supabase
          .from('cartoes')
          .select('limite')
          .eq('id', cartao.id)
          .single()

        if (cartaoCompleto && cartaoCompleto.limite) {
          // Buscar apenas compras não parceladas (compras parceladas são contabilizadas nas parcelas)
          const { data: comprasCartao } = await supabase
            .from('compras')
            .select('valor, parcelada')
            .eq('cartao_id', cartao.id)
            .eq('user_id', userId)
            .eq('metodo_pagamento', 'cartao')

          const comprasNaoParceladas = comprasCartao?.filter(c => !c.parcelada) || []
          const totalCompras = comprasNaoParceladas.reduce((sum, c) => sum + Number(c.valor), 0)

          // Buscar parcelas não pagas
          const { data: parcelasCartao } = await supabase
            .from('parcelas')
            .select('valor')
            .eq('cartao_id', cartao.id)
            .eq('user_id', userId)
            .eq('paga', false)

          const totalParcelas = parcelasCartao?.reduce((sum, p) => sum + Number(p.valor), 0) || 0
          const totalGasto = totalCompras + totalParcelas
          const percentualLimite = (totalGasto / Number(cartaoCompleto.limite)) * 100

          if (percentualLimite >= 80 && percentualLimite < 100) {
            notifications.push({
              id: `limite-proximo-${cartao.id}`,
              type: 'warning',
              title: 'Limite de Cartão Próximo',
              message: `O cartão ${cartao.nome} está com ${percentualLimite.toFixed(1)}% do limite utilizado (R$ ${totalGasto.toFixed(2)} / R$ ${Number(cartaoCompleto.limite).toFixed(2)})`,
              link: '/cartoes',
            })
          } else if (percentualLimite >= 100) {
            notifications.push({
              id: `limite-excedido-${cartao.id}`,
              type: 'error',
              title: 'Limite de Cartão Excedido',
              message: `O cartão ${cartao.nome} excedeu o limite em R$ ${(totalGasto - Number(cartaoCompleto.limite)).toFixed(2)}`,
              link: '/cartoes',
            })
          }
        }
      }
    }

    return notifications
  } catch (error) {
    console.error('Erro ao carregar notificações:', error)
    return []
  }
}
