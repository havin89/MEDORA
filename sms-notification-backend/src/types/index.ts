export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
}

export interface PatientRegistrationRequest {
    phoneNumber: string;
    birthYear: number;
    email?: string;
    password: string;
}

export interface PatientResponse {
    id: string;
    phoneNumber: string;
    birthYear: number;
    email?: string;
}

export interface DoctorRegistrationRequest {
    email: string;
    password: string;
    hospitalName: string;
}

export interface DoctorResponse {
    id: string;
    email: string;
    hospitalName: string;
}

export interface SmsNotification {
    patientId: string;
    message: string;
}

export interface AlertNotification {
    doctorId: string;
    message: string;
}