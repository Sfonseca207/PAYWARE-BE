/**
 * Configuración de Seguridad para Formularios
 * 
 * Este archivo contiene las configuraciones y constantes relacionadas con
 * la seguridad del formulario de contacto para prevenir ataques y sabotaje.
 */

export const SECURITY_CONFIG = {
  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 5,           // Máximo 5 solicitudes por ventana
    WINDOW_MS: 15 * 60 * 1000, // Ventana de 15 minutos
    CLEANUP_INTERVAL: 60 * 1000 // Limpiar cada minuto
  },

  // Validación de campos
  FIELD_LIMITS: {
    NOMBRE: { min: 2, max: 50 },
    APELLIDO: { min: 2, max: 50 },
    PAIS: { min: 2, max: 56 },
    CIUDAD: { min: 2, max: 85 },
    EMPRESA: { min: 2, max: 100 },
    CARGO: { min: 2, max: 80 },
    EMAIL: { max: 254 },
    TELEFONO: { min: 8, max: 20 },
    MENSAJE: { min: 0, max: 120 }
  },

  // Patrones de seguridad
  PATTERNS: {
    // Solo letras y espacios para nombres
    NOMBRES: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/,
    
    // Letras, espacios y guiones para ubicaciones
    UBICACION: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\-\.]+$/,
    
    // Empresa puede incluir números y símbolos básicos
    EMPRESA: /^[a-zA-ZÀ-ÿ\u00f1\u00d10-9\s\-\.\&]+$/,
    
    // Teléfono internacional
    TELEFONO: /^[\+]?[0-9\s\-\(\)]+$/,
    
    // Email válido
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // Mensaje con caracteres básicos
    MENSAJE: /^[a-zA-ZÀ-ÿ\u00f1\u00d10-9\s\.\,\!\?\-\:\;\(\)\"\'\n\r]+$/
  },

  // Dominios de email desechables conocidos
  DISPOSABLE_EMAIL_DOMAINS: [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'temp-mail.org',
    'throwaway.email',
    'getnada.com',
    'tempmailaddress.com',
    'emailondeck.com'
  ],

  // Palabras/frases sospechosas para detectar spam
  SPAM_KEYWORDS: [
    'viagra',
    'casino',
    'lottery',
    'winner',
    'congratulations',
    'click here',
    'act now',
    'limited time',
    'make money',
    'work from home',
    'guarantee',
    'no risk',
    'credit card'
  ],

  // Configuración de logging de seguridad
  LOGGING: {
    LOG_SUSPICIOUS_ACTIVITY: true,
    LOG_RATE_LIMIT_HITS: true,
    LOG_VALIDATION_ERRORS: true,
    LOG_SPAM_DETECTION: true
  }
};

/**
 * Utilidades de seguridad
 */
export class SecurityUtils {
  
  /**
   * Sanitiza texto básico removiendo caracteres peligrosos
   */
  static sanitizeText(text: string): string {
    if (!text) return text;
    
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>'"&]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Verifica si un email pertenece a un dominio desechable
   */
  static isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? SECURITY_CONFIG.DISPOSABLE_EMAIL_DOMAINS.includes(domain) : false;
  }

  /**
   * Detecta posibles palabras spam en el contenido
   */
  static containsSpamKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return SECURITY_CONFIG.SPAM_KEYWORDS.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Calcula el ratio de mayúsculas en un texto
   */
  static getUpperCaseRatio(text: string): number {
    if (!text || text.length === 0) return 0;
    const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
    return upperCaseCount / text.length;
  }

  /**
   * Verifica si hay patrones repetitivos sospechosos
   */
  static hasRepetitivePatterns(text: string): boolean {
    // Busca patrones de 3+ caracteres repetidos 3+ veces
    return /(.{3,})\1{3,}/.test(text);
  }

  /**
   * Extrae y cuenta URLs en un texto
   */
  static countUrls(text: string): number {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const matches = text.match(urlRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Obtiene la IP real del cliente considerando proxies
   */
  static getRealClientIp(headers: any, remoteAddress: string): string {
    const forwarded = headers['x-forwarded-for'];
    const realIp = headers['x-real-ip'];
    const clientIp = headers['x-client-ip'];
    
    return (forwarded && forwarded.split(',')[0]) || 
           realIp || 
           clientIp || 
           remoteAddress || 
           'unknown';
  }
}

/**
 * Códigos de error de seguridad
 */
export enum SecurityErrorCodes {
  SUSPICIOUS_CONTENT = 'SUSPICIOUS_CONTENT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  FIELD_TOO_LONG = 'FIELD_TOO_LONG',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  TOO_MANY_LINKS = 'TOO_MANY_LINKS',
  DISPOSABLE_EMAIL = 'DISPOSABLE_EMAIL',
  SPAM_DETECTED = 'SPAM_DETECTED'
}
