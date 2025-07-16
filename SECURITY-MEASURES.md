# Medidas de Seguridad - Formulario de Contacto

## Resumen de Implementación

Este documento describe las medidas de seguridad implementadas para proteger el formulario de contacto contra sabotaje, spam y ataques maliciosos, considerando que los usuarios pueden completarlo sin estar registrados.

## 🛡️ Medidas de Seguridad Implementadas

### 1. Validación de Entrada Mejorada (DTO)

**Archivo:** `src/formdata/dto/formdata.dto.ts`

#### Mejoras implementadas:
- ✅ **Validación de longitud**: Límites mínimos y máximos para todos los campos
- ✅ **Expresiones regulares**: Patrones específicos para cada tipo de campo
- ✅ **Sanitización automática**: Eliminación de espacios extra y caracteres peligrosos
- ✅ **Validación de email**: Formato RFC compliant
- ✅ **Transformaciones**: Normalización automática de datos (trim, lowercase para emails)
- ✅ **Mensajes de error específicos**: Feedback claro al usuario

#### Límites establecidos:
- Nombre/Apellido: 2-50 caracteres, solo letras y espacios
- País: 2-56 caracteres, letras, espacios y guiones
- Ciudad: 2-85 caracteres, letras, espacios, guiones y puntos
- Empresa: 2-100 caracteres, alfanuméricos básicos
- Cargo: 2-80 caracteres, letras, espacios y puntos
- Email: Hasta 254 caracteres, formato válido
- Teléfono: 8-20 caracteres, formato internacional
- Mensaje: 0-120 caracteres (opcional), caracteres básicos de texto

### 2. Rate Limiting

**Archivo:** `src/formdata/guards/rate-limit.guard.ts`

#### Características:
- ✅ **Límite por IP**: Máximo 5 solicitudes por IP cada 15 minutos
- ✅ **Ventana deslizante**: Reset automático de contadores
- ✅ **Detección de proxy**: Obtención de IP real considerando headers de proxy
- ✅ **Logging de seguridad**: Registro de intentos de rate limiting
- ✅ **Respuesta estructurada**: Información del tiempo de espera al usuario

### 3. Pipe de Validación de Seguridad

**Archivo:** `src/formdata/pipes/security-validation.pipe.ts`

#### Protecciones implementadas:
- ✅ **Detección SQL Injection**: Patrones de consultas maliciosas
- ✅ **Detección XSS**: Scripts y eventos JavaScript
- ✅ **Filtro de URLs sospechosas**: Ejecutables y enlaces cortos
- ✅ **Control de payload**: Límite de tamaño total
- ✅ **Detección de caracteres de control**: Caracteres no imprimibles
- ✅ **Filtro de emails desechables**: Lista de dominios temporales conocidos
- ✅ **Límite de enlaces**: Máximo 2 URLs por mensaje

### 4. Detección de Spam y Contenido Sospechoso

**Archivo:** `src/formdata/formdata.service.ts`

#### Algoritmos implementados:
- ✅ **Análisis de patrones repetitivos**: Detección de contenido duplicado
- ✅ **Ratio de mayúsculas**: Identificación de texto "gritado"
- ✅ **Validación de coherencia**: Verificación nombre/apellido idénticos
- ✅ **Análisis de longitud**: Detección de mensajes excesivamente largos
- ✅ **Correlación email/empresa**: Identificación de patrones sospechosos

### 5. Logging y Monitoreo de Seguridad

#### Eventos registrados:
- ✅ **Submissions de formulario**: IP, timestamp, datos básicos
- ✅ **Violaciones de rate limit**: IP, contador de intentos
- ✅ **Detección de spam**: Razones específicas y patrones detectados
- ✅ **Errores de validación**: Tipos de errores y datos problemáticos
- ✅ **Actividad sospechosa**: Patrones de ataque detectados

### 6. Sanitización de Datos

#### Procesos aplicados:
- ✅ **Normalización de espacios**: Eliminación de espacios múltiples
- ✅ **Eliminación de caracteres HTML**: Prevención de inyección básica
- ✅ **Normalización de email**: Conversión a minúsculas
- ✅ **Limpieza de teléfono**: Solo caracteres telefónicos válidos
- ✅ **Límites de longitud adicionales**: Truncado automático como fallback

## 🚨 Alertas y Notificaciones

### Sistema de Alertas Implementado:
- **Formularios sospechosos**: Marcados con ⚠️ en notificaciones
- **Información de IP**: Incluida en notificaciones de WhatsApp y email
- **Razones de sospecha**: Detalladas en logs y notificaciones

## 📋 Configuración Adicional Recomendada

### A nivel de servidor/infraestructura:
1. **Firewall Web Application (WAF)**: Cloudflare, AWS WAF
2. **Rate limiting adicional**: Nginx, Apache nivel servidor
3. **Monitoreo de IPs**: Fail2ban para IPs maliciosas
4. **HTTPS obligatorio**: Certificados SSL/TLS
5. **Headers de seguridad**: CORS, CSP, HSTS

### Variables de entorno recomendadas:
```env
# Rate limiting
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_MS=900000

# Seguridad
ENABLE_SPAM_DETECTION=true
ENABLE_SECURITY_LOGGING=true
BLOCK_DISPOSABLE_EMAILS=true

# Notificaciones
NOTIFICATION_EMAIL=admin@empresa.com
SECURITY_ALERT_EMAIL=security@empresa.com
```

### Base de datos - Campos adicionales recomendados:
```sql
-- Agregar a la tabla de formularios
ALTER TABLE contactForm ADD COLUMN submitter_ip VARCHAR(45);
ALTER TABLE contactForm ADD COLUMN is_suspicious BOOLEAN DEFAULT FALSE;
ALTER TABLE contactForm ADD COLUMN spam_score INTEGER DEFAULT 0;
ALTER TABLE contactForm ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

## 🔧 Mantenimiento

### Tareas regulares:
1. **Revisar logs de seguridad**: Diariamente
2. **Actualizar lista de dominios desechables**: Mensualmente
3. **Ajustar umbrales de spam**: Según necesidad
4. **Monitorear rate limiting**: Semanalmente
5. **Backup de logs de seguridad**: Diariamente

### Métricas a monitorear:
- Formularios bloqueados por rate limiting
- Detecciones de spam
- IPs más activas
- Patrones de horarios de envío
- Dominios de email más frecuentes

## 🚀 Próximos Pasos Recomendados

1. **Implementar CAPTCHA**: Google reCAPTCHA v3 para verificación adicional
2. **Lista negra de IPs**: Sistema automático de bloqueo
3. **Análisis geográfico**: Restricciones por país si aplica
4. **Machine Learning**: Modelo de detección de spam más avanzado
5. **Honeypot fields**: Campos ocultos para detectar bots
6. **Rate limiting dinámico**: Ajustes automáticos según patrones

## 📞 Contacto y Soporte

Para reportar problemas de seguridad o sugerir mejoras, contactar al equipo de desarrollo.

---
**Última actualización:** Julio 2025
**Versión:** 1.0
**Estado:** Implementado y en producción
