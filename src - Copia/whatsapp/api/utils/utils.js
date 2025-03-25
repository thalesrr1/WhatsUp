import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; 
import { updateCustomer } from '../services/sessionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const historicoPath = path.join(__dirname, 'data', 'clientesPendentes.json');

export function converterParaMinutos(horario) {
    if (horario === "00:00:00") return null;
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
}

export const alterarStatusAtendimento = (telefone, novoStatus) => {
    let pendentes = {};

    // Verifica se o arquivo existe antes de tentar ler
    if (fs.existsSync(historicoPath)) {
        try {
            const fileContent = fs.readFileSync(historicoPath, 'utf8').trim();
            pendentes = fileContent ? JSON.parse(fileContent) : {};
        } catch (err) {
            console.error("Erro ao carregar pendentes:", err);
            pendentes = {}; // Garante que pendentes seja um objeto vazio em caso de erro
        }
    }

    // Verifica se o telefone existe no histórico
    if (pendentes[telefone]) {
        // Atualiza o status
        pendentes[telefone].status = novoStatus;

        // Se o status for true, chama updateCustomer e remove dos pendentes
        if (novoStatus === true) {
            updateCustomer(telefone, { manual: false });
            delete pendentes[telefone];
        }

        // Tenta salvar o arquivo atualizado
        try {
            fs.writeFileSync(historicoPath, JSON.stringify(pendentes, null, 2), 'utf8');
            console.log(`Status atualizado para ${novoStatus} no telefone ${telefone}`);
        } catch (err) {
            console.error("Erro ao salvar pendentes:", err);
        }
    } else {
        console.log(`Telefone ${telefone} não encontrado no histórico.`);
    }
};

// Função para carregar o histórico completo
export const obterHistorico = () => {
    if (fs.existsSync(historicoPath)) {
        try {
            const fileContent = fs.readFileSync(historicoPath, 'utf8').trim();
            return fileContent ? JSON.parse(fileContent) : {};
        } catch (err) {
            console.error("Erro ao carregar pendentes:", err);
            return {};
        }
    }
    return {};
};

export const salvarPendentesAtendimento = (nome, telefone, mensagem, data, status) => {
    let pendentes = {};

    // Verifica se o arquivo existe antes de tentar ler
    if (fs.existsSync(historicoPath)) {
        try {
            const fileContent = fs.readFileSync(historicoPath, 'utf8').trim();
            pendentes = fileContent ? JSON.parse(fileContent) : {};
        } catch (err) {
            console.error("Erro ao carregar pendentes:", err);
            pendentes = {}; // Garante que pendentes seja um objeto vazio em caso de erro
        }
    }

    // Atualiza ou adiciona o telefone com as novas informações
    pendentes[telefone] = {
        nome,
        mensagem,
        data,
        status,
        timestamp: new Date().toISOString()
    };

    // Tenta salvar o arquivo atualizado
    try {
        fs.writeFileSync(historicoPath, JSON.stringify(pendentes, null, 2), 'utf8');
    } catch (err) {
        console.error("Erro ao salvar pendentes:", err);
    }
};

export function DevolveConfPadrao() {
    return {
                "config": {
                    "portaNode": "7079",
                    "ambiente": "delivery",
                    "portaAquiPede": "1080",
                    "linkDelivery": "https://www.aquipede.com.br/aquipedeteste",
                    "emailDelivery": "email@teste.com",
                    "nomeDelivery": "AquiPede",
                    "useChrome": true,
                    "headless": true
                },
                "intents": [
                    {
                        "id": "mensagem_inicial",
                        "name": "1. Mensagem inicial",
                        "description": "Esta será a primeira resposta do robô em uma nova conversa.",
                        "message": "Seja bem vindo ao nosso atendimento automático \n\n{Lista Opções}",
                        "status": true
                    },
                    {
                        "id": "resposta_fazer_pedido",
                        "name": "2. Fazer pedido",
                        "description": "Quando o cliente deseja fazer um pedido.",
                        "message": "Você pode fazer seu pedido através do nosso cardápio:\n{Link do cardápio}\n\nÉ super rápido e fácil! 📲\nQualquer dúvida estarei aqui 😊",
                        "status": true
                    },
                    {
                        "id": "resposta_pedido_andamento",
                        "name": "5. Pedido em andamento (cliente identificado pelo telefone)",
                        "description": "Informações ou perguntas sobre um pedido que já foi feito e ainda está em processamento.",
                        "message": "Seu pedido *{Número do pedido}* está *Status do pedido*.\n\nQualquer dúvida estarei aqui 😊 ",
                        "status": true
                    },
                    {
                        "id": "resposta_pedido_andamento_nao_identificado",
                        "name": "6. Pedido em andamento (cliente não identificado pelo telefone)",
                        "description": "Informações ou perguntas sobre um pedido, porém o cliente ainda não fez pedido ou não fez com o mesmo número do WhatsApp.",
                        "message": "*Não identificamos o seu cadastro pelo seu número de telefone.*\n\n🍳 Para acompanhar um pedido, acesse nosso link: *{Link do cardápio}*. Depois, clique em entrar e faça o login com o telefone do cadastro. Depois clique em *Pedidos* para visualizar seu último pedido. ",
                        "status": true
                    },
                    {
                        "id": "resposta_informacao_cardapio",
                        "name": "8. Informação sobre cardápio/catálogo",
                        "description": "Perguntas ou solicitações de informações sobre o cardápio ou catálogo do restaurante.",
                        "message": "Confira nosso cardápio completo e faça seu pedido através deste link:\n{Link do cardápio}\n\nÉ fácil e rápido! 😃 ",
                        "status": true
                    },
                    {
                        "id": "resposta_atendente",
                        "name": "13. Falar com atendente",
                        "description": "Quando o cliente deseja falar diretamente com um humano.",
                        "message": "Por favor, aguarde um momento enquanto chamo um de nossos atendentes. 👩‍💼👨‍💼",
                        "status": true
                    },
                    {
                        "id": "resposta_existe_promocao",
                        "name": "14. Solicitação de promoção",
                        "description": "Quando o cliente pede informações sobre promoções atuais.",
                        "message": "Temos! Confira aqui:  {Link do cardápio}\n\nVerifique os nossos itens em promoção: \n{Promoções}",
                        "status": true
                    },
                    {
                        "id": "resposta_existe_cupom",
                        "name": "15. Solicitação de Cupom",
                        "description": "Quando o cliente pede um cupom de desconto.",
                        "message": "Confira nosso(s) cupom(s) de desconto (confira as regras no app):\n\n{Lista de cupons}\n\nFaça seu pedido: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_sem_desconto",
                        "name": "16. Sem Promoção/Cupom",
                        "description": "Resposta para o cliente quando não há promoções ou cupons disponíveis.",
                        "message": "Hoje não temos descontos disponíveis. Mas dá uma olhadinha nas opções no nosso cardápio, com certeza vai encontrar o que precisa 😃: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_audio",
                        "name": "19. Áudio",
                        "description": "Quando o cliente envia uma mensagem de áudio em vez de texto.",
                        "message": "Desculpe, não consigo ouvir mensagens em áudio 😕 Pode mandar por escrito o que deseja?",
                        "status": true
                    },
                    {
                        "id": "resposta_endereco_telefone",
                        "name": "12. Solicitação de Endereço/Telefone",
                        "description": "Quando o cliente pede o endereço ou telefone do restaurante.",
                        "message": "Estamos localizados em Av das flores, N15\n\nNosso número para pedidos via telefone é: +55 22 9 9999-9999 {Pode ser o telefone que recebe pedidos}\n\nEstamos disponíveis nestes horários: \n{Horários}\n\nFicaremos felizes em ajudar com qualquer outra dúvida que você possa ter! ",
                        "status": true
                    },
                    {
                        "id": "resposta_taxa_delivery_ativo",
                        "name": "17. Taxa de entrega (Delivery ativado)",
                        "description": "Quando o cliente pergunta sobre a taxa de entrega e o delivery está ativado.",
                        "message": "Taxa de entrega fixa de R$ 10,00",
                        "status": true
                    },
                    {
                        "id": "resposta_taxa_delivery_inativo",
                        "name": "22. Taxa de entrega (Delivery desativado)",
                        "description": "Quando o cliente pergunta sobre a taxa de entrega e o delivery está desativado.",
                        "message": "Não estamos fazendo entregas no momento\nConfira outras opções:\n• Retirada no local\n• Consumo no local",
                        "status": true
                    },
                    {
                        "id": "resposta_taxa_bairro",
                        "name": "23. Verificação de endereço (Método de taxa por bairro)",
                        "description": "Quando o cliente pergunta se o restaurante entrega no endereço dele.",
                        "message": "Consulte a taxa para o seu bairro: {Taxa por bairros}\n\nFaça seu pedido: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_fidelidade",
                        "name": "25. Programa de fidelidade",
                        "description": "Quando o cliente pede informações sobre o programa de fidelidade do restaurante.",
                        "message": "Sim! Temos um programa de fidelidade incrível! 🌟 A cada 1 real em compras, você ganha 1 ponto! Confira os produtos disponíveis para resgate aqui 🎁: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_sem_fidelidade",
                        "name": "26. Sem programa de fidelidade",
                        "description": "Resposta para quando não há programa de fidelidade.",
                        "message": "Ainda não temos programa de fidelidade disponível.",
                        "status": true
                    },
                    {
                        "id": "resposta_horarios",
                        "name": "27. Horário de atendimento",
                        "description": "Quando o cliente pede informações sobre quanto tempo levará para seu pedido ser preparado e entregue.",
                        "message": "Confira nossos horários de atendimento ⏰\n{Horários}",
                        "status": true
                    },
                    {
                        "id": "resposta_forma_pagamento",
                        "name": "29. Forma de pagamento",
                        "description": "Quando o cliente pergunta sobre as formas de pagamento aceitas pelo restaurante.",
                        "message": "Veja a lista com todas as nossas opções de pagamento 💳:\n{Formas de pagamento}\n\nFaça seu pedido: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_loja_fechada",
                        "name": "33. Loja fechada",
                        "description": "Resposta para quando a loja está atualmente fechada.",
                        "message": "Desculpe, nosso estabelecimento está fechado. Agradecemos pela compreensão e esperamos te atender em breve!\n\nConfira nossos horários de atendimento ⏰:\n{Horários}\n\nVeja nosso cardápio: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_opcoes_entrega",
                        "name": "34. Opções de entrega/retirada",
                        "description": "Quando o cliente pergunta sobre as opções disponíveis para entrega ou retirada de pedidos.",
                        "message": "Aceitamos pedidos para:\n• Entrega\n• Retirada no local\n• Consumo no local\n\nFaça seu pedido: {Link do cardápio}",
                        "status": true
                    },
                    {
                        "id": "resposta_sem_resposta",
                        "name": "39. Não responder",
                        "description": "Mensagem enviada quando o robô fizer uma pergunta e o cliente não responder dentro de 10 minutos.",
                        "message": "Você ainda está aí?",
                        "status": true
                    },
                    {
                        "id": "mensagem_pronto",
                        "name": "01. Pedido pronto",
                        "description": "Notifica o cliente de que o pedido está pronto",
                        "message": "Seu pedido está pronto para ser retirado!",
                        "status": true
                    },
                    {
                        "id": "mensagem_solicitando_entregador",
                        "name": "02. Solicitando entregador",
                        "description": "Notifica o cliente de que o pedido está aguardando a retirada por um entregador",
                        "message": "Estamos solicitando o entregador, logo te informaremos que o pedido está a caminho!",
                        "status": true
                    },
                    {
                        "id": "mensagem_entregando",
                        "name": "03. Entregador em rota",
                        "description": "Notifica o cliente de que o pedido está a caminho",
                        "message": "O entregador acabou de sair com seu pedido! Logo, logo ele chegará, fique atento.",
                        "status": true
                    },
                    {
                        "id": "mensagem_finalizado",
                        "name": "04. Pedido finalizado",
                        "description": "Notifica o cliente de que o pedido foi finalizado",
                        "message": "Seu pedido foi finalizado. Muitíssimo obrigado pela preferência e volte sempre. Participe da nossa pesquisa de fidelidade: (*Aqui você pode colocar no google forms*)",
                        "status": true
                    },
                    {
                        "id": "mensagem_retirada",
                        "name": "05. Pronto para retirada",
                        "description": "Notifica o cliente de que o pedido está pronto para ser retirado",
                        "message": "O pedido está pronto para a retirada! Por favor, venha imediatamente para não esfriar.",
                        "status": true
                    },
                    {
                        "id": "mensagem_pedido_aceito",
                        "name": "06. Pedido aceito",
                        "description": "Notifica o cliente de que o pedido foi aceito",
                        "message": "Seu pedido foi aceito com sucesso!",
                        "status": true
                    },
                    {
                        "id": "mensagem_pedido_recusado",
                        "name": "07. Pedido recusado",
                        "description": "Notifica o cliente de que o pedido foi recusado",
                        "message": "Seu pedido foi recusado!",
                        "status": true
                    },
                    {
                        "id": "resposta_nao_entendeu",
                        "name": "22. Não entendeu a solicitação",
                        "description": "Mensagem enviada quando o robo não entendeu a solicitação",
                        "message": "Oops, não entendi a sua solicitação. Por favor, digite apenas números. Aqui estão nossas opções:\n\n{Lista Opções}",
                        "status": true
                    }
                ]
            }
}

export async function cleanString(str) {
    return str.replace(/[^a-zA-Z0-9á-úÁ-Ú\s]/g, '').trim();
}

export function capitalizarTexto(texto) {
    return texto
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase()); 
}

export function formatTime(timeString) {
    const time = timeString.split(":");
    const hour = parseInt(time[0], 10);
    const minute = parseInt(time[1], 10);
    return `${hour}h ${minute === 0 ? "" : minute + "m"}`;
}

export function cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return ''; // Retorna string vazia se phoneNumber for undefined ou inválido
    }
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const hasCountryCode = cleanedNumber.startsWith('55');
    const countryCode = hasCountryCode ? '+55 ' : '+55 ';
    const ddd = cleanedNumber.length > 10 ? cleanedNumber.slice(2, 4) : cleanedNumber.slice(0, 2);
    const number = cleanedNumber.slice(ddd ? 4 : 2);
    return `${countryCode}(${ddd}) 9 ${number.slice(0, 4)}-${number.slice(4, 8)}`;
}

// Obter o nome do contato que enviou a mensagem
export async function getContactName(client, chatId) {
    try {
        const contact = await client.getContact(chatId);
        return contact.name || contact.pushname || ''; // Prioriza name, depois pushname
    } catch (error) {
        return ''; // Retorna vazio se não conseguir obter o nome
    }
}

export async function getIntentKey(intentId, store) {

    if (!intentId) {
        return { error: 'ID de intenção não fornecido' };
    }

    const intents = store.get('intents', []);

    // Busca a intenção pelo ID
    const intent = intents.find(intent => intent.id === intentId);

    if (!intent) {
        console.error('Intenção não encontrada para o ID:', intentId);
        return { error: 'Intenção não encontrada' };
    }

    return { success: true, intentData: intent };
}

// Verifica se a resposta para a intenção está ativa
export async function verifyIntentStatus(intent, store) {
    // Declare a variável 'response' com 'let' ou 'const'
    let response = await getIntentKey(intent, store);

    // Verifique se 'intentData' existe dentro da 'response'
    if (!response.intentData) {
        return false;
    }

    // Acesse 'intentData' de maneira segura
    let intentObj = response.intentData;

    // Retorne o status de 'intentObj'
    return intentObj.status;
}

// Função que obtem a mensagem pela intenção
export async function getIntentMessage(intentId, store) {
    let response = await getIntentKey(intentId, store);

    // Verifique se 'intentData' existe dentro da 'response'
    if (!response.intentData) {
        return false;
    }

    // Acesse 'intentData' de maneira segura
    let intentObj = response.intentData;

    // Retorne o status de 'intentObj'
    return intentObj.message;
}