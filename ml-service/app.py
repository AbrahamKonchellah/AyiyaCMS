"""AyiyaCMS clause analysis service.

Loads the trained TF-IDF + Logistic Regression clause classifier (exported from the
notebook) and exposes it over HTTP, together with rule-based date/deadline extraction.
The .NET API is the only client; this service is not exposed to browsers.
"""
import json
import os
import re
import time
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pysbd
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from extract import find_dates

MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).parent / "model"))
MAX_CHARS = 60_000
MAX_CLAUSES = 150

pipeline = joblib.load(MODEL_DIR / "clause_model.joblib")
labels: list[str] = json.loads((MODEL_DIR / "labels.json").read_text(encoding="utf-8"))
META = {}
if (MODEL_DIR / "meta.json").exists():
    META = json.loads((MODEL_DIR / "meta.json").read_text(encoding="utf-8"))
tfidf = pipeline.named_steps["tfidf"]
clf = pipeline.named_steps["clf"]
terms = tfidf.get_feature_names_out()
assert list(clf.classes_) == list(range(len(labels))), "Model classes do not match labels.json"
_HIDE = set(ENGLISH_STOP_WORDS) | {"num", "url", "shall", "may"}
_seg = pysbd.Segmenter(language="en", clean=False)

# Identical to the cleaning applied to the training data in the notebook.
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_NUM_RE = re.compile(r"(?<![\w-])\d+(?:[,./]\d+)*(?![\w-])")


def clean_text(s: str) -> str:
    s = _URL_RE.sub(" url ", str(s))
    s = _NUM_RE.sub(" num ", s)
    return re.sub(r"\s+", " ", s).strip()


# ── Splitting a document into clause-sized chunks ─────────────────────
_NUMBERED = re.compile(r"(?m)^\s*(?=(?:\d+(?:\.\d+)*\.?|\([a-z]{1,3}\)|\([ivx]{1,4}\))\s+\S)")


def chunk_clauses(text: str, target: int = 700, hard_max: int = 1500) -> list[str]:
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text.replace("\r\n", "\n")) if b.strip()]
    pieces: list[str] = []
    for b in blocks:
        parts = [p.strip() for p in _NUMBERED.split(b) if p.strip()] if "\n" in b else [b]
        pieces.extend(parts)

    chunks: list[str] = []
    for p in pieces:
        p = re.sub(r"\s*\n\s*", " ", p)
        if len(p) <= hard_max:
            chunks.append(p)
            continue
        cur = ""                                     # long block: group sentences
        for s in _seg.segment(p):
            if cur and len(cur) + len(s) > target:
                chunks.append(cur.strip())
                cur = ""
            cur += " " + s.strip()
        if cur.strip():
            chunks.append(cur.strip())
    return [c for c in chunks if len(c.split()) >= 5][:MAX_CLAUSES]


def evidence(row, class_idx: int, k: int = 5) -> list[dict]:
    """The words that pushed the model towards this clause type (tf-idf value × coefficient)."""
    idx, vals = row.indices, row.data
    contrib = vals * clf.coef_[class_idx][idx]
    out = []
    for i in np.argsort(contrib)[::-1]:
        term = terms[idx[i]]
        if contrib[i] <= 0 or term in _HIDE:
            continue
        out.append({"term": term, "weight": round(float(contrib[i]), 4)})
        if len(out) == k:
            break
    return out


def confidence_band(p: float) -> str:
    return "high" if p >= 0.7 else "medium" if p >= 0.4 else "low"


# ── API ───────────────────────────────────────────────────────────────
app = FastAPI(title="AyiyaCMS clause analysis service")


class AnalyzeRequest(BaseModel):
    text: str
    reference_date: str | None = None


@app.get("/health")
def health():
    import sklearn
    trained_with = META.get("sklearn")
    return {"status": "ok", "classes": len(labels), "model": "TF-IDF + Logistic Regression",
            "warning": (f"Model trained with scikit-learn {trained_with}, running {sklearn.__version__}"
                        if trained_with and trained_with != sklearn.__version__ else None)}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    started = time.perf_counter()
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text supplied.")
    if len(text) > MAX_CHARS:
        raise HTTPException(status_code=413, detail=f"Text is longer than {MAX_CHARS} characters.")
    try:
        reference = date.fromisoformat(req.reference_date) if req.reference_date else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="reference_date must be YYYY-MM-DD.")

    chunks = chunk_clauses(text)
    clauses = []
    if chunks:
        X = tfidf.transform([clean_text(c) for c in chunks])
        proba = clf.predict_proba(X)
        for i, chunk in enumerate(chunks):
            top = np.argsort(proba[i])[::-1][:3]
            best = float(proba[i][top[0]])
            clauses.append({
                "index": i,
                "text": chunk,
                "confidence": confidence_band(best),
                "predictions": [{"label": labels[j], "probability": round(float(proba[i][j]), 4)} for j in top],
                "evidence": evidence(X[i], int(top[0])),
            })

    return {
        "model": {"name": "TF-IDF + Logistic Regression", "classes": len(labels)},
        "referenceDate": reference.isoformat(),
        "clauses": clauses,
        "dates": find_dates(text, reference),
        "elapsedMs": round((time.perf_counter() - started) * 1000),
    }
