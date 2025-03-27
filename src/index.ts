import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable

app.use(cors());
app.use(express.json()); // Parse JSON requests

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Create the ads table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT NOT NULL,
        price REAL NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('buy', 'sell'))
      )
    `);
  }
});

// Define the Ad type (matches frontend)
interface Ad {
  id: number;
  user: string;
  price: number;
  amount: number;
  type: 'buy' | 'sell';
}

// GET /ads - List all ads
const getAds: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  db.all('SELECT * FROM ads', [], (err, rows: Ad[]) => {
    if (err) {
      console.error('Error fetching ads:', err.message);
      res.status(500).json({ error: 'Failed to fetch ads' });
      return;
    }
    res.json(rows);
  });
};
app.get('/ads', getAds);

// POST /ads - Create a new ad
const createAd: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const { user, price, amount, type } = req.body as {
    user: string;
    price: number;
    amount: number;
    type: 'buy' | 'sell';
  };

  // Basic validation
  if (!user || !price || !amount || !['buy', 'sell'].includes(type)) {
    res.status(400).json({ error: 'Invalid ad data' });
    return;
  }

  const newAd: Ad = {
    id: 0, // Will be set by SQLite AUTOINCREMENT
    user,
    price: parseFloat(String(price)),
    amount: parseFloat(String(amount)),
    type,
  };

  db.run(
    'INSERT INTO ads (user, price, amount, type) VALUES (?, ?, ?, ?)',
    [newAd.user, newAd.price, newAd.amount, newAd.type],
    function (err) {
      if (err) {
        console.error('Error creating ad:', err.message);
        res.status(500).json({ error: 'Failed to create ad' });
        return;
      }
      // Set the ID of the new ad (this.lastID is the last inserted ID)
      newAd.id = this.lastID;
      res.status(201).json(newAd); // 201 = Created
    }
  );
};
app.post('/ads', createAd);

// Root route for testing
const root: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  res.send('P2P Crypto Backend is running!');
};
app.get('/', root);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Close the database connection when the server stops
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});