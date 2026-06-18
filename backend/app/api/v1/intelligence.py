from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.auth_deps import require_agent
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import require_manager
from app.models.customer import Customer
from app.ml.features import extract_features
from app.ml.predict import predict_churn
from app.models.user import User
import uuid

router = APIRouter()

@router.get("/churn/{customer_id}")
def get_churn_prediction(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    features = extract_features(db, customer)
    prediction = predict_churn(features)

    # Update customer record
    customer.churn_prob = prediction["churn_probability"]
    customer.churn_risk = prediction["churn_risk"]
    db.commit()

    return {**prediction, "features_used": features, "customer_id": str(customer_id)}

@router.post("/churn/batch")
def batch_predict_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    results = []
    for customer in customers:
        features = extract_features(db, customer)
        prediction = predict_churn(features)
        customer.churn_prob = prediction["churn_probability"]
        customer.churn_risk = prediction["churn_risk"]
        results.append({
            "customer_id": str(customer.id),
            "name": customer.contact_name,
            "churn_probability": prediction["churn_probability"],
            "churn_risk": prediction["churn_risk"]
        })
    db.commit()
    return {"updated": len(results), "predictions": results}

@router.get("/overview")
def intelligence_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    risk_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    high_risk_customers = []

    for c in customers:
        risk = c.churn_risk or "low"
        if risk in risk_counts:
            risk_counts[risk] += 1
        if risk in ["high", "critical"]:
            high_risk_customers.append({
                "id": str(c.id),
                "name": c.contact_name,
                "email": c.email,
                "churn_prob": c.churn_prob,
                "churn_risk": c.churn_risk,
                "health_score": c.health_score
            })

    high_risk_customers.sort(key=lambda x: x["churn_prob"] or 0, reverse=True)

    return {
        "total_customers": len(customers),
        "risk_distribution": risk_counts,
        "high_risk_customers": high_risk_customers[:10],
        "avg_health_score": round(sum(c.health_score or 50 for c in customers) / len(customers), 1) if customers else 0
    }


@router.post("/segmentation")
def get_customer_segments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    from app.ml.segmentation import run_segmentation
    return run_segmentation(db)


@router.get("/anomalies/ticket-volume")
def get_ticket_volume_anomalies(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    from app.ml.anomaly_detection import detect_ticket_volume_anomalies
    return detect_ticket_volume_anomalies(db, days)

@router.get("/anomalies/agent-overload")
def get_agent_overload(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    from app.ml.anomaly_detection import detect_agent_overload
    return detect_agent_overload(db)


class RouteRecommendRequest(BaseModel):
    category: Optional[str] = None
    priority: str = "medium"

@router.post("/auto-route")
def get_routing_recommendation(
    data: RouteRecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    from app.ml.auto_routing import recommend_agent
    return recommend_agent(db, data.category, data.priority)


class ResponseTimePredictRequest(BaseModel):
    priority: str
    category: Optional[str] = "other"
    has_agent: bool = True

@router.post("/response-time/predict")
def predict_resolution_time(
    data: ResponseTimePredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    from app.ml.response_time import predict_response_time
    return predict_response_time(db, data.priority, data.category, data.has_agent)

@router.post("/response-time/train")
def train_resolution_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    from app.ml.response_time import train_response_time_model
    return train_response_time_model(db)
