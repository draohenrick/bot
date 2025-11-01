/**

index.js - Bot Radiola (v9.1) com servidor Express e QR Code Web
*/



const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');
const express = require('express');
require('dotenv').config();
const axios = require('axios');




// === Configurações e Carregamento de Dados ===
const HUMAN_NUMBER = process.env.ATENDENTE || '5531994698112';
const TEST_NUMBER = process.env.TEST_NUMBER || null;
const INACTIVITY_MS = parseInt(process.env.INACTIVITY_MS || '300000', 10);
const BOT_START_TIME = Math.floor(Date.now() / 1000);
const PORT = process.env.PORT || 3000;




const PEDIDOS_FILE = path.resolve('./pedidos.json');
const SESSIONS_FILE = path.resolve('./sessions.json');
const UPLOADS_DIR = path.resolve('./uploads');
const MINUTAS_DIR = path.resolve('./minutas');
const SERVICOS_FILE = path.resolve('./servicos.json');




// === Preparação de diretórios ===
[UPLOADS_DIR, MINUTAS_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
if (!fs.existsSync(PEDIDOS_FILE)) fs.writeFileSync(PEDIDOS_FILE, '[]', 'utf8');
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
if (!fs.existsSync(SERVICOS_FILE)) {
console.error("\nERRO FATAL: Arquivo 'servicos.json' não encontrado.\n");
process.exit(1);
}




// === Carregar e validar serviços ===
function loadServices() {
try { return JSON.parse(fs.readFileSync(SERVICOS_FILE, 'utf8')); }
catch (e) { console.error("\nERRO FATAL: Não foi possível carregar o 'servicos.json'.\n", e); return null; }
}
function validateServices(services) {
if (!services || Object.keys(services).length === 0) { console.error("\nERRO: 'servicos.json' vazio ou inválido.\n"); return false; }
for (const key in services) {
if (!services[key].label || !services[key].type) {
console.error(\nERRO: Serviço '${key}' sem 'label' ou 'type'.\n);
return false;
}
}
console.log("✅ 'servicos.json' carregado e validado com sucesso.");
return true;
}
const services = loadServices();
if (!validateServices(services)) process.exit(1);




// === Controle de sessões e estados ===
let chatStates = new Map();
function saveStates() {
try {
const safeStates = Array.from(chatStates.entries()).map(([key, value]) => {
const copy = { ...value };
delete copy.inactivityTimer;
return [key, copy];
});
fs.writeFileSync(SESSIONS_FILE, JSON.stringify(safeStates, null, 2), 'utf8');
} catch (e) { console.error('Erro ao salvar estados:', e); }
}
function loadStates() {
try {
if (fs.existsSync(SESSIONS_FILE)) {
const arr = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
chatStates = new Map(arr);
}
} catch (e) { console.error('Erro ao carregar estados:', e); chatStates = new Map(); }
}
function loadPedidos() { try { return JSON.parse(fs.readFileSync(PEDIDOS_FILE, 'utf8')); } catch { return []; } }
function savePedido(pedido) { const p = loadPedidos(); p.push(pedido); fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(p, null, 2), 'utf8'); }




// === Utilitários ===
const delay = ms => new Promise(res => setTimeout(res, ms));
async function typing(chat, ms = 500) { try { await chat.sendStateTyping(); } catch (e) {} await delay(ms); }
function getSaudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function generateProtocol() { return DP-${Math.random().toString(36).substring(2, 6).toUpperCase()}; }
function parseAndValidateDate(dateString) {
if (!dateString) return null;
const parts = dateString.match(/(\d{2})/(\d{2})/(\d{4})\s(\d{2}):(\d{2})/);
if (!parts) return null;
const [, day, month, year, hour, minute] = parts;
const userDate = new Date(year, month - 1, day, hour, minute);
if (userDate.toString() === 'Invalid Date' || userDate.getMonth() + 1 != month) return null;
const now = new Date();
const minimumTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));
if (userDate < minimumTime) return 'invalid_time';
return userDate;
}
function findLastOrder(chatId) {
const pedidos = loadPedidos();
const userPedidos = pedidos.filter(p => p.chatId === chatId).reverse();
return userPedidos.length > 0 ? userPedidos[0] : null;
}




// === Estados por chat ===
function ensureState(chatId) {
if (!chatStates.has(chatId)) {
chatStates.set(chatId, {
saudado: false, mode: null, protocol: null,
serviceKey: null, awaitingTipo: null, data: {},
etapa: 0, inactivityTimer: null
});
}
return chatStates.get(chatId);
}
function resetState(state, keepSaudado = false) {
if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
const wasGreeted = keepSaudado ? state.saudado : false;
Object.keys(state).forEach(key => delete state[key]);
Object.assign(state, {
saudado: wasGreeted, mode: null, protocol: null,
serviceKey: null, awaitingTipo: null, data: {}, etapa: 0,
inactivityTimer: null
});
}
function scheduleInactivity(chat, chatId) {
const state = ensureState(chatId);
if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
state.inactivityTimer = setTimeout(async () => {
if(state.mode){
await chat.sendMessage('🔒 Atendimento encerrado por inatividade.');
await askForSurvey(chat, state);
}
}, INACTIVITY_MS);
}




// === PDF de resumo ===
async function generateSummaryPDF(state, contactName) {
return new Promise((resolve, reject) => {
try {
const doc = new pdfkit({ margin: 50 });
const title = 'Resumo da Solicitação';
const fileName = solicitacao_${state.protocol}_${Date.now()}.pdf;
const filePath = path.join(MINUTAS_DIR, fileName);
const stream = fs.createWriteStream(filePath);
doc.pipe(stream);
doc.fontSize(18).text(title, { align: 'center' });
doc.fontSize(10).text(Protocolo: ${state.protocol}, { align: 'center' });
doc.moveDown(2);
doc.fontSize(12).text(Cliente: ${contactName});
doc.text(Serviço Solicitado: ${state.awaitingTipo});
doc.text(Data: ${new Date().toLocaleString('pt-BR')});
doc.moveDown();
if(state.data && Object.keys(state.data).length > 0) {
doc.fontSize(14).text('Detalhes Fornecidos:', { underline: true });
doc.moveDown(0.5);
for (const [key, value] of Object.entries(state.data)) {
if (value) doc.fontSize(10).fillColor('black').text(${key}: , { continued: true }).fillColor('dimgray').text(value);
}
}
doc.end();
stream.on('finish', () => resolve(filePath));
stream.on('error', reject);
} catch (e) {
console.error("ERRO ao gerar PDF:", e);
reject(e);
}
});
}




// === Funções de menu e pesquisa ===
function parseMenuSelection(rawBody) {
const lowerBody = rawBody.toLowerCase();
const numericMatch = lowerBody.match(/^\d+/);
if (numericMatch && services[numericMatch[0]]) return { key: numericMatch[0], ...services[numericMatch[0]] };
for (const key in services) {
if (services[key].label.toLowerCase() === lowerBody) return { key, ...services[key] };
if (services[key].keywords?.some(k => lowerBody.includes(k))) return { key, ...services[key] };
}
return null;
}
async function sendWelcomeMessage(chat, contactName, lastOrder) {
const saudacao = getSaudacao();
const firstName = contactName ? contactName.split(' ')[0] : 'Olá';
let welcomeText = ${saudacao}, ${firstName}! 😊\nSou seu assistente virtual. Como posso te ajudar hoje?;
if (lastOrder) {
welcomeText = ${saudacao}, ${firstName}! Bem-vindo(a) de volta! 😊\nVi que sua última solicitação foi sobre *${lastOrder.tipo}*. Deseja algo parecido ou ver outras opções?;
}
await chat.sendMessage(welcomeText);
}
async function sendMenu(chat) {
let menuMsg = 'Por favor, escolha uma das opções abaixo digitando o número correspondente:\n\n';
for (const key in services) menuMsg += ${key}️⃣ *${services[key].label}*\n;
menuMsg += '\n_Se o serviço que você procura não está na lista, digite e um atendente ajudará._';
await chat.sendMessage(menuMsg);
}
async function askForSurvey(chat, state) {
state.mode = 'awaiting_survey_consent';
await typing(chat);
await chat.sendMessage('Para nos ajudar a melhorar, você gostaria de participar de uma rápida pesquisa de satisfação?\n\nResponda sim ou não, por favor.');
}
async function handleSurveyAndClosure(chat, state, lowerBody) {
if (state.mode === 'awaiting_survey_consent') {
if (lowerBody.startsWith('sim')) {
state.mode = 'pesquisa';
await chat.sendMessage('Ótimo! Avalie este atendimento:\n\n1 - 😟 Ruim\n2 - 🙂 Bom\n3 - 😄 Excelente');
} else {
await chat.sendMessage('Tudo bem, obrigado pelo contato! Tenha um ótimo dia!');
resetState(state);
}
return true;
}
if (state.mode === 'pesquisa') {
let feedbackResponse = '';
const choice = lowerBody.match(/\d+/)?.[0];
switch(choice) {
case '1': feedbackResponse = 'Lamentamos sua experiência.'; break;
case '2': feedbackResponse = 'Obrigado pela avaliação!'; break;
case '3': feedbackResponse = 'Ficamos felizes com seu feedback!'; break;
default: await chat.sendMessage('Opção inválida. Responda com 1, 2 ou 3.'); return true;
}
await chat.sendMessage(✅ Avaliação registrada. ${feedbackResponse}\n\nAté logo!);
resetState(state);
return true;
}
return false;
}




// === Handler principal de mensagens ===
async function messageHandler(msg) {
if (msg.timestamp && (msg.timestamp < BOT_START_TIME)) return;
const chat = await msg.getChat();
if (chat.isGroup || msg.from === 'status@broadcast') return;
const contact = await msg.getContact();
const contactName = contact.pushname || contact.name;
const chatId = chat.id._serialized;
const state = ensureState(chatId);
scheduleInactivity(chat, chatId);
const rawBody = (msg.body || '').trim();
const lowerBody = rawBody.toLowerCase();

if (lowerBody === 'menu') {
    if(state.mode) await chat.sendMessage('Solicitação anterior cancelada.');
    resetState(state, true);
    state.mode = 'menu_principal';
    await sendMenu(chat);
    return;
}
if (await handleSurveyAndClosure(chat, state, lowerBody)) return;

switch(state.mode) {
    case 'awaiting_confirmation':
        if (lowerBody.startsWith('sim')) {
            await chat.sendMessage(`Confirmando e gerando o resumo...`);
            const pdfPath = await generateSummaryPDF(state, contactName);
            const media = MessageMedia.fromFilePath(pdfPath);
            const resumoTexto = `*Nova Solicitação: ${state.awaitingTipo}*\n*Protocolo:* ${state.protocol}\n*Cliente:* ${contactName}\n*Contato:* ${chatId.split('@')[0]}\n\n*Resumo:*\n${Object.entries(state.data).map(([k,v]) => `- ${k}: ${v}`).join('\n')}`;
            await client.sendMessage(HUMAN_NUMBER + '@c.us', resumoTexto);
            await client.sendMessage(HUMAN_NUMBER + '@c.us', media);
            await chat.sendMessage(`✅ Solicitação enviada! Protocolo: *${state.protocol}*.`);
            savePedido({ protocolo: state.protocol, ...state.data, tipo: state.awaitingTipo, contato: contactName, chatId, timestamp: new Date().toISOString() });
            await askForSurvey(chat, state);
        } else if (lowerBody.startsWith('n')) {
            await chat.sendMessage('❌ Solicitação cancelada.');
            await askForSurvey(chat, state);
        } else {
            await chat.sendMessage('Responda com *sim* ou *não*.');
        }
        break;

    case 'briefing':
        const service = services[state.serviceKey];
        const briefingRoteiro = service.briefing;
        if (!service || !briefingRoteiro || !briefingRoteiro[state.etapa]) {
            await chat.sendMessage("Erro de configuração. Digite *menu*.");
            resetState(state, true);
            return;
        }
        const step = briefingRoteiro[state.etapa];
        if (step.key === 'datahora') {
            const validationResult = parseAndValidateDate(rawBody);
            if (!validationResult) {
                await chat.sendMessage("Formato inválido. Use DD/MM/AAAA HH:MM");
                return;
            }
            if (validationResult === 'invalid_time') {
                await chat.sendMessage("❌ Data precisa ter ao menos 24h de antecedência.");
                return;
            }
        }
        state.data[step.key] = rawBody;
        state.etapa++;
        if (state.etapa < briefingRoteiro.length) await chat.sendMessage(briefingRoteiro[state.etapa].q);
        else {
            state.mode = 'awaiting_confirmation';
            await chat.sendMessage("Obrigado! Deseja confirmar o envio? (*sim* / *não*)");
        }
        break;

    case 'menu_principal':
        const selection = parseMenuSelection(rawBody);
        if (selection) {
            state.protocol = generateProtocol();
            state.awaitingTipo = selection.label;
            state.serviceKey = selection.key;
            state.mode = null;
            if (selection.type === "action" && selection.action === 'transferToHuman') {
                await chat.sendMessage(`Ok! Um consultor irá te atender sobre *${selection.label}*.`);
                await client.sendMessage(HUMAN_NUMBER + '@c.us', `🔔 Cliente ${contactName} (${chatId.split('@')[0]}) pediu atendimento humano sobre *${selection.label}*.`);
                resetState(state);
            } else if (selection.type === "briefing") {
                state.mode = 'briefing';
                state.etapa = 0;
                state.data = {};
                await chat.sendMessage(`Entendido! Para *${selection.label}*, preciso de algumas informações.`);
                await typing(chat);
                await chat.sendMessage(selection.briefing[0].q);
            }
        } else {
            await chat.sendMessage(`Ok, vou te transferir para um atendente sobre "*${rawBody}*".`);
            await client.sendMessage(HUMAN_NUMBER + '@c.us', `🔔 Cliente ${contactName} (${chatId.split('@')[0]}) pediu serviço não listado: "*${rawBody}*"`);
            resetState(state);
        }
        break;

    default:
        if (!state.saudado) {
            state.saudado = true;
            state.mode = 'menu_principal';
            const lastOrder = findLastOrder(chatId);
            await sendWelcomeMessage(chat, contactName, lastOrder);
            await sendMenu(chat);
        } else {
            await chat.sendMessage('Desculpe, não entendi. Digite *menu* para ver as opções.');
        }
}




}




// === Cliente WhatsApp ===
const client = new Client({
authStrategy: new LocalAuth({ clientId: 'dplay-bot-radiola' }),
puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }
});




let lastQR = null;
client.on('qr', qr => { lastQR = qr; require('qrcode-terminal').generate(qr, { small: true }); });
client.on('ready', () => {
console.log('✅ Bot Radiola online e pronto!');
loadStates();
setInterval(saveStates, 60000);
if (TEST_NUMBER) client.sendMessage(TEST_NUMBER + '@c.us', 🤖 Bot Radiola reiniciado e online.);
});
client.on('message', msg => messageHandler(msg).catch(err => console.error("ERRO GERAL:", err)));
process.on('SIGINT', async () => {
console.log('🔌 Desligando bot...');
saveStates();
await client.destroy();
process.exit(0);
});




// === Servidor Express para QR e status ===
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot Radiola ativo! Acesse /qr para conectar o WhatsApp.'));
app.get('/qr', (req, res) => {
if (!lastQR) return res.send('✅ Sessão ativa ou QR ainda não gerado.');
res.send(<html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"> <h2>Escaneie este QR com o WhatsApp:</h2> <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(lastQR)}&size=250x250" /> </body></html>);
});
app.listen(PORT, () => console.log(🌐 Servidor Express rodando na porta ${PORT}));




client.initialize();