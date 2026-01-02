import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function dashboardRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /dashboard - Resumo geral do dashboard
  app.get('/dashboard', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { mes: mesParam, ano: anoParam } = request.query as { mes?: string; ano?: string }

    const mesAtual = mesParam ? parseInt(mesParam) : new Date().getMonth() + 1
    const anoAtual = anoParam ? parseInt(anoParam) : new Date().getFullYear()
    const inicioMes = new Date(anoAtual, mesAtual - 1, 1)
    const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    // 1. Saldo total das contas
    const contas = await prisma.conta.findMany({
      where: { usuarioId, ativo: true },
    })

    // Calcular saldo de cada conta baseado nas transações
    const transacoesTodas = await prisma.transacao.findMany({
      where: { usuarioId },
    })

    const saldoPorConta: Record<string, number> = {}
    contas.forEach((c) => {
      saldoPorConta[c.id] = Number(c.saldoInicial)
    })

    transacoesTodas.forEach((t) => {
      if (saldoPorConta[t.contaId] !== undefined) {
        if (t.tipo === 'ENTRADA') {
          saldoPorConta[t.contaId] += Number(t.valor)
        } else {
          saldoPorConta[t.contaId] -= Number(t.valor)
        }
      }
    })

    const saldoTotal = Object.values(saldoPorConta).reduce((a, b) => a + b, 0)

    // 2. Transações do mês
    const transacoesMes = await prisma.transacao.findMany({
      where: {
        usuarioId,
        data: { gte: inicioMes, lte: fimMes },
      },
    })

    const entradasMes = transacoesMes
      .filter((t) => t.tipo === 'ENTRADA')
      .reduce((acc, t) => acc + Number(t.valor), 0)

    const saidasMes = transacoesMes
      .filter((t) => t.tipo === 'SAIDA')
      .reduce((acc, t) => acc + Number(t.valor), 0)

    // 3. Parcelas a pagar do mês selecionado
    const parcelasMes = await prisma.parcela.findMany({
      where: {
        contaPagar: { usuarioId, status: 'ABERTA' },
        status: { not: 'PAGA' },
        dataVencimento: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
      include: {
        contaPagar: true,
      },
    })

    // Total de todas as parcelas do mês (incluindo não contabilizadas - são despesas fixas)
    const totalEmAberto = parcelasMes.reduce((acc: number, p: any) => {
      return acc + (Number(p.valor) - Number(p.valorPago))
    }, 0)

    // 4. Parcelas do mês selecionado (próximos vencimentos)
    const hoje = new Date()

    const parcelasProximas = await prisma.parcela.findMany({
      where: {
        contaPagar: { usuarioId },
        status: { not: 'PAGA' },
        dataVencimento: {
          gte: inicioMes,
          lte: fimMes,
        },
      },
      include: {
        contaPagar: true,
      },
      orderBy: { dataVencimento: 'asc' },
      take: 10,
    })

    // 5. Parcelas vencidas (antes do mês atual)
    const parcelasVencidas = await prisma.parcela.findMany({
      where: {
        contaPagar: { usuarioId },
        status: { not: 'PAGA' },
        dataVencimento: { lt: inicioMes },
      },
      include: {
        contaPagar: true,
      },
      orderBy: { dataVencimento: 'asc' },
      take: 5,
    })

    // 6. Resumo do orçamento do mês
    const orcamentos = await prisma.orcamento.findMany({
      where: { usuarioId, mes: mesAtual, ano: anoAtual },
    })

    const totalOrcado = orcamentos.reduce((acc, o) => acc + Number(o.valorLimite || 0), 0)
    const percentualOrcamento = totalOrcado > 0 ? (saidasMes / totalOrcado) * 100 : 0

    // 7. Gastos por categoria (top 5)
    const transacoesComCategoria = await prisma.transacao.findMany({
      where: {
        usuarioId,
        tipo: 'SAIDA',
        data: { gte: inicioMes, lte: fimMes },
        categoriaId: { not: null },
      },
      include: { categoria: true },
    })

    const gastosPorCategoria: Record<string, { nome: string; cor: string; valor: number }> = {}
    transacoesComCategoria.forEach((t) => {
      if (t.categoria) {
        if (!gastosPorCategoria[t.categoriaId!]) {
          gastosPorCategoria[t.categoriaId!] = {
            nome: t.categoria.nome,
            cor: t.categoria.cor,
            valor: 0,
          }
        }
        gastosPorCategoria[t.categoriaId!].valor += Number(t.valor)
      }
    })

    const topCategorias = Object.values(gastosPorCategoria)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)

    return {
      saldoTotal,
      contas: contas.map((c) => ({
        id: c.id,
        nome: c.nome,
        cor: c.cor,
        tipo: c.tipo,
        saldo: saldoPorConta[c.id] || 0,
      })),
      transacoesMes: {
        entradas: entradasMes,
        saidas: saidasMes,
        saldo: entradasMes - saidasMes,
      },
      contasPagar: {
        totalEmAberto,
        quantidade: parcelasMes.length,
      },
      parcelasProximas: parcelasProximas.map((p: any) => ({
        id: p.id,
        descricao: p.contaPagar.descricao,
        numero: p.numero,
        valor: Number(p.valor) - Number(p.valorPago),
        dataVencimento: p.dataVencimento,
        naoContabilizar: p.contaPagar.naoContabilizar || false,
      })),
      parcelasVencidas: parcelasVencidas.map((p: any) => ({
        id: p.id,
        descricao: p.contaPagar.descricao,
        numero: p.numero,
        valor: Number(p.valor) - Number(p.valorPago),
        dataVencimento: p.dataVencimento,
        naoContabilizar: p.contaPagar.naoContabilizar || false,
      })),
      orcamento: {
        totalOrcado,
        totalGasto: saidasMes,
        percentual: percentualOrcamento,
      },
      topCategorias,
      mes: mesAtual,
      ano: anoAtual,
    }
  })
}
