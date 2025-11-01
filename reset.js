// reset.js - Script para limpar os dados do bot para um novo cliente (v1.1)
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Lista de arquivos e pastas a serem removidos
const pathsToDelete = [
    '.wwebjs_auth',
    'sessions.json',
    'pedidos.json',
    'lembretes_enviados.json',
    'minutas',
    'uploads'
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n\x1b[33m%s\x1b[0m', 'ATENÇÃO: Este script irá apagar permanentemente os seguintes dados:');
console.log('\x1b[31m- Conexão do WhatsApp (.wwebjs_auth)');
console.log('- Conversas em andamento (sessions.json)');
console.log('- Histórico de pedidos (pedidos.json)');
console.log('- Histórico de lembretes (lembretes_enviados.json)');
console.log('- PDFs de orçamento gerados (pasta minutas)');
console.log('- Mídias de clientes (pasta uploads)\x1b[0m');
console.log('\nSeu código (index.js) e configurações (servicos.json) NÃO serão afetados.');

rl.question('\nVocê tem certeza que deseja continuar? (s/y/n) ', (answer) => {
    // CORREÇÃO: Adicionado 'y' e 'yes' às respostas aceitas
    if (['s', 'sim', 'y', 'yes'].includes(answer.toLowerCase())) {
        console.log('\nIniciando a limpeza...');

        pathsToDelete.forEach(p => {
            const fullPath = path.resolve(p);
            if (fs.existsSync(fullPath)) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory()) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                        console.log(`Pasta '${p}' apagada com sucesso.`);
                    } else {
                        fs.unlinkSync(fullPath);
                        console.log(`Arquivo '${p}' apagado com sucesso.`);
                    }
                } catch (e) {
                    console.error(`Erro ao apagar '${p}':`, e.message);
                }
            } else {
                console.log(`'${p}' não encontrado, pulando.`);
            }
        });
        
        console.log('\n\x1b[32m%s\x1b[0m', '✅ Limpeza concluída com sucesso!');
        console.log('O bot foi resetado para um estado de fábrica.');
        console.log('Próximos passos:');
        console.log('1. Edite os arquivos `.env` e `servicos.json` para o novo cliente.');
        console.log('2. Inicie o bot com `node index.js` para escanear o novo QR Code.');

    } else {
        console.log('\nOperação cancelada.');
    }
    rl.close();
});