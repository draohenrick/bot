# Usando Node.js LTS
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (melhora cache)
COPY package*.json ./

# Limpa cache, instala dependências de produção e ignora devDependencies
RUN npm cache clean --force \
    && npm install --omit=dev --legacy-peer-deps

# Copia todo o restante do código da aplicação
COPY . .

# Expõe a porta que o app vai rodar (ajuste se necessário)
EXPOSE 3000

# Comando para rodar sua aplicação
CMD ["node", "index.js"]
