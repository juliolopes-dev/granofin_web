import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function contasRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /contas - Listar contas do usuário com saldo calculado
  app.get('/contas', async (request) => {
    const { id: usuarioId } = request.user as { id: string }

    const contas = await prisma.conta.findMany({
      where: { usuarioId, ativo: true },
      orderBy: { nome: 'asc' },
    })

    // Buscar todas as transações do usuário para calcular saldos
    const transacoes = await prisma.transacao.findMany({
      where: { usuarioId },
      select: { contaId: true, tipo: true, valor: true },
    })

    // Buscar todos os pagamentos do usuário
    const pagamentos = await prisma.pagamento.findMany({
      where: { 
        parcela: { contaPagar: { usuarioId } }
      },
      select: { contaId: true, valor: true },
    })

    // Calcular saldo de cada conta
    const contasComSaldo = contas.map((conta) => {
      const saldoInicial = Number(conta.saldoInicial)
      
      const entradas = transacoes
        .filter((t) => t.contaId === conta.id && t.tipo === 'ENTRADA')
        .reduce((acc, t) => acc + Number(t.valor), 0)
      
      const saidas = transacoes
        .filter((t) => t.contaId === conta.id && t.tipo === 'SAIDA')
        .reduce((acc, t) => acc + Number(t.valor), 0)
      
      const totalPagamentos = pagamentos
        .filter((p) => p.contaId === conta.id)
        .reduce((acc, p) => acc + Number(p.valor), 0)

      const saldo = saldoInicial + entradas - saidas - totalPagamentos

      return { ...conta, saldo }
    })

    return { contas: contasComSaldo }
  })

  // GET /contas/:id - Buscar conta por ID
  app.get('/contas/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const conta = await prisma.conta.findFirst({
      where: { id, usuarioId },
    })

    if (!conta) {
      return reply.status(404).send({ error: 'Conta não encontrada' })
    }

    return { conta }
  })

  // GET /contas/:id/saldo - Calcular saldo atual da conta
  app.get('/contas/:id/saldo', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const conta = await prisma.conta.findFirst({
      where: { id, usuarioId },
    })

    if (!conta) {
      return reply.status(404).send({ error: 'Conta não encontrada' })
    }

    // Calcular saldo: saldo inicial + entradas - saídas - pagamentos
    const transacoes = await prisma.transacao.aggregate({
      where: { contaId: id },
      _sum: { valor: true },
    })

    const entradas = await prisma.transacao.aggregate({
      where: { contaId: id, tipo: 'ENTRADA' },
      _sum: { valor: true },
    })

    const saidas = await prisma.transacao.aggregate({
      where: { contaId: id, tipo: 'SAIDA' },
      _sum: { valor: true },
    })

    const pagamentos = await prisma.pagamento.aggregate({
      where: { contaId: id },
      _sum: { valor: true },
    })

    const saldoInicial = Number(conta.saldoInicial)
    const totalEntradas = Number(entradas._sum.valor || 0)
    const totalSaidas = Number(saidas._sum.valor || 0)
    const totalPagamentos = Number(pagamentos._sum.valor || 0)

    const saldoAtual = saldoInicial + totalEntradas - totalSaidas - totalPagamentos

    return {
      saldoInicial,
      totalEntradas,
      totalSaidas,
      totalPagamentos,
      saldoAtual,
    }
  })

  // POST /contas - Criar conta
  app.post('/contas', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      nome: z.string().min(1, 'Nome é obrigatório'),
      tipo: z.enum(['CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO']),
      saldoInicial: z.number().optional().default(0),
      cor: z.string().optional().default('#22c55e'),
    })

    try {
      const data = createSchema.parse(request.body)

      const conta = await prisma.conta.create({
        data: {
          ...data,
          usuarioId,
        },
      })

      return reply.status(201).send({ conta })
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

  // PUT /contas/:id - Atualizar conta
  app.put('/contas/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const updateSchema = z.object({
      nome: z.string().min(1).optional(),
      tipo: z.enum(['CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO']).optional(),
      saldoInicial: z.number().optional(),
      cor: z.string().optional(),
    })

    try {
      const data = updateSchema.parse(request.body)

      // Verificar se conta existe e pertence ao usuário
      const existing = await prisma.conta.findFirst({
        where: { id, usuarioId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Conta não encontrada' })
      }

      const conta = await prisma.conta.update({
        where: { id },
        data,
      })

      return { conta }
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

  // DELETE /contas/:id - Excluir conta (soft delete)
  app.delete('/contas/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    // Verificar se conta existe e pertence ao usuário
    const existing = await prisma.conta.findFirst({
      where: { id, usuarioId },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Conta não encontrada' })
    }

    // Soft delete - apenas marca como inativo
    await prisma.conta.update({
      where: { id },
      data: { ativo: false },
    })

    return reply.status(204).send()
  })
}
