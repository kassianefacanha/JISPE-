const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const entityRoutes = require('./routes/entity');
const athleteRoutes = require('./routes/athlete');
const adminRoutes = require('./routes/admin');
const modalityRoutes = require('./routes/modality');
const publicRoutes = require('./routes/public');
const reportRoutes = require('./routes/report');

const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
  app.set('trust proxy', 1);
}

const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production' ? [] : developmentOrigins;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em 15 minutos.',
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? ':method :status :response-time ms' : 'dev'));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'JISPE API online' });
});

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/modalities', modalityRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'A rota solicitada não foi encontrada.' });
});

app.use(errorHandler);

module.exports = app;
