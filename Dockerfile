# Escolhe a imagem oficial do Node.js
FROM node:20-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro
COPY package.json package-lock.json ./

# Atualiza o npm e instala dependências de produção
RUN npm install -g npm@11 \
    && npm ci --omit=dev --legacy-peer-deps

# Copia todo o código da aplicação
COPY . .

# Expõe a porta da aplicação (ajuste se necessário)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
