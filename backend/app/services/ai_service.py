from groq import Groq
from app.core.config import settings
from app.core.sanitizer import check_prompt_injection
from fastapi import HTTPException

client = Groq(api_key=settings.GROQ_API_KEY)

def get_ai_response(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"GROQ ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

def suggest_reply(ticket_title: str, ticket_description: str, customer_name: str, tone: str = "professional") -> str:
    if check_prompt_injection(ticket_title) or check_prompt_injection(ticket_description):
        raise HTTPException(status_code=400, detail="Invalid input detected")
    prompt = f"""You are a professional customer support agent for AegisAI platform.
Customer: {customer_name}
Ticket: {ticket_title}
Description: {ticket_description}
Tone: {tone}
Write a helpful professional reply. Start directly with the reply."""
    return get_ai_response(prompt)

def summarize_ticket(ticket_title: str, ticket_description: str, comments: list) -> dict:
    prompt = f"""Summarize this support ticket:
Title: {ticket_title}
Description: {ticket_description}
Provide: 1 sentence summary, key issues, recommended action."""
    summary = get_ai_response(prompt)
    return {"summary": summary, "key_points": []}

def analyze_sentiment(ticket_title: str, ticket_description: str) -> dict:
    prompt = f"""Analyze sentiment of this ticket:
Title: {ticket_title}
Description: {ticket_description}
Respond exactly:
SENTIMENT: [positive/neutral/negative]
SCORE: [number -1.0 to 1.0]
EMOTION: [one word]
URGENCY: [low/medium/high/critical]"""
    response = get_ai_response(prompt)
    lines = response.strip().split('\n')
    result = {"sentiment": "neutral", "score": 0.0, "dominant_emotion": "neutral", "urgency": "medium"}
    for line in lines:
        if "SENTIMENT:" in line:
            result["sentiment"] = line.split(":")[1].strip().lower()
        elif "SCORE:" in line:
            try:
                result["score"] = float(line.split(":")[1].strip())
            except:
                pass
        elif "EMOTION:" in line:
            result["dominant_emotion"] = line.split(":")[1].strip().lower()
        elif "URGENCY:" in line:
            result["urgency"] = line.split(":")[1].strip().lower()
    return result
