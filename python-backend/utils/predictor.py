"""
Blood Disease Predictor
Handles ML model loading and prediction logic
"""

import joblib
import numpy as np
import os
from typing import Dict, List, Any

class BloodDiseasePredictor:
    """Random Forest based blood disease predictor"""
    
    # Expected feature names in correct order
    FEATURE_NAMES = [
        'Glucose', 'Cholesterol', 'Hemoglobin', 'Platelets', 
        'White Blood Cells', 'Red Blood Cells', 'Hematocrit', 
        'Mean Corpuscular Volume', 'Mean Corpuscular Hemoglobin', 
        'Mean Corpuscular Hemoglobin Concentration', 'Insulin', 'BMI', 
        'Systolic Blood Pressure', 'Diastolic Blood Pressure', 
        'Triglycerides', 'HbA1c', 'LDL Cholesterol', 'HDL Cholesterol', 
        'ALT', 'AST', 'Heart Rate', 'Creatinine', 'Troponin', 
        'C-reactive Protein'
    ]
    
    # Disease information and recommendations
    DISEASE_INFO = {
        'Healthy': {
            'risk_level': 'Low',
            'description': 'Blood parameters are within normal ranges',
            'patient_message': 'Your blood test results look good! Continue maintaining a healthy lifestyle.',
            'doctor_recommendations': [
                'Continue regular health monitoring',
                'Maintain current lifestyle and diet',
                'Schedule routine check-up in 6-12 months'
            ],
            'patient_recommendations': [
                'Maintain a balanced diet rich in fruits and vegetables',
                'Exercise regularly (at least 30 minutes daily)',
                'Stay hydrated and get adequate sleep',
                'Continue regular health check-ups'
            ]
        },
        'Anemia': {
            'risk_level': 'Medium',
            'description': 'Low hemoglobin or red blood cell count detected',
            'patient_message': 'Some blood parameters need attention. Please consult your doctor.',
            'doctor_recommendations': [
                'Check iron, B12, and folate levels',
                'Consider iron supplementation if deficient',
                'Investigate underlying causes (bleeding, malabsorption)',
                'Monitor hemoglobin levels regularly',
                'Refer to hematologist if severe or persistent'
            ],
            'patient_recommendations': [
                'Increase iron-rich foods (red meat, spinach, lentils)',
                'Take vitamin C to enhance iron absorption',
                'Avoid tea/coffee with meals',
                'Consult your doctor about supplements',
                'Schedule follow-up blood tests'
            ]
        },
        'Diabetes': {
            'risk_level': 'High',
            'description': 'Elevated glucose and HbA1c levels detected',
            'patient_message': 'Your blood sugar levels require medical attention. Please consult your doctor soon.',
            'doctor_recommendations': [
                'Confirm diagnosis with fasting glucose and OGTT',
                'Start or adjust diabetes medication',
                'Refer to endocrinologist',
                'Monitor HbA1c every 3 months',
                'Screen for diabetic complications',
                'Provide diabetes education and lifestyle counseling'
            ],
            'patient_recommendations': [
                'Monitor blood sugar levels regularly',
                'Follow a low-glycemic diet',
                'Exercise regularly to improve insulin sensitivity',
                'Maintain healthy weight',
                'Take prescribed medications as directed',
                'Schedule regular check-ups with your doctor'
            ]
        },
        'Thalasse': {
            'risk_level': 'Medium',
            'description': 'Abnormal red blood cell indices suggesting thalassemia',
            'patient_message': 'Your blood test shows some abnormalities. Please consult your doctor for further evaluation.',
            'doctor_recommendations': [
                'Perform hemoglobin electrophoresis',
                'Check family history for thalassemia',
                'Refer to hematologist for genetic counseling',
                'Monitor for complications (iron overload, bone changes)',
                'Consider transfusion therapy if severe',
                'Genetic testing for family members'
            ],
            'patient_recommendations': [
                'Consult a hematologist for proper diagnosis',
                'Avoid iron supplements unless prescribed',
                'Maintain regular medical follow-ups',
                'Consider genetic counseling if planning family',
                'Stay informed about your condition'
            ]
        },
        'Thromboc': {
            'risk_level': 'High',
            'description': 'Low platelet count detected (thrombocytopenia)',
            'patient_message': 'Your platelet count is low. Please see your doctor immediately for evaluation.',
            'doctor_recommendations': [
                'Investigate cause (medications, infections, autoimmune)',
                'Check for bleeding symptoms',
                'Avoid antiplatelet drugs and NSAIDs',
                'Consider platelet transfusion if severe (<10,000)',
                'Refer to hematologist urgently',
                'Monitor platelet count closely'
            ],
            'patient_recommendations': [
                'Avoid activities that may cause injury or bleeding',
                'Report any unusual bleeding or bruising immediately',
                'Avoid medications that affect platelets (aspirin, ibuprofen)',
                'Follow up with your doctor urgently',
                'Attend all scheduled blood tests'
            ]
        }
    }
    
    def __init__(self, models_dir: str = None):
        """Initialize predictor and load models"""
        if models_dir is None:
            # Default to models directory relative to this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            models_dir = os.path.join(os.path.dirname(current_dir), 'models')
        
        self.models_dir = models_dir
        self.model = None
        self.label_encoder = None
        self.feature_names = None
        
        self._load_models()
    
    def _load_models(self):
        """Load the trained model and encoders"""
        try:
            # Load Random Forest model
            model_path = os.path.join(self.models_dir, 'random_forest_model.pkl')
            self.model = joblib.load(model_path)
            print(f"✓ Model loaded from: {model_path}")
            
            # Load label encoder
            encoder_path = os.path.join(self.models_dir, 'label_encoder.pkl')
            self.label_encoder = joblib.load(encoder_path)
            print(f"✓ Label encoder loaded from: {encoder_path}")
            
            # Load feature names
            features_path = os.path.join(self.models_dir, 'feature_names.pkl')
            if os.path.exists(features_path):
                self.feature_names = joblib.load(features_path)
            else:
                self.feature_names = self.FEATURE_NAMES
            
            print(f"✓ Features: {len(self.feature_names)} parameters")
            
        except Exception as e:
            raise Exception(f"Failed to load models: {str(e)}")
    
    def get_classes(self) -> List[str]:
        """Get list of disease classes"""
        if self.label_encoder:
            return self.label_encoder.classes_.tolist()
        return []
    
    def _extract_features(self, data: Dict[str, float]) -> np.ndarray:
        """Extract and order features from input data"""
        features = []
        missing_features = []
        
        for feature_name in self.feature_names:
            if feature_name in data:
                features.append(float(data[feature_name]))
            else:
                missing_features.append(feature_name)
        
        if missing_features:
            raise ValueError(f"Missing required features: {', '.join(missing_features)}")
        
        return np.array(features).reshape(1, -1)
    
    def predict(self, blood_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Make disease prediction from blood parameters
        
        Args:
            blood_data: Dictionary with blood test parameters
            
        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            raise Exception("Model not loaded")
        
        # Extract features in correct order
        features = self._extract_features(blood_data)
        
        # Make prediction
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]
        
        # Get disease name
        disease = self.label_encoder.inverse_transform([prediction])[0]
        
        # Get confidence (probability of predicted class)
        confidence = float(probabilities[prediction])
        
        # Get all class probabilities
        prob_dict = {}
        for idx, class_name in enumerate(self.label_encoder.classes_):
            prob_dict[class_name] = float(probabilities[idx])
        
        # Get disease information
        disease_info = self.DISEASE_INFO.get(disease, {})
        
        # Build result
        result = {
            'disease': disease,
            'confidence': round(confidence, 4),
            'confidence_percentage': round(confidence * 100, 2),
            'probabilities': prob_dict,
            'risk_level': disease_info.get('risk_level', 'Unknown'),
            'description': disease_info.get('description', ''),
            'patient_message': disease_info.get('patient_message', ''),
            'patient_recommendations': disease_info.get('patient_recommendations', []),
            'doctor_recommendations': disease_info.get('doctor_recommendations', []),
            'abnormal_parameters': self._identify_abnormal_parameters(blood_data)
        }
        
        return result
    
    def _identify_abnormal_parameters(self, blood_data: Dict[str, float]) -> List[Dict[str, Any]]:
        """Identify which blood parameters are outside normal ranges"""
        # Normal ranges (approximate clinical values)
        normal_ranges = {
            'Glucose': (70, 140),
            'Cholesterol': (125, 200),
            'Hemoglobin': (12, 17),
            'Platelets': (150000, 400000),
            'White Blood Cells': (4000, 11000),
            'Red Blood Cells': (4.0, 6.0),
            'Hematocrit': (36, 50),
            'HbA1c': (4, 5.7),
            'Triglycerides': (50, 150),
            'LDL Cholesterol': (0, 100),
            'HDL Cholesterol': (40, 100),
            'Systolic Blood Pressure': (90, 120),
            'Diastolic Blood Pressure': (60, 80),
            'BMI': (18.5, 25)
        }
        
        abnormal = []
        for param, (low, high) in normal_ranges.items():
            if param in blood_data:
                value = blood_data[param]
                if value < low:
                    abnormal.append({
                        'parameter': param,
                        'value': value,
                        'status': 'low',
                        'normal_range': f'{low}-{high}'
                    })
                elif value > high:
                    abnormal.append({
                        'parameter': param,
                        'value': value,
                        'status': 'high',
                        'normal_range': f'{low}-{high}'
                    })
        
        return abnormal
