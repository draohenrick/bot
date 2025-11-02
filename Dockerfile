FROM node:20-alpine

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Remove node_modules e limpa cache do npm antes de instalar
RUN rm -rf node_modules \
    && npm cache clean --force \
    && npm install -g npm@11.6.2 \
    && npm install --legacy-peer-deps

# Copia o restante do projeto
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
