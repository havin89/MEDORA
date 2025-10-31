# Medora - Health Screening Application

A comprehensive health screening and alert system designed for healthcare providers to monitor patient health data, assess risk scores, and manage patient-doctor interactions.

## 📋 Overview

Medora consists of two main components:
1. **Health Alert Proto** - A web-based patient monitoring system with risk assessment
2. **SMS Notification Backend** - A TypeScript-based notification service for patient alerts

## 🚀 Features

### Health Alert System
- **Patient Dashboard** - View personal health information, allergies, and medications
- **Doctor Dashboard** - Monitor multiple patients and their risk scores
- **ML-Powered Reports** - Random Forest model predicts diseases from blood analysis
- **Risk Assessment** - AI-powered risk evaluation based on patient data
- **Multi-language Support** - Interface available in multiple languages
- **Real-time Data** - JSON-based patient data with blood analysis parameters

### SMS Notification Backend
- **User Authentication** - Secure login for doctors and patients
- **SMS Notifications** - Send alerts to patients' phones
- **Doctor Alerts** - Real-time notifications to healthcare providers
- **Patient Management** - Comprehensive patient data handling
- **RESTful API** - Well-structured API endpoints

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **ML Backend**: Python, Flask, scikit-learn (Random Forest)
- **Data Storage**: JSON file with blood analysis data
- **SMS Backend**: TypeScript, Express
- **Authentication**: JWT, bcrypt

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Python 3.11+ with conda (for ML backend)

### Setup Instructions

#### 1. Clone the repository
```bash
git clone <repository-url>
cd Medora-main
```

#### 2. Install Frontend Dependencies
```bash
npm install
```

#### 3. Setup Python ML Backend
```bash
cd python-backend
conda run -n pylatest pip install -r requirements.txt
```

See `python-backend/SETUP_INSTRUCTIONS.md` for detailed ML setup.

#### 4. Start Both Servers

**Terminal 1 - Python ML API:**
```bash
cd python-backend
conda run -n pylatest python app.py
```
API runs on `http://localhost:5001`

**Terminal 2 - Frontend:**
```bash
npm start
```
Frontend runs on `http://localhost:3000`

#### 5. Access the Application
Open your browser and navigate to:
- Home: `http://localhost:3000`
- Patient Login: `http://localhost:3000/patient-login.html`
- Doctor Login: `http://localhost:3000/doctor-login.html`

### Optional: SMS Notification Backend Setup

1. **Navigate to SMS backend directory**
   ```bash
   cd sms-notification-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file with your SMS API credentials and database connection details.

4. **Start the service**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
Medora-main/
├── README.md
├── package.json
├── package-lock.json
├── node_modules/
├── health-alert-proto/
│   ├── server.js                    # Express server (serves static files)
│   └── public/                      # Frontend files
│       ├── index.html               # Landing page
│       ├── patient-login.html       # Patient authentication
│       ├── doctor-login.html        # Doctor authentication
│       ├── patient-dashboard.html   # Patient interface
│       ├── doctor-dashboard.html    # Doctor interface
│       ├── data.json                # Patient & doctor data
│       ├── styles.css               # Application styles
│       ├── script.js                # Main JavaScript
│       ├── app.js                   # Application logic
│       ├── dashboard.js             # Dashboard functionality
│       └── lang.js                  # Language support
└── sms-notification-backend/
    ├── src/
    │   ├── app.ts                   # Main application
    │   ├── controllers/             # Request handlers
    │   ├── routes/                  # API routes
    │   ├── services/                # Business logic
    │   ├── middleware/              # Authentication middleware
    │   ├── models/                  # Data models
    │   └── types/                   # TypeScript types
    ├── package.json
    └── tsconfig.json
```

## 🔌 API Endpoints

### Health Alert Application

The health alert application serves static files and uses client-side data fetching from `data.json`. No backend API endpoints are required for the main application.

### SMS Notification API

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients/sms` - Send SMS to patient

#### Doctors
- `GET /api/doctors` - Get all doctors
- `POST /api/doctors/alerts` - Send alert to doctor

## 📊 Sample Data

The application includes sample patient data in `data.json`:
- **Patient 1**: Ahmet Yılmaz (Male, Born 1980) - ahmet.yilmaz@gmail.com / ahmet123
- **Patient 2**: Fatma Demir (Female, Born 1958) - fatma.demir@yahoo.com / fatma123
- **Patient 3**: Mehmet Kaya (Male, Born 1995) - kaya.mehmet@gmail.com / mehmet123
- **Patient 4**: Elif Arslan (Female, Born 2000) - elif.arslan@gmail.com / elif123
- **Patient 5**: Murat Özkan (Male, Born 1975) - murat.ozkan@gmail.com / murat123

**Sample Doctors**:
- **Dr. Ayhan Karaca** - ayhan.karaca@gmail.com / doctor1
- **Dr. Derya Ersoy** - derya.ersoy@gmail.com / doctor2

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS enabled for cross-origin requests
- Secure API endpoints with middleware protection

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 License

ISC

## 👥 Authors

IB Diploma Program - Computer Science Project

## 🤝 Contributing

This is an educational project. For contributions or suggestions, please contact the project maintainers.

## 📧 Support

For issues or questions, please open an issue in the repository.

## 🔄 Version

Current Version: 1.0.0

---

**Note**: This application is designed for educational purposes as part of the IB Diploma Program Computer Science curriculum.
