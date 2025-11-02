FROM node:20-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Atualiza npm e instala dependências
RUN npm install -g npm@11.6.2 \
    && npm ci --legacy-peer-deps --force --no-cache

# Copia o restante do projeto
COPY . .

# Porta do app
EXPOSE 3000

# Comando de start
CMD ["npm", "start"]
