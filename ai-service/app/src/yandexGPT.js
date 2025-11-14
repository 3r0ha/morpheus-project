import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.YANDEX_API_KEY;
const MODEL_URI = process.env.YANDEX_MODEL_URI;

export async function callYandexGPT(prompt) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

  const data = {
    modelUri: MODEL_URI,
    completionOptions: {
      stream: false,
      temperature: 0.7,
      maxTokens: 500
    },
    messages: [
      {
        role: 'user',
        text: prompt
      }
    ]
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.result.alternatives[0].message.text;
  } catch (error) {
    console.error('YandexGPT Error:', error.response?.data || error.message);
    throw new Error('Failed to get response from YandexGPT');
  }
}