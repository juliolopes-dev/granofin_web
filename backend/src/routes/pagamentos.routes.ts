import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function pagamentosRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // POST /pagamentos - Registrar pagamento
  app.post('/pagamentos', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      parcelaId: z.string().uuid('ID da parcela inválido'),
      contaId: z.string().uuid('ID da conta inválido'),
      valor: z.number().positive('Valor deve ser positivo'),
      dataPagamento: z.string().optional(),
      observacao: z.string().optional().nullable(),
    })

    try {
      const data = createSchema.parse(request.body)

      // Buscar parcela e verificar se pertence ao usuário
      const parcela = await prisma.parcela.findUnique({
        where: { id: data.parcelaId },
        include: {
          contaPagar: true,
        },
      })

      if (!parcela || parcela.contaPagar.usuarioId !== usuarioId) {
        return reply.status(404).send({ error: 'Parcela não encontrada' })
      }

      // Verificar se a conta pertence ao usuário
      const conta = await prisma.conta.findFirst({
        where: { id: data.contaId, usuarioId },
      })

      if (!conta) {
        return reply.status(404).send({ error: 'Conta não encontrada' })
      }

      // Calcular valor restante da parcela
      const valorRestante = Number(parcela.valor) - Number(parcela.valorPago)

      if (data.valor > valorRestante) {
        return reply.status(400).send({
          error: `Valor máximo permitido: R$ ${valorRestante.toFixed(2)}`,
        })
      }

      const dataPagamento = data.dataPagamento
        ? new Date(data.dataPagamento + 'T12:00:00')
        : new Date()

      // Criar pagamento e transação em uma única transação do banco
      const [pagamento] = await prisma.$transaction([
        prisma.pagamento.create({
          data: {
            parcelaId: data.parcelaId,
            contaId: data.contaId,
            valor: data.valor,
            dataPagamento,
            observacao: data.observacao,
          },
        }),
        // Criar transação de saída para descontar do saldo da conta
        prisma.transacao.create({
          data: {
            usuarioId,
            contaId: data.contaId,
            categoriaId: parcela.contaPagar.categoriaId,
            tipo: 'SAIDA',
            valor: data.valor,
            descricao: `Pagamento: ${parcela.contaPagar.descricao}`,
            data: dataPagamento,
          },
        }),
      ])

      // Atualizar valor pago da parcela
      const novoValorPago = Number(parcela.valorPago) + data.valor
      const novoStatus =
        novoValorPago >= Number(parcela.valor)
          ? 'PAGA'
          : novoValorPago > 0
          ? 'PARCIAL'
          : 'PENDENTE'

      await prisma.parcela.update({
        where: { id: data.parcelaId },
        data: {
          valorPago: novoValorPago,
          status: novoStatus,
        },
      })

      // Verificar se todas as parcelas da conta foram pagas
      const todasParcelas = await prisma.parcela.findMany({
        where: { contaPagarId: parcela.contaPagarId },
      })

      const todasPagas = todasParcelas.every(
        (p) =>
          p.id === data.parcelaId
            ? novoStatus === 'PAGA'
            : p.status === 'PAGA'
      )

      if (todasPagas) {
        await prisma.contaPagar.update({
          where: { id: parcela.contaPagarId },
          data: { status: 'QUITADA' },
        })
      }

      return reply.status(201).send({
        pagamento,
        parcelaStatus: novoStatus,
        contaQuitada: todasPagas,
      })
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

  // GET /pagamentos - Listar pagamentos do usuário
  app.get('/pagamentos', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { contaPagarId, contaId } = request.query as {
      contaPagarId?: string
      contaId?: string
    }

    const where: any = {}

    if (contaPagarId) {
      where.parcela = { contaPagarId }
    }

    if (contaId) {
      where.contaId = contaId
    }

    // Filtrar apenas pagamentos de contas do usuário
    const pagamentos = await prisma.pagamento.findMany({
      where: {
        ...where,
        parcela: {
          ...where.parcela,
          contaPagar: { usuarioId },
        },
      },
      include: {
        parcela: {
          include: {
            contaPagar: {
              select: { descricao: true },
            },
          },
        },
        conta: {
          select: { nome: true, cor: true },
        },
      },
      orderBy: { dataPagamento: 'desc' },
    })

    return { pagamentos }
  })

  // DELETE /pagamentos/:id - Estornar pagamento
  app.delete('/pagamentos/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    // Buscar pagamento
    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        parcela: {
          include: { contaPagar: true },
        },
      },
    })

    if (!pagamento || pagamento.parcela.contaPagar.usuarioId !== usuarioId) {
      return reply.status(404).send({ error: 'Pagamento não encontrado' })
    }

    // Atualizar valor pago da parcela
    const novoValorPago = Number(pagamento.parcela.valorPago) - Number(pagamento.valor)
    const novoStatus =
      novoValorPago <= 0
        ? 'PENDENTE'
        : novoValorPago < Number(pagamento.parcela.valor)
        ? 'PARCIAL'
        : 'PAGA'

    await prisma.parcela.update({
      where: { id: pagamento.parcelaId },
      data: {
        valorPago: Math.max(0, novoValorPago),
        status: novoStatus,
      },
    })

    // Reabrir conta se estava quitada
    if (pagamento.parcela.contaPagar.status === 'QUITADA') {
      await prisma.contaPagar.update({
        where: { id: pagamento.parcela.contaPagarId },
        data: { status: 'ABERTA' },
      })
    }

    // Buscar e excluir a transação correspondente ao pagamento
    const descricaoPagamento = `Pagamento: ${pagamento.parcela.contaPagar.descricao}`
    await prisma.transacao.deleteMany({
      where: {
        usuarioId,
        contaId: pagamento.contaId,
        descricao: descricaoPagamento,
        valor: pagamento.valor,
      },
    })

    // Excluir pagamento
    await prisma.pagamento.delete({ where: { id } })

    return reply.status(204).send()
  })
}
