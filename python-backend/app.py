"""
Medora Health Alert - Python ML Backend API
Flask API for blood disease prediction using Random Forest
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils.predictor import BloodDiseasePredictor

app = Flask(__name__)

# Enable CORS for all routes (allows frontend to call this API)
# Allow localhost for development and Render URLs for production
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000", 
            "http://127.0.0.1:3000", 
            "http://localhost:5001", 
            "http://127.0.0.1:5001",
            "https://*.onrender.com"  # Allow all Render subdomains
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize the ML predictor
try:
    predictor = BloodDiseasePredictor()
    print("✓ ML Model loaded successfully!")
except Exception as e:
    print(f"✗ Error loading ML model: {e}")
    predictor = None

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'service': 'Medora ML API',
        'version': '1.0.0',
        'model_loaded': predictor is not None
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Detailed health check"""
    if predictor is None:
        return jsonify({
            'status': 'error',
            'message': 'ML model not loaded'
        }), 500
    
    return jsonify({
        'status': 'healthy',
        'model_type': 'Random Forest',
        'features_count': len(predictor.feature_names),
        'classes': predictor.get_classes()
    })

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    """
    Predict disease from blood analysis parameters
    
    Expected JSON body:
    {
        "Glucose": 113.28,
        "Cholesterol": 214.44,
        "Hemoglobin": 11.62,
        ... (all 24 blood parameters)
    }
    
    Returns:
    {
        "disease": "Anemia",
        "confidence": 0.89,
        "probabilities": {...},
        "risk_level": "Medium",
        "recommendations": [...]
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    if predictor is None:
        return jsonify({
            'error': 'ML model not loaded'
        }), 500
    
    try:
        # Get blood parameters from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400
        
        # Make prediction
        result = predictor.predict(data)
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({
            'error': f'Invalid input: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'error': f'Prediction failed: {str(e)}'
        }), 500

@app.route('/api/batch-predict', methods=['POST'])
def batch_predict():
    """
    Predict diseases for multiple patients
    
    Expected JSON body:
    {
        "patients": [
            {"id": 1, "bloodData": {...}},
            {"id": 2, "bloodData": {...}}
        ]
    }
    """
    if predictor is None:
        return jsonify({
            'error': 'ML model not loaded'
        }), 500
    
    try:
        data = request.get_json()
        patients = data.get('patients', [])
        
        if not patients:
            return jsonify({
                'error': 'No patients provided'
            }), 400
        
        results = []
        for patient in patients:
            patient_id = patient.get('id')
            blood_data = patient.get('bloodData')
            
            if not blood_data:
                results.append({
                    'id': patient_id,
                    'error': 'No blood data provided'
                })
                continue
            
            try:
                prediction = predictor.predict(blood_data)
                results.append({
                    'id': patient_id,
                    'prediction': prediction
                })
            except Exception as e:
                results.append({
                    'id': patient_id,
                    'error': str(e)
                })
        
        return jsonify({
            'results': results,
            'total': len(patients),
            'successful': sum(1 for r in results if 'prediction' in r)
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Batch prediction failed: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed from 5000 to 5001
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print("\n" + "="*80)
    print("🚀 Medora ML API Server Starting...")
    print("="*80)
    print(f"Port: {port}")
    print(f"Debug Mode: {debug}")
    print(f"Model Status: {'Loaded ✓' if predictor else 'Not Loaded ✗'}")
    print("="*80 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
