export class AlertService {
    sendAlert(doctorId: string, message: string): void {
        // Logic to send alert to the doctor's screen
        console.log(`Alert sent to Doctor ID: ${doctorId} - Message: ${message}`);
    }

    manageAlerts(patientId: string, alertType: string): void {
        // Logic to manage alert notifications based on patient actions
        console.log(`Managing alert for Patient ID: ${patientId} - Alert Type: ${alertType}`);
    }
}