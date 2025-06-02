import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';

export function statsRoutes(dbService: DatabaseService, authService: AuthService) {
    const router = Router();
    
    // Auth middleware
    const requireAuth = (req: any, res: any, next: any) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            
            const decoded = authService.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };
    
    router.get('/stats', requireAuth, async (req: any, res) => {
        try {
            const stats = await dbService.getUserStats(req.user.userId);
            res.json(stats);
        } catch (error) {
            console.error('Stats error:', error);
            res.status(500).json({ error: 'Failed to load stats' });
        }
    });
    
    return router;
}