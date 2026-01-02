import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function transacoesRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /transacoes - Listar transações do usuário
  app.get('/transacoes', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { tipo, categoriaId, contaId, dataInicio, dataFim } = request.query as {
      tipo?: string
      categoriaId?: string
      contaId?: string
      dataInicio?: string
      dataFim?: string
    }

    const where: any = { usuarioId }

    if (tipo) where.tipo = tipo
    if (categoriaId) where.categoriaId = categoriaId
    if (contaId) where.contaId = contaId

    if (dataInicio || dataFim) {
      where.data = {}
      if (dataInicio) where.data.gte = new Date(dataInicio)
      if (dataFim) where.data.lte = new Date(dataFim)
    }

    const transacoes = await prisma.transacao.findMany({
      where,
      include: {
        categoria: true,
        conta: true,
      },
      orderBy: { data: 'desc' },
    })

    return { transacoes }
  })

  // GET /transacoes/:id - Buscar transação por ID
  app.get('/transacoes/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const transacao = await prisma.transacao.findFirst({
      where: { id, usuarioId },
      include: {
        categoria: true,
        conta: true,
      },
    })

    if (!transacao) {
      return reply.status(404).send({ error: 'Transação não encontrada' })
    }

    return { transacao }
  })

  // POST /transacoes - Criar transação
  app.post('/transacoes', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      descricao: z.string().min(1, 'Descrição é obrigatória'),
      valor: z.number().positive('Valor deve ser positivo'),
      tipo: z.enum(['ENTRADA', 'SAIDA']),
      data: z.string(),
      contaId: z.string().uuid('ID da conta inválido'),
      categoriaId: z.string().uuid().optional().nullable(),
    })

    try {
      const data = createSchema.parse(request.body)

      // Verificar se a conta pertence ao usuário
      const conta = await prisma.conta.findFirst({
        where: { id: data.contaId, usuarioId },
      })

      if (!conta) {
        return reply.status(404).send({ error: 'Conta não encontrada' })
      }

      // Verificar se a categoria pertence ao usuário (se informada)
      if (data.categoriaId) {
        const categoria = await prisma.categoria.findFirst({
          where: { id: data.categoriaId, usuarioId },
        })

        if (!categoria) {
          return reply.status(404).send({ error: 'Categoria não encontrada' })
        }
      }

      // Adiciona horário meio-dia para evitar problemas de timezone
      const dataTransacao = new Date(data.data + 'T12:00:00')

      const transacao = await prisma.transacao.create({
        data: {
          usuarioId,
          descricao: data.descricao,
          valor: data.valor,
          tipo: data.tipo,
          data: dataTransacao,
          contaId: data.contaId,
          categoriaId: data.categoriaId,
        },
        include: {
          categoria: true,
          conta: true,
        },
      })

      return reply.status(201).send({ transacao })
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

  // PUT /transacoes/:id - Atualizar transação
  app.put('/transacoes/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const updateSchema = z.object({
      descricao: z.string().min(1).optional(),
      valor: z.number().positive().optional(),
      tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
      data: z.string().optional(),
      contaId: z.string().uuid().optional(),
      categoriaId: z.string().uuid().optional().nullable(),
    })

    try {
      const data = updateSchema.parse(request.body)

      // Verificar se a transação existe e pertence ao usuário
      const existing = await prisma.transacao.findFirst({
        where: { id, usuarioId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Transação não encontrada' })
      }

      // Verificar se a conta pertence ao usuário (se informada)
      if (data.contaId) {
        const conta = await prisma.conta.findFirst({
          where: { id: data.contaId, usuarioId },
        })

        if (!conta) {
          return reply.status(404).send({ error: 'Conta não encontrada' })
        }
      }

      // Verificar se a categoria pertence ao usuário (se informada)
      if (data.categoriaId) {
        const categoria = await prisma.categoria.findFirst({
          where: { id: data.categoriaId, usuarioId },
        })

        if (!categoria) {
          return reply.status(404).send({ error: 'Categoria não encontrada' })
        }
      }

      // Adiciona horário meio-dia para evitar problemas de timezone
      const dataTransacao = data.data ? new Date(data.data + 'T12:00:00') : undefined

      const transacao = await prisma.transacao.update({
        where: { id },
        data: {
          ...data,
          data: dataTransacao,
        },
        include: {
          categoria: true,
          conta: true,
        },
      })

      return { transacao }
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

  // DELETE /transacoes/:id - Excluir transação
  app.delete('/transacoes/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    // Verificar se a transação existe e pertence ao usuário
    const existing = await prisma.transacao.findFirst({
      where: { id, usuarioId },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Transação não encontrada' })
    }

    await prisma.transacao.delete({ where: { id } })

    return reply.status(204).send()
  })

  // POST /transacoes/transferencia - Transferir entre contas
  app.post('/transacoes/transferencia', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const transferSchema = z.object({
      valor: z.number().positive('Valor deve ser positivo'),
      data: z.string(),
      contaOrigemId: z.string().uuid('ID da conta origem inválido'),
      contaDestinoId: z.string().uuid('ID da conta destino inválido'),
      descricao: z.string().optional(),
    })

    try {
      const data = transferSchema.parse(request.body)

      if (data.contaOrigemId === data.contaDestinoId) {
        return reply.status(400).send({ error: 'Conta origem e destino devem ser diferentes' })
      }

      // Verificar se as contas pertencem ao usuário
      const [contaOrigem, contaDestino] = await Promise.all([
        prisma.conta.findFirst({ where: { id: data.contaOrigemId, usuarioId } }),
        prisma.conta.findFirst({ where: { id: data.contaDestinoId, usuarioId } }),
      ])

      if (!contaOrigem) {
        return reply.status(404).send({ error: 'Conta origem não encontrada' })
      }
      if (!contaDestino) {
        return reply.status(404).send({ error: 'Conta destino não encontrada' })
      }

      const dataTransacao = new Date(data.data + 'T12:00:00')
      const descricao = data.descricao || `Transferência: ${contaOrigem.nome} → ${contaDestino.nome}`

      // Criar as duas transações em uma transação do banco
      const [saida, entrada] = await prisma.$transaction([
        prisma.transacao.create({
          data: {
            usuarioId,
            descricao: descricao,
            valor: data.valor,
            tipo: 'SAIDA',
            data: dataTransacao,
            contaId: data.contaOrigemId,
          },
          include: { conta: true },
        }),
        prisma.transacao.create({
          data: {
            usuarioId,
            descricao: descricao,
            valor: data.valor,
            tipo: 'ENTRADA',
            data: dataTransacao,
            contaId: data.contaDestinoId,
          },
          include: { conta: true },
        }),
      ])

      return reply.status(201).send({ saida, entrada })
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

  // GET /transacoes/resumo - Resumo das transações
  app.get('/transacoes/resumo', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { dataInicio, dataFim } = request.query as {
      dataInicio?: string
      dataFim?: string
    }

    const where: any = { usuarioId }

    if (dataInicio || dataFim) {
      where.data = {}
      if (dataInicio) where.data.gte = new Date(dataInicio)
      if (dataFim) where.data.lte = new Date(dataFim)
    }

    const transacoes = await prisma.transacao.findMany({ where })

    let totalEntradas = 0
    let totalSaidas = 0

    transacoes.forEach((t) => {
      if (t.tipo === 'ENTRADA') {
        totalEntradas += Number(t.valor)
      } else {
        totalSaidas += Number(t.valor)
      }
    })

    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      totalTransacoes: transacoes.length,
    }
  })
}
