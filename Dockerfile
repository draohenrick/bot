# ===========================
# Dockerfile para WhatsApp Bot
# ===========================

# Use Node.js 20
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

# Expõe a porta que seu bot usa (ex: para API ou webhook)
EXPOSE 3000

# Persistir dados da sessão do WhatsApp
VOLUME ["/app/session"]

# Comando para rodar a aplicação
CMD ["node", "index.js"]
