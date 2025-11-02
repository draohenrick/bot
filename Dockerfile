# Escolhe a imagem Node.js oficial leve
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas package.json e package-lock.json primeiro (para aproveitar cache do Docker)
COPY package*.json ./

# Atualiza npm e instala dependências de produção
RUN npm install -g npm@11 \
    && npm install --omit=dev --legacy-peer-deps

# Copia o restante do projeto
COPY . .

# Expõe a porta que a app vai rodar
EXPOSE 3000

# Comando padrão para iniciar a aplicação
CMD ["node", "index.js"]
