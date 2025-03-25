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
