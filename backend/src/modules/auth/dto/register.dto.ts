import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  // Datos del tenant
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  slug: string;

  // Datos del usuario owner
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}