import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.routes.js'
import { categoriasRoutes } from './routes/categorias.routes.js'
import { contasRoutes } from './routes/contas.routes.js'
import { contasPagarRoutes } from './routes/contas-pagar.routes.js'
import { pagamentosRoutes } from './routes/pagamentos.routes.js'
import { transacoesRoutes } from './routes/transacoes.routes.js'
import { orcamentoRoutes } from './routes/orcamento.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'

// Extender tipos do Fastify para incluir authenticate
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string }
    user: { id: string; email: string }
  }
}

import { FastifyRequest, FastifyReply } from 'fastify'

const app = fastify({ logger: true })

// Plugins
app.register(cors, {
  origin: true,
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'granofin-secret',
})

// Decorator de autenticação
app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
})

// Rotas da API com prefixo /api
app.register(authRoutes, { prefix: '/api' })
app.register(categoriasRoutes, { prefix: '/api' })
app.register(contasRoutes, { prefix: '/api' })
app.register(contasPagarRoutes, { prefix: '/api' })
app.register(pagamentosRoutes, { prefix: '/api' })
app.register(transacoesRoutes, { prefix: '/api' })
app.register(orcamentoRoutes, { prefix: '/api' })
app.register(dashboardRoutes, { prefix: '/api' })

// Rotas sem prefixo para compatibilidade (desenvolvimento)
app.register(authRoutes)
app.register(categoriasRoutes)
app.register(contasRoutes)
app.register(contasPagarRoutes)
app.register(pagamentosRoutes)
app.register(transacoesRoutes)
app.register(orcamentoRoutes)
app.register(dashboardRoutes)

// Servir arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(process.cwd(), 'public')
  app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
  })

  // Fallback para SPA - redireciona rotas não encontradas para index.html
  app.setNotFoundHandler(async (request, reply) => {
    // Se for uma rota de API, retorna 404
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }
    // Caso contrário, serve o index.html para o React Router
    return (reply as any).sendFile('index.html')
  })
}

// Rota de health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Rota para testar conexão com banco
app.get('/db-test', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { database: 'connected', timestamp: new Date().toISOString() }
  } catch (error) {
    return { database: 'error', message: String(error) }
  }
})

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Servidor rodando em http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
