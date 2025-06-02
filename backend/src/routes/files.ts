import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { FileService } from '../services/FileService';
import { AuthService } from '../services/AuthService';

export function fileRoutes(
    dbService: DatabaseService, 
    fileService: FileService, 
    authService: AuthService
) {
    const router = Router();
    const upload = fileService.getMulterConfig();
    
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
    
    router.post('/upload', requireAuth, upload.single('file'), async (req: any, res) => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            
            const downloadToken = fileService.generateDownloadToken();
            
            await dbService.createFileRecord({
                user_id: req.user.userId,
                filename: req.file.filename,
                original_name: req.file.originalname,
                file_size: req.file.size,
                download_token: downloadToken
            });
            
            const downloadUrl = `${req.protocol}://${req.get('host')}/download/${downloadToken}`;
            
            res.json({
                message: 'File uploaded successfully',
                downloadUrl,
                filename: req.file.originalname,
                size: req.file.size
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    });
    
    return router;
}
