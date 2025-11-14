import os
from dotenv import load_dotenv
import aiohttp
import asyncio

load_dotenv()

class APIClient:
    def __init__(self):
        self.base_url = os.getenv("API_BASE_URL")
        if not self.base_url:
            raise ValueError("API_BASE_URL не определен в .env файле")

    async def _request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.request(method, url, timeout=15, **kwargs) as response:
                    if method.upper() == "DELETE" and response.status == 204:
                        return response.status

                    if response.status == 404:
                        return None
                    
                    response.raise_for_status() 
                    
                    return await response.json()
            except aiohttp.ClientResponseError as e:
                print(f"Ошибка API (статус {e.status}): {e.message} для URL {url}")
                try:
                    error_data = await e.json() 
                    print(f"Тело ошибки: {error_data}")
                    return error_data
                except Exception:
                    return {"error": f"Ошибка API: статус {e.status}"}
            except asyncio.TimeoutError:
                print(f"Таймаут запроса к URL: {url}")
                return {"error": "Сервер не отвечает. Попробуйте позже."}
            except Exception as e:
                print(f"Произошла непредвиденная ошибка при запросе к API: {e}")
                return {"error": "Произошла внутренняя ошибка."}

    async def find_user_by_telegram_id(self, telegram_id: int):
        path = f"/telegram/user/{telegram_id}"
        return await self._request("GET", path)
    
    async def send_dream(self, telegram_id: int, text: str):
        path = "/telegram/interpret"
        payload = {"telegramId": telegram_id, "text": text}
        return await self._request("POST", path, json=payload)
    
    async def send_follow_up(self, session_id: str, telegram_id: int, text: str):
        path = f"/telegram/interpret/{session_id}"
        payload = {"telegramId": telegram_id, "text": text}
        return await self._request("POST", path, json=payload)

    async def get_history(self, telegram_id: int, page: int = 1):
        path = f"/telegram/history/{telegram_id}?page={page}&limit=5"
        return await self._request("GET", path)

    async def get_session_details(self, session_id: str):
        path = f"/telegram/session/{session_id}"
        return await self._request("GET", path)
    
    async def delete_session(self, session_id: str, telegram_id: int):
        path = f"/telegram/session/{session_id}"
        payload = {"telegramId": telegram_id}
        return await self._request("DELETE", path, json=payload)

api_client = APIClient()