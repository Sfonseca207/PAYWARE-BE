import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = 5; // Máximo 5 solicitudes
  private readonly windowMs = 15 * 60 * 1000; // Ventana de 15 minutos

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    
    const now = Date.now();
    const clientData = this.requests.get(clientIp);

    // Limpiar datos expirados
    if (clientData && now > clientData.resetTime) {
      this.requests.delete(clientIp);
    }

    const currentData = this.requests.get(clientIp);

    if (!currentData) {
      // Primera solicitud del cliente
      this.requests.set(clientIp, {
        count: 1,
        resetTime: now + this.windowMs
      });
      
      console.log(`[RATE LIMIT] Nueva sesión para IP: ${clientIp}`);
      return true;
    }

    if (currentData.count >= this.maxRequests) {
      console.log(`[RATE LIMIT EXCEEDED] IP: ${clientIp} - Solicitudes: ${currentData.count}/${this.maxRequests}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Demasiadas solicitudes. Por favor, espera antes de enviar otro formulario.',
          retryAfter: Math.ceil((currentData.resetTime - now) / 1000)
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Incrementar contador
    currentData.count++;
    this.requests.set(clientIp, currentData);
    
    console.log(`[RATE LIMIT] IP: ${clientIp} - Solicitudes: ${currentData.count}/${this.maxRequests}`);
    return true;
  }

  private getClientIp(request: Request): string {
    // Intentar obtener la IP real del cliente considerando proxies
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    const clientIp = request.headers['x-client-ip'] as string;
    
    return forwarded?.split(',')[0] || 
           realIp || 
           clientIp || 
           request.ip || 
           request.connection.remoteAddress || 
           request.socket.remoteAddress ||
           'unknown';
  }

  // Método para limpiar datos expirados (opcional, para optimización)
  private cleanupExpiredData(): void {
    const now = Date.now();
    for (const [ip, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}
