import { ApiProperty } from "@nestjs/swagger";
import { 
    IsNotEmpty, 
    IsString, 
    Length, 
    IsEmail, 
    Matches,
    IsBoolean,
    IsOptional,
    MaxLength,
    MinLength
} from "class-validator";
import { Transform } from "class-transformer";

export class FormDataDTO{

    @IsNotEmpty({ message: 'El nombre es requerido' })
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, { 
        message: 'El nombre solo puede contener letras y espacios' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Nombre del usuario',
        example: 'Juan Carlos',
        minLength: 2,
        maxLength: 50
    })
    nombre: string;

    @IsNotEmpty({ message: 'El apellido es requerido' })
    @IsString({ message: 'El apellido debe ser una cadena de texto' })
    @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, { 
        message: 'El apellido solo puede contener letras y espacios' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Apellido del usuario',
        example: 'García López',
        minLength: 2,
        maxLength: 50
    })
    apellido: string;

    @IsNotEmpty({ message: 'El país es requerido' })
    @IsString({ message: 'El país debe ser una cadena de texto' })
    @MinLength(2, { message: 'El país debe tener al menos 2 caracteres' })
    @MaxLength(56, { message: 'El país no puede exceder 56 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\-]+$/, { 
        message: 'El país solo puede contener letras, espacios y guiones' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'País del usuario',
        example: 'España',
        minLength: 2,
        maxLength: 56
    })
    pais: string;

    @IsNotEmpty({ message: 'La ciudad es requerida' })
    @IsString({ message: 'La ciudad debe ser una cadena de texto' })
    @MinLength(2, { message: 'La ciudad debe tener al menos 2 caracteres' })
    @MaxLength(85, { message: 'La ciudad no puede exceder 85 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\-\.]+$/, { 
        message: 'La ciudad solo puede contener letras, espacios, guiones y puntos' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Ciudad del usuario',
        example: 'Madrid',
        minLength: 2,
        maxLength: 85
    })
    ciudad: string;

    @IsNotEmpty({ message: 'La empresa es requerida' })
    @IsString({ message: 'La empresa debe ser una cadena de texto' })
    @MinLength(2, { message: 'La empresa debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'La empresa no puede exceder 100 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d10-9\s\-\.\&]+$/, { 
        message: 'La empresa solo puede contener letras, números, espacios, guiones, puntos y &' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Empresa del usuario',
        example: 'TechCorp S.A.',
        minLength: 2,
        maxLength: 100
    })
    empresa: string;

    @IsNotEmpty({ message: 'El cargo es requerido' })
    @IsString({ message: 'El cargo debe ser una cadena de texto' })
    @MinLength(2, { message: 'El cargo debe tener al menos 2 caracteres' })
    @MaxLength(80, { message: 'El cargo no puede exceder 80 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\-\.]+$/, { 
        message: 'El cargo solo puede contener letras, espacios, guiones y puntos' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Cargo del usuario',
        example: 'Desarrollador Senior',
        minLength: 2,
        maxLength: 80
    })
    cargo: string;

    @IsNotEmpty({ message: 'El email es requerido' })
    @IsEmail({}, { message: 'Debe proporcionar un email válido' })
    @MaxLength(254, { message: 'El email no puede exceder 254 caracteres' })
    @Transform(({ value }) => value?.trim().toLowerCase())
    @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
        message: 'El formato del email no es válido'
    })
    @ApiProperty({ 
        description: 'Email del usuario',
        example: 'usuario@ejemplo.com',
        format: 'email',
        maxLength: 254
    })
    email: string;

    @IsNotEmpty({ message: 'El teléfono es requerido' })
    @IsString({ message: 'El teléfono debe ser una cadena de texto' })
    @MinLength(8, { message: 'El teléfono debe tener al menos 8 caracteres' })
    @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
    @Matches(/^[\+]?[0-9\s\-\(\)]+$/, { 
        message: 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el símbolo +' 
    })
    @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
    @ApiProperty({ 
        description: 'Teléfono del usuario',
        example: '+34 612 345 678',
        minLength: 8,
        maxLength: 20
    })
    telefono: string;

    @IsOptional()
    @IsString({ message: 'El mensaje debe ser una cadena de texto' })
    @MaxLength(120, { message: 'El mensaje no puede exceder 120 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d10-9\s\.\,\!\?\-\:\;\(\)\"\'\n\r]*$/, { 
        message: 'El mensaje contiene caracteres no permitidos' 
    })
    @Transform(({ value }) => value ? value.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n') : value)
    @ApiProperty({ 
        description: 'Mensaje del usuario (opcional)',
        example: 'Estoy interesado en conocer más sobre sus servicios...',
        required: false,
        maxLength: 120
    })
    mensaje?: string;

    @IsOptional()
    @IsBoolean({ message: 'Recibir noticias debe ser verdadero o falso' })
    @Transform(({ value }) => value === 'true' || value === true)
    @ApiProperty({ 
        description: 'Indica si el usuario desea recibir noticias',
        example: false,
        required: false,
        default: false
    })
    recibirNoticias?: boolean;

}