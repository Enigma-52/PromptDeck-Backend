import express from 'express';
import { getGreeting } from '../services/testService.js';

const router = express.Router();

router.get('/greeting', async (req, res) => {
  try {
    const name = req.query.name;
    const greeting = await getGreeting(name);
    res.json(greeting);
  } catch (error) {
    console.error('Error in /test/greeting:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;