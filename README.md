# Morpheus Project

ИИ-толкователь снов. Микросервисная архитектура с веб-интерфейсом и Telegram-ботом.

## Стек

| Компонент | Технологии |
|-----------|------------|
| API Gateway | Express.js 5, Socket.IO 4, Prisma ORM, JWT |
| AI Service | Node.js, YandexGPT API |
| TTS/ASR | Fastify, Yandex SpeechKit, FFmpeg |
| Telegram Bot | Python 3.11, aiogram 3.x, python-socketio |
| Frontend | React 18, Vite, TailwindCSS, React Query |
| DB | PostgreSQL 15, Redis 7 |

## Архитектура

```
Frontend (:80) ─────┐                    ┌───── Telegram Bot
     │              │    WebSocket       │           │
     │              ▼                    ▼           │
     │         ┌─────────────────────────────┐      │
     └────────►│      API Gateway (:3001)    │◄─────┘
               │  Socket.IO + REST API       │
               └──────┬──────┬──────┬───────┘
                      │      │      │
          ┌───────────┘      │      └───────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │ AI Service  │   │ TTS Service │   │ ASR Service │
   │   (:3002)   │   │   (:3010)   │   │   (:3020)   │
   │ YandexGPT   │   │ Yandex TTS  │   │ SpeechKit   │
   └─────────────┘   └─────────────┘   └─────────────┘
          │
          ▼
   ┌─────────────────────────────────┐
   │  PostgreSQL (:5433) + Redis     │
   └─────────────────────────────────┘
```

## База данных (Prisma)

```prisma
model User {
  id                       String             @id @default(uuid())
  email                    String?            @unique
  phone                    String?            @unique
  passwordHash             String?
  telegramId               BigInt?            @unique
  subscriptionStatus       SubscriptionStatus @default(FREE)
  remainingInterpretations Int                @default(3)
  lastFreeInterpretationAt DateTime?
  role                     UserRole           @default(USER)
  status                   UserStatus         @default(ACTIVE)
  chatSessions             ChatSession[]
  payments                 Payment[]
}

model ChatSession {
  id        String    @id @default(uuid())
  userId    String
  title     String
  messages  Message[]
  @@index([userId])
}

model Message {
  id        String      @id @default(uuid())
  sessionId String
  role      MessageRole // user | assistant
  content   String      @db.Text
  audioUrls String[]    @default([])
  @@index([sessionId])
}

model Payment {
  id                String        @id @default(uuid())
  userId            String
  amount            Decimal       @db.Decimal(10, 2)
  status            PaymentStatus @default(PENDING)
  provider          String        @default("robokassa")
  providerPaymentId String?       @unique
}
```

## Ключевые реализации

### 1. WebSocket авторизация (socket.js)

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  // Внутренний сервис (бот)
  if (token === process.env.INTERNAL_SERVICE_SECRET) {
    socket.isBot = true;
    socket.isAuthed = true;
    return next();
  }

  // JWT для пользователей
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        socket.isAuthed = false;
        return next();
      }
      socket.userId = decoded.userId;
      socket.isAuthed = true;
      next();
    });
  }
});

// Маппинг userId -> socketId для адресной доставки
userSocketMap[socket.userId] = socket.id;
userSocketMap['bot'] = socket.id; // для бота
```

### 2. Классификация намерений (ai.service.js)

Перед толкованием проверяется, относится ли текст к сну:

```javascript
const classificationResponse = await axios.post(`${AI_SERVICE_URL}/classify-intent`, {
  text: new_message_text
});

if (!classificationResponse.data.is_dream_related) {
  return { success: true, data: "Я — Морфеус, толкователь снов..." };
}
```

Промпт классификатора:
```
Ты — точный классификатор. Определи, описывает ли пользователь сон.
Ответ: "true" если о сне, "false" если нет.
```

### 3. Контекстный анализ снов (yandexGPT.js)

Передача предыдущих снов для анализа динамики:

```javascript
if (previousDreams.length > 0) {
  finalUserMessage += `Проанализируй мой новый сон, учитывая предыдущие:\n`;
  previousDreams.forEach((dream) => {
    finalUserMessage += `- "${dream.substring(0, 100)}..."\n`;
  });
  finalUserMessage += `\nМой новый сон: "${newMessageText}"`;
}

const data = {
  modelUri: MODEL_URI,
  completionOptions: {
    temperature: 0.6,
    maxTokens: 1500
  },
  messages
};
```

### 4. Система лимитов (chat.service.js)

```javascript
async _checkAndDecrementInterpretations(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let hasAccess = false;

  if (user.subscriptionStatus === 'PREMIUM') {
    hasAccess = user.remainingInterpretations > 0;
  } else {
    // FREE: 3 начальных + 1 раз в 3 дня
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - 3);

    hasAccess = user.remainingInterpretations > 0 ||
                !user.lastFreeInterpretationAt ||
                user.lastFreeInterpretationAt < cooldownDate;
  }

  if (!hasAccess) {
    sendMessageToUser(io, userSocketMap, userId, 'error_message', {
      type: 'no_interpretations',
      content: 'Лимит исчерпан'
    });
    throw error;
  }

  // Декремент
  await prisma.user.update({
    where: { id: user.id },
    data: {
      remainingInterpretations: { decrement: 1 },
      lastFreeInterpretationAt: new Date()
    }
  });
}
```

Константы:
```javascript
INTERPRETATION_LIMITS = {
  FREE_INITIAL_COUNT: 3,
  PREMIUM_DAILY_COUNT: 20,
  FREE_COOLDOWN_DAYS: 3,
};
```

### 5. Telegram WebApp авторизация (auth.service.js)

Валидация initData от Telegram:

```javascript
const linkTelegramAccount = async (userId, telegramInitData) => {
  const params = new URLSearchParams(telegramInitData);
  const hash = params.get('hash');
  const userPayload = JSON.parse(params.get('user'));
  const authDate = params.get('auth_date');

  // Проверка подписи
  const dataToCheck = [];
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') dataToCheck.push(`${key}=${value}`);
  }
  dataToCheck.sort();

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataToCheck.join('\n'))
    .digest('hex');

  if (calculatedHash !== hash) {
    throw new Error('Верификация Telegram не пройдена');
  }

  // Проверка времени (1 час)
  if (Date.now() / 1000 - parseInt(authDate) > 3600) {
    throw new Error('Данные устарели');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramId: BigInt(telegramId) }
  });
};
```

### 6. Кэширование в Redis

```javascript
// Кэш сессий пользователя
const cacheKey = `sessions:user-${userId}:page-${page}:limit-${limit}`;
const cachedData = await redisClient.get(cacheKey);
if (cachedData) return JSON.parse(cachedData);

// Сохранение с TTL
await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

// Инвалидация при изменении
await redisClient.del(`session:${sessionId}`);
const keys = await redisClient.keys(`sessions:user-${userId}:*`);
if (keys.length > 0) await redisClient.del(keys);

// JWT blocklist для logout
await redisClient.setEx(`blocklist:${token}`, remainingSeconds, 'true');
```

### 7. Telegram FSM (user_handlers.py)

```python
from aiogram.fsm.context import FSMContext
from app.states import ChatStates

@router.message(F.text == "▶️ Начать диалог", StateFilter(None))
async def start_dialog_handler(message: Message, state: FSMContext):
    await state.set_state(ChatStates.in_dialogue)

@router.message(StateFilter(ChatStates.in_dialogue))
async def dialogue_message_handler(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    session_id = data.get("session_id")

    if not session_id:
        # Новый сон
        response = await api_client.send_dream(telegram_id, message.text)
        await state.update_data(session_id=response["sessionId"])
    else:
        # Продолжение диалога
        response = await api_client.send_follow_up(session_id, telegram_id, message.text)

@router.message(F.voice, StateFilter(ChatStates.in_dialogue))
async def voice_message_handler(message: Message, state: FSMContext, bot: Bot):
    # Premium-only ASR
    if user_data.get("subscriptionStatus") != "PREMIUM":
        return await message.answer("🎙️ Распознавание речи доступно только в Premium")

    # Скачивание и распознавание
    file_info = await bot.get_file(message.voice.file_id)
    await bot.download_file(file_info.file_path, destination=file_path)
    response = await api_client.recognize_voice(telegram_id, file_path)
```

### 8. TTS Service (server.js)

```javascript
const synthesizeSchema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', maxLength: 249 },
      voice: { type: 'string', default: 'ermil' },
      emotion: { type: 'string', default: 'neutral' },
      speed: { type: 'number', default: 1.0 },
      format: { type: 'string', enum: ['mp3', 'ogg_opus'] },
    },
  },
};

app.post('/synthesize', { schema: synthesizeSchema }, async (req, reply) => {
  const params = new URLSearchParams({
    text,
    lang: 'ru-RU',
    voice,
    emotion,
    speed,
    format,
    sampleRateHertz: 48000,
  });

  const res = await yandexApiClient.post('', params.toString());
  reply.header('Content-Type', 'audio/mpeg');
  return reply.send(res.data);
});
```

### 9. WebSocket события (bot.py)

```python
sio = socketio.AsyncClient()

@sio.event
async def telegram_response(data):
    telegram_id = int(data['telegramId'])
    content = format_for_telegram(data['content'])
    await bot_instance.send_message(chat_id=telegram_id, text=content)

@sio.event
async def user_upgraded_to_premium(data):
    telegram_id = int(data['telegramId'])
    await bot_instance.send_message(
        chat_id=telegram_id,
        text="🎉 Твой статус обновлен до Premium!"
    )

await sio.connect(API_URL, auth={'token': INTERNAL_SECRET}, transports=['websocket'])
```

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/auth/register` | Регистрация (email/phone + password) |
| POST | `/api/auth/login` | Авторизация, возврат JWT |
| POST | `/api/auth/link-telegram` | Привязка Telegram через initData |
| GET | `/api/auth/me` | Профиль текущего пользователя |
| POST | `/api/chat/new` | Создание толкования (source: web/telegram) |
| POST | `/api/chat/:sessionId/message` | Продолжение диалога |
| GET | `/api/chat/sessions` | Список сессий (пагинация) |
| GET | `/api/chat/sessions/:id` | Детали сессии с сообщениями |
| DELETE | `/api/chat/sessions/:id` | Удаление сессии |
| POST | `/api/tts/synthesize` | Синтез речи (proxy к TTS service) |
| POST | `/api/asr/recognize` | Распознавание речи (multipart/form-data) |
| POST | `/api/payment/upgrade` | Апгрейд до Premium |

## Запуск

```bash
# Клонирование
git clone https://github.com/3r0ha/morpheus-project.git
cd morpheus-project

# Конфигурация
cp api-gateway/.env.example api-gateway/.env
cp ai-service/app/.env.example ai-service/app/.env
cp tts-service/.env.example tts-service/.env
cp telegram-bot/.env.example telegram-bot/.env

# Запуск
docker-compose up -d

# Миграции БД
docker exec morpheus_api_gateway npx prisma migrate deploy

# Логи
docker-compose logs -f api-gateway
```

## Переменные окружения

**api-gateway/.env:**
```
DATABASE_URL=postgresql://user:pass@postgres-db:5432/sonnik_db
REDIS_URL=redis://redis-cache:6379
JWT_SECRET=<secret>
AI_SERVICE_URL=http://ai-service:3002
TTS_SERVICE_URL=http://tts-service:3010
ASR_SERVICE_URL=http://asr-service:3020
TELEGRAM_BOT_TOKEN=<token>
INTERNAL_SERVICE_SECRET=<internal-secret>
```

**ai-service/app/.env:**
```
YANDEX_API_KEY=<key>
YANDEX_MODEL_URI=gpt://folder-id/yandexgpt-lite
```

**tts-service/.env:**
```
YANDEX_API_KEY=<key>
YANDEX_FOLDER_ID=<folder-id>
```

**telegram-bot/.env:**
```
BOT_TOKEN=<token>
INTERNAL_SERVICE_SECRET=<internal-secret>
REDIS_HOST=redis-cache
```

## Структура

```
├── api-gateway/
│   ├── src/
│   │   ├── api/           # REST endpoints (auth, chat, tts, asr, payment, telegram, admin)
│   │   ├── config/        # redis.js, socket.js, prisma.js, constants.js
│   │   ├── services/      # ai.service.js, auth.service.js, chat.service.js, payment.service.js
│   │   ├── middlewares/   # auth.middleware.js, error.middleware.js, sanitization.middleware.js
│   │   └── cron/          # scheduler.js (сброс лимитов Premium)
│   └── prisma/schema.prisma
│
├── ai-service/app/
│   ├── index.js           # /interpret, /classify-intent
│   └── yandexGPT.js       # Yandex Cloud LLM API
│
├── tts-service/
│   └── server.js          # Fastify + Yandex TTS
│
├── asr-service/src/
│   └── index.js           # Yandex SpeechKit + FFmpeg
│
├── telegram-bot/
│   ├── bot.py             # Main + Socket.IO client
│   └── app/
│       ├── handlers/user_handlers.py  # FSM, команды, callbacks
│       ├── keyboards/     # inline_keyboards.py, reply_keyboards.py
│       ├── services/      # api_client.py, redis_client.py
│       └── states/chat_states.py
│
├── frontend/src/
│   ├── components/        # React компоненты
│   ├── pages/             # Страницы
│   ├── services/          # API client
│   └── context/           # Auth context
│
└── docker-compose.yml
```
