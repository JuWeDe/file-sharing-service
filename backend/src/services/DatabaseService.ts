import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at: string;
}

export interface FileRecord {
    id: number;
    user_id: number;
    filename: string;
    original_name: string;
    file_size: number;
    download_token: string;
    upload_date: string;
    last_download: string | null;
    download_count: number;
    is_active: boolean;
}

export class DatabaseService {
    private db: sqlite3.Database;
    
    constructor() {
        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const dbPath = path.join(dataDir, 'database.sqlite');
        this.db = new sqlite3.Database(dbPath);
    }
    
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS files (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        filename TEXT NOT NULL,
                        original_name TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        download_token TEXT UNIQUE NOT NULL,
                        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_download DATETIME,
                        download_count INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }
    
    async createUser(username: string, passwordHash: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
            stmt.run([username, passwordHash], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    
    async getUserByUsername(username: string): Promise<User | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row: User) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }
    
    async createFileRecord(fileData: Omit<FileRecord, 'id' | 'upload_date' | 'last_download' | 'download_count' | 'is_active'>): Promise<number> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO files (user_id, filename, original_name, file_size, download_token)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run([
                fileData.user_id,
                fileData.filename,
                fileData.original_name,
                fileData.file_size,
                fileData.download_token
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    
    async getFileByToken(token: string): Promise<FileRecord | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM files WHERE download_token = ? AND is_active = 1',
                [token],
                (err, row: FileRecord) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }
    
    async updateFileDownload(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE files 
                SET download_count = download_count + 1, last_download = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            stmt.run([id], (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    }
    
    async getExpiredFiles(): Promise<FileRecord[]> {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM files 
                WHERE is_active = 1 
                AND (
                    last_download IS NULL AND datetime(upload_date, '+30 days') < datetime('now')
                    OR last_download IS NOT NULL AND datetime(last_download, '+30 days') < datetime('now')
                )
            `;
            
            this.db.all(query, (err, rows: FileRecord[]) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
    
    async deactivateFile(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('UPDATE files SET is_active = 0 WHERE id = ?');
            stmt.run([id], (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    }
    
    async getUserStats(userId: number): Promise<{totalFiles: number, totalSize: number, totalDownloads: number}> {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as totalFiles,
                    COALESCE(SUM(file_size), 0) as totalSize,
                    COALESCE(SUM(download_count), 0) as totalDownloads
                FROM files 
                WHERE user_id = ? AND is_active = 1
            `;
            
            this.db.get(query, [userId], (err, row: any) => {
                if (err) reject(err);
                else resolve({
                    totalFiles: row.totalFiles || 0,
                    totalSize: row.totalSize || 0,
                    totalDownloads: row.totalDownloads || 0
                });
            });
        });
    }
}
