import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { DatabaseService } from "./services/DatabaseService";
import { FileService } from "./services/FileService";
import { AuthService } from "./services/AuthService";
import { CleanupService } from "./services/CleanupService";
import { authRoutes } from "./routes/auth";
import { fileRoutes } from "./routes/files";
import { statsRoutes } from "./routes/stats";
import { downloadRoutes } from "./routes/download";

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация сервисов
const dbService = new DatabaseService();
const fileService = new FileService();
const authService = new AuthService(dbService);
const cleanupService = new CleanupService(dbService, fileService);

// Базовые middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Подключение роутов
app.use("/api/auth", authRoutes(authService));
app.use("/api/files", fileRoutes(dbService, fileService, authService));
app.use("/api/stats", statsRoutes(dbService, authService));
app.use("/download", downloadRoutes(dbService, fileService));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Обработка ошибок
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.use(cors({
  origin: 'http://127.0.0.1:5500', // Или другой порт, если используете
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Запуск сервера
app.listen(PORT, async () => {
  try {
    await dbService.initialize();
    cleanupService.start();
    console.log(`Server running on port ${PORT}`);
    console.log("Database initialized");
    console.log("Cleanup service started");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
});

export default app;
