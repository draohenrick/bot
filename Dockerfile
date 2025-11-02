# Escolhe a imagem oficial do Node
FROM node:20-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Atualiza npm e instala dependências de produção
RUN npm install -g npm@11 \
    && npm install --omit=dev --legacy-peer-deps

# Copia o restante do projeto
COPY . .

# Expõe a porta que sua app vai rodar
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "index.js"]
