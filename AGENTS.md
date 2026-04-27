# Instruções do Agente

- Sempre que fizer uma mudança no código, atualize o diretório `.github` (especificamente o arquivo de workflow `docker.yml`) incrementando a versão da tag se necessário ou garantindo que o build reflita a nova versão.
- Mantenha a versão no `package.json` sincronizada com as tags no `.github/workflows/docker.yml`.
