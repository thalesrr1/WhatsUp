const { contextBridge, ipcRenderer } = require('electron');

// Expor as funções para o frontend
contextBridge.exposeInMainWorld('repairWpp', async () => {
    try {
        console.log("Frontend: Iniciando solicitação de reparo...");
        const result = await ipcRenderer.invoke('repair-whatsapp');
        console.log("Frontend: Resultado do reparo:", result);
        return result;
    } catch (error) {
        console.error('Frontend: Erro ao reparar WhatsApp:', error);
        return { error: error.message || "Erro desconhecido durante o reparo" };
    }
});

// Adicionar funções para monitoramento da inicialização do WhatsApp
contextBridge.exposeInMainWorld('wppInitMonitor', {
    // Função para iniciar o cliente WhatsApp
    startClient: () => ipcRenderer.invoke('start-whatsapp-client'),
    
    // Registrar listeners para eventos de inicialização
    onInitStart: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-init-start', listener);
        return () => ipcRenderer.removeListener('wpp-init-start', listener);
    },
    
    onInitStep: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-init-step', listener);
        return () => ipcRenderer.removeListener('wpp-init-step', listener);
    },
    
    onInitError: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-init-error', listener);
        return () => ipcRenderer.removeListener('wpp-init-error', listener);
    },
    
    onInitComplete: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-init-complete', listener);
        return () => ipcRenderer.removeListener('wpp-init-complete', listener);
    },
    
    onStateChange: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-state-change', listener);
        return () => ipcRenderer.removeListener('wpp-state-change', listener);
    },
    
    onStreamChange: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('wpp-stream-change', listener);
        return () => ipcRenderer.removeListener('wpp-stream-change', listener);
    },

    closePopup: () => {
        ipcRenderer.send('close-popup', { message: 'WhatsApp pronto para uso.', type: 'success' });
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    saveIntent: (intentKey, intentData) => ipcRenderer.invoke('save-intent', intentKey, intentData),
    getIntent: (intentKey) => ipcRenderer.invoke('get-intent', intentKey),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    getConfig: () => ipcRenderer.invoke('get-config'),
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
    getWppDiagnostic: () => ipcRenderer.invoke('get-wpp-diagnostic'),
    clearConnectionStatus: () => ipcRenderer.invoke('clear-wpp-diagnostic'),
    getLastUpdate: () => ipcRenderer.invoke('get-last-update'),
    getDeviceName: () => ipcRenderer.invoke('get-device-name'),
    disconectWpp: () => ipcRenderer.invoke('disconnect-whatsapp'),
    getHistory: () => ipcRenderer.invoke('get-history'),
    updateStatusHistory: (aId, aStatus) => ipcRenderer.invoke('update-status-history', aId, aStatus),
});
