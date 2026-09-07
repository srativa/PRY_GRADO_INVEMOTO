import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from '../usuario/usuario.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // HU-02 (inicio de sesión) + HU-03 (validación de credenciales).
  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const usuario = await this.usuarioService.buscarPorCorreoConRelaciones(
      dto.correo,
    );

    // Mensaje genérico en todos los casos de fallo: no revelar si el correo
    // existe o si fue la contraseña la que falló.
    const credencialesInvalidas = () =>
      new UnauthorizedException('Correo o contraseña incorrectos.');

    if (
      !usuario ||
      usuario.estado !== 'ACTIVO' ||
      usuario.empresa.estado !== 'ACTIVO'
    ) {
      throw credencialesInvalidas();
    }

    const passwordValida = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );
    if (!passwordValida) {
      throw credencialesInvalidas();
    }

    const payload: JwtPayload = {
      sub: usuario.idUsuario,
      idEmpresa: usuario.idEmpresa,
      rol: usuario.rol.codigo,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
    };
  }
}
