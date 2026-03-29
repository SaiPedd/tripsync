import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  user: 'saisahasrapeddabuddi',
  host: 'localhost',
  database: 'tripsync',
  port: 5432,
});

// Generate random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new trip
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, destination, userId } = req.body;

    const inviteCode = generateInviteCode();

    // Create the trip
    const result = await pool.query(
      `INSERT INTO trips (name, destination, invite_code, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, destination, invite_code, created_at`,
      [name, destination, inviteCode, userId]
    );

    const trip = result.rows[0];

    // Add creator as a member with 'owner' role
    await pool.query(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [trip.id, userId]
    );

    res.json({ trip });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all trips for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT t.id, t.name, t.destination, t.invite_code, t.created_at, tm.role
       FROM trips t
       JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a trip with invite code
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { inviteCode, userId } = req.body;

    // Find the trip
    const tripResult = await pool.query(
      'SELECT id, name, destination FROM trips WHERE invite_code = $1',
      [inviteCode.toUpperCase()]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    // Check if already a member
    const memberCheck = await pool.query(
      'SELECT id FROM trip_members WHERE trip_id = $1 AND user_id = $2',
      [trip.id, userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this trip' });
    }

    // Add as member
    await pool.query(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, 'member')`,
      [trip.id, userId]
    );

    res.json({ trip });
  } catch (error) {
    console.error('Join trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;