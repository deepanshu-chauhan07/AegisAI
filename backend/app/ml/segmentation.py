import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.ml.features import extract_features, get_feature_columns

def assign_segment_labels(cluster_centers: np.ndarray, feature_cols: list, n_clusters: int) -> dict:
    """Rank clusters by a composite risk score (relative to each other) and assign labels."""
    health_idx = feature_cols.index("health_score")
    days_idx = feature_cols.index("days_since_signup")
    sla_idx = feature_cols.index("sla_breach_count")
    critical_idx = feature_cols.index("critical_ticket_ratio")

    risk_scores = []
    for i in range(n_clusters):
        center = cluster_centers[i]
        risk = -center[health_idx] + center[sla_idx] * 2 + center[critical_idx] * 2
        risk_scores.append((i, risk, center[days_idx]))

    sorted_by_risk = sorted(risk_scores, key=lambda x: x[1])

    labels = {}
    if n_clusters == 4:
        new_customer_threshold = np.percentile([r[2] for r in risk_scores], 50)
        for rank, (cluster_id, risk, days) in enumerate(sorted_by_risk):
            if days < new_customer_threshold and rank > 0:
                labels[cluster_id] = "New & Growing"
            elif rank == 0:
                labels[cluster_id] = "Champions"
            elif rank == n_clusters - 1:
                labels[cluster_id] = "At Risk"
            else:
                labels[cluster_id] = "Steady"
    else:
        names = ["Champions", "Steady", "New & Growing", "At Risk"]
        for rank, (cluster_id, risk, days) in enumerate(sorted_by_risk):
            labels[cluster_id] = names[min(rank, len(names) - 1)]

    return labels

def run_segmentation(db: Session, n_clusters: int = 4):
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    if len(customers) < n_clusters:
        return {"error": f"Need at least {n_clusters} active customers to segment. Found {len(customers)}."}

    feature_cols = get_feature_columns()
    rows = []
    for c in customers:
        feats = extract_features(db, c)
        rows.append(feats)

    df = pd.DataFrame(rows)[feature_cols]

    # Add tiny noise to break ties when many features are constant (e.g. no ticket history yet)
    df_noisy = df.copy()
    for col in df_noisy.columns:
        if df_noisy[col].std() < 1e-6:
            df_noisy[col] = df_noisy[col] + np.random.normal(0, 0.01, len(df_noisy))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_noisy)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels_arr = kmeans.fit_predict(X_scaled)

    segment_names = assign_segment_labels(kmeans.cluster_centers_, feature_cols, n_clusters)

    results = []
    for i, customer in enumerate(customers):
        cluster_id = int(labels_arr[i])
        results.append({
            "customer_id": str(customer.id),
            "name": customer.contact_name,
            "email": customer.email,
            "health_score": round(customer.health_score or 50.0, 1),
            "segment": segment_names[cluster_id],
            "cluster_id": cluster_id
        })

    segment_summary = {}
    for r in results:
        seg = r["segment"]
        segment_summary[seg] = segment_summary.get(seg, 0) + 1

    return {
        "total_customers": len(customers),
        "segments": segment_summary,
        "customers": results
    }
