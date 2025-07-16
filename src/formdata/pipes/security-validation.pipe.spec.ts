import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { SecurityValidationPipe } from './security-validation.pipe';
import { FormDataDTO } from '../dto/formdata.dto';

describe('SecurityValidationPipe', () => {
  let pipe: SecurityValidationPipe;

  const validFormData = {
    nombre: 'Juan',
    apellido: 'Pérez',
    pais: 'España',
    ciudad: 'Madrid',
    empresa: 'TechCorp',
    cargo: 'Desarrollador',
    email: 'juan@techcorp.com',
    telefono: '+34 612 345 678',
    mensaje: 'Mensaje válido',
    recibirNoticias: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityValidationPipe],
    }).compile();

    pipe = module.get<SecurityValidationPipe>(SecurityValidationPipe);
  });

  describe('transform', () => {
    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should pass valid form data', async () => {
      const result = await pipe.transform(validFormData, {
        metatype: FormDataDTO,
        type: 'body',
        data: undefined,
      });

      expect(result).toBeDefined();
      expect(result.nombre).toBe('Juan');
      expect(result.email).toBe('juan@techcorp.com');
    });

    it('should pass form data without message', async () => {
      const formDataWithoutMessage = {
        ...validFormData,
        mensaje: undefined,
      };

      const result = await pipe.transform(formDataWithoutMessage, {
        metatype: FormDataDTO,
        type: 'body',
        data: undefined,
      });

      expect(result).toBeDefined();
      expect(result.mensaje).toBeUndefined();
    });

    it('should block SQL injection attempts in valid format first', async () => {
      // SQL injection that passes class-validator but fails security check  
      const maliciousData = {
        ...validFormData,
        mensaje: 'Tengo un UNION de consultas',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(maliciousData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(maliciousData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'El contenido enviado contiene elementos no permitidos por motivos de seguridad.',
          code: 'SUSPICIOUS_CONTENT',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Patrón sospechoso detectado')
      );

      consoleSpy.mockRestore();
    });

    it('should block XSS attempts', async () => {
      const xssData = {
        ...validFormData,
        mensaje: '<script>alert("xss")</script>',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(xssData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Patrón sospechoso detectado')
      );

      consoleSpy.mockRestore();
    });

    it('should block JavaScript events', async () => {
      const jsEventData = {
        ...validFormData,
        mensaje: '<div onload="maliciousFunction()">texto</div>',
      };

      await expect(
        pipe.transform(jsEventData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);
    });

    it('should block suspicious URLs', async () => {
      const suspiciousUrlData = {
        ...validFormData,
        mensaje: 'Descarga este archivo: http://evil.com/malware.exe',
      };

      await expect(
        pipe.transform(suspiciousUrlData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);
    });

    it('should block too many URLs in message', async () => {
      const tooManyUrlsData = {
        ...validFormData,
        mensaje: 'Visita http://site1.com y también http://site2.com y http://site3.com',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(tooManyUrlsData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(tooManyUrlsData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'El mensaje contiene demasiados enlaces.',
          code: 'TOO_MANY_LINKS',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Demasiadas URLs en el mensaje: 3')
      );

      consoleSpy.mockRestore();
    });

    it('should block disposable email addresses', async () => {
      const disposableEmailData = {
        ...validFormData,
        email: 'test@10minutemail.com',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(disposableEmailData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(disposableEmailData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'Por favor, utiliza una dirección de email permanente.',
          code: 'DISPOSABLE_EMAIL',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Email desechable detectado: 10minutemail.com')
      );

      consoleSpy.mockRestore();
    });

    it('should block individual field too large', async () => {
      const largeFieldData = {
        ...validFormData,
        mensaje: 'a'.repeat(2001), // This will trigger field too long before payload too large
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(largeFieldData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(largeFieldData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'El campo mensaje es demasiado largo.',
          code: 'FIELD_TOO_LONG',
        });
      }

      consoleSpy.mockRestore();
    });

    it('should block fields that are too long', async () => {
      const longFieldData = {
        ...validFormData,
        nombre: 'a'.repeat(2001), // Exceeds individual field limit
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(longFieldData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(longFieldData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'El campo nombre es demasiado largo.',
          code: 'FIELD_TOO_LONG',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Campo nombre demasiado largo:')
      );

      consoleSpy.mockRestore();
    });

    it('should block control characters', async () => {
      const controlCharData = {
        ...validFormData,
        nombre: 'Juan\x00Pérez', // Null character
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(controlCharData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(HttpException);

      try {
        await pipe.transform(controlCharData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'El campo nombre contiene caracteres no válidos.',
          code: 'INVALID_CHARACTERS',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Caracteres de control detectados en campo nombre')
      );

      consoleSpy.mockRestore();
    });

    it('should handle validation errors from class-validator', async () => {
      const invalidData = {
        ...validFormData,
        email: 'not-an-email', // Invalid email format
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(
        pipe.transform(invalidData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        })
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(invalidData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'Los datos proporcionados no son válidos',
          errors: expect.stringContaining('email'),
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VALIDATION ERROR] Datos inválidos recibidos:')
      );

      consoleSpy.mockRestore();
    });

    it('should pass through non-validatable types', async () => {
      const result = await pipe.transform('simple string', {
        metatype: String,
        type: 'param',
        data: undefined,
      });

      expect(result).toBe('simple string');
    });

    it('should allow message with exactly 2 URLs', async () => {
      const twoUrlsData = {
        ...validFormData,
        mensaje: 'Visita ejemplo.com y tambien sitio.org para mas info',
      };

      const result = await pipe.transform(twoUrlsData, {
        metatype: FormDataDTO,
        type: 'body',
        data: undefined,
      });

      expect(result).toBeDefined();
      expect(result.mensaje).toContain('ejemplo.com');
    });

    it('should handle empty message field properly', async () => {
      const emptyMessageData = {
        ...validFormData,
        mensaje: '',
      };

      const result = await pipe.transform(emptyMessageData, {
        metatype: FormDataDTO,
        type: 'body',
        data: undefined,
      });

      expect(result).toBeDefined();
      expect(result.mensaje).toBe('');
    });

    it('should detect multiple disposable email domains', async () => {
      const disposableEmails = [
        'test@tempmail.org',
        'user@guerrillamail.com',
        'fake@mailinator.com',
        'temp@yopmail.com',
      ];

      for (const email of disposableEmails) {
        const disposableEmailData = {
          ...validFormData,
          email,
        };

        await expect(
          pipe.transform(disposableEmailData, {
            metatype: FormDataDTO,
            type: 'body',
            data: undefined,
          })
        ).rejects.toThrow(HttpException);
      }
    });

    it('should allow legitimate emails that are not disposable', async () => {
      const legitimateEmails = [
        'user@gmail.com',
        'test@company.com',
        'contact@business.org',
        'info@domain.net',
      ];

      for (const email of legitimateEmails) {
        const legitimateEmailData = {
          ...validFormData,
          email,
        };

        const result = await pipe.transform(legitimateEmailData, {
          metatype: FormDataDTO,
          type: 'body',
          data: undefined,
        });

        expect(result).toBeDefined();
        expect(result.email).toBe(email);
      }
    });
  });
});
