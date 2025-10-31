# SMS Notification Backend

This project is a backend application designed to send SMS notifications to patients and alerts to doctors. It includes user authentication for both doctors and patients, ensuring secure access to their respective functionalities.

## Features

- User authentication for doctors and patients
- SMS notifications sent to patients' phones
- Alerts sent to doctors' screens
- Patient management functionalities
- Doctor management functionalities

## Project Structure

```
sms-notification-backend
├── src
│   ├── app.ts                     # Entry point of the application
│   ├── controllers                # Contains controllers for handling requests
│   │   ├── authController.ts      # Handles user authentication
│   │   ├── patientController.ts    # Manages patient data
│   │   └── doctorController.ts     # Manages doctor data
│   ├── routes                     # Contains route definitions
│   │   ├── authRoutes.ts          # Routes for authentication
│   │   ├── patientRoutes.ts       # Routes for patient-related actions
│   │   └── doctorRoutes.ts        # Routes for doctor-related actions
│   ├── services                   # Contains service classes for business logic
│   │   ├── smsService.ts          # Sends SMS notifications
│   │   └── alertService.ts        # Sends alerts to doctors
│   ├── middleware                 # Contains middleware functions
│   │   └── authMiddleware.ts      # Handles authentication and authorization
│   ├── models                     # Contains data models
│   │   ├── doctor.ts              # Defines the Doctor model
│   │   └── patient.ts             # Defines the Patient model
│   └── types                      # Contains TypeScript types
│       └── index.ts              # Defines request and response types
├── package.json                   # NPM configuration file
├── tsconfig.json                  # TypeScript configuration file
└── README.md                      # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd sms-notification-backend
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Configure environment variables for SMS API and database connection.

5. Start the application:
   ```
   npm start
   ```

## API Endpoints

- **Authentication**
  - POST `/api/auth/login` - Login for doctors and patients
  - POST `/api/auth/register` - Register new doctors and patients

- **Patients**
  - GET `/api/patients` - Retrieve patient information
  - POST `/api/patients/sms` - Send SMS notifications to patients

- **Doctors**
  - GET `/api/doctors` - Retrieve doctor information
  - POST `/api/doctors/alerts` - Send alerts to doctors

## License

This project is licensed under the MIT License.