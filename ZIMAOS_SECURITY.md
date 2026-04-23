# ZimaOS - Guia de Configuração de Segurança e Deploy 🛡️

Com as limitações de variáveis globais e as necessidades específicas do ZimaOS combinadas com acesso reverso, reconstruímos o deploy utilizando Docker Secrets, redes isoladas e proteção avançada.

## O Que Mudou Na Arquitetura?

### 1. Separação Estrita de Acesso
- **Publicamente (Via Cloudflare Tunnel):** Os usuários externos agora acessam **SOMENTE** o contêiner \`app\` via Cloudflare sem que nenhuma porta do seu roteador seja aberta, mascarando totalmente seu provedor de internet e mitigando ataques DDoS.
- **Privadamente (Via ZimaClient/LAN):** A aplicação do site e as ferramentas de banco de dados e manutenção, como o **pgAdmin**, permanecem confidenciais. Elas foram isoladas na sub-rede que é ativada apenas pelo ZimaClient interno. A porta do pgadmin (\`8080\`) foi estritamente vinculada a \`127.0.0.1\` na API do Docker para que dispositivos da sua DMZ ou internet não acessem.

### 2. Uso de *Secrets* Em Lógia Sem *Root* (ZimaOS Fix)
Como o ZimaOS pode se comportar de maneira letárgica ao embutir dinamicamente chaves no \`.env\`, criamos a pasta \`secrets/\`. 
- Isso insere arquivos de senhas como módulos nativos _"Read Only"_ de montagem Docker em um diretório enclausurado. 
- O container entra via um Script Shell (\`sh -c...\`) que carrega dinamicamente a string do \`DATABASE_URL\`, da Master Key do Gemini e do PostgreSQL. Assim não corremos o risco de credenciais cruciais vazarem em plain-text local ou no YAML.

### 3. Fortificação de Privilégios Mínimos:
Adicionamos em todos os blocos:
- \`security_opt: ["no-new-privileges:true"]\` (Mesmo invadido, não elevem a root de container).
- \`cap_drop: [ALL]\` (Retirados os recursos extras desnecessários do linux).
- \`read_only: true\` (Cloudflare container é totalmente congelado).

---

## 🛠️ O que você precisa fazer agora

A nova estrutura gerou a pasta **\`secrets\`** no seu diretório base. Elas contêm arquivos de texo simples usados para injetar a senha. 

1. **Vá até a pasta `/secrets`** criada por mim neste commit e troque as credenciais que estão lá dentro pelo seu gosto pessoal (Acessei e criei os arquivos `db_password.txt`, `pgadmin_password.txt` e `gemini_api_key.txt` com senhas padrão).
2. Em **`docker-compose.yml`**, procure pelo bloco do **cloudflared** no final do arquivo e cole seu **`TUNNEL_TOKEN`** criado na sua conta Cloudflare em `COLE_SEU_TOKEN_AQUI`.
3. Use o ZimaClient para gerenciar ou suba a aplicação acessando a pasta e rodando o `docker compose up -d`. O Túnel garantirá a saída pública apenas sobre o app.
