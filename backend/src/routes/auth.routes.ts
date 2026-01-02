import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register - Cadastro de usuário
  app.post('/auth/register', async (request, reply) => {
    const registerSchema = z.object({
      nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    })

    try {
      const { nome, email, senha } = registerSchema.parse(request.body)

      // Verificar se email já existe
      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      })

      if (existingUser) {
        return reply.status(400).send({ error: 'Email já cadastrado' })
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 10)

      // Criar usuário
      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          createdAt: true,
        },
      })

      // Gerar token
      const token = app.jwt.sign(
        { id: usuario.id, email: usuario.email },
        { expiresIn: '7d' }
      )

      return reply.status(201).send({
        usuario,
        token,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro no registro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /auth/login - Login
  app.post('/auth/login', async (request, reply) => {
    const loginSchema = z.object({
      email: z.string().email('Email inválido'),
      senha: z.string().min(1, 'Senha é obrigatória'),
    })

    try {
      const { email, senha } = loginSchema.parse(request.body)

      // Buscar usuário
      const usuario = await prisma.usuario.findUnique({
        where: { email },
      })

      if (!usuario) {
        return reply.status(401).send({ error: 'Email ou senha incorretos' })
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha)

      if (!senhaValida) {
        return reply.status(401).send({ error: 'Email ou senha incorretos' })
      }

      // Gerar token
      const token = app.jwt.sign(
        { id: usuario.id, email: usuario.email },
        { expiresIn: '7d' }
      )

      return reply.send({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
        token,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro no login:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // GET /auth/me - Dados do usuário logado
  app.get(
    '/auth/me',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.user as { id: string }

        const usuario = await prisma.usuario.findUnique({
          where: { id },
          select: {
            id: true,
            nome: true,
            email: true,
            createdAt: true,
          },
        })

        if (!usuario) {
          return reply.status(404).send({ error: 'Usuário não encontrado' })
        }

        return reply.send({ usuario })
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )
}
