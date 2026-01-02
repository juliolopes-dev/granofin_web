import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function contasPagarRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /contas-pagar - Listar contas a pagar do usuário
  app.get('/contas-pagar', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { status, tipo } = request.query as { status?: string; tipo?: string }

    const where: any = { usuarioId }
    if (status) where.status = status
    if (tipo) where.tipo = tipo

    const contasPagar = await prisma.contaPagar.findMany({
      where,
      include: {
        categoria: true,
        parcelas: {
          orderBy: { numero: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calcular valores pagos e pendentes
    const contasComResumo = contasPagar.map((conta) => {
      const valorPago = conta.parcelas.reduce(
        (acc, p) => acc + Number(p.valorPago),
        0
      )
      const valorPendente = Number(conta.valorTotal) - valorPago
      const parcelasPagas = conta.parcelas.filter((p) => p.status === 'PAGA').length
      const parcelasPendentes = conta.parcelas.filter((p) => p.status !== 'PAGA').length

      return {
        ...conta,
        valorPago,
        valorPendente,
        parcelasPagas,
        parcelasPendentes,
      }
    })

    return { contasPagar: contasComResumo }
  })

  // GET /contas-pagar/:id - Buscar conta a pagar por ID
  app.get('/contas-pagar/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const contaPagar = await prisma.contaPagar.findFirst({
      where: { id, usuarioId },
      include: {
        categoria: true,
        parcelas: {
          include: {
            pagamentos: {
              include: { conta: true },
              orderBy: { dataPagamento: 'desc' },
            },
          },
          orderBy: { numero: 'asc' },
        },
      },
    })

    if (!contaPagar) {
      return reply.status(404).send({ error: 'Conta a pagar não encontrada' })
    }

    // Calcular resumo
    const valorPago = contaPagar.parcelas.reduce(
      (acc, p) => acc + Number(p.valorPago),
      0
    )
    const valorPendente = Number(contaPagar.valorTotal) - valorPago

    return {
      contaPagar: {
        ...contaPagar,
        valorPago,
        valorPendente,
      },
    }
  })

  // POST /contas-pagar - Criar conta a pagar
  app.post('/contas-pagar', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      descricao: z.string().min(1, 'Descrição é obrigatória'),
      valorTotal: z.number().positive('Valor deve ser positivo'),
      tipo: z.enum(['PARCELADA', 'AVULSA']),
      categoriaId: z.string().uuid().optional().nullable(),
      totalParcelas: z.number().int().positive().optional().nullable(),
      dataVencimento: z.string().optional(), // Data do primeiro vencimento
      observacao: z.string().optional().nullable(),
      naoContabilizar: z.boolean().optional().default(false),
    })

    try {
      const data = createSchema.parse(request.body)

      // Validar: se parcelada, precisa de totalParcelas
      if (data.tipo === 'PARCELADA' && !data.totalParcelas) {
        return reply.status(400).send({
          error: 'Contas parceladas precisam do número de parcelas',
        })
      }

      // Criar conta a pagar
      const contaPagar = await prisma.contaPagar.create({
        data: {
          usuarioId,
          descricao: data.descricao,
          valorTotal: data.valorTotal,
          tipo: data.tipo,
          categoriaId: data.categoriaId,
          totalParcelas: data.totalParcelas,
          observacao: data.observacao,
          naoContabilizar: data.naoContabilizar,
        },
      })

      // Gerar parcelas
      if (data.tipo === 'PARCELADA' && data.totalParcelas) {
        const valorParcela = data.valorTotal / data.totalParcelas
        const dataBase = data.dataVencimento
          ? new Date(data.dataVencimento)
          : new Date()

        const parcelas = []
        for (let i = 0; i < data.totalParcelas; i++) {
          const dataVencimento = new Date(dataBase)
          dataVencimento.setMonth(dataVencimento.getMonth() + i)

          parcelas.push({
            contaPagarId: contaPagar.id,
            numero: i + 1,
            valor: valorParcela,
            dataVencimento,
          })
        }

        await prisma.parcela.createMany({ data: parcelas })
      } else {
        // Conta avulsa: criar uma única "parcela" sem vencimento
        await prisma.parcela.create({
          data: {
            contaPagarId: contaPagar.id,
            numero: 1,
            valor: data.valorTotal,
            dataVencimento: data.dataVencimento
              ? new Date(data.dataVencimento)
              : null,
          },
        })
      }

      // Buscar conta completa com parcelas
      const contaCompleta = await prisma.contaPagar.findUnique({
        where: { id: contaPagar.id },
        include: {
          categoria: true,
          parcelas: { orderBy: { numero: 'asc' } },
        },
      })

      return reply.status(201).send({ contaPagar: contaCompleta })
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

  // PUT /contas-pagar/:id - Atualizar conta a pagar (apenas descrição, categoria, observação)
  app.put('/contas-pagar/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const updateSchema = z.object({
      descricao: z.string().min(1).optional(),
      categoriaId: z.string().uuid().optional().nullable(),
      observacao: z.string().optional().nullable(),
    })

    try {
      const data = updateSchema.parse(request.body)

      // Verificar se conta existe e pertence ao usuário
      const existing = await prisma.contaPagar.findFirst({
        where: { id, usuarioId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Conta a pagar não encontrada' })
      }

      const contaPagar = await prisma.contaPagar.update({
        where: { id },
        data,
        include: {
          categoria: true,
          parcelas: { orderBy: { numero: 'asc' } },
        },
      })

      return { contaPagar }
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

  // DELETE /contas-pagar/:id - Excluir conta a pagar
  app.delete('/contas-pagar/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    // Verificar se conta existe e pertence ao usuário
    const existing = await prisma.contaPagar.findFirst({
      where: { id, usuarioId },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Conta a pagar não encontrada' })
    }

    // Excluir (cascade vai deletar parcelas e pagamentos)
    await prisma.contaPagar.delete({ where: { id } })

    return reply.status(204).send()
  })

  // GET /contas-pagar/resumo - Resumo das contas a pagar
  app.get('/contas-pagar/resumo', async (request) => {
    const { id: usuarioId } = request.user as { id: string }

    const contas = await prisma.contaPagar.findMany({
      where: { usuarioId },
      include: { parcelas: true },
    })

    let totalAberto = 0
    let totalPago = 0
    let contasAbertas = 0
    let contasQuitadas = 0

    contas.forEach((conta) => {
      const valorPago = conta.parcelas.reduce(
        (acc, p) => acc + Number(p.valorPago),
        0
      )
      const valorPendente = Number(conta.valorTotal) - valorPago

      totalPago += valorPago
      totalAberto += valorPendente

      if (conta.status === 'ABERTA') {
        contasAbertas++
      } else {
        contasQuitadas++
      }
    })

    return {
      totalAberto,
      totalPago,
      contasAbertas,
      contasQuitadas,
      totalContas: contas.length,
    }
  })
}
