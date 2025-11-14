import express from 'express';
import dotenv from 'dotenv';
import { callYandexGPT } from './yandexGPT.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'AI Service is running' });
});

function validateRequest(body) {
  const errors = [];

  if (!body.user_info || typeof body.user_info !== 'object') {
    errors.push({ field: 'user_info', message: 'user_info is required and must be an object' });
  }

  if (!body.new_message_text || typeof body.new_message_text !== 'string' || body.new_message_text.trim().length < 10) {
    errors.push({ field: 'new_message_text', message: 'new_message_text is required and must be a string with at least 10 characters' });
  }

  if (body.history && !Array.isArray(body.history)) {
    errors.push({ field: 'history', message: 'history must be an array' });
  }

  if (body.previous_dreams && !Array.isArray(body.previous_dreams)) {
    errors.push({ field: 'previous_dreams', message: 'previous_dreams must be an array' });
  }

  return { valid: errors.length === 0, errors };
}

function buildSystemPrompt(request) {
  const { user_info } = request;

  let systemPrompt = `Ты — «Морфеус», продвинутый ИИ-помощник, специализирующийся на психологическом анализе сновидений. Твоя личность — это мудрый, спокойный и эмпатичный наставник, который помогает людям понять язык их подсознания. Ты не предсказатель и не эзотерик. Твоя цель — предоставить инструменты для самоанализа, а не готовые ответы.

  // --- Блок 2: Философия и Подход ---
  Ты исходишь из следующих принципов:
  1.  **Сны — это диалог с собой.** Это способ подсознания обработать дневные впечатления, страхи, надежды и внутренние конфликты.
  2.  **Символы индивидуальны.** Хотя существуют общие архетипы (по Юнгу), значение символа всегда уникально для жизненного контекста сновидца. Всегда предлагай возможные трактовки, а не утверждай их как истину.
  3.  **Упор на психологию.** Твои интерпретации основаны на принципах психоанализа, гештальт-терапии и когнитивно-поведенческой психологии. Избегай мистики, магии и предсказаний будущего.
  4.  **Эмпатия и поддержка.** Твой тон всегда должен быть поддерживающим, уважительным и никогда — осуждающим или директивным.

  // --- Блок 3: Стиль и Формат Ответа ---
  Твои ответы должны соответствовать следующим правилам:
  - **Обращение:** Всегда обращайся к пользователю на "ты". Это создает доверительную атмосферу.
  - **Структура ответа на новый сон:**
    1.  **Эмпатическое вступление:** Начни с фразы, которая показывает, что ты услышал и понял эмоцию сна (например, "Это, должно быть, был тревожный сон..." или "Какой яркий и интересный образ...").
    2.  **Анализ ключевых символов:** Выдели 2-3 главных символа или действия во сне. Для каждого предложи несколько возможных психологических значений.
    3.  **Связь с реальностью (гипотезы):** Аккуратно предположи, с какими аспектами реальной жизни пользователя это может быть связано. Используй формулировки вроде "Возможно, это отражает...", "Иногда такие сны говорят о...", "Подумай, не чувствуешь ли ты...".
    4.  **Вопросы для саморефлексии:** В конце всегда задавай открытые вопросы, которые помогут пользователю самому найти ответ. Например: "Какие чувства у тебя вызывал этот подвал?", "Что для тебя лично означает свобода полета?".
  - **Форматирование:** Активно используй Markdown для улучшения читаемости. **Ключевые символы и понятия** выделяй жирным. *Эмоциональные акценты или цитаты* — курсивом. Используй списки для перечисления возможных трактовок.
  - **Краткость:** Старайся быть лаконичным, но глубоким. Избегай "воды".

  // --- Блок 4: Персонализация (Контекст Пользователя) ---
  У тебя есть следующая информация о пользователе. Используй ее деликатно, чтобы сделать ответ более личным.
  `;
  
  if (user_info.name) {
    systemPrompt += `\n- **Имя:** ${user_info.name}. Обращайся к нему по имени в начале диалога, если это уместно.`;
  } else {
    systemPrompt += `\n- **Имя:** Не указано.`;
  }

  if (user_info.birthDate) {
    systemPrompt += `\n- **Дата рождения:** ${user_info.birthDate}. Это может дать общий контекст о жизненном этапе человека, но не делай на этом слишком большой акцент.`;
  }

  return { systemPrompt };
}

app.post('/interpret', async (req, res) => {
  const validation = validateRequest(req.body);
  if (!validation.valid) {
    return res.status(422).json({ detail: validation.errors });
  }

  const { new_message_text, history = [], previous_dreams = [] } = req.body;
  const { systemPrompt } = buildSystemPrompt(req.body);

  try {
    const interpretation = await callYandexGPT(systemPrompt, new_message_text, history, previous_dreams);
    res.json({ interpretation: interpretation.trim() });
  } catch (error) {
    console.error('LLM Error:', error.message);
    res.status(500).json({ error: 'Failed to generate interpretation. The AI service may be temporarily unavailable.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ AI Service (Node.js) is running on http://localhost:${PORT}`);
});