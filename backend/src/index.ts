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
import plaidProxyRoutes from './routes/plaidProxyRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import planRoutes from './routes/planRoutes.js';
import { rateLimit } from './middleware/rateLimit.js';

console.log('Starting server...');
dotenv.config();
console.log('Dotenv configured');

const app = express();
// Cloud Run sits behind one Google front end. Trust it so req.ip is the client's
// address, which the rate limits below are keyed on.
app.set('trust proxy', 1);
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

// Rate limits on unauthenticated endpoints that cost something per call: password
// guessing, outbound email and Stripe lookups. Held in memory per instance, so across
// several Cloud Run instances they limit each one separately.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));
app.use('/api/payment/verify-session', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/payment/create-website-checkout', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

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
// Server-side Plaid calls for the add-on. Mounted before plaidRoutes on the same path:
// the two use different sub-paths, and anything this router does not handle falls
// through to the existing usage and pricing routes.
apiRouter.use('/plaid', plaidProxyRoutes);
apiRouter.use('/plaid', plaidRoutes);
apiRouter.use('/content', contentRoutes);
apiRouter.use('/plans', planRoutes);

app.get('/', (req, res) => {
    res.send('Financial Portal API is running');
});

app.use('/api', apiRouter);

// Start server immediately so Cloud Run health check passes
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
