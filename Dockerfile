# Usando Node oficial (versão LTS)
FROM node:20

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas package.json e package-lock.json para otimizar cache
COPY package*.json ./

# Limpa cache do npm, atualiza npm e instala dependências
RUN npm cache clean --force \
    && npm install -g npm@11.6.2 \
    && npm install --legacy-peer-deps

# Copia o restante do projeto
COPY . .

# Expõe a porta que a aplicação vai usar (se necessário)
EXPOSE 3000

# Comando padrão para rodar a aplicação
CMD ["node", "index.js"]
