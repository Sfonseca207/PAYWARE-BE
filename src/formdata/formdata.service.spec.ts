import { Test, TestingModule } from '@nestjs/testing';
import { FormdataService } from './formdata.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from '../twilio/twilio.service';
import { MailerService } from '../mailer/mailer.service';
import { FormDataDTO } from './dto/formdata.dto';

describe('FormdataService', () => {
  let service: FormdataService;
  let prismaService: PrismaService;
  let twilioService: TwilioService;
  let mailerService: MailerService;

  const mockPrismaService = {
    contactForm: {
      create: jest.fn(),
    },
  };

  const mockTwilioService = {
    sendWhatsAppMessage: jest.fn(),
  };

  const mockMailerService = {
    sendContactoForm: jest.fn(),
  };

  const mockFormData: FormDataDTO = {
    nombre: 'Juan Carlos',
    apellido: 'García López',
    pais: 'España',
    ciudad: 'Madrid',
    empresa: 'TechCorp S.A.',
    cargo: 'Desarrollador Senior',
    email: 'juan.garcia@techcorp.com',
    telefono: '+34 612 345 678',
    mensaje: 'Estoy interesado en conocer más sobre sus servicios.',
    recibirNoticias: true,
  };

  const mockFormDataWithoutMessage: FormDataDTO = {
    ...mockFormData,
    mensaje: undefined,
  };

  beforeEach(async () => {
    // Set environment variable for tests
    process.env.NOTIFICATION_EMAIL = 'test@example.com,admin@example.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormdataService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TwilioService,
          useValue: mockTwilioService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<FormdataService>(FormdataService);
    prismaService = module.get<PrismaService>(PrismaService);
    twilioService = module.get<TwilioService>(TwilioService);
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NOTIFICATION_EMAIL;
  });

  describe('createformdata', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create formdata successfully with message', async () => {
      const mockCreatedData = {
        id: '123',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      const result = await service.createformdata(mockFormData, '192.168.1.1');

      expect(result).toEqual(mockCreatedData);
      expect(mockPrismaService.contactForm.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Juan Carlos',
          apellido: 'García López',
          pais: 'España',
          ciudad: 'Madrid',
          empresa: 'TechCorp S.A.',
          cargo: 'Desarrollador Senior',
          email: 'juan.garcia@techcorp.com',
          telefono: '+34 612 345 678',
          mensaje: 'Estoy interesado en conocer más sobre sus servicios.',
          recibirNoticias: true,
        },
      });
      expect(mockMailerService.sendContactoForm).toHaveBeenCalled();
      expect(mockTwilioService.sendWhatsAppMessage).toHaveBeenCalled();
    });

    it('should create formdata successfully without message', async () => {
      const mockCreatedData = {
        id: '124',
        ...mockFormDataWithoutMessage,
        mensaje: null,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      const result = await service.createformdata(mockFormDataWithoutMessage, '192.168.1.1');

      expect(result).toEqual(mockCreatedData);
      expect(mockPrismaService.contactForm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mensaje: undefined,
        }),
      });
    });

    it('should sanitize text fields properly', async () => {
      const dirtyFormData: FormDataDTO = {
        ...mockFormData,
        nombre: '  Juan   Carlos  ',
        apellido: 'García<script>alert("xss")</script>López',
        empresa: 'TechCorp   &   Associates',
        mensaje: '  Este es un mensaje    con espacios   múltiples  ',
      };

      const mockCreatedData = {
        id: '125',
        ...dirtyFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(dirtyFormData, '192.168.1.1');

      expect(mockPrismaService.contactForm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Juan Carlos',
          apellido: 'Garcíascriptalert("xss")/scriptLópez',
          empresa: 'TechCorp & Associates',
          mensaje: 'Este es un mensaje con espacios múltiples',
        }),
      });
    });

    it('should normalize email to lowercase', async () => {
      const formDataWithUpperEmail: FormDataDTO = {
        ...mockFormData,
        email: 'JUAN.GARCIA@TECHCORP.COM',
      };

      const mockCreatedData = {
        id: '126',
        ...formDataWithUpperEmail,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(formDataWithUpperEmail, '192.168.1.1');

      expect(mockPrismaService.contactForm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'juan.garcia@techcorp.com',
        }),
      });
    });

    it('should detect spam patterns - identical name and surname', async () => {
      const spamFormData: FormDataDTO = {
        ...mockFormData,
        nombre: 'Test',
        apellido: 'Test',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '127',
        ...spamFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(spamFormData, '192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SPAM DETECTION] Posible spam detectado')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Nombre y apellido idénticos')
      );

      consoleSpy.mockRestore();
    });

    it('should detect spam patterns - excessive uppercase in message', async () => {
      const spamFormData: FormDataDTO = {
        ...mockFormData,
        mensaje: 'ESTE ES UN MENSAJE CON DEMASIADAS MAYÚSCULAS PARA SER NORMAL',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '128',
        ...spamFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(spamFormData, '192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SPAM DETECTION] Posible spam detectado')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Uso excesivo de mayúsculas')
      );

      consoleSpy.mockRestore();
    });

    it('should detect spam patterns - repetitive content', async () => {
      const spamFormData: FormDataDTO = {
        ...mockFormData,
        nombre: 'TestTestTest',
        apellido: 'SpamSpamSpam',
        mensaje: 'abcabcabcabc',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '129',
        ...spamFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(spamFormData, '192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SPAM DETECTION] Posible spam detectado')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Patrones de texto repetitivos detectados')
      );

      consoleSpy.mockRestore();
    });

    it('should NOT flag legitimate corporate email as spam', async () => {
      const legitimateFormData: FormDataDTO = {
        ...mockFormData,
        empresa: 'Consware',
        email: 'sfonseca@consware.com.co',
        mensaje: 'Estoy interesado en sus servicios de software.',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '130',
        ...legitimateFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(legitimateFormData, '192.168.1.1');

      // Verificar que NO se detectó como spam
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[SPAM DETECTION] Posible spam detectado')
      );

      consoleSpy.mockRestore();
    });

    it('should detect spam patterns - generic company names', async () => {
      const spamFormData: FormDataDTO = {
        ...mockFormData,
        empresa: 'test',
        mensaje: 'ESTO ES UN MENSAJE CON MUCHAS MAYÚSCULAS!!!',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '131',
        ...spamFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(spamFormData, '192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SPAM DETECTION] Posible spam detectado')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Nombre de empresa genérico o sospechoso')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Uso excesivo de mayúsculas')
      );

      consoleSpy.mockRestore();
    });

    it('should include suspicious flag in WhatsApp message when spam detected', async () => {
      const spamFormData: FormDataDTO = {
        ...mockFormData,
        nombre: 'Spam',
        apellido: 'Spam',
      };

      const mockCreatedData = {
        id: '130',
        ...spamFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(spamFormData, '192.168.1.1');

      expect(mockTwilioService.sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [Sospechoso de Spam]')
      );
      expect(mockTwilioService.sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.stringContaining('Nombre y apellido idénticos')
      );
    });

    it('should sanitize phone number properly', async () => {
      const formDataWithDirtyPhone: FormDataDTO = {
        ...mockFormData,
        telefono: '+34-612-345-678 ext. 123',
      };

      const mockCreatedData = {
        id: '131',
        ...formDataWithDirtyPhone,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(formDataWithDirtyPhone, '192.168.1.1');

      expect(mockPrismaService.contactForm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          telefono: '+34-612-345-678  123',
        }),
      });
    });

    it('should log security information with IP', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockCreatedData = {
        id: '132',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(mockFormData, '203.0.113.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FORM SUBMISSION] Nueva submission desde IP: 203.0.113.1')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FORM SUBMISSION] Email: juan.garcia@techcorp.com')
      );

      consoleSpy.mockRestore();
    });

    it('should include IP information in WhatsApp message', async () => {
      const mockCreatedData = {
        id: '133',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(mockFormData, '203.0.113.1');

      expect(mockTwilioService.sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.stringContaining('*IP:* 203.0.113.1')
      );
    });

    it('should handle multiple notification emails', async () => {
      const mockCreatedData = {
        id: '134',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockResolvedValue(true);

      await service.createformdata(mockFormData, '192.168.1.1');

      expect(mockMailerService.sendContactoForm).toHaveBeenCalledWith(
        ['test@example.com', 'admin@example.com'],
        expect.any(Object),
        expect.objectContaining({
          clientIp: '192.168.1.1',
          spamSuspicion: expect.any(Object)
        })
      );
    });

    it('should throw error when NOTIFICATION_EMAIL is not set', async () => {
      delete process.env.NOTIFICATION_EMAIL;

      const mockCreatedData = {
        id: '135',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);

      await expect(
        service.createformdata(mockFormData, '192.168.1.1')
      ).rejects.toThrow('NOTIFICATION_EMAIL is not defined in the environment variables');
    });

    it('should handle database errors properly', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const dbError = new Error('Database connection failed');

      mockPrismaService.contactForm.create.mockRejectedValue(dbError);

      await expect(
        service.createformdata(mockFormData, '192.168.1.1')
      ).rejects.toThrow('Database connection failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FORM ERROR] Error al procesar formulario desde IP:')
      );

      consoleSpy.mockRestore();
    });

    it('should handle mailer service errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockCreatedData = {
        id: '136',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockRejectedValue(new Error('Email service failed'));

      await expect(
        service.createformdata(mockFormData, '192.168.1.1')
      ).rejects.toThrow('Email service failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FORM ERROR] Error al procesar formulario desde IP:')
      );

      consoleSpy.mockRestore();
    });

    it('should handle twilio service errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockCreatedData = {
        id: '137',
        ...mockFormData,
        createdAt: new Date(),
      };

      mockPrismaService.contactForm.create.mockResolvedValue(mockCreatedData);
      mockMailerService.sendContactoForm.mockResolvedValue(true);
      mockTwilioService.sendWhatsAppMessage.mockRejectedValue(new Error('WhatsApp service failed'));

      await expect(
        service.createformdata(mockFormData, '192.168.1.1')
      ).rejects.toThrow('WhatsApp service failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FORM ERROR] Error al procesar formulario desde IP:')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Private Methods Testing', () => {
    it('should properly sanitize text with multiple spaces', () => {
      // Accessing private method for testing (TypeScript trick)
      const sanitized = (service as any).sanitizeText('  Test   text   with   spaces  ');
      expect(sanitized).toBe('Test text with spaces');
    });

    it('should remove HTML characters from text', () => {
      const sanitized = (service as any).sanitizeText('Test<script>alert("xss")</script>text');
      expect(sanitized).toBe('Testscriptalert("xss")/scripttext');
    });

    it('should return null for empty text', () => {
      const sanitized = (service as any).sanitizeText('');
      expect(sanitized).toBeNull();
    });

    it('should return null for undefined text', () => {
      const sanitized = (service as any).sanitizeText(undefined);
      expect(sanitized).toBeNull();
    });

    it('should sanitize phone numbers properly', () => {
      const sanitized = (service as any).sanitizePhone('+34-612-345-678 ext. 123');
      expect(sanitized).toBe('+34-612-345-678  123');
    });

    it('should detect spam patterns correctly', () => {
      const spamResult = (service as any).detectSpamPatterns({
        nombre: 'TestTestTest',
        apellido: 'TestTestTest',
        empresa: 'test',
        mensaje: 'ESTE ES UN MENSAJE CON MUCHAS MAYÚSCULAS!!!',
        email: 'test@test.com',
        telefono: '123456789',
        pais: 'España',
        ciudad: 'Madrid',
        cargo: 'Test',
        recibirNoticias: false
      });

      expect(spamResult.isSuspicious).toBe(true);
      expect(spamResult.reasons).toContain('Nombre y apellido idénticos');
      expect(spamResult.reasons).toContain('Patrones de texto repetitivos detectados');
      expect(spamResult.reasons).toContain('Uso excesivo de mayúsculas');
      expect(spamResult.reasons).toContain('Nombre de empresa genérico o sospechoso');
    });

    it('should not detect spam in normal content', () => {
      const spamResult = (service as any).detectSpamPatterns({
        nombre: 'Juan Carlos',
        apellido: 'García López',
        empresa: 'Consware',
        mensaje: 'Estoy interesado en conocer más sobre sus servicios.',
        email: 'sfonseca@consware.com.co',
        telefono: '+34 612 345 678',
        pais: 'España',
        ciudad: 'Madrid',
        cargo: 'Desarrollador',
        recibirNoticias: true
      });

      expect(spamResult.isSuspicious).toBe(false);
      expect(spamResult.reasons).toHaveLength(0);
    });

    it('should detect repeating patterns correctly', () => {
      expect((service as any).hasRepeatingPatterns('testtest')).toBe(false); // Muy corto
      expect((service as any).hasRepeatingPatterns('testtesttest')).toBe(true); // Repetitivo
      expect((service as any).hasRepeatingPatterns('abcabcabc')).toBe(true); // Repetitivo
      expect((service as any).hasRepeatingPatterns('Juan Carlos García')).toBe(false); // Normal
    });

    it('should detect excessive uppercase correctly', () => {
      expect((service as any).hasExcessiveUppercase('HELLO WORLD!!!')).toBe(true); // >60% mayúsculas
      expect((service as any).hasExcessiveUppercase('Hello World')).toBe(false); // Normal
      expect((service as any).hasExcessiveUppercase('Test')).toBe(false); // Muy corto
      expect((service as any).hasExcessiveUppercase('ESTO ES UN MENSAJE LARGO CON MAYÚSCULAS')).toBe(true); // Excesivo
    });
  });
});
