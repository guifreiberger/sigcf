import type { Request } from 'express';
import { Perfil } from '../usuarios/perfil.enum.js';

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  perfil: Perfil;
}

export interface PayloadJwt {
  sub: number;
  nome: string;
  perfil: Perfil;
}

export interface RequisicaoAutenticada extends Request {
  usuario: UsuarioAutenticado;
}
