import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  user: 'saisahasrapeddabuddi',
  host: 'localhost',
  database: 'tripsync',
  port: 5432,
});

// Add a vote option (date or place suggestion)
router.post('/options', async (req: Request, res: Response) => {
  try {
    const { tripId, optionType, optionValue, userId } = req.body;

    const result = await pool.query(
      `INSERT INTO vote_options (trip_id, option_type, option_value, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, option_type, option_value, created_at`,
      [tripId, optionType, optionValue, userId]
    );

    res.json({ option: result.rows[0] });
  } catch (error) {
    console.error('Add option error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all options for a trip
router.get('/options/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const result = await pool.query(
      `SELECT vo.id, vo.option_type, vo.option_value, vo.created_at,
              u.name as created_by_name,
              COUNT(v.id) as vote_count
       FROM vote_options vo
       LEFT JOIN users u ON vo.created_by = u.id
       LEFT JOIN votes v ON vo.id = v.option_id
       WHERE vo.trip_id = $1
       GROUP BY vo.id, u.name
       ORDER BY vote_count DESC, vo.created_at DESC`,
      [tripId]
    );

    res.json({ options: result.rows });
  } catch (error) {
    console.error('Get options error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on an option
router.post('/vote', async (req: Request, res: Response) => {
  try {
    const { optionId, userId } = req.body;

    // Check if already voted
    const existingVote = await pool.query(
      'SELECT id FROM votes WHERE option_id = $1 AND user_id = $2',
      [optionId, userId]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote (toggle off)
      await pool.query(
        'DELETE FROM votes WHERE option_id = $1 AND user_id = $2',
        [optionId, userId]
      );
      res.json({ voted: false });
    } else {
      // Add vote
      await pool.query(
        'INSERT INTO votes (option_id, user_id) VALUES ($1, $2)',
        [optionId, userId]
      );
      res.json({ voted: true });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's votes for a trip
router.get('/user-votes/:tripId/:userId', async (req: Request, res: Response) => {
  try {
    const { tripId, userId } = req.params;

    const result = await pool.query(
      `SELECT vo.id as option_id
       FROM votes v
       JOIN vote_options vo ON v.option_id = vo.id
       WHERE vo.trip_id = $1 AND v.user_id = $2`,
      [tripId, userId]
    );

    const votedOptionIds = result.rows.map(row => row.option_id);
    res.json({ votedOptionIds });
  } catch (error) {
    console.error('Get user votes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;