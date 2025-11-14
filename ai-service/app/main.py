from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .schemas import DreamInterpretationRequest, DreamInterpretationResponse

app = FastAPI(
    title="AI Dream Interpreter Service",
    description="Микросервис для интерпретации снов с помощью LLM",
    version="1.0.0"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Ошибка валидации! Получено тело запроса: {await request.json()}")
    print(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.post("/interpret", response_model=DreamInterpretationResponse)
async def interpret_dream(request: DreamInterpretationRequest):
    print(f"Получен запрос от: {request.user_info.name}")
    print(f"Новое сообщение: \"{request.new_message_text}\"")
    
    
    history_len = len(request.history) if request.history else 0
    prev_dreams_len = len(request.previous_dreams) if request.previous_dreams else 0

    if history_len > 0:
        interpretation_text = (
            f"Это заглушка-ответ на уточняющий вопрос. "
            f"Я помню {history_len} предыдущих сообщений в этом диалоге. "
            f"Твой новый вопрос: \"{request.new_message_text}\"."
        )
    elif prev_dreams_len > 0:
        interpretation_text = (
            f"Это заглушка-ответ на ПЕРВЫЙ сон. "
            f"Я вижу, что у тебя есть {prev_dreams_len} старых снов для контекста. "
            f"Твой новый сон: \"{request.new_message_text}\"."
        )
    else:
        interpretation_text = (
            f"Это заглушка-ответ на ПЕРВЫЙ сон. "
            f"Контекста из старых снов нет. "
            f"Твой новый сон: \"{request.new_message_text}\"."
        )

    return DreamInterpretationResponse(interpretation=interpretation_text)

@app.get("/")
def read_root():
    return {"status": "AI Service is running"}