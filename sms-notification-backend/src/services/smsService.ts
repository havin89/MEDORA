export class SmsService {
    private smsApiUrl: string;
    private apiKey: string;

    constructor() {
        this.smsApiUrl = process.env.SMS_API_URL || 'https://api.example.com/send-sms';
        this.apiKey = process.env.SMS_API_KEY || 'your_api_key_here';
    }

    public async sendSms(phoneNumber: string, message: string): Promise<void> {
        const payload = {
            to: phoneNumber,
            message: message,
        };

        const response = await fetch(this.smsApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to send SMS: ' + response.statusText);
        }
    }
}