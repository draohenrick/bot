# Dockerfile para Railway - Bot WhatsApp

FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json primeiro para aproveitar cache
COPY package*.json ./

# Configura npm para retries maiores, desabilita ssl estrito e instala npm atualizado
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set strict-ssl false \
    && npm install -g npm@11.6.2

# Instala dependências ignorando integridade e peer deps
RUN npm ci --legacy-peer-deps --force --no-cache || npm install --legacy-peer-deps --force --no-cache

# Copia todo o restante do código
COPY . .

# Porta padrão (ajuste se necessário)
EXPOSE 3000

# Comando de start do bot (ajuste se usar outro script)
CMD ["npm", "start"]
