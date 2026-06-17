"""
Retrain churn model using real company data from CSV.
Usage: python3 app/ml/retrain_from_csv.py path/to/customers.csv
"""
import sys
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report, precision_recall_curve
import pickle
import os

FEATURE_COLS = [
    "health_score", "ticket_count", "critical_ticket_ratio",
    "sla_breach_count", "open_ticket_count", "days_since_signup",
    "plan_tier_score", "resolution_rate"
]

def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame()

    total_tickets = df.get("total_tickets", pd.Series([0]*len(df))).fillna(0)
    critical = df.get("critical_tickets", pd.Series([0]*len(df))).fillna(0)
    resolved = df.get("resolved_tickets", pd.Series([0]*len(df))).fillna(0)

    out["health_score"] = (100 - (df.get("sla_breaches", pd.Series([0]*len(df))).fillna(0) * 8) -
                            (critical / total_tickets.replace(0, 1) * 30)).clip(0, 100)
    out["ticket_count"] = total_tickets
    out["critical_ticket_ratio"] = (critical / total_tickets.replace(0, 1)).fillna(0)
    out["sla_breach_count"] = df.get("sla_breaches", pd.Series([0]*len(df))).fillna(0)
    out["open_ticket_count"] = df.get("open_tickets", pd.Series([0]*len(df))).fillna(0)

    if "signup_date" in df.columns:
        signup = pd.to_datetime(df["signup_date"], errors="coerce")
        out["days_since_signup"] = (pd.Timestamp.now() - signup).dt.days.fillna(180)
    else:
        out["days_since_signup"] = 180

    plan_map = {"free": 0, "starter": 1, "pro": 2, "enterprise": 3}
    out["plan_tier_score"] = df.get("plan_tier", pd.Series(["free"]*len(df))).map(plan_map).fillna(0)
    out["resolution_rate"] = (resolved / total_tickets.replace(0, 1)).fillna(1.0).clip(0, 1)

    out["churned"] = df.get("churned", pd.Series([0]*len(df))).fillna(0).astype(int)
    return out

def retrain(csv_path: str):
    raw_df = pd.read_csv(csv_path)
    print(f"📂 Loaded {len(raw_df)} rows from {csv_path}")

    df = prepare_features(raw_df)

    if df["churned"].sum() < 5:
        print("⚠️  WARNING: Very few churned examples in real data. Blending with synthetic data for stability.")
        from app.ml.train import generate_synthetic_data
        synthetic = generate_synthetic_data(2000)
        df = pd.concat([df, synthetic], ignore_index=True)

    X = df[FEATURE_COLS]
    y = df["churned"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scale_pos_weight = ((y_train == 0).sum() / max((y_train == 1).sum(), 1)) * 0.6

    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
        gamma=0.1, reg_alpha=0.1, reg_lambda=1.0,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss", early_stopping_rounds=20,
        random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    probs = model.predict_proba(X_test)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_test, probs)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-9)
    best_threshold = thresholds[np.argmax(f1_scores[:-1])]
    preds = (probs >= best_threshold).astype(int)

    print(f"✅ Retrained — Accuracy: {accuracy_score(y_test, preds):.2%} | ROC-AUC: {roc_auc_score(y_test, probs):.3f}")
    print(classification_report(y_test, preds, target_names=["retained", "churned"]))

    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    with open(os.path.join(model_dir, "churn_model.pkl"), "wb") as f:
        pickle.dump(model, f)
    with open(os.path.join(model_dir, "threshold.pkl"), "wb") as f:
        pickle.dump(float(best_threshold), f)
    print("💾 Model retrained and saved with real company data")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 app/ml/retrain_from_csv.py path/to/customers.csv")
        sys.exit(1)
    retrain(sys.argv[1])
