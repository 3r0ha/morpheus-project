import Fastify from 'fastify';
import axios from 'axios';
import dotenv from 'dotenv';
import qs from 'querystring';       // ← это главное
dotenv.config();

const PORT = Number(process.env.PORT) || 3010;
const KEY = process.env.YANDEX_API_KEY?.trim();
const FOLDER = process.env.YANDEX_FOLDER_ID?.trim();

if (!KEY || !FOLDER) {
  console.error('ОШИБКА: YANDEX_API_KEY и YANDEX_FOLDER_ID обязательны');
  process.exit(1);
}

const app = Fastify({ logger: true });

app.post('/synthesize', async (req, reply) => {
  const {
    text = 'привет',
    voice = 'marina',
    emotion = 'good',
    speed = 1.0,
    format = 'mp3'
  } = req.body || {};

  if (!text || text.length > 249) {
    return reply.code(400).send({ error: 'text обязателен и ≤249 символов' });
  }

  const formData = qs.stringify({
    text,
    lang: 'ru-RU',
    voice,
    emotion,
    speed: Number(speed),
    format,
    sampleRateHertz: 48000
  });

  try {
    const res = await axios.post(
      'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
      formData,
      {
        headers: {
          'Authorization': `Api-Key ${KEY}`,
          'x-folder-id': FOLDER,
          'Content-Type': 'application/x-www-form-urlencoded'   // ← ЭТО КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
        },
        responseType: 'arraybuffer',
        timeout: 20000
      }
    );

    reply.header('Content-Type', format === 'ogg_opus' ? 'audio/ogg' : 'audio/mpeg');
    return reply.send(Buffer.from(res.data));

  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data ? Buffer.from(err.response.data).toString('utf-8') : err.message;
    app.log.error(`Yandex TTS error ${status}: ${body}`);
    return reply.code(500).send({ error: 'TTS временно недоступен', status, details: body });
  }
});

app.get('/', () => ({ status: 'ok', port: PORT, service: 'Yandex TTS REST v1' }));

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`TTS-сервис запущен → http://localhost:${PORT}`);
});