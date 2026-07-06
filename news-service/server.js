const express = require('express');
const { Pool } = require('pg');
const { connect } = require('nats');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres-service',
  port: 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DB || 'news'
});

// NATS connection
let natsClient;
async function connectNATS() {
  try {
    natsClient = await connect({
      servers: process.env.NATS_URL || 'nats://nats-service:4222'
    });
    console.log('✅ Connected to NATS');
  } catch (error) {
    console.error('❌ NATS connection error:', error.message);
  }
}
connectNATS();

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL');
    release();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'News Service',
    timestamp: new Date().toISOString()
  });
});

// GET all news (without join - just return category_id)
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single news
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create news
app.post('/', async (req, res) => {
  try {
    const { title, content, category_id } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO news (title, content, category_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content || '', category_id || null]
    );
    
    // Publish to NATS
    if (natsClient) {
      const message = {
        event: 'news.created',
        data: result.rows[0],
        timestamp: new Date().toISOString()
      };
      natsClient.publish('news.created', JSON.stringify(message));
      console.log('📨 Published to NATS:', message);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update news
app.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category_id } = req.body;
    
    const result = await pool.query(
      'UPDATE news SET title = $1, content = $2, category_id = $3 WHERE id = $4 RETURNING *',
      [title, content, category_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE news
app.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 News Service running on port ${PORT}`);
});
