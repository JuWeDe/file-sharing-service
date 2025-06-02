import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './DatabaseService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export class AuthService {
    constructor(private dbService: DatabaseService) {}
    
    async registerUser(username: string, password: string): Promise<number> {
        const existingUser = await this.dbService.getUserByUsername(username);
        if (existingUser) {
            throw new Error('User already exists');
        }
        
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        return await this.dbService.createUser(username, passwordHash);
    }
    
    async loginUser(username: string, password: string): Promise<string> {
        const user = await this.dbService.getUserByUsername(username);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        return token;
    }
    
    verifyToken(token: string): { userId: number; username: string } {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return { userId: decoded.userId, username: decoded.username };
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
}