import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

export const getInterpretation = async (user, new_message_text, history = [], previousDreams = []) => {
  try {
    const userInfoPayload = {
      name: user.name || 'Пользователь',
    };
    if (user.birthDate) {
      userInfoPayload.birthDate = user.birthDate.toISOString().split('T')[0];
    }
    
    const sanitizedHistory = history.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const requestBody = {
      user_info: userInfoPayload,
      new_message_text: new_message_text,
      history: sanitizedHistory,
      previous_dreams: previousDreams,
    };

    const response = await axios.post(`${AI_SERVICE_URL}/interpret`, requestBody);
    return { success: true, data: response.data.interpretation };

  } catch (error) {
    console.error('Ошибка при обращении к AI-сервису:', error.message);

    if (error.response && error.response.status === 422) {
      const validationErrors = error.response.data.detail;
      if (validationErrors && validationErrors.length > 0) {
        const firstError = validationErrors[0];
        
        if (firstError.type === 'string_too_short' || firstError.type === 'string_too_long') {
          return { success: false, message: 'Текст сна должен быть подходящей длины.' };
        }
        return { success: false, message: `Ошибка в данных: ${firstError.msg}` };
      }
    }
    return { success: false, message: 'К сожалению, сервис интерпретации снов временно недоступен. Попробуйте позже.' };
  }
};