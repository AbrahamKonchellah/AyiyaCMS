# AyiyaCMS clause analysis service

Small Python service that the .NET API calls. It runs the trained clause classifier
(TF-IDF + Logistic Regression, trained on LEDGAR in the notebook) and finds court dates
and deadlines with rules.

## 1. Export the trained model from the Colab notebook
Run this in the notebook after `best_lr` and `label_names` exist, then unzip the download
into `ml-service/` so you end up with `ml-service/model/clause_model.joblib`,
`labels.json` and `meta.json`.

```python
import joblib, json, os, sklearn
assert list(best_lr.named_steps["clf"].classes_) == list(range(len(label_names)))
os.makedirs("model", exist_ok=True)
joblib.dump(best_lr, "model/clause_model.joblib", compress=3)
json.dump(label_names, open("model/labels.json", "w"))
json.dump({"sklearn": sklearn.__version__}, open("model/meta.json", "w"))
print("scikit-learn", sklearn.__version__)
!zip -r model.zip model
from google.colab import files; files.download("model.zip")
```

## 2. Run it (Windows PowerShell)
```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install scikit-learn==<version printed above>
uvicorn app:app --host 127.0.0.1 --port 8000
```
Check http://127.0.0.1:8000/health: it should say `status: ok`, `classes: 100` and no warning.

## 3. Point the API at it
Default is `http://127.0.0.1:8000`. To change it:
```powershell
dotnet user-secrets set "MlService:BaseUrl" "http://127.0.0.1:8000"
```

## Notes
- The classifier was trained on US commercial contract clauses. Court orders and other
  document types will get low-confidence predictions; the UI flags those for review.
- Date and deadline extraction is rule-based, not learned.
- Bare periods such as "within 7 days" are assumed to run from the date of the order and are
  labelled as assumptions. Periods anchored on other events ("of service") are flagged, not computed.
