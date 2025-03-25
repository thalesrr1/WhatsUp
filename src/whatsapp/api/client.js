import fs from 'fs';
import wppconnect from '@wppconnect-team/wppconnect';
import { InitServer } from './server.js';
import { HandleMessage, iniciarVerificacaoStatusLoja } from './services/intentHandler.js';
import { iniciarVerificacaoPeriodica } from './services/sessionManager.js';
import { processIntent } from './services/intentProcess.js';
import { fileURLToPath } from 'url'; 
import path from 'path';
import { exec } from 'child_process';

import { ipcMain } from 'electron';
import { BrowserWindow } from 'electron';

let lastUpdate = null;
let connectionStatus = 'Desconectado';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

global.store = null;
// Criar uma variável global
global.clientWpp = null;

// Sistema de diagnóstico de erros
const errorDiagnostic = {
    errors: [],
    maxErrors: 20,
    lastErrorTime: 0,
    
    // Categorias de erro para facilitar o diagnóstico
    errorCategories: {
        PUPPETEER: 'Problema com Puppeteer',
        CHROMIUM: 'Problema com Chromium',
        GPU: 'Problema com GPU',
        WPPCONNECT: 'Problema com WPPConnect',
        NETWORK: 'Problema de Rede',
        QR_CODE: 'Problema com QR Code',
        SESSION: 'Problema de Sessão',
        UNKNOWN: 'Problema Desconhecido'
    },
    
    // Padrões para identificar tipos de erro
    errorPatterns: [
        { regex: /puppeteer|browser|chromium|chrome/i, category: 'PUPPETEER' },
        { regex: /net::ERR|network|timeout|timed out|ECONNREFUSED/i, category: 'NETWORK' },
        { regex: /session|auth|token|logged/i, category: 'SESSION' },
        { regex: /qr|scan|code/i, category: 'QR_CODE' },
        { regex: /wppconnect|whatsapp|wa|message/i, category: 'WPPCONNECT' },
        { regex: /gpu|command_buffer|CreateCommandBuffer/i, category: 'GPU' }
    ],
    
    // Identifica a categoria do erro com base na mensagem
    identifyErrorCategory(message) {
        for (const pattern of this.errorPatterns) {
            if (pattern.regex.test(message)) {
                return pattern.category;
            }
        }
        return 'UNKNOWN';
    },
    
    // Adiciona um erro ao registro
    addError(message, stack = null, source = 'system') {
        const timestamp = new Date();
        const category = this.identifyErrorCategory(message);
        
        // Registrar erro no log
        this.logErrorToFile(category, message, stack);
        
        // Adicionar ao histórico de erros
        this.errors.unshift({
            id: Date.now(),
            category,
            message,
            stack,
            source,
            timestamp,
            suggestion: this.getSuggestion(category)
        });
        
        // Manter apenas os últimos maxErrors
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }
        
        // Atualizar timestamp do último erro
        this.lastErrorTime = Date.now();
        
        // Notificar a interface
        this.notifyUI();
        
        return this.errors[0];
    },
    
    // Registra o erro em um arquivo de log
    logErrorToFile(category, message, stack) {
        const logMessage = `[${new Date().toISOString()}] [${category}] ${message}\n${stack ? stack + '\n' : ''}`;
        logError(logMessage); // Usa a função logError existente
    },
    
    // Retorna sugestões de correção com base na categoria
    getSuggestion(category) {
        switch(category) {
            case 'PUPPETEER':
                return 'Execute no terminal: npm uninstall puppeteer && npm install puppeteer@latest';
                
            case 'WPPCONNECT':
                return 'Execute no terminal: npm uninstall @wppconnect-team/wppconnect && npm install @wppconnect-team/wppconnect@latest';
                
            case 'NETWORK':
                return 'Verifique sua conexão com a internet e se o WhatsApp Web está acessível';
                
            case 'QR_CODE':
                return 'Apague a pasta ./src/whatsapp/api/tokens e reinicie a aplicação para gerar um novo QR Code. Ou clique em limpar sessão na aba de conexões e aguarde.';
                
            case 'SESSION':
                return 'Apague a pasta ./src/whatsapp/api/tokens e reinicie a aplicação para iniciar uma nova sessão. Ou clique em limpar sessão na aba de conexões e aguarde.';
                
            case 'GPU':
                return 'Desative a opção "Usar Chrome" no canto inferior direito da aplicação. O navegador não suporta aceleração de GPU. Após desativar, reinicie o aplicativo.';

            default:
                return 'Tente reiniciar a aplicação. Se o problema persistir, reinstale as dependências: npm uninstall puppeteer @wppconnect-team/wppconnect && npm install puppeteer @wppconnect-team/wppconnect';
        }
    },
    
    // Notifica a interface sobre mudanças nos erros
    notifyUI() {
        BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('wpp-diagnostic-update', {
                    errors: this.errors.slice(0, 5), // Envia apenas os 5 erros mais recentes
                    hasErrors: this.errors.length > 0,
                    lastErrorTime: this.lastErrorTime
                });
            }
        });
    },
    
    // Retorna os erros atuais
    getErrors() {
        return this.errors;
    },
    
    // Limpa o histórico de erros
    clearErrors() {
        this.errors = [];
        this.notifyUI();
    }
};

// Função para enviar atualizações para o frontend
function sendToRenderer(event, data) {
    BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
        window.webContents.send(event, data);
        }
    });
}

async function startClient() {
    try {
        // Enviar evento de início da inicialização
        sendToRenderer('wpp-init-start', {
            message: 'Iniciando processo de inicialização do WhatsApp...',
            progress: 5
        });

        let config = global.store.get('config') || {};
        
        // Enviar evento de configuração carregada
        sendToRenderer('wpp-init-step', {
            message: 'Configurações carregadas',
            progress: 10,
            completed: true
        });

        global.clientWpp = await wppconnect.create({
            session: 'whatsUp', // Nome da sessão
            catchQR: (base64Qr, asciiQR) => {
                console.log(asciiQR);
                var matches = base64Qr.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
                    response = {};

                if (matches.length !== 3) {
                    return new Error('Invalid input string');
                }
                response.type = matches[1];
                response.data = Buffer.from(matches[2], 'base64');

                fs.writeFile('./src/whatsapp/api/image/qrCode.png', response.data, 'binary', (err) => {
                    if (err) console.log(err);
                });
                
                // Enviar evento de QR Code gerado
                sendToRenderer('wpp-init-step', {
                    message: 'QR Code gerado. Aguardando leitura...',
                    progress: 100,
                    completed: true
                });
            },
            logQR: false,
            statusFind: (statusSession, session) => {
                console.log(`Status da Sessão: ${statusSession} - ${session}`);
                connectionStatus = statusSession;
                lastUpdate = new Date().toLocaleString();

                // Enviar evento de atualização de status
                let statusProgress = 0;
                let statusCompleted = false;
                let statusMessage = '';
                let statusType = 'loading';
            
                switch (statusSession) {
                    case 'isLogged':
                        statusProgress = 100;
                        statusCompleted = true;
                        statusMessage = 'Cliente logado com sucesso.';
                        statusType = 'success';
                        break;
                    case 'notLogged':
                        statusProgress = 100;
                        statusCompleted = true;
                        statusMessage = 'Cliente carregado, aguardando leitura do QR-Code.';
                        statusType = 'success';
                        break;
                    case 'qrReadSuccess':
                        statusProgress = 100;
                        statusCompleted = true;
                        statusMessage = 'QR-Code lido com sucesso.';
                        statusType = 'success';
                        break;
                    case 'qrReadError':
                        statusProgress = 75;
                        statusMessage = 'Erro ao ler o QR-Code.';
                        statusType = 'error';
                        break;
                    case 'autocloseCalled':
                        statusProgress = 50;
                        statusMessage = 'O WppConnect foi fechado, reinicie.';
                        statusType = 'error';
                        break;
                    case 'desconnectedMobile':
                        statusMessage = 'Leia o QR-Code para continuar.';
                        statusCompleted = true;
                        statusProgress = 100;
                        break;
                    case 'inChat':
                        statusProgress = 100;
                        statusMessage = 'Cliente conectado e ouvindo.';
                        statusCompleted = true;
                        statusType = 'success';
                        break;
                    default:
                        statusProgress = 100;
                }
                
                sendToRenderer('wpp-init-step', {
                    message: statusMessage,
                    progress: statusProgress,
                    completed: statusCompleted,
                    type: statusType
                });

                // Verificar status problemáticos
                if (['notLogged', 'browserClose', 'qrReadError', 'autocloseCalled', 'desconnectedMobile', 'isConnected'].includes(statusSession)) {
                    const currentTime = Date.now();

                    // Evitar solução redundante para o mesmo erro dentro de 1 minuto
                    if (statusSession !== 'notLogged' || statusSession !== 'desconnectedMobile' 
                        || statusSession !== 'isConnected'
                        || (currentTime - errorDiagnostic.lastErrorTime > 60000)) {
                        let message = '';
                        
                        // Tratamento de mensagens específicas para cada erro do WhatsApp
                        switch (statusSession) {
                            case 'notLogged':
                                message = 'Nenhuma sessão foi encontrada, por favor leia o QR-Code para conectar o Whatsapp.';
                                break;
                            case 'browserClose':
                                message = 'A janela do navegador foi fechada. Por favor, reinicie o aplicativo e encerre todas as instancias do Chrome!.';
                                break;
                            case 'qrReadError':
                                message = 'Ocorreu um erro ao ler o QR Code. Tente escanear novamente.';
                                break;
                            case 'autocloseCalled':
                                message = 'O processo foi cancelado automaticamente. Verifique a conexão e tente novamente.';
                                break;
                            case 'desconnectedMobile':
                                message = 'O QR Code foi gerado, mas o celular está desconectado. Conecte o WhatsApp no celular e tente novamente.';
                                break;
                            case 'isConnected':
                                message = 'O cliente do Whatsapp foi instanciado e aguarda a leitura do QR-Code.';
                                break;    
                            default:
                                message = `Problema desconhecido: ${statusSession}`;
                                break;
                        }

                        // Adiciona o erro diagnosticado com a mensagem específica
                        errorDiagnostic.addError(message, null, 'status');
                        
                        // Enviar mensagem de erro para o renderer
                        if (statusSession !== 'isConnected' && statusSession !== 'notLogged') {
                            sendToRenderer('wpp-init-error', {
                                message: message,
                                type: 'error'
                            });
                        }
                    }
                }
            },
            headless: config.headless,
            devtools: false,
            useChrome: config.useChrome,
            debug: false,
            browserWS: '',
            browserArgs: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ],
            puppeteerOptions: {},
            disableWelcome: false,
            updatesLog: true,
            autoClose: 0, // Nunca fechar automaticamente
            tokenStore: 'json', // Persistência mais confiável
            folderNameToken: './src/whatsapp/api/tokens',
            keepAlive: true // Mantém a sessão ativa
        });

        // Enviar evento de cliente criado
        sendToRenderer('wpp-init-step', {
            message: 'Cliente WhatsApp criado com sucesso',
            progress: 100,
            completed: true
        });

        // Evento para reconectar caso desconecte
        global.clientWpp.onStateChange((state) => {
            console.log(`Estado da conexão: ${state}`);
            
            // Enviar evento de mudança de estado
            sendToRenderer('wpp-state-change', {
                state: state,
                timestamp: new Date().toLocaleString()
            });
            
            const estadosProblema = ['CONFLICT', 'UNPAIRED', 'UNPAIRED_IDLE', 'DISCONNECTED'];

            if (estadosProblema.includes(state)) {
                console.log('Tentando reconectar em 5 segundos...');
                
                // Registrar o problema
                errorDiagnostic.addError(
                    `Estado problemático da conexão: ${state}`, 
                    null, 
                    'state'
                );
                
                // Enviar evento de erro
                sendToRenderer('wpp-init-error', {
                    message: `Estado problemático da conexão: ${state}`,
                    type: 'error'
                });
                
                setTimeout(() => startClient(), 5000);
            }
        });

        // Verifica mudanças na conexão (útil para detectar quedas)
        global.clientWpp.onStreamChange((state) => {
            console.log(`Estado do stream: ${state}`);
            
            // Enviar evento de mudança de stream
            sendToRenderer('wpp-stream-change', {
                state: state,
                timestamp: new Date().toLocaleString()
            });
            
            if (state === 'DISCONNECTED' || state === 'SYNCING') {
                console.log('Desconectado, tentando reconectar...');
                
                // Registrar o problema
                if (state === 'DISCONNECTED') {
                    errorDiagnostic.addError(
                        `Stream desconectado: ${state}`, 
                        null, 
                        'stream'
                    );
                    
                    // Enviar evento de erro
                    sendToRenderer('wpp-init-error', {
                        message: `Stream desconectado: ${state}`,
                        type: 'error'
                    });
                }

                setTimeout(() => startClient(), 5000);
            }
        });

        // Verifica a cada 10 minutos se ainda está conectado
        setInterval(async () => {
            console.log('Verificando sessão...');
            const state = await global.clientWpp.getConnectionState();
            if (state !== 'CONNECTED') {
                console.log('Sessão não conectada, reiniciando...');
                startClient();
            }
        }, 10 * 60 * 1000); // A cada 10 minutos

        if (config.ambiente === 'delivery') {
            global.clientWpp.onMessage(async (message) => {
                if (message.chatId.endsWith('@g.us')) return;
                if (!message.isRead) {
                    HandleMessage(message, global.store, global.clientWpp);
                }
            });
        }
        
        // Enviar evento de inicialização concluída
        sendToRenderer('wpp-init-complete', {
            message: 'Inicialização do WhatsApp concluída com sucesso!',
            progress: 100,
            type: 'success'
        });

        // Fechar popup ao atingir 100% e exibir toast de sucesso
        sendToRenderer('close-popup', {
            message: 'WhatsApp pronto para uso.',
            type: 'success'
        });

    } catch (error) {
        console.log('Erro ao iniciar:', error);

        errorDiagnostic.addError(
            `Falha ao inicializar o cliente: ${error.message}`, 
            error.stack, 
            'initialization'
        );
        
        // Enviar evento de erro
        sendToRenderer('wpp-init-error', {
            message: `Falha ao inicializar o cliente: ${error.message}`,
            error: error.stack || error.toString(),
            type: 'error'
        });
        
        logError(error.stack || error);
    }
}

// Função para salvar logs de erro em um arquivo
function logError(message) {
    const logDir = path.join(__dirname, 'logs'); // Caminho da pasta logs
    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`); // Nome do arquivo com a data

    // Cria a pasta logs se não existir
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Se o arquivo não existir, cria um novo
    if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '=== ERROR LOG ===\n', { flag: 'w' });
    }

    // Adiciona a mensagem ao log diário
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
}

// Captura erros não tratados para evitar crash
process.on('uncaughtException', (err) => {
    console.error('Erro não tratado:', err);
    logError(err.stack || err);
});

// Função para enviar uma mensagem de delivery
async function sendMessageDelivery(to, message) {
    try {
        console.log(`[LOG] Tentando enviar mensagem para ${to}: "${message}"`);
        if (global.clientWpp) {
            await global.clientWpp.sendText(to, message);
            console.log(`[SUCESSO] Mensagem enviada para ${to}`);
        } else {
            console.log(`[ERRO] global.clientWpp não está definido.`);
        }
    } catch (error) {
        console.log(`[ERRO] Falha ao enviar mensagem para ${to}: ${error.message}`);
    }
}

// Função para enviar uma mensagem
async function sendMessage(to, message) {
    const numeroComNove = formatarNumeroWhatsApp(to);
    try {
        console.log(`[LOG] Tentando enviar mensagem para ${to}: "${message}"`);
        if (global.clientWpp) {
            await global.clientWpp.sendText(to, message);
            await global.clientWpp.sendText(numeroComNove, message);
            console.log(`[SUCESSO] Mensagem enviada para ${to}`);
        } else {
            console.log(`[ERRO] global.clientWpp não está definido.`);
        }
    } catch (error) {
        console.log(`[ERRO] Falha ao enviar mensagem para ${to}: ${error.message}`);
    }
}

// Função para enviar uma mensagem com PDF
async function sendMessageWithPDF(to, message, pdfPath) {
    const numeroComNove = formatarNumeroWhatsApp(to);
    try {
        console.log(`[LOG] Tentando enviar mensagem com PDF para ${to}: "${message}", arquivo: ${pdfPath}`);
        if (global.clientWpp) {
            await global.clientWpp.sendFile(to, pdfPath, 'file.pdf', message);
            await global.clientWpp.sendFile(numeroComNove, pdfPath, 'file.pdf', message);
            console.log(`[SUCESSO] Mensagem com PDF enviada para ${to}`);
        } else {
            console.log(`[ERRO] global.clientWpp não está definido.`);
        }
    } catch (error) {
        console.log(`[ERRO] Falha ao enviar mensagem com PDF para ${to}: ${error.message}`);
    }
}

// Função para enviar uma mensagem com imagem
async function sendMessageWithImage(to, message, imagePath) {
    const numeroComNove = formatarNumeroWhatsApp(to);
    try {
        const fileName = path.basename(imagePath);
        console.log(`[LOG] Tentando enviar mensagem com imagem para ${to}: "${message}", arquivo: ${fileName}`);
        if (global.clientWpp) {
            await global.clientWpp.sendFile(to, imagePath, fileName, message);
            await global.clientWpp.sendFile(numeroComNove, imagePath, fileName, message);
            console.log(`[SUCESSO] Mensagem com imagem enviada para ${to}`);
        } else {
            console.log(`[ERRO] global.clientWpp não está definido.`);
        }
    } catch (error) {
        console.log(`[ERRO] Falha ao enviar mensagem com imagem para ${to}: ${error.message}`);
    }
}

// Função para enviar uma mensagem de status
async function sendMessageStatus(to, status) {
    const numeroComNove = formatarNumeroWhatsApp(to);
    try {
        console.log(`[LOG] Processando status para ${to}: "${status}"`);
        let message = await processIntent(status, global.store, '', to);
        
        if (message) {
            console.log(`[LOG] Mensagem de status processada para ${to}: "${message}"`);
            await global.clientWpp.sendText(to, message);
            await global.clientWpp.sendText(numeroComNove, message);
            console.log(`[SUCESSO] Mensagem de status enviada para ${to}`);
        } else {
            console.log(`[ERRO] Nenhuma mensagem gerada para o status ${status}`);
        }
    } catch (error) {
        console.log(`[ERRO] Falha ao enviar mensagem de status para ${to}: ${error.message}`);
    }
}

async function StatusServerWpp(clientwpp) {
    try {
        // if (!clientwpp) {
        //     return {
        //         status: 'Desconectado',
        //         error: 'Cliente WhatsApp não inicializado',
        //         message: 'O cliente WhatsApp não foi inicializado corretamente ou foi desconectado. Verifique se o cliente foi configurado.'
        //     };
        // }

        // if (typeof clientwpp.isConnected !== 'function') {
        //     return {
        //         status: 'Desconectado',
        //         error: 'Método isConnected não encontrado',
        //         message: 'O método isConnected não está disponível. Verifique a configuração do cliente.'
        //     };
        // }

        const isConnected = await clientwpp.isConnected();
        let status = connectionStatus || 'Desconectado'; // Usa connectionStatus global

        // Mensagem personalizada de acordo com o status
        let message = '';
        switch (status) {
            case 'isLogged':
                message = 'O WhatsApp está conectado e funcionando corretamente.';
                break;
            case 'notLogged':
                message = 'Aguardando a leitura do código QR com o Whatsapp.';
                break;    
            case 'inChat':
                message = 'O WhatsApp está conectado e funcionando corretamente.';
                break;    
            case 'qrReadSuccess':
                message = 'Aguardando login. Por favor, leia o código QR com o WhatsApp.';
                break;
            case 'desconnectedMobile':
                message = 'O QR Code foi gerado, mas o celular está desconectado. Conecte o WhatsApp no celular e tente novamente.';
                break;   
            case 'Desconectado':
                message = 'O cliente foi desconectado ou não foi inicializado corretamente.';

                if (errorDiagnostic.errors.length > 0) {
                    const latestError = errorDiagnostic.errors[0];
                    diagnosticInfo = {
                        errorType: latestError.category,
                        errorMessage: latestError.message,
                        suggestion: latestError.suggestion,
                        timestamp: latestError.timestamp
                    };
                }
                
                break;
            default:
                message = 'Status desconhecido. Verifique a conexão e o cliente WhatsApp.';
                break;
        }

        return {
            status,
            isConnected,
            lastUpdate,
            message,
        };
        
    } catch (error) {
        console.error('[ERRO] Falha ao verificar status do WhatsApp:', error);
        // Registrar o erro
        errorDiagnostic.addError(
            `Erro ao verificar status: ${error.message}`, 
            error.stack, 
            'status_check'
        );
        
        return {
            status: 'Erro',
            error: error.message || 'Erro desconhecido',
            lastUpdate,
            message: 'Ocorreu um erro ao tentar verificar o status do WhatsApp.',
            diagnosticInfo: {
                errorType: errorDiagnostic.identifyErrorCategory(error.message),
                errorMessage: error.message,
                suggestion: errorDiagnostic.getSuggestion(errorDiagnostic.identifyErrorCategory(error.message)),
                timestamp: new Date()
            }
        };
    }
}

function formatarNumeroWhatsApp(numero) {
    // Remove tudo que não for número
    let numeroLimpo = numero.replace(/\D/g, '');

    // Adiciona o código do Brasil (55) se não existir
    if (!numeroLimpo.startsWith('55')) {
        numeroLimpo = '55' + numeroLimpo;
    }

    // Separa DDD e número
    const ddd = numeroLimpo.slice(2, 4);
    let numeroSemDDD = numeroLimpo.slice(4);

    // Se o número tem 8 dígitos, adiciona o "9" (número antigo sem nono dígito)
    if (numeroSemDDD.length === 8) {
        numeroSemDDD = '9' + numeroSemDDD;
    }

    // Retorna o número formatado no padrão do WhatsApp
    return `55${ddd}${numeroSemDDD}@c.us`;
}

// Exportar as funções
export const getConnectionStatus = async () => {
    return connectionStatus;
};

export const getLastUpdate = async () => {
    return lastUpdate || 'Nunca';
};

ipcMain.handle('get-connection-status', async () => {
    try {
        const status = await getConnectionStatus();
        const diagnosticInfo = errorDiagnostic.errors.length > 0 ? {
            latestError: errorDiagnostic.errors[0],
            errorCount: errorDiagnostic.errors.length
        } : null;
        
        return { status, diagnosticInfo };
    } catch (error) {
        console.error("Erro ao obter status da conexão:", error);
        return { 
            error: "Não foi possível obter o status da conexão.",
            diagnosticInfo: null
        };
    }
});

ipcMain.handle('get-last-update', async () => {
    try {
        return await getLastUpdate();
    } catch (error) {
        console.error("Erro ao obter última atualização:", error);
        return { error: "Erro ao obter última atualização." };
    }
});

ipcMain.handle('get-device-name', async () => {
    try {
        if (!global.clientWpp) {
            throw new Error("Cliente do WhatsApp não inicializado.");
        }

        const deviceInfo = await global.clientWpp.getHostDevice();
        if (!deviceInfo || !deviceInfo.platform || !deviceInfo.pushname) {
            throw new Error("Informações do dispositivo inválidas.");
        }

        return `${deviceInfo.platform} - ${deviceInfo.pushname}`;
    } catch (error) {
        console.error("Erro ao obter nome do dispositivo:", error);
        return "Não foi possível recuperar o nome do dispositivo.";
    }
});

ipcMain.handle('disconnect-whatsapp', async () => {
    try {
        if (!global.clientWpp) {
            throw new Error("Cliente do WhatsApp não encontrado.");
        }

        await global.clientWpp.logout();
        startClient(); // Reinicia o cliente após a desconexão
        console.log("Desconectado do WhatsApp com sucesso.");
        
        return { success: "Desconectado com sucesso." };
    } catch (error) {
        console.error("Erro ao desconectar do WhatsApp:", error);
        return { error: `Erro: ${error.message}` };
    }
});

ipcMain.handle('repair-whatsapp', async (event) => {
    try {
        console.log("Iniciando processo de reparo do WhatsApp...");
        
        // 1. Primeiro, garantir que o cliente seja desconectado corretamente
        if (global.clientWpp) {
            try {
                console.log("Encerrando sessão do WhatsApp...");
                
                // Tenta fazer logout de forma limpa
                await global.clientWpp.logout().catch(e => console.log("Erro no logout:", e.message));
                console.log("Logout do WhatsApp realizado.");
                
                // Fecha a página e o navegador
                if (global.clientWpp.page && !global.clientWpp.page.isClosed()) {
                    await global.clientWpp.page.close().catch(e => console.log("Erro ao fechar página:", e.message));
                }
                
                if (global.clientWpp.browser) {
                    await global.clientWpp.browser.close().catch(e => console.log("Erro ao fechar navegador:", e.message));
                }
                
                console.log("Navegador fechado com sucesso.");
            } catch (closeError) {
                console.log("Aviso: Erro ao encerrar sessão:", closeError.message);
            }
        }
        
        // 2. Limpar tokens e cache da sessão
        try {
            console.log("Removendo tokens e cache da sessão...");
            const tokenPath = path.join('./src/whatsapp/api/tokens', 'whatsUp');
            
            if (fs.existsSync(tokenPath)) {
                fs.rmSync(tokenPath, { recursive: true, force: true });
                console.log("Tokens da sessão removidos com sucesso.");
            }
            
            // Limpar também o cache do Puppeteer
            const userDataPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(userDataPath)) {
                fs.rmSync(userDataPath, { recursive: true, force: true });
                console.log("Cache do navegador removido.");
            }
            
            // Limpar diretório .cache do Puppeteer se existir
            const puppeteerCache = path.join(process.cwd(), '.cache');
            if (fs.existsSync(puppeteerCache)) {
                fs.rmSync(puppeteerCache, { recursive: true, force: true });
                console.log("Cache adicional do Puppeteer removido.");
            }
        } catch (tokenError) {
            console.log("Aviso: Erro ao remover tokens:", tokenError.message);
        }
        
        // 3. Limpar referência global e forçar coleta de lixo
        global.clientWpp = null;
        
        if (global.gc) {
            global.gc();
            console.log("Coleta de lixo forçada executada.");
        }
        
        // 4. Desinstalar pacotes com verificação de conclusão
        console.log("Desinstalando pacotes...");
        
        await new Promise((resolve, reject) => {
            exec('npm uninstall @wppconnect-team/wppconnect puppeteer', { timeout: 240000 }, (error, stdout, stderr) => {
                if (error && !stderr.includes("npm WARN")) {
                    console.error(`Erro na desinstalação: ${error.message}`);
                    reject(error);
                    return;
                }
                console.log(`Desinstalação concluída: ${stdout}`);
                resolve();
            });
        });
        
        // 5. Limpar cache do npm para garantir instalação limpa
        console.log("Limpando cache do npm...");
        
        await new Promise((resolve, reject) => {
            exec('npm cache clean --force', { timeout: 240000 }, (error, stdout, stderr) => {
                if (error) {
                    console.log(`Aviso na limpeza do cache: ${error.message}`);
                    // Não rejeita, apenas continua
                }
                console.log(`Cache do npm limpo: ${stdout}`);
                resolve();
            });
        });
        
        // 6. Reinstalar pacotes com as versões mais recentes
        console.log("Instalando as versões mais recentes dos pacotes...");
        
        await new Promise((resolve, reject) => {
            // Instalar sempre as versões mais recentes (latest)
            exec('npm install @wppconnect-team/wppconnect@latest puppeteer@latest', 
                { timeout: 240000 }, // Tempo maior para download e instalação
                (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Erro na instalação: ${error.message}`);
                        reject(error);
                        return;
                    }
                    console.log(`Instalação concluída: ${stdout}`);
                    
                    // Verificar as versões instaladas para registro
                    exec('npm list @wppconnect-team/wppconnect puppeteer --depth=0', (err, out) => {
                        if (!err) console.log(`Versões instaladas: ${out}`);
                        resolve();
                    });
                }
            );
        });
        
        // 7. Aguardar um tempo para garantir que tudo seja carregado corretamente
        console.log("Aguardando inicialização dos módulos...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 8. Reiniciar o cliente com verificação de sucesso
        console.log("Reiniciando cliente WhatsApp...");
        
        try {
            // Limpar cache de módulos para garantir que as novas versões sejam carregadas
            Object.keys(require.cache).forEach(function(key) {
                if (key.includes('wppconnect') || key.includes('puppeteer')) {
                    delete require.cache[key];
                }
            });
            
            // Reiniciar o cliente
            await startClient();
            
            // Verificar se o cliente foi inicializado corretamente
            setTimeout(async () => {
                const status = await StatusServerWpp(global.clientWpp);
                console.log("Status após reinicialização:", status);
            }, 10000);
            
            console.log("Processo de reparo concluído com sucesso.");
            return { 
                success: "Reparo concluído com sucesso. O WhatsApp está sendo reinicializado com as versões mais recentes dos pacotes." 
            };
        } catch (startError) {
            console.error("Erro ao reiniciar cliente:", startError);
            return { 
                error: `Erro ao reiniciar cliente: ${startError.message}. Tente reiniciar a aplicação.` 
            };
        }
    } catch (error) {
        console.error("Erro crítico durante o processo de reparo:", error);
        return { 
            error: `Erro durante o reparo: ${error.message}. Tente reiniciar a aplicação.` 
        };
    }
});

// Adicionar handlers IPC para o diagnóstico
ipcMain.handle('get-wpp-diagnostic', async () => {
    return {
        errors: errorDiagnostic.getErrors(),
        hasErrors: errorDiagnostic.errors.length > 0
    };
});

ipcMain.handle('clear-wpp-diagnostic', async () => {
    errorDiagnostic.clearErrors();
    return "Lista de erros limpa com sucesso!";
});

// Função para inicializar o chatbot com o store
async function InitializeChatBot(store) {
    global.store = store; // Salva a instância do store globalmente
    let config = global.store.get('config') || {};
    if (config.portaNode === '') {
        console.log('É necessário concluir as configurações antes de iniciar o robô');
        return;
    } else {
        await InitServer(config.portaNode);
        await startClient();
        var LStatusWpp = await StatusServerWpp(global.clientWpp);

        if (LStatusWpp.whatsappStatus === 'Desconectado') {
            console.log('O WhatsApp está desconectado!');
        } else {
            console.log('O WhatsApp está conectado!'); 
            iniciarVerificacaoPeriodica(global.clientWpp, global.store);
        }
    }
}

// Exportando a função para ser utilizada em outros arquivos
export { InitializeChatBot, sendMessage, sendMessageWithPDF, sendMessageWithImage, 
         sendMessageStatus, StatusServerWpp, sendMessageDelivery };