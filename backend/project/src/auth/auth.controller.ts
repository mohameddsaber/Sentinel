import { Controller, Post,Body,Res } from '@nestjs/common';
import { AuthResponse, AuthService } from './auth.service.js';
import { SignupDto } from '../dto/signup.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { type Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
    @Post('signup')
    async  signup(@Body() signupDto: SignupDto): Promise<AuthResponse> 
    {
      const res = await this.authService.signup(signupDto);
      return res;
    }

    @Post('login')
    async  login(
      @Body() loginDto: LoginDto ,
      @Res({ passthrough: true }) response: Response): Promise<AuthResponse> 
    {
      const res = await this.authService.login(loginDto);
      response.cookie('access_token', res.access_token, 
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      return res;
    }
    @Post ('logout')
    async logout(@Res({ passthrough: true }) response: Response): Promise<{ message: string }> 
    {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    
      return { message: 'Logged out successfully' };
    }
  
}
