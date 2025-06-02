import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { FileService } from '../services/FileService';

export function downloadRoutes(dbService: DatabaseService, fileService: FileService) {
    const router = Router();
    
    // Используем просто :token без /download в пути
    router.get('/:token', async (req, res) => {
        try {
            const { token } = req.params;
            
            const fileRecord = await dbService.getFileByToken(token);
            if (!fileRecord) {
                return res.status(404).json({ 
                    error: 'File not found',
                    details: 'The file may have expired or been deleted'
                });
            }
            
            const filePath = fileService.getFilePath(fileRecord.filename);
            
            // Обновляем статистику скачиваний
            await dbService.updateFileDownload(fileRecord.id);
            
            res.download(filePath, fileRecord.original_name, (err) => {
                if (err) {
                    console.error('Download failed:', err);
                    res.status(500).json({ error: 'File download failed' });
                }
            });
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    return router;
}