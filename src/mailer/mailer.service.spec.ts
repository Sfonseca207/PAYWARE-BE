import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from './mailer.service';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

describe('MailerService', () => {
  let service: MailerService;
  let nestMailerService: NestMailerService;

  const mockNestMailerService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        {
          provide: NestMailerService,
          useValue: mockNestMailerService,
        },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
    nestMailerService = module.get<NestMailerService>(NestMailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send email without security info', async () => {
    const formData = {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@example.com',
      telefono: '+1234567890',
      empresa: 'Test Corp',
      cargo: 'Developer',
      pais: 'España',
      ciudad: 'Madrid',
      mensaje: 'Test message',
      recibirNoticias: true
    };

    mockNestMailerService.sendMail.mockResolvedValue(true);

    await service.sendContactoForm('test@example.com', formData);

    expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: '📥 Nuevo Formulario de Contacto ',
      html: expect.stringContaining('Nuevo Formulario de Contacto')
    });
  });

  it('should send email with security info and spam alert', async () => {
    const formData = {
      nombre: 'Test',
      apellido: 'Test',
      email: 'test@test.com',
      telefono: '+1234567890',
      empresa: 'test',
      cargo: 'test',
      pais: 'España',
      ciudad: 'Madrid',
      mensaje: 'SPAM MESSAGE WITH CAPS',
      recibirNoticias: false
    };

    const securityInfo = {
      clientIp: '192.168.1.1',
      spamSuspicion: {
        isSuspicious: true,
        reasons: ['Nombre y apellido idénticos', 'Uso excesivo de mayúsculas']
      }
    };

    mockNestMailerService.sendMail.mockResolvedValue(true);

    await service.sendContactoForm(['admin@example.com'], formData, securityInfo);

    expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
      to: ['admin@example.com'],
      subject: '📥 Nuevo Formulario de Contacto ⚠️ [Sospechoso de Spam]',
      html: expect.stringMatching(/⚠️.*Sospechoso de Spam.*Información de Seguridad.*IP de origen.*192\.168\.1\.1.*Alertas de seguridad.*Nombre y apellido idénticos/s)
    });
  });

  it('should send email with security info but no spam detected', async () => {
    const formData = {
      nombre: 'Juan Carlos',
      apellido: 'García',
      email: 'juan@consware.com',
      telefono: '+34612345678',
      empresa: 'Consware',
      cargo: 'Developer',
      pais: 'España',
      ciudad: 'Madrid',
      mensaje: 'Legitimate message',
      recibirNoticias: true
    };

    const securityInfo = {
      clientIp: '203.0.113.1',
      spamSuspicion: {
        isSuspicious: false,
        reasons: []
      }
    };

    mockNestMailerService.sendMail.mockResolvedValue(true);

    await service.sendContactoForm('admin@company.com', formData, securityInfo);

    expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
      to: 'admin@company.com',
      subject: '📥 Nuevo Formulario de Contacto ',
      html: expect.stringMatching(/Información de Seguridad.*IP de origen.*203\.0\.113\.1/s)
    });

    // Verificar que NO incluye alertas de spam
    const call = mockNestMailerService.sendMail.mock.calls[0][0];
    expect(call.html).not.toContain('Alertas de seguridad');
    expect(call.subject).not.toContain('Sospechoso de Spam');
  });

  it('should handle email sending errors', async () => {
    const formData = {
      nombre: 'Test',
      email: 'test@test.com'
    };

    mockNestMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'));

    await expect(
      service.sendContactoForm('test@example.com', formData)
    ).rejects.toThrow('SMTP Error');
  });
});
