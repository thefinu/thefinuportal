import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import transactionRoutes from './routes/transactionRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import plaidRoutes from './routes/plaidRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import planRoutes from './routes/planRoutes.js';

console.log('Starting server...');
dotenv.config();
console.log('Dotenv configured');

const app = express();
console.log('Express app initialized');
const PORT = process.env.PORT || 5000;
console.log(`Port defined: ${PORT}`);

// Middleware
// Stripe webhook needs raw body for signature verification — must be before express.json()
app.use('/api/payment/stripe-webhook', express.raw({ type: 'application/json' }));
app.use('/payment/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const allowedOrigins = [
    'https://thefinu.com',
    'https://www.thefinu.com',
    'https://admin.thefinu.com',
    'http://localhost:3000',
    'http://localhost:3001',
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
const apiRouter = express.Router();
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/payment', paymentRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/contact', contactRoutes);
apiRouter.use('/plaid', plaidRoutes);
apiRouter.use('/content', contentRoutes);
apiRouter.use('/plans', planRoutes);

app.get('/', (req, res) => {
    res.send('Financial Portal API is running');
});

// Database Connection — connect before accepting API requests
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

// Track DB readiness so the health check can pass while routes wait
let dbReady = false;

// Health check responds immediately (Cloud Run requirement), but API routes
// return 503 until MongoDB is connected.
app.use('/api', (req, res, next) => {
    if (!dbReady) {
        return res.status(503).json({ message: 'Database is connecting, please retry shortly' });
    }
    next();
});

app.use('/api', apiRouter);

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        dbReady = true;
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Start server — health check (GET /) works immediately, API routes gate on dbReady
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
