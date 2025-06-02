import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class FileService {
    private uploadDir: string;
    
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    
    getMulterConfig() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });
        
        return multer({
            storage,
            limits: {
                fileSize: 100 * 1024 * 1024 // 100MB
            },
            fileFilter: (req, file, cb) => {
                // Запрещаем потенциально опасные файлы
                const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
                const ext = path.extname(file.originalname).toLowerCase();
                
                if (dangerousExtensions.includes(ext)) {
                    cb(new Error('File type not allowed'));
                } else {
                    cb(null, true);
                }
            }
        });
    }
    
    generateDownloadToken(): string {
        return uuidv4();
    }
    
    getFilePath(filename: string): string {
        return path.join(this.uploadDir, filename);
    }
    
    deleteFile(filename: string): boolean {
        try {
            const filePath = this.getFilePath(filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }
    
    fileExists(filename: string): boolean {
        return fs.existsSync(this.getFilePath(filename));
    }
}
