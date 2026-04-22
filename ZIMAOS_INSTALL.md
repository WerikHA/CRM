# AgencyFlow CRM - Guia de Instalação ZimaOS / CasaOS

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
   - `DB_PASSWORD`: Uma senha segura para seu banco de dados.
   - `GEMINI_API_KEY`: Sua chave da API Gemini (opcional).
5. **Instalar**: Clique em "Install".

## Ferramentas Incluídas
- **App Principal**: `http://<IP-DO-ZIMAOS>:3000`
- **Gestor de Banco (pgAdmin)**: `http://<IP-DO-ZIMAOS>:8080`
  - *Login padrão:* `admin@agency.com` / `admin`
  - *Use para visualizar e editar tabelas manualmente.*

## Banco de Dados
- As tabelas são criadas automaticamente no primeiro boot usando o arquivo `db/init.sql`.
- Os dados são persistidos no volume `agencyflow_postgres_data`.

## Acesso
- A aplicação estará disponível em `http://<IP-DO-ZIMAOS>:3000`.
