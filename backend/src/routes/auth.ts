import { Router } from 'express';
import { AuthService } from '../services/AuthService';

export function authRoutes(authService: AuthService) {
    const router = Router();
    
    router.post('/register', async (req: any, res: any) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }
            
            if (username.length < 3 || password.length < 6) {
                return res.status(400).json({ 
                    error: 'Username must be at least 3 characters and password at least 6 characters' 
                });
            }
            
            await authService.registerUser(username, password);
            res.json({ message: 'User registered successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/login', async (req: any, res: any) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }
            
            const token = await authService.loginUser(username, password);
            res.json({ token });
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    });
    
    return router;
}