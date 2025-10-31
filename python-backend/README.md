# Medora Python ML Backend

Flask API for blood disease prediction using Random Forest machine learning model.

## Features

- **ML Prediction API**: Predict diseases from blood analysis parameters
- **Batch Processing**: Analyze multiple patients at once
- **CORS Enabled**: Frontend can call API from different origin
- **Production Ready**: Configured for Render deployment

## Setup Instructions

### 1. Install Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Train and Save the Model

Run the Jupyter notebook to train the model and save it:

```bash
cd ../machine_learning
jupyter notebook blood_disease_prediction.ipynb
```

Execute all cells including the new cell #34 that saves the model to `python-backend/models/`.

### 3. Generate Patient Blood Data

```bash
cd ../python-backend
python generate_patient_blood_data.py
```

This will add blood analysis data to all patients in `data.json`.

### 4. Start the API Server

```bash
python app.py
```

The API will start on `http://localhost:5001`

## API Endpoints

### Health Check
```bash
GET /
GET /api/health
```

### Single Prediction
```bash
POST /api/predict
Content-Type: application/json

{
  "Glucose": 113.28,
  "Cholesterol": 214.44,
  "Hemoglobin": 11.62,
  ... (all 24 blood parameters)
}
```

**Response:**
```json
{
  "disease": "Anemia",
  "confidence": 0.89,
  "confidence_percentage": 89.0,
  "risk_level": "Medium",
  "patient_message": "Some blood parameters need attention...",
  "patient_recommendations": [...],
  "doctor_recommendations": [...],
  "abnormal_parameters": [...]
}
```

### Batch Prediction
```bash
POST /api/batch-predict
Content-Type: application/json

{
  "patients": [
    {"id": 1, "bloodData": {...}},
    {"id": 2, "bloodData": {...}}
  ]
}
```

## Testing the API

### Using curl:
```bash
# Health check
curl http://localhost:5001/api/health

# Test prediction (use actual blood data from data.json)
curl -X POST http://localhost:5001/api/predict \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

### Using Python:
```python
import requests

url = "http://localhost:5001/api/predict"
blood_data = {
    "Glucose": 113.28,
    "Cholesterol": 214.44,
    # ... all 24 parameters
}

response = requests.post(url, json=blood_data)
print(response.json())
```

## Deployment to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Add Python ML backend"
git push origin main
```

### 2. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medora-ml-api`
   - **Root Directory**: `python-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: Free

### 3. Update Frontend API URL

In your frontend code, update the API endpoint:

```javascript
// For production
const API_URL = 'https://medora-ml-api.onrender.com';

// For local development
const API_URL = 'http://localhost:5000';
```

## Project Structure

```
python-backend/
├── app.py                          # Flask API application
├── requirements.txt                # Python dependencies
├── Procfile                        # Render deployment config
├── runtime.txt                     # Python version
├── generate_patient_blood_data.py  # Data generation script
├── models/                         # ML models directory
│   ├── random_forest_model.pkl     # Trained model
│   ├── label_encoder.pkl           # Label encoder
│   └── feature_names.pkl           # Feature names
└── utils/
    ├── __init__.py
    └── predictor.py                # ML prediction logic
```

## Environment Variables

For production deployment, set these environment variables on Render:

- `FLASK_ENV`: `production`
- `PORT`: Auto-set by Render (defaults to 5001 locally)

## Troubleshooting

### Model not found error
- Make sure you've run the Jupyter notebook to save the model
- Check that `models/` directory contains the .pkl files

### CORS errors
- Verify the frontend URL is in the CORS allowed origins
- Update `app.py` CORS configuration for production URLs

### Import errors
- Ensure all dependencies are in `requirements.txt`
- Run `pip install -r requirements.txt` again

## License

MIT
