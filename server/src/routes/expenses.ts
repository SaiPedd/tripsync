import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  user: 'saisahasrapeddabuddi',
  host: 'localhost',
  database: 'tripsync',
  port: 5432,
});

// Add an expense
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { tripId, paidBy, amount, description, category, splitWith } = req.body;

    // Create the expense
    const expenseResult = await pool.query(
      `INSERT INTO expenses (trip_id, paid_by, amount, description, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, amount, description, category, created_at`,
      [tripId, paidBy, amount, description, category]
    );

    const expense = expenseResult.rows[0];
    const splitAmount = amount / splitWith.length;

    // Create splits for each person
    for (const userId of splitWith) {
      await pool.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, is_paid)
         VALUES ($1, $2, $3, $4)`,
        [expense.id, userId, splitAmount, userId === paidBy]
      );
    }

    res.json({ expense });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all expenses for a trip
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const result = await pool.query(
      `SELECT e.id, e.amount, e.description, e.category, e.created_at,
              u.name as paid_by_name, u.id as paid_by_id
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.trip_id = $1
       ORDER BY e.created_at DESC`,
      [tripId]
    );

    res.json({ expenses: result.rows });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get balances for a trip (who owes who)
router.get('/balances/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    // Get what each person paid
    const paidResult = await pool.query(
      `SELECT u.id, u.name, COALESCE(SUM(e.amount), 0) as total_paid
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN expenses e ON e.paid_by = u.id AND e.trip_id = $1
       WHERE tm.trip_id = $1
       GROUP BY u.id, u.name`,
      [tripId]
    );

    // Get what each person owes
    const owedResult = await pool.query(
      `SELECT u.id, u.name, COALESCE(SUM(es.amount_owed), 0) as total_owed
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN expense_splits es ON es.user_id = u.id
       LEFT JOIN expenses e ON es.expense_id = e.id AND e.trip_id = $1
       WHERE tm.trip_id = $1
       GROUP BY u.id, u.name`,
      [tripId]
    );

    // Calculate balances
    const balances = paidResult.rows.map(paid => {
      const owed = owedResult.rows.find(o => o.id === paid.id);
      const totalOwed = owed ? parseFloat(owed.total_owed) : 0;
      const totalPaid = parseFloat(paid.total_paid);
      return {
        userId: paid.id,
        name: paid.name,
        paid: totalPaid,
        owes: totalOwed,
        balance: totalPaid - totalOwed
      };
    });

    res.json({ balances });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get trip members (for splitting)
router.get('/members/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.name
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = $1`,
      [tripId]
    );

    res.json({ members: result.rows });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;