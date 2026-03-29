import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import voteRoutes from './routes/votes';
import aiRoutes from './routes/ai';
import expenseRoutes from './routes/expenses';
import itineraryRoutes from './routes/itinerary';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/trips', tripRoutes);
app.use('/votes', voteRoutes);
app.use('/ai', aiRoutes);
app.use('/expenses', expenseRoutes);
app.use('/itinerary', itineraryRoutes);

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TripSync server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});