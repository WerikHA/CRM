# Amplifica CRM - Guia de Instalação ZimaOS / CasaOS

Este CRM foi preparado para rodar em containers Docker, garantindo persistência e facilidade de atualização.

## Estrutura do Projeto
- `Dockerfile`: Script para construir a imagem da aplicação.
- `docker-compose.yml`: Arquivo de orquestração para ZimaOS.
- `db/init.sql`: Script de criação automática das tabelas.

## Como Instalar no ZimaOS (CasaOS)
1. **Prepare os arquivos**: Certifique-se de que a pasta do projeto contém os arquivos `Dockerfile`, `docker-compose.yml` e a pasta `db/`.
2. **Importar App**: No painel do CasaOS, vá em "App Store" -> "Custom Install" (ícone no canto superior direito).
3. **Importar Compose**: Clique em "Import" e selecione o arquivo `docker-compose.yml` deste projeto.
4. **Configurar Variáveis**:
   - `VITE_COMPANY_NAME`: O nome da sua agência (White Label).
   - `SUPABASE_URL`: A URL do seu projeto no Supabase (Ex: `https://xyz.supabase.co`). **Atenção**: Deve terminar em `.co`, não `.com`.
   - `SUPABASE_ANON_KEY`: A chave anônima (anon key) do Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: A chave de serviço (service role) do Supabase. **Importante**: Use esta chave para evitar erros de "Row-Level Security" ao salvar dados.
   - `GEMINI_API_KEY`: Sua chave da API Gemini (opcional).
5. **Instalar**: Clique em "Install".

## Ferramentas Incluídas
- **App Principal (CRM + Landing Page)**: `https://seu-dominio.com` (recomendado) ou `http://<IP-DO-ZIMAOS>:3000`
- **Landing Page**: A página inicial já está inclusa e pode ser personalizada via variáveis de ambiente (`VITE_COMPANY_NAME` e `VITE_PRIMARY_COLOR`).
- **Gestor de Banco Local**: Embora a aplicação use Supabase, o `docker-compose` inclui um PostgreSQL local para backups e integração futura.
  - **pgAdmin**: `http://<IP-DO-ZIMAOS>:8080`
  - *Login padrão:* `admin@agency.com` / `admin`

## Banco de Dados
- Atualmente a aplicação salva os dados no **Supabase** (Remoto).
- O arquivo `db/init.sql` serve como referência do schema se você quiser migrar para o Postgres local ou fazer sync automático.

## Acesso
- A aplicação estará disponível em `https://seu-dominio.com`. O sistema redireciona automaticamente HTTP para HTTPS para garantir segurança completa (conformidade LGPD).
