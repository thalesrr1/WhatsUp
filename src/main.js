import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url'; 
import Store from 'electron-store';
import { InitializeChatBot } from './whatsapp/api/client.js'; 
import { obterHistorico, alterarStatusAtendimento, DevolveConfPadrao } from './whatsapp/api/utils/utils.js';

// Inicializando o store
const store = new Store();

// Definição de valores padrão para os campos que podem estar ausentes
const valoresPadrao = {
    useChrome: true,
    headless: true
};

// Obtém a configuração existente
const existingConfig = store.get('config') || {};

// Mescla os dados novos com os antigos, garantindo que nenhum campo existente seja sobrescrito
const updatedConfig = { ...valoresPadrao, ...existingConfig };

// Salva a configuração mesclada no store
store.set('config', updatedConfig);

console.log('Configuração atualizada com sucesso!', updatedConfig);

// Obtenção correta do diretório com ES6 modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 950,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),  // Usando __dirname corretamente aqui
            nodeIntegration: true,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'icon.ico')
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize();
    Menu.setApplicationMenu(null); // Esconder o menu superior
    InitializeChatBot(store);

    mainWindow.webContents.openDevTools();
});

ipcMain.handle('get-history', () => {
    return obterHistorico(); // Retorna um objeto vazio se não houver configuração salva
});

ipcMain.handle('update-status-history', (event, aId, aStatus) => {
    if (!aId) {
        return { error: 'ID de histórico não fornecido!' };
    }

    // Chama a função que altera o status do atendimento
    alterarStatusAtendimento(aId, aStatus);

    // Retorna um objeto de sucesso (ou outro dado, se necessário)
    return { success: `Status do atendimento para o ID ${aId} foi atualizado com sucesso!` };
});


ipcMain.handle('get-log-content', async () => {
    try {
        const logContent = fs.readFileSync(logFilePath, 'utf8'); // Lê o arquivo sincronicamente
        return logContent;  // Retorna o conteúdo do log para o frontend
    } catch (err) {
        console.error('Erro ao ler o arquivo de log:', err);
        return 'Erro ao ler o arquivo de log.';  // Caso haja erro
    }
});

// Receber dados do renderer e salvar ou atualizar uma intenção pelo ID
ipcMain.handle('save-intent', (event, intentData) => {
    try {
        // Obtém todas as intenções armazenadas
        let intents = store.get('intents', []);

        // Se não houver 'intents', cria um array vazio
        if (!intents) {
            intents = [];
        }

        // Verifica se já existe uma intenção com o mesmo ID
        const existingIntentIndex = intents.findIndex(intent => intent.id === intentData.id);

        if (existingIntentIndex !== -1) {
            // Se já existir, atualiza a intenção
            intents[existingIntentIndex] = intentData;
        } else {
            // Caso contrário, adiciona a nova intenção
            intents.push(intentData);
        }

        // Salva as intenções de volta no store
        store.set('intents', intents);

        return { success: true, message: 'Intenção salva/atualizada com sucesso!' };
    } catch (error) {
        console.error('Erro ao salvar ou atualizar intenção:', error);
        return { success: false, message: 'Erro ao salvar ou atualizar intenção!' };
    }
});

// Consultar uma intenção pelo ID
ipcMain.handle('get-intent', (event, intentId) => {
    if (!intentId) {
        return { error: 'ID de intenção não fornecido' };
    }

    const intents = store.get('intents', []);

    // Busca a intenção pelo ID
    const intent = intents.find(intent => intent.id === intentId);
    
    if (!intent) {
        return { error: 'Intenção não encontrada' };
    }

    return { success: true, intentData: intent };
});

ipcMain.handle('update-config', (event, config) => {
    const existingConfig = store.get('config') || {}; // Obtém a configuração existente
    const [key, value] = Object.entries(config)[0]; // Extrai a chave e o valor do JSON recebido

    if (!key) return 'Erro: Nenhuma chave fornecida.';

    existingConfig[key] = value; // Atualiza apenas o campo específico
    store.set('config', existingConfig); // Salva a configuração atualizada

    return `Configuração "${key}" atualizada com sucesso!`;
});

ipcMain.handle('save-config', (event, config) => {
    const existingConfig = store.get('config') || {}; // Obtém a configuração existente
    const updatedConfig = { ...existingConfig, ...config }; // Mescla os dados novos com os antigos
    store.set('config', updatedConfig); // Salva a configuração mesclada
    return 'Configuração atualizada com sucesso!';
});

// Evento para recuperar a configuração
ipcMain.handle('get-config', () => {
    return store.get('config') || {}; // Retorna um objeto vazio se não houver configuração salva
});
