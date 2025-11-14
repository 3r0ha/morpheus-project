import { prisma } from '../config/prisma.js';
import { SUBSCRIPTION_STATUS, INTERPRETATION_LIMITS } from '../config/constants.js';
import redisClient from '../config/redis.js';

const upgradeToPremium = async (userId) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: SUBSCRIPTION_STATUS.PREMIUM,
      remainingInterpretations: INTERPRETATION_LIMITS.PREMIUM_DAILY_COUNT,
    },
    select: {
        id: true, email: true, name: true, birthDate: true,
        subscriptionStatus: true, remainingInterpretations: true, createdAt: true,
    },
  });
  await redisClient.del(`user:${userId}`);

  return updatedUser;
};

export const paymentService = {
  upgradeToPremium,
};