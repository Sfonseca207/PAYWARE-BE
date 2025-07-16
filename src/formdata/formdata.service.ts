import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormDataDTO } from './dto/formdata.dto';
import { FormData } from './entities/formdata.entity';
import { TwilioService } from '../twilio/twilio.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class FormdataService {
  constructor(
    private readonly prismaService: PrismaService, 
    private readonly twilioService: TwilioService, 
    private readonly mailerService: MailerService
  ){}

  async createformdata(formData: FormDataDTO, clientIp?: string) {
    try {
      // Log de seguridad con datos sanitizados
      console.log(`[FORM SUBMISSION] Nueva submission desde IP: ${clientIp || 'unknown'} - ${new Date().toISOString()}`);
      console.log(`[FORM SUBMISSION] Email: ${formData.email}, Empresa: ${formData.empresa}`);

      // Crear entrada en base de datos con información adicional de seguridad
      const enhancedFormData = {
        ...formData,
        // Agregar metadata de seguridad si tu esquema lo permite
        submittedAt: new Date(),
        submitterIp: clientIp || 'unknown',
        // Sanitizar datos antes de guardar
        nombre: this.sanitizeText(formData.nombre) || '',
        apellido: this.sanitizeText(formData.apellido) || '',
        empresa: this.sanitizeText(formData.empresa) || '',
        cargo: this.sanitizeText(formData.cargo) || '',
        mensaje: formData.mensaje ? this.sanitizeText(formData.mensaje) : null,
        pais: this.sanitizeText(formData.pais) || '',
        ciudad: this.sanitizeText(formData.ciudad) || '',
        // Normalizar email
        email: formData.email.toLowerCase().trim(),
        // Normalizar teléfono
        telefono: this.sanitizePhone(formData.telefono)
      };

      const newFormData: FormData = await this.prismaService.contactForm.create({
        data: {
          nombre: enhancedFormData.nombre,
          apellido: enhancedFormData.apellido,
          pais: enhancedFormData.pais,
          ciudad: enhancedFormData.ciudad,
          empresa: enhancedFormData.empresa,
          cargo: enhancedFormData.cargo,
          email: enhancedFormData.email,
          telefono: enhancedFormData.telefono,
          mensaje: enhancedFormData.mensaje || undefined,
          recibirNoticias: enhancedFormData.recibirNoticias || false
        }
      });

      // Verificar si es un posible spam basado en patrones
      const isSpamSuspicion = this.detectSpamPatterns(formData);
      if (isSpamSuspicion.isSuspicious) {
        console.log(`[SPAM DETECTION] Posible spam detectado desde IP: ${clientIp}`);
        console.log(`[SPAM DETECTION] Razones: ${isSpamSuspicion.reasons.join(', ')}`);
        
        // En un entorno de producción, podrías decidir no enviar notificaciones 
        // o enviar a una cola de revisión manual
      }

      const messageBody = `
📥 *Nuevo Formulario de Contacto* ${isSpamSuspicion.isSuspicious ? '⚠️ [Sospechoso de Spam]' : ''}

👤 *Datos del Contacto*
- *Nombre:* ${enhancedFormData.nombre}
- *Apellido:* ${enhancedFormData.apellido}
- *Correo:* ${enhancedFormData.email}
- *Teléfono:* ${enhancedFormData.telefono}
- *Empresa:* ${enhancedFormData.empresa}
- *Cargo:* ${enhancedFormData.cargo}

🌍 *Ubicación*
- *País:* ${enhancedFormData.pais}
- *Ciudad:* ${enhancedFormData.ciudad}

📝 *Mensaje*
"${enhancedFormData.mensaje && enhancedFormData.mensaje.trim() ? enhancedFormData.mensaje : 'No incluyó mensaje.'}"

📰 *¿Solicita recibir noticias?* ${enhancedFormData.recibirNoticias ? 'Sí' : 'No'}

🔒 *Info de Seguridad*
- *IP:* ${clientIp || 'Desconocida'}
- *Enviado:* ${new Date().toLocaleString('es-ES')}
${isSpamSuspicion.isSuspicious ? `- *⚠️ Alertas:* ${isSpamSuspicion.reasons.join(', ')}` : ''}
      `.trim();

      const notificationEmail = process.env.NOTIFICATION_EMAIL

      if (!notificationEmail) {
        throw new Error('NOTIFICATION_EMAIL is not defined in the environment variables');
      }

      const recipients = notificationEmail.split(',').map(e => e.trim());

      // Preparar información de seguridad para el email
      const securityInfo = {
        clientIp: clientIp || 'Desconocida',
        spamSuspicion: isSpamSuspicion
      };

      await this.mailerService.sendContactoForm(recipients, enhancedFormData, securityInfo);
      await this.twilioService.sendWhatsAppMessage(messageBody)

      return newFormData;
      
    } catch (error) {
      console.error(`[FORM ERROR] Error al procesar formulario desde IP: ${clientIp || 'unknown'} - ${error.message}`);
      throw new Error(error.message);
    }
  }

  private sanitizeText(text: string | undefined): string | null {
    if (!text) return null;
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .replace(/[<>]/g, '') // Remover caracteres HTML básicos
      .substring(0, 500); // Limitar longitud como medida de seguridad adicional
  }

  private sanitizePhone(phone: string): string {
    if (!phone) return phone;
    
    return phone
      .trim()
      .replace(/[^\d\+\-\s\(\)]/g, '') // Solo permitir números y caracteres telefónicos
      .substring(0, 20);
  }

  private detectSpamPatterns(formData: FormDataDTO): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // 1. Verificar si nombre y apellido son idénticos (posible spam automatizado)
    if (formData.nombre?.toLowerCase().trim() === formData.apellido?.toLowerCase().trim()) {
      reasons.push('Nombre y apellido idénticos');
    }

    // 2. Verificar patrones repetitivos en texto combinado
    const textToCheck = `${formData.nombre} ${formData.apellido} ${formData.mensaje || ''}`;
    if (this.hasRepeatingPatterns(textToCheck)) {
      reasons.push('Patrones de texto repetitivos detectados');
    }

    // 3. Verificar exceso de mayúsculas en todo el contenido
    if (this.hasExcessiveUppercase(textToCheck)) {
      reasons.push('Uso excesivo de mayúsculas');
    }

    // 4. Verificar empresas con nombres genéricos o sospechosos
    const suspiciousCompanyPatterns = [
      /^test$/i,
      /^empresa$/i,
      /^company$/i,
      /^business$/i,
      /^xxxxx+$/i,
      /^[0-9]+$/,
      /^.{1}$/  // Una sola letra
    ];
    
    if (suspiciousCompanyPatterns.some(pattern => pattern.test(formData.empresa.trim()))) {
      reasons.push('Nombre de empresa genérico o sospechoso');
    }

    // 5. Verificar mensajes con múltiples enlaces (solo si el mensaje es largo)
    if (formData.mensaje && formData.mensaje.length > 200) {
      const urlCount = (formData.mensaje.match(/https?:\/\/\S+/g) || []).length;
      if (urlCount > 3) {
        reasons.push('Mensaje largo con múltiples enlaces');
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  private hasRepeatingPatterns(text: string): boolean {
    if (!text || text.length < 6) return false;
    
    // Verificar patrones repetitivos de 3 o más caracteres
    return /(.{3,})\1{2,}/.test(text.toLowerCase().replace(/\s+/g, ''));
  }

  private hasExcessiveUppercase(text: string): boolean {
    if (!text || text.length < 10) return false;
    
    const letters = text.match(/[a-zA-Z]/g);
    if (!letters || letters.length < 10) return false;
    
    const upperCaseLetters = text.match(/[A-Z]/g) || [];
    const upperCaseRatio = upperCaseLetters.length / letters.length;
    
    return upperCaseRatio > 0.6; // Más del 60% en mayúsculas es sospechoso
  }
}
