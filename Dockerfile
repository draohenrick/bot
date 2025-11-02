# Use Node.js 20 LTS
FROM node:20

# Diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de package para instalar dependências primeiro
COPY package.json package-lock.json* ./

# Instala dependências de produção (ignora dev)
RUN npm install --omit=dev

# Copia todo o código da aplicação
COPY . .

# Exponha a porta que o app vai rodar (altere se necessário)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
