import { processIntent } from './intentProcess.js';

const customerSessions = {}; // Objeto para armazenar os atendimentos

const addCustomer = (phone, name) => {
    customerSessions[phone] = {
        name,
        lastMessageTime: new Date(),
        manual: false,
        firstMessage: true,
        lastManualChange: new Date(),
    };
    return customerSessions[phone]; // Retorna o objeto do cliente
};

const updateCustomer = (phone, newData) => {
    if (customerSessions[phone]) {
        customerSessions[phone] = { ...customerSessions[phone], ...newData };
    }
};

const getCustomer = (phone) => {
    return customerSessions[phone] || null;
};

const removeCustomer = (phone) => {
    delete customerSessions[phone];
};

// Função que verifica atendimentos sem atualização há mais de 10 ou 20 minutos
const verificarAtendimentosInativos = async (clientWpp, storeObj) => {
    const agora = new Date();
    const dezMinutosEmMs = 10 * 60 * 1000; // 10 minutos em milissegundos
    const vinteMinutosEmMs = 20 * 60 * 1000; // 20 minutos em milissegundos

    // Itera sobre todos os atendimentos
    Object.keys(customerSessions).forEach(async (phone) => {
        const customer = customerSessions[phone];
        const tempoDesdeUltimaMensagem = agora - new Date(customer.lastMessageTime);

        // Verifica se o atendimento não foi atualizado há mais de 20 minutos
        if (tempoDesdeUltimaMensagem === vinteMinutosEmMs) { // Correção: === substituído por >=
            console.log(`Atendimento de ${phone} inativo há mais de 20 minutos. Encerrando...`);

            // Envia mensagem antes de remover o atendimento
            let message = await processIntent('resposta_encerramento_atendimento', storeObj, 'cliente', phone);
            if (message) {
                await clientWpp.sendText(phone, message);
            }

            // Remove o atendimento
            removeCustomer(phone);
            return;
        }

        // Verifica se o atendimento não foi atualizado há mais de 10 minutos
        if (tempoDesdeUltimaMensagem === dezMinutosEmMs) { 
            console.log(`Atendimento de ${phone} inativo há mais de 10 minutos.`);

            // Envia mensagem para o cliente após 10 minutos de inatividade
            let message = await processIntent('resposta_sem_resposta', storeObj, 'cliente', phone);
            if (message) {
                await clientWpp.sendText(phone, message);
            }
            return;
        }
    });
};

// Função para rodar a verificação a cada minuto
const iniciarVerificacaoPeriodica = (clientWpp, storeObj) => {
    setInterval(() => verificarAtendimentosInativos(clientWpp, storeObj), 60 * 1000); // Verifica a cada 60 segundos (1 minuto)
};

export { addCustomer, updateCustomer, getCustomer, removeCustomer, iniciarVerificacaoPeriodica };
