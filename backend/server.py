from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from transformers import pipeline
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global storage for models
models = {}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load models on startup
@app.on_event("startup")
async def load_models():
    try:
        logger.info("Loading Hugging Face models...")
        models["summarizer"] = pipeline("summarization", model="facebook/bart-large-cnn")
        
        # Translation models - English to other languages
        models["translator_en_es"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-es")
        models["translator_en_fr"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-fr")
        models["translator_en_de"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-de")
        models["translator_en_it"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-it")
        models["translator_en_pt"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-pt")
        models["translator_en_nl"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-nl")
        models["translator_en_ru"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-ru")
        models["translator_en_zh"] = pipeline("translation", model="Helsinki-NLP/opus-mt-en-zh")
        
        logger.info("All models loaded successfully")
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")

# Define Models
class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000)
    max_length: Optional[int] = Field(default=150)
    min_length: Optional[int] = Field(default=40)

class SummarizeResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: str = Field(default="en")
    target_lang: str = Field(...)

class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str

class QuizRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000)
    num_questions: Optional[int] = Field(default=5, ge=1, le=10)

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    source_text: str

class SavedContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_type: str  # 'summary', 'translation', 'quiz'
    original_text: str
    result: dict
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "SmartLearn API is running", "status": "active"}

@api_router.post("/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    try:
        if "summarizer" not in models:
            raise HTTPException(status_code=503, detail="Summarizer model not loaded")
        
        # Truncate if too long
        text_to_process = request.text[:1024] if len(request.text) > 1024 else request.text
        
        result = models["summarizer"](
            text_to_process,
            max_length=request.max_length,
            min_length=request.min_length,
            do_sample=False
        )
        
        summary = result[0]["summary_text"]
        
        # Save to database
        doc = {
            "id": str(uuid.uuid4()),
            "content_type": "summary",
            "original_text": request.text,
            "result": {"summary": summary},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.saved_content.insert_one(doc)
        
        return SummarizeResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary)
        )
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@api_router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    try:
        # Map language pairs to models
        model_map = {
            ("en", "es"): "translator_en_es",
            ("en", "fr"): "translator_en_fr",
        }
        
        lang_pair = (request.source_lang.lower(), request.target_lang.lower())
        
        if lang_pair not in model_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language pair. Supported: en->es, en->fr"
            )
        
        model_key = model_map[lang_pair]
        
        if model_key not in models:
            raise HTTPException(status_code=503, detail="Translation model not loaded")
        
        # Truncate if too long
        text_to_process = request.text[:512] if len(request.text) > 512 else request.text
        
        result = models[model_key](text_to_process)
        translated = result[0]["translation_text"]
        
        # Save to database
        doc = {
            "id": str(uuid.uuid4()),
            "content_type": "translation",
            "original_text": request.text,
            "result": {
                "translated_text": translated,
                "source_lang": request.source_lang,
                "target_lang": request.target_lang
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.saved_content.insert_one(doc)
        
        return TranslateResponse(
            original_text=request.text,
            translated_text=translated,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@api_router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    try:
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=503, detail="API key not configured")
        
        # Initialize Gemini chat
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"quiz_{uuid.uuid4()}",
            system_message="You are an expert quiz generator for educational content. Generate multiple-choice questions with clear explanations."
        ).with_model("gemini", "gemini-2.0-flash")
        
        prompt = f"""
Based on the following text, generate {request.num_questions} multiple-choice questions.

Text: {request.text}

For each question, provide:
1. The question
2. Four answer options (A, B, C, D)
3. The correct answer (letter only)
4. A brief explanation

Format your response as JSON with this structure:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correct_answer": "A",
      "explanation": "Explanation here"
    }}
  ]
}}

Provide ONLY the JSON, no additional text.
"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        quiz_data = json.loads(response_text)
        questions = [QuizQuestion(**q) for q in quiz_data["questions"]]
        
        # Save to database
        doc = {
            "id": str(uuid.uuid4()),
            "content_type": "quiz",
            "original_text": request.text,
            "result": {"questions": [q.dict() for q in questions]},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.saved_content.insert_one(doc)
        
        return QuizResponse(
            questions=questions,
            source_text=request.text
        )
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse quiz response")
    except Exception as e:
        logger.error(f"Quiz generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@api_router.get("/history", response_model=List[dict])
async def get_history():
    try:
        history = await db.saved_content.find({}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
        return history
    except Exception as e:
        logger.error(f"History fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
