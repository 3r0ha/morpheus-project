# Базовый образ
FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование исходного кода
COPY . .

# Экспонируем порт
EXPOSE 3020

# Команда для запуска
CMD ["npm", "start"]