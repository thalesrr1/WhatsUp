import { getContactName, salvarPendentesAtendimento } from '../../../../src/whatsapp/api/utils/utils.js';
import { updateCustomer, getCustomer, addCustomer, removeCustomer } from './sessionManager.js';
import { processIntent } from './intentProcess.js';
import { RetornarStatusFidelidade, RetornarPromocoes, RetornarNumeroPedido, RetornarListaCupons, 
         RetornarStatusLoja, RetornarTipoEntrega, RetornaModoDelivery } from './apiService.js';

import pkg from 'node-notifier';
const { WindowsToaster } = pkg;
import { exec } from 'child_process';
import os from 'os';

let isPlaying = false; // Variável de controle

// Criar instância do WindowsToaster e evitar "snoreToast"
const notifier = new WindowsToaster({
    withFallback: false, 
    appID: "WhatsUp Atendimentos" 
});

/**
 * Reproduz um som sem abrir o Media Player.
 */
function playNotificationSound() {
    if (isPlaying) return; // Se já estiver tocando, não faz nada

    isPlaying = true; // Marca que o som começou a tocar

    const soundPath = `"${process.cwd()}/src/whatsapp/api/sounds/atendente.wav"`;

    const soundCommand = os.platform() === 'win32'
        ? `powershell -c (New-Object Media.SoundPlayer ${soundPath}).PlaySync()`
        : `${os.platform() === 'darwin' ? 'afplay' : 'aplay'} ${soundPath}`;

    exec(soundCommand, (err) => {
        if (err) {
            console.error('Erro ao tocar som:', err);
        }
        isPlaying = false; // Libera a flag quando o som terminar
    });
}

/**
 * Envia uma notificação para a bandeja do sistema.
 * @param {string} name - Nome do remetente da mensagem.
 */
function sendNotification(name) {
    notifier.notify({
        title: 'Novo atendimento manual',
        message: `Mensagem de ${name} requer atendimento manual.`,
        icon: './src/whatsapp/api/image/whatsUp.png',
        sound: false
    });
}

let statusLoja = "Fechado";

const processingQueue = new Map(); // Armazena mensagens em processamento

let email;
let portaAquiPede;

async function iniciarVerificacaoStatusLoja(aStore) {
    PreencherPortaAquiPede(aStore);
    try {
        // Executa a verificação imediatamente
        const status = await RetornarStatusLoja(email);
        statusLoja = (status === 'fechado') ? 'Fechado' : 'Aberto';
    } catch (error) {
        console.error("Erro ao verificar status da loja:", error);
    }

    // Inicia a verificação periódica a cada 3 minutos
    setInterval(async () => {
        try {
            const status = await RetornarStatusLoja(email);
            statusLoja = (status === 'fechado') ? 'Fechado' : 'Aberto';
        } catch (error) {
            console.error("Erro ao verificar status da loja:", error);
        }
    }, 180000); // 3 minutos
}

async function HandleMessage(messageObj, storeObj, clientWpp) {
    const { from, body, type } = messageObj;
    const name = await getContactName(clientWpp, from);
    PreencherEmail(storeObj);
    PreencherPortaAquiPede(storeObj);

    //playNotificationSound();
    //sendNotification(name);
    //return;

    if (from === 'status@broadcast') {
        return; // Ignora mensagens de status
    }

    if (type === 'audio') {
        let message = await processIntent('resposta_audio', storeObj, name, from);
        if (message) {
            await clientWpp.sendText(from, message);
        }

        return;
    }

    if (type !== 'chat') {
        return;
    }

    if (processingQueue.has(from)) {
        return; // Evita processamento duplicado do mesmo número
    }

    processingQueue.set(from, true); // Marca o número como em processamento

    try {
        let customer = getCustomer(from);

        // Função para verificar se já passaram 2 minutos desde a mudança para manual
        const verificarRetornoAutomatico = (customer) => {
            if (customer.manual) {
                const tempoDesdeAlteracao = new Date() - new Date(customer.lastManualChange); // Tempo em milissegundos
                const doisMinutosEmMs = 7 * 60 * 1000; // 2 minutos em milissegundos

                // Se já passaram 7 minutos, retorna ao atendimento automático
                if (tempoDesdeAlteracao >= doisMinutosEmMs) {
                    updateCustomer(customer.from, { manual: false }); // Altera para automático
                    console.log(`Atendimento de ${customer.from} retornou ao modo automático.`);
                }
            }
        };

        if (!customer) {
            customer = addCustomer(from, { name, lastMessage: new Date(), manual: false, firstMessage: true });
        } else {
            updateCustomer(from, { lastMessage: new Date(), firstMessage: false });
        }

        if (customer.firstMessage === true) {
            let firstMessage = await processIntent('mensagem_inicial', storeObj, name, from);
            if (firstMessage) {
                await clientWpp.sendText(from, firstMessage);
            }    

            updateCustomer(from, { lastMessage: new Date(), firstMessage: false });
            
            return;
        }

        verificarRetornoAutomatico(customer);

        // 1️⃣ *Fazer Pedido* 🛒  
        // 2️⃣ *Cardápio* 📖  
        // 3️⃣ *Status do Pedido* ⏳  
        // 4️⃣ *Promoções* 🎉  
        // 5️⃣ *Cupons* 🎟️  
        // 6️⃣ *Fidelidade* 💎  
        // 7️⃣ *Endereço* 📍  
        // 8️⃣ *Horários* ⏰  
        // 9️⃣ *Formas de Pagamento* 💰  
        // 🔟 *Opções de Delivery* 🚚  
        // 1️⃣1️⃣ *Entrega* 📦  
        // 1️⃣2️⃣ *Ajuda* ❓ 
        // atendente 

        let intent;
        const bodyLower = body.trim().toLowerCase();
        if (/^\d+$/.test(bodyLower)) { // Verifica se "body" contém apenas números
            switch (bodyLower) {
                case '1':
                    intent = 'resposta_fazer_pedido';
                    break;
                case '2':
                    intent = 'resposta_informacao_cardapio';
                    break;
                case '3':
                    intent = 'resposta_pedido_andamento';
                    break;
                case '4':
                    intent = 'resposta_existe_promocao';
                    break;
                case '5':
                    intent = 'resposta_existe_cupom';
                    break;
                case '6':
                    intent = 'resposta_fidelidade';
                    break;
                case '7':
                    intent = 'resposta_endereco_telefone';
                    break;
                case '8':
                    intent = 'resposta_horarios';
                    break;
                case '9':
                    intent = 'resposta_forma_pagamento';
                    break;
                case '10':
                    intent = 'resposta_opcoes_entrega';
                    break;
                case '11':
                    intent = 'resposta_taxa_delivery';
                    break;
                case '12':
                    intent = 'resposta_atendente';
                    break;
                default:
                    intent = 'resposta_nao_entendeu';
            }
        } else if (bodyLower === "atendente") {
            intent = 'resposta_atendente'; // Permite a palavra "atendente" como alternativa
        } else {
            intent = 'resposta_nao_entendeu'; // Caso não seja um número ou "atendente"
        } 
    
        if (!customer.manual) {
            let message;            
            
            if (intent === 'resposta_atendente') {
                updateCustomer(from, { lastMessage: new Date(), manual: true, lastManualChange: new Date() });  // Adiciona a data da mudança para manual
                customer = getCustomer(from);

                message = await processIntent(intent, storeObj, name, from);
                if (message) {
                    await clientWpp.sendText(from, message);
                }

                // Tocar som e mostrar notificação na bandeja para chamar o atendente
                playNotificationSound();
                sendNotification(name);
                
                salvarPendentesAtendimento(name, from, body, new Date(), false);
                return;
            }

            switch (intent) {
                case 'resposta_fidelidade':
                    if (await RetornarStatusFidelidade(email) === 'S') {
                        message = await processIntent('resposta_fidelidade', storeObj, name, from);
                    } else {
                        message = await processIntent('resposta_sem_fidelidade', storeObj, name, from);
                    }
                    break;

                case 'resposta_existe_promocao':
                    if (await RetornarPromocoes(email) === 'Indisponível') {
                        message = await processIntent('resposta_sem_desconto', storeObj, name, from);
                    } else {
                        message = await processIntent('resposta_existe_promocao', storeObj, name, from);
                    }
                    break;

                case 'resposta_existe_cupom':
                    if (await RetornarListaCupons(email) === 'Indisponível') {
                        message = await processIntent('resposta_sem_desconto', storeObj, name, from);
                    } else {
                        message = await processIntent('resposta_existe_cupom', storeObj, name, from);
                    }
                    break;    

                case 'resposta_pedido_andamento':
                    if (await RetornarNumeroPedido(from, portaAquiPede) === 'Indisponível') {
                        message = await processIntent('resposta_pedido_andamento_nao_identificado', storeObj, name, from);
                    } else {
                        message = await processIntent('resposta_pedido_andamento', storeObj, name, from);
                    }
                    break;   

                case 'resposta_taxa_delivery':
                    if (await RetornaModoDelivery(email) !== 'R') {
                        if (await RetornarTipoEntrega(email) === 'N') {
                            message = await processIntent('resposta_taxa_delivery_ativo', storeObj, name, from);
                        } else if (await RetornarTipoEntrega(email) === 'S') {
                            message = await processIntent('resposta_taxa_bairro', storeObj, name, from);
                        }
                    } else {
                        message = await processIntent('resposta_taxa_delivery_inativo', storeObj, name, from);    
                    }
                    break; 

                default:
                    message = await processIntent(intent, storeObj, name, from);
            }

            if (message) {
                await clientWpp.sendText(from, message);
            } else {
                console.error(`❌ Erro: Mensagem não gerada para a intenção ${intent}`);
            }
        }

    } catch (error) {
        console.error(`❌ Erro ao processar mensagem de ${from}:`, error);
    } finally {
        processingQueue.delete(from); // Libera a fila para novas mensagens
    }
}

function PreencherEmail(storeObj) {
    let config = storeObj.get('config') || {};
    email = config.emailDelivery;
}

function PreencherPortaAquiPede(storeObj) {
    let config = storeObj.get('config') || {};
    portaAquiPede = config.portaAquiPede;
}

export { HandleMessage, iniciarVerificacaoStatusLoja };
