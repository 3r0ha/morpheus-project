import asyncio
import logging
import sys
import os
from dotenv import load_dotenv
import socketio

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from app.handlers import user_handlers
from app.keyboards.reply_keyboards import get_main_menu

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = "http://api-gateway:3001/"
INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET")

if not all([BOT_TOKEN, API_URL, INTERNAL_SECRET]):
    raise ValueError("Одна или несколько переменных окружения не заданы (BOT_TOKEN, API_BASE_URL, INTERNAL_SERVICE_SECRET)")

sio = socketio.AsyncClient(logger=False, engineio_logger=False)
bot_instance = Bot(token=BOT_TOKEN)

@sio.event
async def connect():
    print('WebSocket: Успешно подключен к api-gateway')
    await sio.emit("bot_status", {"status": "UP", "message": "Bot is connected"})
    asyncio.create_task(send_heartbeat())

@sio.event
async def disconnect():
    print('WebSocket: Отключен от api-gateway')

@sio.event
async def connect_error(data):
    print(f"WebSocket: Ошибка подключения {data}")

@sio.event
async def telegram_response(data):
    try:
        telegram_id = int(data['telegramId'])
        content = data['content']
        print(f"WebSocket: Получен ответ для telegram_id {telegram_id}")
        await bot_instance.send_message(chat_id=telegram_id, text=content)
    except Exception as e:
        print(f"Ошибка при отправке сообщения в Telegram: {e}")

@sio.event
async def user_authed(data):
    try:
        telegram_id = int(data['telegramId'])
        name = data.get('name', 'пользователь')
        print(f"WebSocket: Получено уведомление об успешной авторизации для {telegram_id}")

        await bot_instance.send_message(
            chat_id=telegram_id, 
            text=f"Отлично, {name}! Твой аккаунт успешно связан. Теперь я готов слушать твои сны.",
            reply_markup=get_main_menu()
        )
    except Exception as e:
        print(f"Ошибка в user_authed: {e}")

async def run_socketio():
    while True:
        try:
            print(f"WebSocket: Попытка подключения к {API_URL}...")
            await sio.connect(API_URL, auth={'token': INTERNAL_SECRET}, transports=['websocket'])
            await sio.wait()
        except socketio.exceptions.ConnectionError as e:
            print(f"WebSocket: Ошибка соединения: {e}. Повторная попытка через 5 секунд...")
            await asyncio.sleep(5)

async def send_heartbeat():
    while sio.connected:
        try:
            print("WebSocket: Отправка heartbeat...")
            await sio.emit("bot_heartbeat", {"status": "UP"})
        except Exception as e:
            print(f"WebSocket: Ошибка при отправке heartbeat: {e}")
        await asyncio.sleep(30)

async def main() -> None:
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)
    dp.include_router(user_handlers.router)

    socket_task = asyncio.create_task(run_socketio())
    polling_task = asyncio.create_task(dp.start_polling(bot_instance))
    
    print("Бот и WebSocket-клиент запущены")
    await asyncio.gather(socket_task, polling_task)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nБот и клиент остановлены")