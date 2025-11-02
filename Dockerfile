FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instala dependências sem cache e tenta várias vezes
RUN npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retries 5 \
    && npm install -g npm@11.6.2 \
    && npm install --legacy-peer-deps --no-cache

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
