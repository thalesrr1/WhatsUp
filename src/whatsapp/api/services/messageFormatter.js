import { RetornarTelefone, RetornarListaCupons, RetornarTaxaFixa, RetornaTaxaPorBairro,
    RetornarHorarios, RetornarPromocoes, RetornarTempoEntrega, RetornarTipoDocumento,
    RetornarStatusPedido, RetornarNumeroPedido } from './apiService.js';

let store;
let clientTelefone;
let clientName;
let email;
let portaAquiPede;

async function formatMessage(message, storeObj, name, phone) {
    store = storeObj;
    clientName = name;
    clientTelefone = phone;
    PreencherPortaAquiPede();
    PreencherEmail();

    // Garantir que a mensagem seja uma string antes de aplicar o replace
    message = String(message);

    // Obter os placeholders presentes na mensagem
    const placeholdersResolved = await getPlaceholders(message);

    // Substitui cada chave no texto pela mensagem correspondente no objeto placeholders
    Object.keys(placeholdersResolved).forEach(key => {
        // Substitui a chave pelo valor correspondente
        message = message.replace(new RegExp(key, 'g'), placeholdersResolved[key]);
    });

    return message;
}

// Função assíncrona para obter apenas os placeholders presentes na mensagem
async function getPlaceholders(message) {
    const placeholders = {};

    if (message.includes('{Nome cliente}')) {
        placeholders['{Nome cliente}'] = clientName;
    }
    if (message.includes('{Nome Loja}')) {
        placeholders['{Nome Loja}'] = RetornarNomeLoja();
    }
    if (message.includes('{Telefone}')) {
        placeholders['{Telefone}'] = await RetornarTelefone(email);
    }
    if (message.includes('{Número do pedido}')) {
        placeholders['{Número do pedido}'] = await RetornarNumeroPedido(clientTelefone, portaAquiPede);
    }
    if (message.includes('{Status do pedido}')) {
        placeholders['{Status do pedido}'] = await RetornarStatusPedido(clientTelefone, portaAquiPede);
    }
    if (message.includes('{Lista de cupons}')) {
        placeholders['{Lista de cupons}'] = await RetornarListaCupons(email);
    }
    if (message.includes('{Taxa de entrega fixa}')) {
        placeholders['{Taxa de entrega fixa}'] = await RetornarTaxaFixa(email);
    }
    if (message.includes('{Taxa por bairros}')) {
        placeholders['{Taxa por bairros}'] = await RetornaTaxaPorBairro(email);
    }
    if (message.includes('{Link do cardápio}')) {
        placeholders['{Link do cardápio}'] = RetornarLinkCardapio();
    }
    if (message.includes('{Promoções}')) {
        placeholders['{Promoções}'] = await RetornarPromocoes(email);
    }
    if (message.includes('{Horários}')) {
        placeholders['{Horários}'] = await RetornarHorarios(email);
    }
    if (message.includes('{Lista Opções}')) {
        placeholders['{Lista Opções}'] = RetornarOpcoes();
    }
    if (message.includes('{Tempo médio de entrega}')) {
        placeholders['{Tempo médio de entrega}'] = await RetornarTempoEntrega(email);
    }
    if (message.includes('{Formas de pagamento}')) {
        placeholders['{Formas de pagamento}'] = await RetornarTipoDocumento(email);
    }

    return placeholders;
}

function RetornarOpcoes() {
    return `📌 *Menu de Opções* 📌
    
1️⃣ *Fazer Pedido* 🛒  
2️⃣ *Cardápio* 📖  
3️⃣ *Status do Pedido* ⏳  
4️⃣ *Promoções* 🎉  
5️⃣ *Cupons* 🎟️  
6️⃣ *Fidelidade* 💎  
7️⃣ *Endereço* 📍  
8️⃣ *Horários* ⏰  
9️⃣ *Formas de Pagamento* 💰  
🔟 *Opções de Delivery* 🚚  
1️⃣1️⃣ *Entrega* 📦  
1️⃣2️⃣ *Ajuda* ❓  

Digite o número correspondente à opção desejada.`;
}

function PreencherPortaAquiPede() {
    let config = store.get('config') || {};
    portaAquiPede = config.portaAquiPede;
}

function PreencherEmail() {
    let config = store.get('config') || {};
    email = config.emailDelivery;
}

function RetornarNomeLoja() {
    let config = store.get('config') || {};
    return config.nomeDelivery;
}

function RetornarLinkCardapio() {
    let config = store.get('config') || {};
    return config.linkDelivery;
}

export { formatMessage };
