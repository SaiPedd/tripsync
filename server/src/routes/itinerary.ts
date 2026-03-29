import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  user: 'saisahasrapeddabuddi',
  host: 'localhost',
  database: 'tripsync',
  port: 5432,
});

// Create a day for the trip
router.post('/days', async (req: Request, res: Response) => {
  try {
    const { tripId, dayNumber, date } = req.body;

    const result = await pool.query(
      `INSERT INTO itinerary_days (trip_id, day_number, date)
       VALUES ($1, $2, $3)
       RETURNING id, day_number, date`,
      [tripId, dayNumber, date || null]
    );

    res.json({ day: result.rows[0] });
  } catch (error) {
    console.error('Create day error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all days and activities for a trip
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    // Get days
    const daysResult = await pool.query(
      `SELECT id, day_number, date FROM itinerary_days 
       WHERE trip_id = $1 ORDER BY day_number`,
      [tripId]
    );

    // Get activities for each day
    const days = await Promise.all(
      daysResult.rows.map(async (day) => {
        const activitiesResult = await pool.query(
          `SELECT a.id, a.title, a.description, a.start_time, a.end_time, 
                  a.location, a.cost_estimate, a.order_index, u.name as created_by_name
           FROM activities a
           LEFT JOIN users u ON a.created_by = u.id
           WHERE a.day_id = $1
           ORDER BY a.order_index, a.start_time`,
          [day.id]
        );
        return { ...day, activities: activitiesResult.rows };
      })
    );

    res.json({ days });
  } catch (error) {
    console.error('Get itinerary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add activity to a day
router.post('/activities', async (req: Request, res: Response) => {
  try {
    const { dayId, title, description, startTime, endTime, location, costEstimate, userId } = req.body;

    // Get the next order index
    const orderResult = await pool.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM activities WHERE day_id = $1`,
      [dayId]
    );
    const orderIndex = orderResult.rows[0].next_order;

    const result = await pool.query(
      `INSERT INTO activities (day_id, title, description, start_time, end_time, location, cost_estimate, order_index, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, description, start_time, end_time, location, cost_estimate, order_index`,
      [dayId, title, description || null, startTime || null, endTime || null, location || null, costEstimate || null, orderIndex, userId]
    );

    res.json({ activity: result.rows[0] });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete activity
router.delete('/activities/:activityId', async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;

    await pool.query('DELETE FROM activities WHERE id = $1', [activityId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete day (and all its activities)
router.delete('/days/:dayId', async (req: Request, res: Response) => {
  try {
    const { dayId } = req.params;

    await pool.query('DELETE FROM itinerary_days WHERE id = $1', [dayId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete day error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;