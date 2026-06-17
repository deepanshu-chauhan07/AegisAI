from fastapi import APIRouter, Depends, HTTPException
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
