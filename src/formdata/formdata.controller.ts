import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { FormdataService } from './formdata.service';
import { FormDataDTO } from './dto/formdata.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SecurityValidationPipe } from './pipes/security-validation.pipe';

@ApiTags('Formulario de Contacto')
@Controller('formdata')
export class FormdataController {
  constructor(private readonly formdataService: FormdataService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @UsePipes(new SecurityValidationPipe())
  @ApiOperation({ 
    summary: 'Crear formulario de contacto',
    description: 'Endpoint para enviar formularios de contacto. Incluye validaciones de seguridad y rate limiting.'
  })
  @ApiBody({ 
    type: FormDataDTO,
    description: 'Datos del formulario de contacto'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Formulario enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        id: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos'
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Demasiadas solicitudes - Rate limit excedido'
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error interno del servidor'
  })
  async createformdata(
    @Body() formdata: FormDataDTO,
    @Req() request: Request
  ) {
    try {
      // Obtener IP del cliente para logging
      const clientIp = request.ip || 
                      request.connection.remoteAddress || 
                      request.socket.remoteAddress ||
                      'unknown';

      // Log de seguridad
      console.log(`[SECURITY LOG] Formulario recibido desde IP: ${clientIp} - ${new Date().toISOString()}`);
      
      const result = await this.formdataService.createformdata(formdata, clientIp);
      
      return {
        success: true,
        message: 'Formulario enviado exitosamente',
        id: result.id
      };
      
    } catch (error) {
      console.error(`[SECURITY ERROR] Error al procesar formulario desde IP: ${request.ip} - ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Error al procesar el formulario. Por favor, inténtalo de nuevo.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
