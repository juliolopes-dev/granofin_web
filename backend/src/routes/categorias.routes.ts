import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function categoriasRoutes(app: FastifyInstance) {
  // Middleware de autenticação para todas as rotas
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  // GET /categorias - Listar categorias do usuário (com hierarquia)
  app.get('/categorias', async (request) => {
    const { id: usuarioId } = request.user as { id: string }
    const { flat } = request.query as { flat?: string }

    const categorias = await prisma.categoria.findMany({
      where: { usuarioId, ativo: true },
      include: {
        categoriaPai: true,
        subcategorias: {
          where: { ativo: true },
          orderBy: { nome: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    })

    // Se flat=true, retorna lista plana (para selects)
    if (flat === 'true') {
      return { categorias }
    }

    // Retorna apenas categorias pai (subcategorias vêm aninhadas)
    const categoriasPai = categorias.filter((c) => !c.categoriaPaiId)

    return { categorias: categoriasPai }
  })

  // GET /categorias/:id - Buscar categoria por ID
  app.get('/categorias/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const categoria = await prisma.categoria.findFirst({
      where: { id, usuarioId },
    })

    if (!categoria) {
      return reply.status(404).send({ error: 'Categoria não encontrada' })
    }

    return { categoria }
  })

  // POST /categorias - Criar categoria (ou subcategoria)
  app.post('/categorias', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }

    const createSchema = z.object({
      nome: z.string().min(1, 'Nome é obrigatório'),
      tipo: z.enum(['DESPESA', 'RECEITA']),
      cor: z.string().optional().default('#6366f1'),
      icone: z.string().optional().default('FiTag'),
      categoriaPaiId: z.string().uuid().optional().nullable(),
    })

    try {
      const data = createSchema.parse(request.body)

      // Se tem categoria pai, verificar se pertence ao usuário e herdar o tipo
      if (data.categoriaPaiId) {
        const categoriaPai = await prisma.categoria.findFirst({
          where: { id: data.categoriaPaiId, usuarioId, ativo: true },
        })

        if (!categoriaPai) {
          return reply.status(404).send({ error: 'Categoria pai não encontrada' })
        }

        // Subcategoria herda o tipo da categoria pai
        data.tipo = categoriaPai.tipo as 'DESPESA' | 'RECEITA'
      }

      const categoria = await prisma.categoria.create({
        data: {
          nome: data.nome,
          tipo: data.tipo,
          cor: data.cor,
          icone: data.icone,
          categoriaPaiId: data.categoriaPaiId || null,
          usuarioId,
        },
        include: {
          categoriaPai: true,
        },
      })

      return reply.status(201).send({ categoria })
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

  // PUT /categorias/:id - Atualizar categoria
  app.put('/categorias/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    const updateSchema = z.object({
      nome: z.string().min(1).optional(),
      tipo: z.enum(['DESPESA', 'RECEITA']).optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
    })

    try {
      const data = updateSchema.parse(request.body)

      // Verificar se categoria existe e pertence ao usuário
      const existing = await prisma.categoria.findFirst({
        where: { id, usuarioId },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Categoria não encontrada' })
      }

      const categoria = await prisma.categoria.update({
        where: { id },
        data,
      })

      return { categoria }
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

  // DELETE /categorias/:id - Excluir categoria (soft delete)
  app.delete('/categorias/:id', async (request, reply) => {
    const { id: usuarioId } = request.user as { id: string }
    const { id } = request.params as { id: string }

    // Verificar se categoria existe e pertence ao usuário
    const existing = await prisma.categoria.findFirst({
      where: { id, usuarioId },
    })

    if (!existing) {
      return reply.status(404).send({ error: 'Categoria não encontrada' })
    }

    // Soft delete - apenas marca como inativo
    await prisma.categoria.update({
      where: { id },
      data: { ativo: false },
    })

    return reply.status(204).send()
  })
}
