import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import chatRoutes from './chat/chat.routes.js';
import adminRoutes from './admin/admin.routes.js';
import telegramRoutes from './telegram/telegram.routes.js';
import paymentRoutes from './payment/payment.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/telegram', telegramRoutes);
router.use('/payment', paymentRoutes);

export default router;