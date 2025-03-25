import { verifyIntentStatus, getIntentMessage } from '../../../../src/whatsapp/api/utils/utils.js';
import { formatMessage } from '../../../../src/whatsapp/api/services/messageFormatter.js';

async function processIntent(intentType, storeObj, name, phone) {
    if (await verifyIntentStatus(intentType, storeObj)) { // Se retornar true
        let message = await getIntentMessage(intentType, storeObj);
        let formatedMessage = await formatMessage(message, storeObj, name, phone);
        
        return formatedMessage;
    } else {
        return '';
    }
}

export { processIntent }
