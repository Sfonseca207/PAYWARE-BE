import { ApiProperty } from '@nestjs/swagger';
export class FormData {

    @ApiProperty()
    id: string;

    @ApiProperty()
    nombre: string;

    @ApiProperty()
    apellido: string;

    @ApiProperty()
    pais: string;

    @ApiProperty()
    ciudad: string;

    @ApiProperty()
    empresa: string;

    @ApiProperty()
    cargo: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    telefono: string;

    @ApiProperty()
    mensaje: string;

    @ApiProperty()
    recibirNoticias: boolean;

}