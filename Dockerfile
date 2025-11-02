FROM node:20-alpine

WORKDIR /app

# Copia apenas package.json e lockfile
COPY package*.json ./

# Limpa cache npm
RUN rm -rf node_modules package-lock.json \
    && npm cache clean --force \
    && npm install -g npm@11.6.2

# Instala dependências ignorando integridade
RUN npm install --legacy-peer-deps --force --no-audit

# Copia código
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
