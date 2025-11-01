# Usa a imagem Node 22
FROM node:22

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos necessários
COPY package*.json ./

# Instala dependências (substitui o npm ci)
RUN npm install --legacy-peer-deps

# Copia o restante do projeto
COPY . .

# Expõe a porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
