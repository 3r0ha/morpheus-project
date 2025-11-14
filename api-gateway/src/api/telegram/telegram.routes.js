import { Router } from 'express';
import { 
    findTelegramUserHandler,
    handleInterpretDream,
    handleAuthSuccess,
    getHistoryForTelegram,
    getSessionDetailsForTelegram,
    addMessageToTelegramChat,
    deleteSessionForTelegram,
} from './telegram.controller.js';

const router = Router();

router.get('/user/:telegramId', findTelegramUserHandler);

router.post('/interpret', handleInterpretDream);
router.post('/interpret/:sessionId', addMessageToTelegramChat);

router.post('/auth-success', handleAuthSuccess);

router.get('/history/:telegramId', getHistoryForTelegram);
router.get('/session/:sessionId', getSessionDetailsForTelegram);
router.delete('/session/:sessionId', deleteSessionForTelegram);

export default router;