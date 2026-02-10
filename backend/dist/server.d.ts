declare class GPSRaporServer {
    private app;
    private server;
    private io;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupSocketIO;
    private setupErrorHandling;
    private initializeDatabase;
    start(): Promise<void>;
    private shutdown;
}
export default GPSRaporServer;
//# sourceMappingURL=server.d.ts.map