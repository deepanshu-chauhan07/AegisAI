import pickle
import os
import pandas as pd
import shap
from app.ml.features import get_feature_columns

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

_model = None
_threshold = None
_explainer = None

def load_model():
    global _model, _threshold, _explainer
    if _model is None:
        with open(os.path.join(MODEL_DIR, "churn_model.pkl"), "rb") as f:
            _model = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "threshold.pkl"), "rb") as f:
            _threshold = pickle.load(f)
        _explainer = shap.TreeExplainer(_model)
    return _model, _threshold, _explainer

def predict_churn(features: dict) -> dict:
    model, threshold, explainer = load_model()
    cols = get_feature_columns()
    df = pd.DataFrame([features])[cols]

    prob = float(model.predict_proba(df)[0, 1])
    churned = prob >= threshold

    if prob < 0.3:
        risk = "low"
    elif prob < 0.5:
        risk = "medium"
    elif prob < 0.75:
        risk = "high"
    else:
        risk = "critical"

    shap_values = explainer.shap_values(df)
    shap_dict = {cols[i]: float(shap_values[0][i]) for i in range(len(cols))}
    top_factors = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    return {
        "churn_probability": round(prob, 4),
        "churn_risk": risk,
        "predicted_churn": bool(churned),
        "top_factors": [
            {"feature": f, "impact": round(v, 4), "direction": "increases_risk" if v > 0 else "decreases_risk"}
            for f, v in top_factors
        ]
    }
