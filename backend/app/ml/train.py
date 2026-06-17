import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report, precision_recall_curve
import pickle
import os

np.random.seed(42)

FEATURE_COLS = [
    "health_score", "ticket_count", "critical_ticket_ratio",
    "sla_breach_count", "open_ticket_count", "days_since_signup",
    "plan_tier_score", "resolution_rate"
]

def generate_synthetic_data(n_samples: int = 6000) -> pd.DataFrame:
    health_score = np.random.beta(2, 2, n_samples) * 100
    ticket_count = np.random.poisson(5, n_samples)
    critical_ratio = np.clip(np.random.beta(1.5, 4, n_samples), 0, 1)
    sla_breach = np.random.poisson(1.2, n_samples)
    open_tickets = np.random.poisson(2, n_samples)
    days_since_signup = np.random.randint(1, 730, n_samples)
    plan_tier = np.random.choice([0, 1, 2, 3], n_samples, p=[0.3, 0.3, 0.25, 0.15])
    resolution_rate = np.clip(np.random.beta(4, 1.5, n_samples), 0, 1)

    df = pd.DataFrame({
        "health_score": health_score, "ticket_count": ticket_count,
        "critical_ticket_ratio": critical_ratio, "sla_breach_count": sla_breach,
        "open_ticket_count": open_tickets, "days_since_signup": days_since_signup,
        "plan_tier_score": plan_tier, "resolution_rate": resolution_rate
    })

    churn_signal = (
        (100 - df["health_score"]) / 100 * 0.30 +
        np.minimum(df["sla_breach_count"] / 5, 1) * 0.22 +
        df["critical_ticket_ratio"] * 0.18 +
        np.minimum(df["open_ticket_count"] / 6, 1) * 0.12 +
        (1 - df["resolution_rate"]) * 0.13 +
        (3 - df["plan_tier_score"]) / 3 * 0.05
    )
    noise = np.random.normal(0, 0.08, n_samples)
    df["churned"] = ((churn_signal + noise) > 0.48).astype(int)
    return df

def train_model():
    df = generate_synthetic_data(6000)
    X = df[FEATURE_COLS]
    y = df["churned"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Moderate class weighting — balance, not extreme
    scale_pos_weight = ((y_train == 0).sum() / (y_train == 1).sum()) * 0.6

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

    # Find optimal threshold using precision-recall curve (maximize F1)
    precisions, recalls, thresholds = precision_recall_curve(y_test, probs)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-9)
    best_idx = np.argmax(f1_scores[:-1])
    best_threshold = thresholds[best_idx]

    preds = (probs >= best_threshold).astype(int)
    acc = accuracy_score(y_test, preds)
    auc = roc_auc_score(y_test, probs)

    print(f"✅ Optimal threshold: {best_threshold:.3f}")
    print(f"✅ Accuracy: {acc:.2%} | ROC-AUC: {auc:.3f}")
    print(classification_report(y_test, preds, target_names=["retained", "churned"]))

    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    with open(os.path.join(model_dir, "churn_model.pkl"), "wb") as f:
        pickle.dump(model, f)
    with open(os.path.join(model_dir, "threshold.pkl"), "wb") as f:
        pickle.dump(float(best_threshold), f)
    print(f"💾 Model + threshold saved")
    return model

if __name__ == "__main__":
    train_model()
