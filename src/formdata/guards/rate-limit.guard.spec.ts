import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  const createMockExecutionContext = (ip: string, headers: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          headers,
          connection: { remoteAddress: ip },
          socket: { remoteAddress: ip },
        }),
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitGuard],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(() => {
    // Clear the internal requests map after each test
    (guard as any).requests.clear();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow first request from new IP', () => {
      const context = createMockExecutionContext('192.168.1.1');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE LIMIT] Nueva sesión para IP: 192.168.1.1')
      );

      consoleSpy.mockRestore();
    });

    it('should allow multiple requests within limit', () => {
      const context = createMockExecutionContext('192.168.1.1');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First request
      expect(guard.canActivate(context)).toBe(true);
      
      // Second request
      expect(guard.canActivate(context)).toBe(true);
      
      // Third request
      expect(guard.canActivate(context)).toBe(true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE LIMIT] IP: 192.168.1.1 - Solicitudes: 2/5')
      );

      consoleSpy.mockRestore();
    });

    it('should block requests when limit exceeded', () => {
      const context = createMockExecutionContext('192.168.1.1');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      // The 6th request should be blocked
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        
        const response = error.getResponse();
        expect(response).toEqual({
          success: false,
          message: 'Demasiadas solicitudes. Por favor, espera antes de enviar otro formulario.',
          retryAfter: expect.any(Number),
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE LIMIT EXCEEDED] IP: 192.168.1.1 - Solicitudes: 5/5')
      );

      consoleSpy.mockRestore();
    });

    it('should handle different IPs independently', () => {
      const context1 = createMockExecutionContext('192.168.1.1');
      const context2 = createMockExecutionContext('192.168.1.2');

      // IP 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        expect(guard.canActivate(context1)).toBe(true);
      }

      // IP 2 should still be allowed
      expect(guard.canActivate(context2)).toBe(true);

      // IP 1 should be blocked
      expect(() => guard.canActivate(context1)).toThrow(HttpException);
    });

    it('should extract IP from x-forwarded-for header', () => {
      const context = createMockExecutionContext('10.0.0.1', {
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      guard.canActivate(context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('203.0.113.1')
      );

      consoleSpy.mockRestore();
    });

    it('should extract IP from x-real-ip header', () => {
      const context = createMockExecutionContext('10.0.0.1', {
        'x-real-ip': '203.0.113.2',
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      guard.canActivate(context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('203.0.113.2')
      );

      consoleSpy.mockRestore();
    });

    it('should extract IP from x-client-ip header', () => {
      const context = createMockExecutionContext('10.0.0.1', {
        'x-client-ip': '203.0.113.3',
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      guard.canActivate(context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('203.0.113.3')
      );

      consoleSpy.mockRestore();
    });

    it('should fall back to unknown IP when no IP available', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            connection: {},
            socket: {},
          }),
        }),
      } as ExecutionContext;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      guard.canActivate(context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown')
      );

      consoleSpy.mockRestore();
    });

    it('should reset counter after time window expires', () => {
      const context = createMockExecutionContext('192.168.1.1');
      
      // Make initial request
      expect(guard.canActivate(context)).toBe(true);

      // Manually expire the time window by manipulating the internal state
      const requests = (guard as any).requests;
      const clientData = requests.get('192.168.1.1');
      clientData.resetTime = Date.now() - 1000; // Set to past time

      // Next request should reset the counter
      expect(guard.canActivate(context)).toBe(true);

      // Should be treated as first request again
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      expect(guard.canActivate(context)).toBe(true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE LIMIT] IP: 192.168.1.1 - Solicitudes: 2/5')
      );

      consoleSpy.mockRestore();
    });

    it('should handle malformed x-forwarded-for header', () => {
      const context = createMockExecutionContext('10.0.0.1', {
        'x-forwarded-for': '',
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      guard.canActivate(context);

      // Should fall back to request.ip
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('10.0.0.1')
      );

      consoleSpy.mockRestore();
    });

    it('should log rate limit tracking correctly', () => {
      const context = createMockExecutionContext('192.168.1.1');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First request
      guard.canActivate(context);
      expect(consoleSpy).toHaveBeenCalledWith('[RATE LIMIT] Nueva sesión para IP: 192.168.1.1');

      // Second request
      guard.canActivate(context);
      expect(consoleSpy).toHaveBeenCalledWith('[RATE LIMIT] IP: 192.168.1.1 - Solicitudes: 2/5');

      // Third request
      guard.canActivate(context);
      expect(consoleSpy).toHaveBeenCalledWith('[RATE LIMIT] IP: 192.168.1.1 - Solicitudes: 3/5');

      consoleSpy.mockRestore();
    });
  });
});
