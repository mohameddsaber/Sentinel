import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
