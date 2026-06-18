import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ticket import Ticket
from datetime import datetime, timedelta

def detect_ticket_volume_anomalies(db: Session, days: int = 30):
    """Detect days with unusually high/low ticket creation volume using Isolation Forest."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    tickets = db.query(Ticket).filter(Ticket.created_at >= start_date).all()

    daily_counts = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_counts[date] = 0
    for t in tickets:
        date = t.created_at.strftime("%Y-%m-%d")
        if date in daily_counts:
            daily_counts[date] += 1

    df = pd.DataFrame(list(daily_counts.items()), columns=["date", "count"])

    if df["count"].std() < 1e-6 or len(df) < 10:
        return {"anomalies": [], "message": "Not enough variance in data to detect anomalies yet."}

    model = IsolationForest(contamination=0.15, random_state=42)
    df["anomaly_score"] = model.fit_predict(df[["count"]])
    df["is_anomaly"] = df["anomaly_score"] == -1

    anomalies = df[df["is_anomaly"]].to_dict("records")
    mean_count = df["count"].mean()

    return {
        "period_days": days,
        "average_daily_tickets": round(mean_count, 1),
        "anomalies": [
            {
                "date": a["date"],
                "ticket_count": int(a["count"]),
                "type": "spike" if a["count"] > mean_count else "drop",
                "deviation": round(a["count"] - mean_count, 1)
            }
            for a in anomalies
        ]
    }

def detect_agent_overload(db: Session):
    """Flag agents with unusually high open-ticket load using Isolation Forest."""
    agent_loads = db.query(
        Ticket.agent_id,
        func.count(Ticket.id).label("open_count")
    ).filter(
        Ticket.status.in_(["open", "in_progress", "assigned"]),
        Ticket.agent_id.isnot(None)
    ).group_by(Ticket.agent_id).all()

    if len(agent_loads) < 3:
        return {"anomalies": [], "message": "Not enough agents with active tickets to detect overload patterns."}

    df = pd.DataFrame([{"agent_id": str(a.agent_id), "open_count": a.open_count} for a in agent_loads])

    if df["open_count"].std() < 1e-6:
        return {"anomalies": [], "message": "All agents have similar load. No anomalies."}

    model = IsolationForest(contamination=0.2, random_state=42)
    df["anomaly_score"] = model.fit_predict(df[["open_count"]])
    df["is_overloaded"] = (df["anomaly_score"] == -1) & (df["open_count"] > df["open_count"].mean())

    overloaded = df[df["is_overloaded"]].to_dict("records")

    return {
        "average_load": round(df["open_count"].mean(), 1),
        "overloaded_agents": [
            {"agent_id": a["agent_id"], "open_tickets": int(a["open_count"])}
            for a in overloaded
        ]
    }
