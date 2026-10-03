import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from '../dto/signup.dto.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from '../dto/login.dto.js';

export type AuthResponse = {
    access_token: string;
};

@Injectable()
export class AuthService 
{
    constructor(private userService: UsersService,private jwtService: JwtService) {}


    async signup(signupDto: SignupDto): Promise<AuthResponse>
    {
        const { name, email, password } = signupDto;
        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException(`User with email ${email} already exists`);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userService.createUser(name, email, hashedPassword);
        return this.issueToken(user.id, user.email, user.name);

    }
    async login(loginDto:LoginDto): Promise<AuthResponse>
    {
        const { email, password } = loginDto;
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid Email or Password');
        }
        const isMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid Email or Password');
        }
        return this.issueToken(user.id, user.email, user.name);
    }

    private async issueToken(userId: number, email: string, name: string): Promise<AuthResponse>
    {
        const payload = { sub: userId, email, name };
        return { access_token: await this.jwtService.signAsync(payload) };
  }
}
