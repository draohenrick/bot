/**
index.js - Bot Radiola (v9.1) com servidor Express e QR Code Web
*/

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
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
    if (!services || Object.keys(services).length === 0) { 
        console.error("\nERRO: 'servicos.json' vazio ou inválido.\n"); 
        return false; 
    }
    for (const key in services) {
        if (!services[key].label || !services[key].type) {
            console.error(`\nERRO: Serviço '${key}' sem 'label' ou 'type'.\n`);
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
function generateProtocol() { return `DP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`; }

function parseAndValidateDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/);
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
            const doc = new PDFDocument({ margin: 50 });
            const title = 'Resumo da Solicitação';
            const fileName = `solicitacao_${state.protocol}_${Date.now()}.pdf`;
            const filePath = path.join(MINUTAS_DIR, fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);
            doc.fontSize(18).text(title, { align: 'center' });
            doc.fontSize(10).text(`Protocolo: ${state.protocol}`, { align: 'center' });
            doc.moveDown(2);
            doc.fontSize(12).text(`Cliente: ${contactName}`);
            doc.text(`Serviço Solicitado: ${state.awaitingTipo}`);
            doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`);
            doc.moveDown();
            if(state.data && Object.keys(state.data).length > 0) {
                doc.fontSize(14).text('Detalhes Fornecidos:', { underline: true });
                doc.moveDown(0.5);
                for (const [key, value] of Object.entries(state.data)) {
                    if (value) doc.fontSize(10).fillColor('black').text(`${key}: `, { continued: true }).fillColor('dimgray').text(value);
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
