import { Injectable, Logger } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly mailerService: NestMailerService) {}

  async sendContactoForm(to: string | string[], formData: any): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: '📥 Nuevo Formulario de Contacto',
        html: `
          <div style="font-family: Arial, sans-serif; font-size:15px;">
            <span style="font-size:1.5em;">📥</span> <b>Nuevo Formulario de Contacto</b> <br><br>
            
            <span style="font-size:1.2em;">👤</span> <b>Datos del Contacto</b><br>
            <b>Nombre:</b> ${formData.nombre}<br>
            <b>Apellido:</b> ${formData.apellido}<br>
            <b>Correo:</b> ${formData.email}<br>
            <b>Teléfono:</b> ${formData.telefono}<br><br>
            <b>Empresa:</b> ${formData.empresa}<br>
            <b>Cargo:</b> ${formData.cargo}<br><br>
            
            <span style="font-size:1.2em;">🌍</span> <b>Ubicación</b><br>
            <b>País:</b> ${formData.pais}<br>
            <b>Ciudad:</b> ${formData.ciudad}<br><br>
            
            <span style="font-size:1.2em;">📝</span> <b>Mensaje</b><br>
            <i>"${formData.mensaje || 'No incluyó mensaje.'}"</i><br><br>
            
            <span style="font-size:1.2em;">📰</span> <b>¿Solicita recibir noticias?</b> ${formData.recibirNoticias ? 'Sí' : 'No'}
          </div>
        `,
      });
      this.logger.log(`Correo enviado correctamente a ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
