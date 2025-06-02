import { CronJob } from 'cron';
import { DatabaseService } from './DatabaseService';
import { FileService } from './FileService';

export class CleanupService {
    private job: CronJob;
    
    constructor(
        private dbService: DatabaseService,
        private fileService: FileService
    ) {
        this.job = new CronJob('0 0 * * *', () => {
            this.cleanupExpiredFiles();
        });
    }
    
    start(): void {
        this.job.start();
        console.log('Cleanup service scheduled to run daily at midnight');
    }
    
    stop(): void {
        this.job.stop();
    }
    
    async cleanupExpiredFiles(): Promise<void> {
        try {
            console.log('Starting cleanup of expired files...');
            
            const expiredFiles = await this.dbService.getExpiredFiles();
            let deletedCount = 0;
            
            for (const file of expiredFiles) {
                try {
                    const deleted = this.fileService.deleteFile(file.filename);
                    if (deleted) {
                        await this.dbService.deactivateFile(file.id);
                        deletedCount++;
                        console.log(`Deleted expired file: ${file.original_name}`);
                    }
                } catch (error) {
                    console.error(`Error deleting file ${file.filename}:`, error);
                }
            }
            
            console.log(`Cleanup completed. Deleted ${deletedCount} expired files.`);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}