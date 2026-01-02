import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function orcamentoRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /orcamento - Listar orçamentos do usuário (por mês/ano)
  app.get('/orcamento', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { mes, ano } = request.query as { mes?: string; ano?: string }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const orcamentos = await prisma.orcamento.findMany({
      where: {
        usuarioId,
        mes: mesAtual,
        ano: anoAtual,
      },
      include: {
        categoria: true,
      },
      orderBy: { categoria: { nome: 'asc' } },
    })

    // Calcular gastos e entradas por categoria no período
    const inicioMes = new Date(anoAtual, mesAtual - 1, 1)
    const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    // Buscar total de entradas do mês para calcular orçamentos por percentual
    const entradas = await prisma.transacao.findMany({
      where: {
        usuarioId,
        tipo: 'ENTRADA',
        data: { gte: inicioMes, lte: fimMes },
      },
    })
    const totalEntradas = entradas.reduce((acc, t) => acc + Number(t.valor), 0)

    const transacoes = await prisma.transacao.findMany({
      where: {
        usuarioId,
        tipo: 'SAIDA',
        data: {
          gte: inicioMes,
          lte: fimMes,
        },
        categoriaId: { not: null },
      },
    })

    // Agrupar gastos por categoria
    const gastosPorCategoria: Record<string, number> = {}
    transacoes.forEach((t) => {
      if (t.categoriaId) {
        gastosPorCategoria[t.categoriaId] =
          (gastosPorCategoria[t.categoriaId] || 0) + Number(t.valor)
      }
    })

    // Combinar orçamentos com gastos
    const orcamentosComGastos = orcamentos.map((orc) => {
      // Se tem percentual, calcular valor limite baseado nas entradas
      const valorLimiteCalculado = orc.percentual
        ? (Number(orc.percentual) / 100) * totalEntradas
        : Number(orc.valorLimite || 0)

      const gasto = gastosPorCategoria[orc.categoriaId] || 0
      const disponivel = valorLimiteCalculado - gasto
      const percentualUsado = valorLimiteCalculado > 0 ? (gasto / valorLimiteCalculado) * 100 : 0

      return {
        ...orc,
        valorLimiteCalculado,
        gasto,
        disponivel,
        percentualUsado,
        tipoLimite: orc.percentual ? 'PERCENTUAL' : 'VALOR',
      }
    })

    return {
      orcamentos: orcamentosComGastos,
      mes: mesAtual,
      ano: anoAtual,
      totalEntradas,
    }
  })

  // POST /orcamento - Criar ou atualizar orçamento
  app.post('/orcamento', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      categoriaId: z.string().uuid('ID da categoria inválido'),
      tipoLimite: z.enum(['VALOR', 'PERCENTUAL']).default('VALOR'),
      valorLimite: z.number().min(0).optional().nullable(),
      percentual: z.number().min(0).max(100).optional().nullable(),
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2020).max(2100),
    })

    try {
      const data = createSchema.parse(request.body)

      // Validar: deve ter valorLimite OU percentual
      if (data.tipoLimite === 'VALOR' && (!data.valorLimite || data.valorLimite <= 0)) {
        return reply.status(400).send({ error: 'Valor limite é obrigatório' })
      }
      if (data.tipoLimite === 'PERCENTUAL' && (!data.percentual || data.percentual <= 0)) {
        return reply.status(400).send({ error: 'Percentual é obrigatório' })
      }

      // Verificar se a categoria pertence ao usuário
      const categoria = await prisma.categoria.findFirst({
        where: { id: data.categoriaId, usuarioId },
      })

      if (!categoria) {
        return reply.status(404).send({ error: 'Categoria não encontrada' })
      }

      // Verificar se já existe orçamento para esta categoria/mês/ano
      const existing = await prisma.orcamento.findFirst({
        where: {
          usuarioId,
          categoriaId: data.categoriaId,
          mes: data.mes,
          ano: data.ano,
        },
      })

      let orcamento
      if (existing) {
        // Atualizar existente
        orcamento = await prisma.orcamento.update({
          where: { id: existing.id },
          data: {
            valorLimite: data.tipoLimite === 'VALOR' ? data.valorLimite : null,
            percentual: data.tipoLimite === 'PERCENTUAL' ? data.percentual : null,
          },
          include: { categoria: true },
        })
      } else {
        // Criar novo
        orcamento = await prisma.orcamento.create({
          data: {
            usuarioId,
            categoriaId: data.categoriaId,
            valorLimite: data.tipoLimite === 'VALOR' ? data.valorLimite : null,
            percentual: data.tipoLimite === 'PERCENTUAL' ? data.percentual : null,
            mes: data.mes,
            ano: data.ano,
          },
          include: { categoria: true },
        })
      }

      return reply.status(201).send({ orcamento })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      throw error
    }
  })

  // DELETE /orcamento/:id - Excluir orçamento
  app.delete('/orcamento/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const existing = await prisma.orcamento.findFirst({
      where: { id, usuarioId },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Orçamento não encontrado' })
    }

    await prisma.orcamento.delete({ where: { id } })

    return reply.status(204).send()
  })

  // GET /orcamento/resumo - Resumo geral do orçamento
  app.get('/orcamento/resumo', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { mes, ano } = request.query as { mes?: string; ano?: string }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    // Buscar orçamentos
    const orcamentos = await prisma.orcamento.findMany({
      where: { usuarioId, mes: mesAtual, ano: anoAtual },
    })

    // Calcular total orçado
    const totalOrcado = orcamentos.reduce(
      (acc, o) => acc + Number(o.valorLimite || 0),
      0
    )

    // Calcular gastos do mês
    const inicioMes = new Date(anoAtual, mesAtual - 1, 1)
    const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    const transacoes = await prisma.transacao.findMany({
      where: {
        usuarioId,
        tipo: 'SAIDA',
        data: { gte: inicioMes, lte: fimMes },
      },
    })

    const totalGasto = transacoes.reduce((acc, t) => acc + Number(t.valor), 0)

    // Calcular entradas do mês
    const entradas = await prisma.transacao.findMany({
      where: {
        usuarioId,
        tipo: 'ENTRADA',
        data: { gte: inicioMes, lte: fimMes },
      },
    })

    const totalEntradas = entradas.reduce((acc, t) => acc + Number(t.valor), 0)

    return {
      mes: mesAtual,
      ano: anoAtual,
      totalOrcado,
      totalGasto,
      totalEntradas,
      saldo: totalEntradas - totalGasto,
      percentualGasto: totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0,
      disponivel: totalOrcado - totalGasto,
    }
  })
}
