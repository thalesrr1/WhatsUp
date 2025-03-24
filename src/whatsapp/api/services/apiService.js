import axios from 'axios';
import { cleanPhoneNumber, capitalizarTexto, formatTime, converterParaMinutos } from '../../../../src/whatsapp/api/utils/utils.js';

async function RetornarTelefone(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_telefone_wpp&email=${email}`);
    const phone = response.data.data.results;

    return cleanPhoneNumber(phone.whatsapp_loja);
}

async function RetornarTempoEntrega(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_tempo_wpp&email=${email}`);
    const time = response.data.data.results;

    return time.tempo_entrega;
}

async function RetornarTipoDocumento(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_pagamentos_wpp&email=${email}`);
    const payments = response.data.data.results;

    // Função para capitalizar o texto
    const capitalizarTexto = (texto) => {
        return texto.replace(/\b\w/g, (letra) => letra.toUpperCase());
    };

    // Arrays para agrupar os métodos de pagamento
    let cartaoCredito = [];
    let cartaoDebito = [];
    let valeRefeicaoAlimentacao = [];
    let outros = [];

    payments.forEach(payment => {
        const descricao = capitalizarTexto(payment.esp_descricao);

        if (descricao.includes("CARTAO CREDITO")) {
            cartaoCredito.push(descricao);
        } else if (descricao.includes("CARTAO DEBITO")) {
            cartaoDebito.push(descricao);
        } else if (descricao.includes("VALE")) {
            valeRefeicaoAlimentacao.push(descricao);
        } else {
            outros.push(descricao);
        }
    });

    let mensagem = '';
    // Formatação da mensagem
    if (cartaoCredito.length) {
        mensagem += `**Cartões de crédito:** ${cartaoCredito.join(', ')}\n`;
    }
    if (cartaoDebito.length) {
        mensagem += `**Cartões de débito:** ${cartaoDebito.join(', ')}\n`;
    }
    if (valeRefeicaoAlimentacao.length) {
        mensagem += `**Vale-refeição/alimentação:** ${valeRefeicaoAlimentacao.join(', ')}\n`;
    }
    if (outros.length) {
        mensagem += `**Outros:** ${outros.join(', ')}\n`;
    }

    return mensagem;
}

async function RetornaTaxaPorBairro(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_bairros_wpp&email=${email}`);
    const bairros = response.data.data.results;

    let mensagem;

    bairros.forEach(bairro => {
        const bairroCapitalizado = capitalizarTexto(bairro.bairro);  // Capitaliza o nome do bairro
        const valorFormatado = parseFloat(bairro.valor).toFixed(2); // Formata o valor para 2 casas decimais

        mensagem += `📍 **${bairroCapitalizado}**: R$ ${valorFormatado}\n`;
    });

    return mensagem;
}

async function RetornarStatusLoja(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_horarios_wpp&email=${email}`);
    const schedules = response.data.data.results;

    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const horaAtual = agora.getHours() * 60 + agora.getMinutes(); // Convertendo para minutos do dia

    const diasSemanaMap = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
    const schedule = schedules.find(s => s.dia_semana === diasSemanaMap[diaSemana]);

    if (!schedule) return "fechado";

    const abrir1 = converterParaMinutos(schedule.hora_abertura);
    const fechar1 = converterParaMinutos(schedule.hora_fechamento);
    const abrir2 = schedule.status_turno2 === "S" ? converterParaMinutos(schedule.hora_abertura_turno2) : null;
    const fechar2 = schedule.status_turno2 === "S" ? converterParaMinutos(schedule.hora_fechamento_turno2) : null;

    if ((horaAtual >= abrir1 && horaAtual < fechar1) || (abrir2 !== null && horaAtual >= abrir2 && horaAtual < fechar2)) {
        return "aberto";
    }

    return "fechado";
}

async function RetornarHorarios(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_horarios_wpp&email=${email}`);
    const schedules = response.data.data.results;

    let mensagem = '';

    schedules.forEach(schedule => {
        // Verifica se o segundo turno está configurado como 'S'
        const segundoTurno = schedule.hora_abertura_turno2 === "00:00:00" ? "" : ` e ${formatTime(schedule.hora_abertura_turno2)} às ${formatTime(schedule.hora_fechamento_turno2)}`;
        
        // Constrói a linha de horário para cada dia da semana
        if (schedule.hora_abertura !== "00:00:00" || schedule.hora_fechamento !== "00:00:00") {
            mensagem += `*${capitalizarTexto(schedule.dia_semana)}*: ${formatTime(schedule.hora_abertura)} às ${formatTime(schedule.hora_fechamento)}${segundoTurno || " - Fechados"}\n`;
        } else {
            mensagem += `*${capitalizarTexto(schedule.dia_semana)}*: Somente um turno\n`;
        }
    });

    return mensagem;
}

async function RetornarTaxaFixa(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_taxa_fixa_wpp&email=${email}`);
    const tax = response.data.data.results;

    if (!tax || !tax.taxa_entrega) {
        return "Taxa de entrega não encontrada.";
    }

    // Formatar valor para Real (BRL)
    const taxaFormatada = parseFloat(tax.taxa_entrega).toLocaleString("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
    });

    return taxaFormatada;
}

async function RetornarTipoEntrega(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_tipo_delivery_wpp&email=${email}`);
    const shipping = response.data.data.results[0];

    return shipping.taxa_por_zona;
}

async function RetornaModoDelivery(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_tipo_retirada_wpp&email=${email}`);
    const metodo = response.data.data.results[0]; // Acessa o primeiro item do array

    console.log(metodo.aceita_retirada);
    return metodo.aceita_retirada;
}

async function RetornarPromocoes(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_promotions_bot&email_vinculado=${email}`);
    const promotions = response.data.data.results;

    if (!promotions || promotions.length === 0) {
        return "Indisponível";
    }

    let mensagem = "🎉 **Ofertas e Promoções** 🎉\n\n";

    promotions.forEach(promotion => {
        // Formatação da descrição e observações
        let descricao = promotion.prd_descricao;
        let observacao = promotion.prd_observacao ? `\n📌 *Observações:* ${promotion.prd_observacao}` : "";

        // Verifica se o produto tem entrega disponível
        let entrega = promotion.prd_delivery === 'S' ? "🚚 *Entrega disponível!*" : "🛒 *Retire na loja*";

        // Criação da mensagem personalizada para cada produto em promoção
        mensagem += `**${descricao}**\nPreço Original: R$ ${promotion.prd_preco_venda}\nPreço Promocional: R$ ${promotion.prd_preco_promocao}\n${entrega}${observacao}\n\n`;
    });

    return mensagem;
}

async function RetornarNumeroPedido(phone, port) {
    if (!phone || !port) {
        return 'Indisponível';
    }

    try {
        const response = await axios.get(`http://localhost:${port}/?endpoint=get_id_pedido&telefone=${phone}`);

        if (response.data.success === true) {
            return response.data.id;
        } else {
            return 'Indisponível';
        }
    } catch (error) {
        console.error('Erro na requisição para obter o número do pedido:', error);
        return 'Indisponível'; // Retorna "Indisponível" caso haja algum erro
    }
}

async function RetornarStatusPedido(phone, port) {
    if (!phone || !port) {
        return 'Indisponível';
    }

    try {
        const response = await axios.get(`http://localhost:${port}/?endpoint=get_status_pedido&telefone=${phone}`);
        
        if (response.data.success === true) {
            return response.data.status;
        } else {
            return 'Indisponível';
        }
    } catch (error) {
        console.error('Erro na requisição para obter o status do pedido:', error);
        return 'Indisponível'; // Retorna "Indisponível" caso haja algum erro
    }
}

async function RetornarStatusFidelidade(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_fidelidade_wpp&email=${email}`);
    const results = response.data.data.results;

    if (results && results.length > 0) {
        const loyalt = results[0];
        return loyalt.loja_pontos;
    } else {
        // Retorna um valor padrão caso o array esteja vazio ou não contenha dados esperados
        console.error("Nenhum dado encontrado para fidelidade.");
        return 'N';  // Ou outro valor de sua escolha
    }
}

async function RetornarListaCupons(email) {
    const response = await axios.get(`https://www.aquipede.com.br/api/?endpoint=get_cupons_wpp&email=${email}`);
    const coupons = response.data.data.results;

    if (!coupons || coupons.length === 0) {
        return "Indisponível";
    }

    let mensagem = "🎟️ *Seus cupons disponíveis:* \n\n";

    coupons.forEach((cupom, index) => {
        mensagem += `🛍️ *${capitalizarTexto(cupom.cup_descricao)}*\n`;
        mensagem += `🔖 Código: *${cupom.cup_cupom.toUpperCase()}*\n`;
        mensagem += `💰 Desconto: *${cupom.cup_desconto}%* ${cupom.cup_tipo_desconto === 'P' ? "em compras" : "de desconto fixo"}\n`;
        mensagem += `📅 Válido de *${cupom.cup_data_inicio}* até *${cupom.cup_data_fim}*\n`;
        mensagem += `📌 Pedido mínimo: R$ ${parseFloat(cupom.cup_valor_minimo).toFixed(2)}\n`;

        if (index < coupons.length - 1) {
            mensagem += "\n━━━━━━━━━━━━━━━━━━\n\n";
        }
    });

    return mensagem;
}

export { RetornarTelefone, RetornarListaCupons, RetornarTaxaFixa, RetornaTaxaPorBairro,
         RetornarHorarios, RetornarPromocoes, RetornarTempoEntrega, RetornarTipoDocumento,
         RetornarStatusPedido, RetornarNumeroPedido, RetornarStatusFidelidade, RetornarStatusLoja,
         RetornarTipoEntrega, RetornaModoDelivery }