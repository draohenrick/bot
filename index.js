const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// Caminho do arquivo de sessão no volume do Railway
const SESSION_DIR = '/app/session';
if (!fs.existsSync(SESSION_DIR)){
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Inicializa cliente usando LocalAuth para persistência automática
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot",          // identifica o bot se houver mais de um
        dataPath: SESSION_DIR     // caminho do volume Railway
    })
});

// Evento de QR code
client.on('qr', qr => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

// Evento de autenticação
client.on('authenticated', () => {
    console.log('Bot autenticado com sucesso!');
});

// Evento de pronto
client.on('ready', () => {
    console.log('Bot pronto para uso!');
});

// Evento de mensagens
client.on('message', msg => {
    console.log('Mensagem recebida:', msg.body);
    if(msg.body.toLowerCase() === 'ping') {
        msg.reply('pong');
    }
});

// Inicializa o cliente
client.initialize();
