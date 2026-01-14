from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pin_hash: str
    security_question: Optional[str] = None
    security_answer_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    preferences: dict = Field(default_factory=dict)

class UserCreate(BaseModel):
    pin: str
    security_question: Optional[str] = None
    security_answer: Optional[str] = None

class UserVerify(BaseModel):
    pin: str

class SecurityAnswerVerify(BaseModel):
    answer: str

class PINReset(BaseModel):
    new_pin: str
    security_answer: str

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str
    color: str
    keywords: List[str] = Field(default_factory=list)
    is_default: bool = True

class CategoryCreate(BaseModel):
    name: str
    icon: str
    color: str
    keywords: List[str] = []
