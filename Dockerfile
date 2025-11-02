# Dockerfile para WhatsApp Bot no Railway

FROM node:20

# Diretório de trabalho
WORKDIR /app

# Copia arquivos de package
COPY package*.json ./

# Limpa cache e instala dependências de produção
RUN npm cache clean --force \
    && npm install --omit=dev --legacy-peer-deps

# Copia todo o código da aplicação
COPY . .

# Expõe a porta (caso use API ou webhook)
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "index.js"]
