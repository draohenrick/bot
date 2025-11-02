# Use Node.js 20
FROM node:20

WORKDIR /app

# Copia arquivos de package
COPY package*.json ./

# Limpa cache e instala dependências de produção
RUN npm cache clean --force \
    && npm install --omit=dev

# Copia código da aplicação
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
