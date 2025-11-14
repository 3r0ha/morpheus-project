import express from 'express';
import { callYandexGPT } from './yandexGPT.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'AI Service is running' });
});

// === Валидация входящего запроса (аналог Pydantic) ===
function validateRequest(body) {
  const errors = [];

  if (!body.user_info || typeof body.user_info !== 'object') {
    errors.push({ field: 'user_info', message: 'user_info is required and must be an object' });
  } else {
    if (!body.user_info.name) body.user_info.name = 'Пользователь';
  }

  if (!body.new_message_text || typeof body.new_message_text !== 'string' || body.new_message_text.trim().length === 0) {
    errors.push({ field: 'new_message_text', message: 'new_message_text is required and must be a non-empty string' });
  }

  if (body.history && !Array.isArray(body.history)) {
    errors.push({ field: 'history', message: 'history must be an array' });
  }

  if (body.previous_dreams && !Array.isArray(body.previous_dreams)) {
    errors.push({ field: 'previous_dreams', message: 'previous_dreams must be an array' });
  }

  return { valid: errors.length === 0, errors };
}

// === Формирование промпта для YandexGPT ===
function buildPrompt(request) {
  const { user_info, new_message_text, history = [], previous_dreams = [] } = request;

  let context = '';
  if (previous_dreams.length > 0) {
    context += `У пользователя было ${previous_dreams.length} предыдущих снов. `;
  }
  if (history.length > 0) {
    context += `Это продолжение диалога (${history.length} сообщений). `;
  }

  return `
Ты — психолог и толкователь снов. Пользователь: ${user_info.name || 'Пользователь'}.
${context}

Новый сон/вопрос: "${new_message_text}"

Ответь кратко, мудро, с эмпатией. Используй "ты". Не более 2-3 предложений.
`.trim();
}

// === Основной эндпоинт /interpret ===
app.post('/interpret', async (req, res) => {
  const validation = validateRequest(req.body);
  if (!validation.valid) {
    return res.status(422).json({ detail: validation.errors });
  }

  const prompt = buildPrompt(req.body);

  try {
    const interpretation = await callYandexGPT(prompt);
    res.json({ interpretation: interpretation.trim() });
  } catch (error) {
    console.error('LLM Error:', error.message);
    res.status(500).json({ error: 'Failed to generate interpretation' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Service (Node.js) running on http://localhost:${PORT}`);
});