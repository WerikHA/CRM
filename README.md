<div align="center">
  <h1>📋 Amplifica CRM</h1>
  <p><b>Sistema White Label de Gestão para Agências de Marketing</b></p>
  <p>
    <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status Active" />
    <img src="https://img.shields.io/badge/version-2.9.51-blue" alt="Version" />
    <img src="https://img.shields.io/badge/tech-React%2019%20%7C%20Express%20%7C%20Supabase-purple" alt="Tech Stack" />
    <img src="https://img.shields.io/badge/database-Supabase%20(PostgreSQL)-orange" alt="Database" />
    <img src="https://img.shields.io/badge/integrations-Facebook%20%7C%20Google%20%7C%20WhatsApp-brightgreen" alt="Integrations" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  </p>
</div>

---

## 📋 Visão Geral

**Amplifica CRM** é um sistema de gestão completo White Label para agências de marketing, com dashboard estratégico, gestão de clientes, funil de vendas, integrações com redes sociais, WhatsApp, inteligência artificial e muito mais. É a ferramenta central para operação diária da agência, unificando comunicação, vendas, produção e financeiro.

---

## ✨ Funcionalidades

### 📊 Dashboard Estratégico
- KPIs e métricas de desempenho em tempo real
- Gráficos interativos com Recharts
- Visão consolidada de campanhas, vendas e produção

### 👥 Gestão de Clientes
- Histórico completo de interações, contratos e comunicações
- Perfil detalhado com dados de contato, redes sociais e observações
- Gestão de documentos e anexos

### 🎯 Funil de Vendas
- Pipeline de leads com acompanhamento visual (drag & drop com dnd-kit)
- Estágios personalizáveis do funil
- Conversão e taxa de fechamento

### 🎨 Workflow de Design & Vídeo
- Fluxo de aprovação de criativos e vídeos
- Calendarização integrada com React Big Calendar
- Notificações e deadlines

### 🤖 Inteligência Artificial
- Gemini API para automação de insights e sugestões
- Geração de conteúdo e análise de dados

### 🔗 Integrações
| Integração | Funcionalidade |
|-----------|---------------|
| **Facebook/Instagram** | Postagem e agendamento via OAuth |
| **Google** | Google Drive, Google APIs |
| **WhatsApp** | Comunicação via Baileys (WhatsApp Web API) |
| **Stripe** | Cobrança e assinaturas |
| **n8n** | Automação de workflows |
| **Web Scraping** | Playwright + Puppeteer para automação web |

### 🔒 Segurança
- Autenticação JWT com bcrypt
- Proxy reverso integrado
- Helmet para headers de segurança
- Rate limiting (express-rate-limit)
- Sanitização XSS
- Criptografia de dados sensíveis

---

## 🛠️ Stack Tecnológica

| Categoria | Tecnologia |
|-----------|-----------|
| **Frontend** | React 19, Vite, TypeScript |
| **Backend** | Express, Node.js |
| **UI** | Tailwind CSS 4, Motion, Lucide |
| **Banco** | Supabase (PostgreSQL) |
| **Autenticação** | JWT (jsonwebtoken + bcrypt) |
| **IA** | Google GenAI (Gemini) |
| **WebSocket** | Socket.io |
| **WhatsApp** | Baileys (WhatsApp Web API) |
| **Pagamentos** | Stripe |
| **Agendamento** | node-cron |
| **Calendário** | React Big Calendar (dnd-kit) |
| **Scraping** | Playwright, Puppeteer Extra |
| **Email** | Nodemailer |
| **Segurança** | Helmet, express-rate-limit, xss |
| **Container** | Docker + Docker Compose |

---

## 🗂️ Estrutura do Projeto

```
CRM/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizáveis
│   ├── pages/              # Páginas do CRM
│   │   ├── dashboard/      # Dashboard estratégico
│   │   ├── clients/        # Gestão de clientes
│   │   ├── funnel/         # Funil de vendas
│   │   ├── calendar/       # Calendário e agendamentos
│   │   └── settings/       # Configurações
│   ├── lib/                # Helpers e utilitários
│   └── hooks/              # Custom hooks
├── server.ts               # Servidor Express principal
├── db/                     # Migrations e schemas
│   └── migration.sql       # Schema do banco de dados
├── public/                 # Arquivos estáticos
├── logs/                   # Logs do servidor
├── .env.example            # Variáveis de ambiente
├── Dockerfile              # Imagem Docker
├── docker-compose.yml      # Orquestração
├── DOCS_LGPD.md            # Documentação de conformidade LGPD
├── ZIMAOS_INSTALL.md       # Guia de instalação no ZimaOS
└── ZIMAOS_SECURITY.md      # Guia de segurança ZimaOS
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js** 20+ 
- **npm** ou pnpm
- **Docker** (opcional, recomendado)
- Conta **Supabase** (PostgreSQL gerenciado)
- Chave **Gemini API** (para funcionalidades de IA)

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/WerikoEntusiasta/CRM.git
cd CRM

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais Supabase, JWT, Stripe, etc.

# Execute as migrations
# (Configure o banco Supabase manualmente ou via SQL em /db/)

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Docker Compose

```bash
docker compose up -d --build
```

### ZimaOS

Para instalação no ZimaOS, consulte [ZIMAOS_INSTALL.md](./ZIMAOS_INSTALL.md).

---

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|:-----------:|
| `PORT` | Porta do servidor | ❌ |
| `NODE_ENV` | Ambiente (development/production) | ❌ |
| `APP_URL` | URL pública da aplicação | ✅ |
| `JWT_SECRET` | Chave secreta JWT | ✅ |
| `DB_ENCRYPTION_KEY` | Chave de criptografia do banco | ✅ |
| `SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Chave anônima Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço Supabase | ✅ |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | ❌ |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret Stripe | ❌ |
| `GEMINI_API_KEY` | Chave Google Gemini | ❌ |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth | ❌ |
| `FACEBOOK_APP_ID` | App ID Facebook | ❌ |
| `VITE_COMPANY_NAME` | Nome da empresa (white label) | ❌ |
| `VITE_PRIMARY_COLOR` | Cor primária do tema (hex) | ❌ |

---

## 🔌 API Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|:----:|
| `POST` | `/api/auth/login` | Login do usuário | ❌ |
| `POST` | `/api/auth/register` | Registrar novo usuário | ❌ |
| `GET` | `/api/clients` | Listar clientes | ✅ |
| `POST` | `/api/clients` | Criar cliente | ✅ |
| `GET` | `/api/clients/:id` | Detalhes do cliente | ✅ |
| `GET` | `/api/leads` | Listar leads do funil | ✅ |
| `POST` | `/api/leads` | Adicionar lead | ✅ |
| `GET` | `/api/campaigns` | Listar campanhas | ✅ |
| `GET` | `/api/dashboard/metrics` | Métricas do dashboard | ✅ |
| `GET` | `/api/calendar` | Eventos do calendário | ✅ |
| `POST` | `/api/whatsapp/send` | Enviar mensagem WhatsApp | ✅ |
| `POST` | `/api/payments/create` | Criar checkout Stripe | ✅ |

---

## 🔒 LGPD

O CRM possui documentação de conformidade com a LGPD (Lei Geral de Proteção de Dados). Consulte [DOCS_LGPD.md](./DOCS_LGPD.md) para detalhes sobre:
- Política de privacidade
- Retenção e exclusão de dados
- Consentimento do usuário
- Direitos do titular

---

## 📄 Licença

**MIT** © Amplifica Group

---

<div align="center">
  <p>Desenvolvido por <a href="https://github.com/WerikoEntusiasta">WerikOliveira</a> — Amplifica Group</p>
</div>
