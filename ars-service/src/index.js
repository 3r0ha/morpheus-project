const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3020;

const upload = multer({ dest: 'uploads/' });

app.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioPath = req.file.path;
    const audioData = fs.readFileSync(audioPath);

    const yandexUrl = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=oggopus&sampleRateHertz=44100';
    const headers = {
      Authorization: `Api-Key ${process.env.YANDEX_API_KEY}`,
      'Content-Type': 'audio/ogg',
    };

    const response = await axios.post(yandexUrl, audioData, { headers });

    fs.unlinkSync(audioPath);

    res.json({ text: response.data.result });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to process audio', details: error.message });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`ARS Service running on http://localhost:${port}`);
});