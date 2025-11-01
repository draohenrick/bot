FROM node:20

WORKDIR /app

COPY package*.json ./

# Atualiza npm e instala dependências sem cache
RUN npm install -g npm@11.6.2 \
    && npm ci --legacy-peer-deps --force --no-cache

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
