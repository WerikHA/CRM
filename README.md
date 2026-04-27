# 🚀 Amplifica CRM - Sistema de Gestão para Agências de Marketing (White Label)

![Versão](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

O **Amplifica CRM** é uma plataforma robusta e moderna projetada especificamente para agências de marketing e freelancers que buscam profissionalizar sua gestão e entrega de serviços. É uma solução **White Label** completa, permitindo personalização total de marca.

---

## ✨ Funcionalidades Principais

- **📊 Dashboard Estratégico**: Visão em tempo real de KPIs de leads, ordens de serviço e saúde financeira.
- **💼 Gestão de Clientes**: Cadastro centralizado com histórico de interações e branding personalizado por cliente.
- **📈 Funil de Vendas (Leads)**: Gestão de prospectos via integração com Landing Pages e Webhooks.
- **🎨 Workflow de Design & Vídeo**: Sistema de pedidos e aprovação de artes e vídeos integrado para agilizar a entrega.
- **🔗 Integrações Nativas**:
  - **WhatsApp**: Envio de notificações e automação via QR Code.
  - **n8n**: Webhooks automáticos para automação de processos externos.
  - **Supabase**: Banco de dados relacional (PostgreSQL) com alta performance e escalabilidade.
- **🤖 Inteligência Artificial**: Integração com Gemini API para fluxos inteligentes de dados e automações.
- **📧 E-mail Transacional**: Sistema de envio de e-mails configurável via SMTP.
- **🛡️ Segurança Avançada**: Proxy reverso interno que oculta chaves de API do navegador e força conexões HTTPS.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion.
- **Backend / Server**: Node.js, Express (integrado com Vite).
- **Banco de Dados**: Supabase (PostgreSQL) com Proxy Interno de Segurança.
- **Infraestrutura**: Docker & Docker Compose (Pronto para ZimaOS, CasaOS, Servidores Linux).

---

## 📦 Como Instalar (Docker)

A maneira mais rápida de colocar o Amplifica CRM no ar é usando o **Docker Compose**.

### Pré-requisitos
- Docker e Docker Compose instalados.
- Um projeto configurado no [Supabase](https://supabase.com).

### Passo a Passo

1.  **Clone este repositório** (ou baixe os arquivos).
2.  **Configure as Variáveis de Ambiente** no arquivo `.env` (ou diretamente no Compose):
    - `VITE_COMPANY_NAME`: Nome da sua agência.
    - `SUPABASE_URL`: URL do seu projeto Supabase (deve terminar em `.co`).
    - `SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.
    - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (necessária para o Proxy de Segurança).
3.  **Inicie o sistema**:
    ```bash
    docker-compose up -d
    ```
4.  **Acesse**: `http://localhost:3000` (O sistema redirecionará para HTTPS se configurado).

---

## 🐋 Imagem Docker Hub

A imagem oficial está disponível no Docker Hub:
`docker.io/werikoliveira/amplifica-crm:2.1`

Para atualizar seu container:
```bash
docker pull werikoliveira/amplifica-crm:2.1
docker-compose up -d
```

---

## 🔒 Segurança e Privacidade

Este projeto foi desenvolvido com foco em conformidade **LGPD/GDPR**:
- **Proxy de Dados**: O navegador nunca acessa diretamente o banco de dados. Todas as requisições passam pelo servidor Node.js, onde são validadas.
- **Secrets Management**: Chaves sensíveis (Supabase, API Keys) residem apenas no servidor, nunca no cliente.
- **Forced HTTPS**: Configurado para forçar conexões seguras e prevenir ataques de Mixed Content.

---

## 📄 Licença

Uso exclusivo para agências parceiras do ecossistema Amplifica Marketing. Todos os direitos reservados.
