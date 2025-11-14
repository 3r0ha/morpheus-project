FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --only=production

# Копируем код приложения
COPY server.js ./

# Порт
EXPOSE 3010

# Запуск
CMD ["node", "server.js"]