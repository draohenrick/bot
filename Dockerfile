# === Etapa 1: Base Node.js + dependências do Puppeteer ===
FROM node:20-bullseye-slim

# Evitar prompts interativos do apt
ENV DEBIAN_FRONTEND=noninteractive

# Atualiza e instala pacotes necessários para Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    wget \
    curl \
    unzip \
    xdg-utils \
    gnupg \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instalar Chromium
RUN apt-get update && apt-get install -y chromium \
    && rm -rf /var/lib/apt/lists/*

# Define variáveis para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Diretório do app
WORKDIR /app

# Copia package.json e package-lock.json primeiro para otimizar build
COPY package*.json ./

# Instala dependências
RUN npm ci --omit=dev

# Copia todo o código
COPY . .

# Expõe porta para Express
EXPOSE 3000

# Comando de inicialização
CMD ["node", "index.js"]
