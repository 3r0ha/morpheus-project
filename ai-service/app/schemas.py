from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal 
from datetime import date

class UserInfo(BaseModel):
    name: Optional[str] = "Пользователь"
    birthDate: Optional[date] = None

class Message(BaseModel):
    role: Literal['user', 'assistant']
    content: str

class DreamInterpretationRequest(BaseModel):
    user_info: UserInfo
    new_message_text: str = Field(..., min_length=1) 
    
    history: Optional[List[Message]] = [] 
    
    previous_dreams: Optional[List[str]] = []

class DreamInterpretationResponse(BaseModel):
    interpretation: str