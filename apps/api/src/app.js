require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize, connectToDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev')); // HTTP request logger (silent during tests)
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static('public/uploads'));

// Health check route
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
const routes = require('./routes/index');
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.method} ${req.url} not found` 
    });
});

// Global Error Handler (consistent JSON shape + Sequelize error mapping)
const errorHandler = require('./middleware/error.middleware');
app.use(errorHandler);

// Start the server with database connection
const startServer = async () => {
    try {
        // Test database connection
        await connectToDatabase();
        
        // Start listening
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Don't bind a port (or hard-exit on DB failure) when imported by the test runner;
// supertest drives the exported `app` directly.
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;