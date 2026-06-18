import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ticket import Ticket
import pickle
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
PRIORITY_MAP = {"low": 0, "medium": 1, "high": 2, "critical": 3}
CATEGORY_MAP = {"billing": 0, "technical": 1, "account": 2, "feature": 3, "other": 4}

def get_historical_resolution_data(db: Session) -> pd.DataFrame:
    tickets = db.query(Ticket).filter(
        Ticket.status == "resolved",
        Ticket.resolved_at.isnot(None)
    ).all()

    rows = []
    for t in tickets:
        if not t.created_at or not t.resolved_at:
            continue
        resolution_hours = (t.resolved_at - t.created_at).total_seconds() / 3600
        rows.append({
            "priority_score": PRIORITY_MAP.get(t.priority, 1),
            "category_score": CATEGORY_MAP.get(t.category, 4),
            "had_agent": 1 if t.agent_id else 0,
            "resolution_hours": resolution_hours
        })
    return pd.DataFrame(rows)

def train_response_time_model(db: Session):
    df = get_historical_resolution_data(db)

    if len(df) < 10:
        return {"error": f"Need at least 10 resolved tickets to train. Found {len(df)}. Using fallback estimates instead."}

    X = df[["priority_score", "category_score", "had_agent"]]
    y = df["resolution_hours"]

    model = LinearRegression()
    model.fit(X, y)

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(os.path.join(MODEL_DIR, "response_time_model.pkl"), "wb") as f:
        pickle.dump(model, f)

    r2_score = model.score(X, y)
    return {"trained": True, "samples_used": len(df), "r2_score": round(r2_score, 3)}

def predict_response_time(db: Session, priority: str, category: str, has_agent: bool = True) -> dict:
    model_path = os.path.join(MODEL_DIR, "response_time_model.pkl")

    priority_score = PRIORITY_MAP.get(priority, 1)
    category_score = CATEGORY_MAP.get(category, 4)
    had_agent = 1 if has_agent else 0

    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        predicted_hours = model.predict([[priority_score, category_score, had_agent]])[0]
        predicted_hours = max(0.5, predicted_hours)
        method = "ml_model"
    else:
        # Fallback heuristic based on SLA conventions when not enough historical data exists yet
        base_hours = {"critical": 2, "high": 8, "medium": 24, "low": 72}
        predicted_hours = base_hours.get(priority, 24)
        method = "heuristic_fallback"

    return {
        "predicted_resolution_hours": round(predicted_hours, 1),
        "predicted_resolution_display": f"{round(predicted_hours, 1)} hours" if predicted_hours < 24 else f"{round(predicted_hours/24, 1)} days",
        "method": method,
        "priority": priority,
        "category": category
    }
