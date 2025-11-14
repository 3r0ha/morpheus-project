import asyncHandler from 'express-async-handler';
import { prisma } from '../../config/prisma.js';
import { telegramService } from '../../services/telegram.service.js';
import { chatService } from '../../services/chat.service.js';
import { sendMessageToUser } from '../../config/socketHelpers.js';
import redisClient from '../../config/redis.js';

export const handleAuthSuccess = asyncHandler(async (req, res) => {
    const { telegramInitData } = req.body;
    const io = req.io;
    const userSocketMap = req.userSocketMap; 
    
    const params = new URLSearchParams(telegramInitData);
    const userPayload = JSON.parse(params.get('user'));
    const telegramId = userPayload?.id;

    if (!telegramId) {
        return res.status(400).json({ error: 'Некорректные данные Telegram' });
    }

    const user = await telegramService.findUserByTelegramId(telegramId);

    const finalName = user && user.name 
        ? user.name 
        : (userPayload.first_name || userPayload.username || 'пользователь');

    sendMessageToUser(io, userSocketMap, 'bot', 'user_authed', { 
        telegramId: telegramId.toString(),
        name: finalName, 
    });
    
    res.status(200).json({ message: 'Уведомление отправлено' });
});

export const findTelegramUserHandler = asyncHandler(async (req, res) => {
    const { telegramId } = req.params;
    const user = await telegramService.findUserByTelegramId(telegramId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    const { passwordHash, ...safeUser } = user;
    res.status(200).json(safeUser);
});

export const handleInterpretDream = asyncHandler(async (req, res) => {
    const { telegramId, text } = req.body;
    if (!telegramId || !text) {
        return res.status(400).json({ error: 'telegramId and text are required' });
    }
    const user = await telegramService.findUserByTelegramId(telegramId);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден. Пожалуйста, выполните /start и свяжите аккаунт.' });
    }
    
    const result = await chatService.createNewChat(user.id, text, 'telegram');
    res.status(201).json(result);
});

export const addMessageToTelegramChat = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { telegramId, text } = req.body;

    if (!telegramId || !text) {
        return res.status(400).json({ error: 'telegramId and text are required' });
    }

    const user = await telegramService.findUserByTelegramId(telegramId);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    const result = await chatService.addMessageToChat(sessionId, user.id, text, 'telegram');
    res.status(200).json(result);
});

export const getHistoryForTelegram = asyncHandler(async (req, res) => {
    const { telegramId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; 
    
    const user = await telegramService.findUserByTelegramId(telegramId);
    if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const result = await chatService.getSessionsByUser(user.id, page, limit);
    res.status(200).json(result);
});


export const getSessionDetailsForTelegram = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    
    if (!session) {
        return res.status(404).json({ message: 'Сессия не найдена' });
    }
    
    res.status(200).json(session);
});

export const deleteSessionForTelegram = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { telegramId } = req.body;

    if (!telegramId) {
        return res.status(400).json({ error: 'telegramId is required' });
    }

    const user = await telegramService.findUserByTelegramId(telegramId);
    if (!user) {
        res.status(403);
        throw new Error('Доступ запрещен.');
    }

    const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { userId: true }, 
    });

    if (!session) {
        return res.status(404).json({ message: 'Сессия не найдена' });
    }

    if (session.userId !== user.id) {
        res.status(403);
        throw new Error('Доступ запрещен.');
    }

    await prisma.chatSession.delete({ where: { id: sessionId } });

    const userSessionsPage1CacheKey = `sessions:user-${user.id}:page-1:limit-15`;
    const sessionDetailsCacheKey = `session:${sessionId}`;
    await redisClient.del([userSessionsPage1CacheKey, sessionDetailsCacheKey]);

    res.status(204).send();
});