export interface Patient {
    id: string;
    phoneNumber: string;
    birthYear: number;
    email?: string;
    password: string; // or OTP
}