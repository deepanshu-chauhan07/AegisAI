import pandas as pd
import io
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from app.models.customer import Customer
from datetime import datetime
import uuid

REQUIRED_COLUMNS = ["contact_name", "email"]
OPTIONAL_COLUMNS = [
    "company_name", "phone", "plan_tier", "signup_date",
    "total_tickets", "critical_tickets", "sla_breaches",
    "open_tickets", "resolved_tickets", "last_interaction_days_ago", "churned"
]

async def import_customers_csv(db: Session, file: UploadFile):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are allowed")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB")

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing}")

    created, updated, errors = 0, 0, []

    for idx, row in df.iterrows():
        try:
            email = str(row["email"]).strip()
            if not email or email == "nan":
                errors.append(f"Row {idx+2}: missing email")
                continue

            existing = db.query(Customer).filter(Customer.email == email).first()

            data = {
                "contact_name": str(row.get("contact_name", "Unknown")).strip(),
                "email": email,
                "company_name": str(row.get("company_name", "")).strip() or None,
                "phone": str(row.get("phone", "")).strip() or None,
                "plan_tier": str(row.get("plan_tier", "free")).strip().lower(),
            }

            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                customer = Customer(id=uuid.uuid4(), **data)
                db.add(customer)
                created += 1

        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")

    db.commit()

    return {
        "total_rows": len(df),
        "created": created,
        "updated": updated,
        "errors": errors[:20],
        "error_count": len(errors)
    }

def export_training_csv(df: pd.DataFrame) -> pd.DataFrame:
    """Prepares uploaded CSV data into ML-ready training format."""
    training_cols = [
        "total_tickets", "critical_tickets", "sla_breaches",
        "open_tickets", "resolved_tickets", "churned"
    ]
    available = [c for c in training_cols if c in df.columns]
    return df[available].fillna(0)
