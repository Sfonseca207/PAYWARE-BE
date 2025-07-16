import { 
  PipeTransform, 
  Injectable, 
  ArgumentMetadata, 
  BadRequestException,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SecurityValidationPipe implements PipeTransform<any> {
  // Lista de palabras sospechosas o potencialmente maliciosas
  private readonly suspiciousPatterns = [
    // SQL Injection patterns
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/gi,
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // JavaScript events
    /on\w+\s*=/gi,
    // Data URIs with scripts
    /data:.*?base64|javascript:/gi,
    // Common XSS patterns
    /(\b(alert|confirm|prompt|console)\s*\()/gi,
    // URL suspicious patterns
    /(https?:\/\/[^\s]+\.(?:exe|bat|cmd|scr|vbs|jar|zip))/gi,
    // Excessive repetition (potential spam)
    /(.)\1{50,}/g,
    // Potential phishing domains
    /(bit\.ly|tinyurl|goo\.gl|t\.co|short\.link)/gi
  ];

  // Patrones de contenido inapropiado
  private readonly inappropriatePatterns = [
    // Excesivo uso de mayúsculas (posible spam)
    /^[A-Z\s\!\?]{50,}$/,
    // URLs sospechosas
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g
  ];

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Aplicar validaciones de seguridad
    this.performSecurityChecks(value);

    // Transformar y validar con class-validator
    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        return Object.values(error.constraints || {}).join(', ');
      }).join('; ');

      console.log(`[VALIDATION ERROR] Datos inválidos recibidos: ${errorMessages}`);
      
      throw new BadRequestException({
        success: false,
        message: 'Los datos proporcionados no son válidos',
        errors: errorMessages
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private performSecurityChecks(data: any): void {
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Verificar patrones sospechosos
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(dataString)) {
        console.log(`[SECURITY ALERT] Patrón sospechoso detectado: ${pattern.source}`);
        console.log(`[SECURITY ALERT] Datos recibidos: ${JSON.stringify(data)}`);
        
        throw new HttpException(
          {
            success: false,
            message: 'El contenido enviado contiene elementos no permitidos por motivos de seguridad.',
            code: 'SUSPICIOUS_CONTENT'
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Verificar cada campo individualmente
    if (typeof data === 'object' && data !== null) {
      this.checkIndividualFields(data);
    }

    // Verificar tamaño total del payload
    if (JSON.stringify(data).length > 10000) {
      console.log(`[SECURITY ALERT] Payload demasiado grande: ${JSON.stringify(data).length} caracteres`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Los datos enviados son demasiado grandes.',
          code: 'PAYLOAD_TOO_LARGE'
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private checkIndividualFields(data: any): void {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Verificar contenido sospechoso en cada campo
        this.checkFieldContent(key, value);
        
        // Verificar longitud excesiva
        if (value.length > 2000) {
          console.log(`[SECURITY ALERT] Campo ${key} demasiado largo: ${value.length} caracteres`);
          
          throw new HttpException(
            {
              success: false,
              message: `El campo ${key} es demasiado largo.`,
              code: 'FIELD_TOO_LONG'
            },
            HttpStatus.BAD_REQUEST
          );
        }

        // Verificar caracteres de control
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
          console.log(`[SECURITY ALERT] Caracteres de control detectados en campo ${key}`);
          
          throw new HttpException(
            {
              success: false,
              message: `El campo ${key} contiene caracteres no válidos.`,
              code: 'INVALID_CHARACTERS'
            },
            HttpStatus.BAD_REQUEST
          );
        }
      }
    }
  }

  private checkFieldContent(fieldName: string, content: string): void {
    // Verificar URLs en campos de texto (especialmente en mensaje)
    if (fieldName === 'mensaje' && content) {
      const urlMatches = content.match(/https?:\/\/[^\s]+/gi);
      if (urlMatches && urlMatches.length > 2) {
        console.log(`[SECURITY ALERT] Demasiadas URLs en el mensaje: ${urlMatches.length}`);
        
        throw new HttpException(
          {
            success: false,
            message: 'El mensaje contiene demasiados enlaces.',
            code: 'TOO_MANY_LINKS'
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Verificar email válido en campo email
    if (fieldName === 'email') {
      // Verificar dominios desechables conocidos
      const disposableEmailDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org'
      ];
      
      const emailDomain = content.split('@')[1]?.toLowerCase();
      if (emailDomain && disposableEmailDomains.includes(emailDomain)) {
        console.log(`[SECURITY ALERT] Email desechable detectado: ${emailDomain}`);
        
        throw new HttpException(
          {
            success: false,
            message: 'Por favor, utiliza una dirección de email permanente.',
            code: 'DISPOSABLE_EMAIL'
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }
}
