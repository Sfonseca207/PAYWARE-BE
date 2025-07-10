import { Twilio } from 'twilio';
import { Injectable } from '@nestjs/common';


@Injectable()
export class TwilioService {
 
  private client: Twilio;

  constructor(){
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async sendWhatsAppMessage(body: string): Promise<any> {
    try {
      const message = await this.client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: "whatsapp:+573174231039", 
        body: body,
      });
      return message;
    } catch (error) {
      throw new Error(`Error sending WhatsApp message: ${error.message}`);
    }
  }

}
