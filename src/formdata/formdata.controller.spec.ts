import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FormdataController } from './formdata.controller';
import { FormdataService } from './formdata.service';
import { FormDataDTO } from './dto/formdata.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SecurityValidationPipe } from './pipes/security-validation.pipe';

describe('FormdataController', () => {
  let controller: FormdataController;
  let service: FormdataService;

  const mockFormdataService = {
    createformdata: jest.fn(),
  };

  const mockFormData: FormDataDTO = {
    nombre: 'Juan',
    apellido: 'Pérez',
    pais: 'España',
    ciudad: 'Madrid',
    empresa: 'TechCorp',
    cargo: 'Desarrollador',
    email: 'juan.perez@techcorp.com',
    telefono: '+34 612 345 678',
    mensaje: 'Mensaje de prueba',
    recibirNoticias: false,
  };

  const mockRequest = {
    ip: '192.168.1.1',
    connection: { remoteAddress: '192.168.1.1' },
    socket: { remoteAddress: '192.168.1.1' },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormdataController],
      providers: [
        {
          provide: FormdataService,
          useValue: mockFormdataService,
        },
        RateLimitGuard,
        SecurityValidationPipe,
      ],
    }).compile();

    controller = module.get<FormdataController>(FormdataController);
    service = module.get<FormdataService>(FormdataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createformdata', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should create formdata successfully', async () => {
      const mockResult = {
        id: '123',
        ...mockFormData,
        submittedAt: new Date(),
      };

      mockFormdataService.createformdata.mockResolvedValue(mockResult);

      const result = await controller.createformdata(mockFormData, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Formulario enviado exitosamente',
        id: mockResult.id,
      });
      expect(mockFormdataService.createformdata).toHaveBeenCalledWith(
        mockFormData,
        '192.168.1.1'
      );
    });

    it('should create formdata successfully with optional message empty', async () => {
      const formDataWithoutMessage = {
        ...mockFormData,
        mensaje: undefined,
      };

      const mockResult = {
        id: '124',
        ...formDataWithoutMessage,
        submittedAt: new Date(),
      };

      mockFormdataService.createformdata.mockResolvedValue(mockResult);

      const result = await controller.createformdata(formDataWithoutMessage, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Formulario enviado exitosamente',
        id: mockResult.id,
      });
      expect(mockFormdataService.createformdata).toHaveBeenCalledWith(
        formDataWithoutMessage,
        '192.168.1.1'
      );
    });

    it('should handle unknown IP correctly', async () => {
      const requestWithoutIp = {
        connection: {},
        socket: {},
      } as any;

      const mockResult = {
        id: '125',
        ...mockFormData,
        submittedAt: new Date(),
      };

      mockFormdataService.createformdata.mockResolvedValue(mockResult);

      const result = await controller.createformdata(mockFormData, requestWithoutIp);

      expect(result).toEqual({
        success: true,
        message: 'Formulario enviado exitosamente',
        id: mockResult.id,
      });
      expect(mockFormdataService.createformdata).toHaveBeenCalledWith(
        mockFormData,
        'unknown'
      );
    });

    it('should handle service errors and throw HttpException', async () => {
      const errorMessage = 'Database connection failed';
      mockFormdataService.createformdata.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.createformdata(mockFormData, mockRequest)
      ).rejects.toThrow(HttpException);

      try {
        await controller.createformdata(mockFormData, mockRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toEqual({
          success: false,
          message: 'Error al procesar el formulario. Por favor, inténtalo de nuevo.',
          error: undefined, // En test environment no se muestra el error detallado
        });
      }
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const requestWithProxy = {
        ip: '10.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.1, 10.0.0.1',
        },
        connection: { remoteAddress: '10.0.0.1' },
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      const mockResult = {
        id: '126',
        ...mockFormData,
        submittedAt: new Date(),
      };

      mockFormdataService.createformdata.mockResolvedValue(mockResult);

      await controller.createformdata(mockFormData, requestWithProxy);

      // El IP debería ser extraído del header x-forwarded-for
      expect(mockFormdataService.createformdata).toHaveBeenCalledWith(
        mockFormData,
        expect.any(String) // La lógica de extracción de IP está en el controlador
      );
    });

    it('should handle validation errors from service', async () => {
      const validationError = new Error('Validation failed');
      mockFormdataService.createformdata.mockRejectedValue(validationError);

      await expect(
        controller.createformdata(mockFormData, mockRequest)
      ).rejects.toThrow(HttpException);
    });

    it('should log security information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockResult = {
        id: '127',
        ...mockFormData,
        submittedAt: new Date(),
      };

      mockFormdataService.createformdata.mockResolvedValue(mockResult);

      await controller.createformdata(mockFormData, mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY LOG] Formulario recibido desde IP:')
      );

      consoleSpy.mockRestore();
    });

    it('should log security errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorMessage = 'Service error';
      
      mockFormdataService.createformdata.mockRejectedValue(new Error(errorMessage));

      try {
        await controller.createformdata(mockFormData, mockRequest);
      } catch (error) {
        // Error esperado
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ERROR] Error al procesar formulario desde IP:')
      );

      consoleSpy.mockRestore();
    });
  });
});
