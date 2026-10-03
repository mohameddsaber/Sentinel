import { Injectable,NotFoundException } from '@nestjs/common';
export type User = {
    id: number;
    name: string;
    email: string;
    hashedPassword: string;
}

@Injectable()
export class UsersService 
{
    private users:User[] = [];
    private nextId = 1;

    async createUser(name: string, email: string, hashedPassword: string): Promise<User> 
    {
        const user: User = {
            id: this.nextId++,
            name,
            email: email?.toLowerCase(),
            hashedPassword
        };
        this.users.push(user);
        return user;
    }
    async findByEmail(email: string): Promise<User | undefined>
    {
        try {
            const user = this.users.find(user => user.email === email);
            return user;
        } catch (error) {
            throw new NotFoundException(`User with email ${email} not found`);
        }
    }
    async findAll(): Promise<User[]>
    {
        return this.users;
    }
}
