import express from 'express';
import { sendMessage, sendMessageWithPDF, sendMessageWithImage, sendMessageStatus, StatusServerWpp, sendMessageDelivery } from './client.js';

const app = express();
app.use(express.json()); // Para permitir que o body seja um JSON

// Função para registrar os erros no log
function logError(message, error, req) {
    console.error(`[${new Date().toISOString()}] - Erro: ${message}`);
    console.error(`Detalhes da requisição: ${JSON.stringify(req.body)}`);
    console.error('Stack trace:', error.stack);
}

// Endpoint para enviar uma mensagem
app.post('/send-message', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Faltando parâmetros: to ou message' });
    }

    try {
        await sendMessage(to, message);
        return res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        logError('Erro ao enviar mensagem', error, req);
        return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Endpoint para enviar uma mensagem delivery
app.post('/send-message-delivery', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Faltando parâmetros: to ou message' });
    }

    try {
        await sendMessageDelivery(to, message);
        return res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        logError('Erro ao enviar mensagem', error, req);
        return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Endpoint para enviar uma mensagem com PDF
app.post('/send-pdf', async (req, res) => {
    const { to, message, path } = req.body;

    if (!to || !message || !path) {
        return res.status(400).json({ error: 'Faltando parâmetros: to, message ou path' });
    }

    try {
        await sendMessageWithPDF(to, message, path);
        return res.json({ success: true, message: 'Mensagem com PDF enviada com sucesso!' });
    } catch (error) {
        logError('Erro ao enviar mensagem com PDF', error, req);
        return res.status(500).json({ error: 'Erro ao enviar mensagem com PDF' });
    }
});

// Endpoint para enviar uma mensagem com imagem
app.post('/send-image', async (req, res) => {
    const { to, message, path } = req.body;

    if (!to || !message || !path) {
        return res.status(400).json({ error: 'Faltando parâmetros: to, message ou path' });
    }

    try {
        await sendMessageWithImage(to, message, path);
        return res.json({ success: true, message: 'Mensagem com imagem enviada com sucesso!' });
    } catch (error) {
        logError('Erro ao enviar mensagem com imagem', error, req);
        return res.status(500).json({ error: 'Erro ao enviar mensagem com imagem' });
    }
});

// Endpoint para enviar uma mensagem com imagem
app.post('/send-status', async (req, res) => {
    const { to, status } = req.body;

    if (!to || !status) {
        return res.status(400).json({ error: 'Faltando parâmetros: to ou status' });
    }

    try {
        await sendMessageStatus(to, status);
        return res.json({ success: true, message: 'Mensagem de status enviada com sucesso!' });
    } catch (error) {
        logError('Erro ao enviar mensagem com status', error, req);
        return res.status(500).json({ error: 'Erro ao enviar mensagem com status' });
    }
});

// Endpoint para verificar status do WhatsApp
app.get('/status', async (req, res) => {
    try {
        const status = await StatusServerWpp(global.clientWpp);
        return res.json({ success: true, ...status });
    } catch (error) {
        logError('Erro ao verificar status do WhatsApp', error, req);
        return res.status(500).json({ success: false, error: 'Erro ao verificar status do WhatsApp' });
    }
});

// Inicia o servidor
async function InitServer(port) {
    app.listen(port, () => {
        console.log(`Servidor rodando na porta ${port}`);
    });
}

// Exportando a função para ser utilizada em outros arquivos
export { InitServer };
