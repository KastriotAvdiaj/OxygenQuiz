from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import ollama
import logging
from typing import Optional
import os
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LLM Chat API", version="1.0.0")

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="Chat prompt")

class ChatResponse(BaseModel):
    response: str
    status: str = "success"

class ErrorResponse(BaseModel):
    error: str
    status: str = "error"



origins = [
    "http://localhost",
    "https://localhost:5173", # Your React App
    "http://localhost:3001", # Another potential port for a dev server
    # Add your production frontend URL here when you deploy
    # "https://your-frontend-app.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# Configuration
MODEL_NAME = os.getenv("LLM_MODEL", "gemma3:12b")
MAX_RETRIES = 3

@app.get("/")
async def root():
    return {"message": "LLM Chat API is running", "model": MODEL_NAME}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Simple test to see if Ollama is responsive
        ollama.list()
        return {"status": "healthy", "model": MODEL_NAME}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint with error handling and logging"""
    
    logger.info(f"Chat request received - prompt length: {len(request.prompt)}")
    
    for attempt in range(MAX_RETRIES):
        try:
            response = ollama.chat(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": request.prompt}]
            )
            
            content = response["message"]["content"]
            logger.info(f"Chat response generated successfully - response length: {len(content)}")
            
            return ChatResponse(response=content)
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            
            if attempt == MAX_RETRIES - 1:
                # Last attempt failed
                logger.error(f"All {MAX_RETRIES} attempts failed for chat request")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate response after {MAX_RETRIES} attempts"
                )
            
            # Wait a bit before retrying (simple backoff)
            import asyncio
            await asyncio.sleep(1)

@app.post("/generate")
async def generate_content(request: ChatRequest):
    """Generic content generation endpoint - handles any type of generation task"""
    
    logger.info(f"Content generation request - prompt length: {len(request.prompt)}")
    
    for attempt in range(MAX_RETRIES):
        try:
            response = ollama.chat(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": request.prompt}]
            )
            
            content = response["message"]["content"]
            logger.info(f"Content generated successfully - response length: {len(content)}")
            
            return {"content": content, "status": "success"}
            
        except Exception as e:
            logger.error(f"Content generation attempt {attempt + 1} failed: {str(e)}")
            
            if attempt == MAX_RETRIES - 1:
                logger.error(f"All {MAX_RETRIES} attempts failed for content generation")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate content after {MAX_RETRIES} attempts"
                )
            
            import asyncio
            await asyncio.sleep(1)

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", 8000))
    
    logger.info(f"Starting server on port {port} with model {MODEL_NAME}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )