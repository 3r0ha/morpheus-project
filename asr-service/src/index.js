import express from 'express';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3020;

const fixDuplicateText = (text) => {
    if (typeof text !== 'string' || text.length === 0) {
        return text;
    }
    const trimmedText = text.trim();
    const mid = Math.floor(trimmedText.length / 2);

    if (trimmedText.length % 2 === 0) {
        const firstHalf = trimmedText.substring(0, mid);
        const secondHalf = trimmedText.substring(mid);
        if (firstHalf === secondHalf) {
            console.log(`ОБНАРУЖЕН И ИСПРАВЛЕН ДУБЛИКАТ: "${trimmedText}" -> "${firstHalf}"`);
            return firstHalf;
        }
    }
    
  
    if (trimmedText.length % 2 !== 0) {
        const firstHalf = trimmedText.substring(0, mid);
        const secondHalf = trimmedText.substring(mid + 1);
         if (firstHalf === secondHalf && trimmedText[mid] === ' ') {
            console.log(`ОБНАРУЖЕН И ИСПРАВЛЕН ДУБЛИКАТ (с пробелом): "${trimmedText}" -> "${firstHalf}"`);
            return firstHalf;
        }
    }

    return trimmedText; 
};

app.use(express.raw({ type: 'audio/ogg', limit: '10mb' }));

app.post('/stt', async (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'Тело запроса с аудиоданными пусто.' });
  }

  try {
    const yandexUrl = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=oggopus&sampleRateHertz=48000';
    const headers = {
      'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
      'Content-Type': 'audio/ogg',
    };

    const yandexResponse = await fetch(yandexUrl, {
      method: 'POST',
      headers: headers,
      body: req.body,
    });

    const responseData = await yandexResponse.json();

    if (!yandexResponse.ok) {
        throw new Error(`Yandex API Error (${yandexResponse.status}): ${JSON.stringify(responseData)}`);
    }

    const originalText = responseData.result;
    const fixedText = fixDuplicateText(originalText);
    res.json({ text: fixedText });

  } catch (error) {
    console.error('Ошибка в ASR сервисе при обращении к Yandex:', error.message);
    res.status(502).json({ error: 'Ошибка при обращении к сервису распознавания Yandex.', details: error.message });
  }
});

app.get('/', (req, res) => {
    res.status(200).send('ASR Service is running.');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ASR Service запущен на http://localhost:${port}`);
});