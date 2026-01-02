# Status do Projeto - GranoFin

## 1. Visão Geral
- **Stack**: 
  - Frontend: React + Vite + TypeScript + Tailwind CSS
  - Backend: Node.js + Fastify + Prisma ORM
  - Banco: PostgreSQL (produção na VPS)
- **Arquitetura**: Monorepo com frontend e backend separados
- **Objetivo**: Sistema de gestão financeira pessoal com controle de contas a pagar, orçamento, entradas e saídas

## 2. Estado Atual
✅ **Setup Completo**
- Backend Fastify configurado e rodando (porta 3333)
- Frontend React+Vite configurado e rodando (porta 5173)
- Prisma conectado ao PostgreSQL de produção
- Health check e teste de conexão funcionando

✅ **Modelagem do Banco Completa**
- 8 tabelas criadas: usuarios, categorias, contas, contas_pagar, parcelas, pagamentos, transacoes, orcamentos
- 6 enums definidos: TipoCategoria, TipoConta, TipoContaPagar, StatusContaPagar, StatusParcela, TipoTransacao
- Relacionamentos configurados com cascade delete
- Suporte a subcategorias (categoriaPaiId)

✅ **Autenticação Backend Completa**
- POST /auth/register - Cadastro com validação Zod
- POST /auth/login - Login com JWT (expira em 7 dias)
- GET /auth/me - Dados do usuário autenticado
- Middleware de autenticação configurado

✅ **Autenticação Frontend Completa**
- AuthContext com login, register, logout
- Tela de Login com validação
- Tela de Cadastro com confirmação de senha
- PrivateRoute para proteção de rotas
- Serviço API com Axios e interceptors

✅ **Layout Base Completo**
- Sidebar lateral com efeito hover (expande ao passar o mouse)
- Menu: Dashboard, Orçamento, Contas a Pagar, Transações, Contas, Categorias
- Dashboard com cards de resumo
- Páginas placeholder para todas as seções

✅ **CRUD Categorias Completo**
- Backend: GET, POST, PUT, DELETE /categorias
- Frontend: Listagem separada por tipo (Despesa/Receita)
- Modal de criação/edição com seleção de cor
- Soft delete (marca como inativo)
- **Subcategorias**: Suporte a hierarquia pai/filho

✅ **CRUD Contas (Carteiras) Completo**
- Backend: GET, POST, PUT, DELETE /contas + rota de saldo
- Frontend: Cards com saldo, tipo e cor
- Modal de criação/edição
- Tipos: CORRENTE, POUPANCA, CARTEIRA, INVESTIMENTO
- **Opção esconder valores**: Botão para ocultar saldos na tela

✅ **CRUD Contas a Pagar Completo**
- Backend: GET, POST, PUT, DELETE /contas-pagar + resumo
- Geração automática de parcelas para contas parceladas
- Frontend: Tabela com filtros, modal de criação, modal de detalhes
- Tipos: PARCELADA (com parcelas) e AVULSA (aportes)
- **Parcelas fixas**: Opção para definir valor fixo por parcela
- **Não contabilizar**: Opção para despesas fixas que não são dívidas (ex: ajuda mensal)

✅ **Sistema de Pagamentos Completo**
- Backend: POST /pagamentos, GET /pagamentos, DELETE /pagamentos/:id
- Pagamento total ou fracionado (parcial)
- Atualização automática de status (PENDENTE → PARCIAL → PAGA)
- Quitação automática da conta quando todas parcelas pagas
- Frontend: Botão "Pagar" em cada parcela, modal de pagamento

✅ **CRUD Transações Completo**
- Backend: GET, POST, PUT, DELETE /transacoes + resumo
- Frontend: Tabela com filtros, modal de criação/edição
- Tipos: ENTRADA (receitas) e SAIDA (despesas)
- Cards de resumo: Entradas, Saídas, Saldo
- **Filtro de data elegante**: Navegação por mês/ano

✅ **Orçamento Completo**
- Backend: GET, POST, DELETE /orcamento + resumo
- Frontend: Navegação por mês, barras de progresso
- Acompanhamento de gastos vs limite por categoria
- Indicadores visuais (verde/amarelo/vermelho)
- **Orçamento por percentual**: Limite baseado em % das entradas do mês
- **Seletor de mês/ano**: Escolher mês específico ao criar orçamento

✅ **Dashboard Completo**
- Backend: GET /dashboard com resumo geral
- Cards: Saldo Total, Entradas, Saídas, Contas a Pagar
- Alertas de parcelas vencidas
- Minhas Carteiras com saldos
- Próximos vencimentos do mês selecionado
- Resumo do orçamento do mês
- Top 5 gastos por categoria
- **Filtro de data elegante**: Navegação por mês/ano
- **Opção esconder valores**: Botão para ocultar todos os valores
- **Indicador "Não contabiliza"**: Badge visual para despesas fixas

## 3. Última Sessão
- **Data**: 01/01/2026
- **Mudanças**: 
  - Subcategorias (hierarquia pai/filho)
  - Orçamento por percentual das entradas
  - Filtro de data elegante (Dashboard + Transações)
  - Opção esconder valores no Dashboard
  - Parcelas fixas em Contas a Pagar
  - Opção "Não contabilizar" para despesas fixas
  - Seletor de mês/ano no modal de orçamento
  - Correção de exibição de próximos vencimentos no Dashboard
- **Testes**: 
  - ✅ Criar subcategorias
  - ✅ Orçamento por percentual
  - ✅ Navegar entre meses no Dashboard
  - ✅ Esconder/mostrar valores
  - ✅ Parcelas fixas
  - ✅ Despesas não contabilizadas

## 4. Tarefas Concluídas
- [x] **Tarefa 2**: Modelagem completa do banco de dados (todas as tabelas)
- [x] **Tarefa 3**: Autenticação Backend (cadastro/login com JWT)
- [x] **Tarefa 4**: Autenticação Frontend (telas de login/cadastro)
- [x] **Tarefa 5**: Layout Base (Sidebar com hover + estrutura de páginas)
- [x] **Tarefa 6**: CRUD Categorias
- [x] **Tarefa 7**: CRUD Contas (Carteiras)
- [x] **Tarefa 8**: CRUD Contas a Pagar (Parceladas + Avulsas)
- [x] **Tarefa 9**: Sistema de Pagamentos (fracionado + aportes)
- [x] **Tarefa 10**: CRUD Transações (Entradas/Saídas)
- [x] **Tarefa 11**: Orçamento (configuração + acompanhamento)
- [x] **Tarefa 12**: Dashboard
- [x] **Subcategorias**: Schema + Backend + Frontend
- [x] **Orçamento por percentual**: Limite baseado em % das entradas
- [x] **Filtro de data elegante**: Transações + Dashboard
- [x] **Opção esconder valores**: Dashboard + Contas
- [x] **Parcelas fixas**: Contas a Pagar
- [x] **Não contabilizar**: Despesas fixas que não são dívidas
- [x] **Seletor de mês/ano**: Modal de criação de orçamento

## 5. PROJETO CONCLUÍDO! 🎉

O sistema GranoFin está completo com todas as funcionalidades:
- Autenticação (login/cadastro)
- Gestão de Categorias com Subcategorias
- Gestão de Contas/Carteiras
- Contas a Pagar (parceladas, avulsas, parcelas fixas, não contabilizar)
- Sistema de Pagamentos (fracionado)
- Transações (entradas e saídas) com filtro por mês
- Orçamento por categoria (valor fixo ou percentual)
- Dashboard com visão geral e filtro por mês

## 6. Contexto Técnico Completo
Sistema de gestão financeira pessoal multiusuário com autenticação JWT. Funcionalidades principais: (1) Contas a pagar parceladas - usuário define quantidade de parcelas e sistema gera automaticamente, com opção de parcela fixa; (2) Contas avulsas - sem parcelas definidas, pagamento por aportes; (3) Pagamento fracionado - permite pagar valor parcial mantendo saldo devedor; (4) Múltiplas carteiras - conta corrente, poupança, dinheiro em espécie; (5) Transações de entrada (salário, rendimentos) e saída (gastos do dia-a-dia); (6) Orçamento por categoria com valor fixo ou percentual das entradas; (7) Subcategorias para organização hierárquica; (8) Opção "não contabilizar" para despesas fixas que não são dívidas. Interface com sidebar lateral com efeito hover contendo seções: Dashboard, Orçamento, Contas a Pagar, Transações, Contas. Backend em Fastify com Prisma ORM conectado a PostgreSQL em produção. Frontend em React+Vite+TypeScript+Tailwind. Nomes de tabelas em português conforme requisito.

---

## Comandos Úteis

```bash
# Backend
cd backend
npm run dev          # Inicia servidor de desenvolvimento
npm run prisma:studio # Abre Prisma Studio para visualizar dados

# Frontend  
cd frontend
npm run dev          # Inicia servidor de desenvolvimento
```

## Estrutura de Pastas
```
granofin_web/
├── backend/
│   ├── src/
│   │   ├── lib/prisma.ts
│   │   └── server.ts
│   ├── prisma/schema.prisma
│   ├── .env (DATABASE_URL, JWT_SECRET)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── package.json
└── PROJETO_STATUS.md
```
