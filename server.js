const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 8000;

// SQLite Database setup with domain constraint checks and indexes
const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');

    // Create users table with indexes
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        CONSTRAINT unique_name UNIQUE (first_name, last_name)
      );
    `);
  }
});

// Enable JSON parsing for POST requests
app.use(express.json());

// Define API endpoint for GET requests with multiple criteria
app.get('/get', (req, res) => {
  // Extract parameters from the request
  const { firstName, lastName } = req.query;

  // Construct the SQL query based on the provided criteria
  const query = 'SELECT * FROM users WHERE' +
    (firstName ? ' first_name = ?' : '') +
    (lastName ? (firstName ? ' AND' : '') + ' last_name = ?' : '');

  // Prepare the parameters for the SQL query
  const params = [];
  if (firstName) params.push(firstName);
  if (lastName) params.push(lastName);

  // Query the database based on the parameters
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Send the results in JSON format
    res.json({ results: rows });
  });
});

// Define API endpoint for POST requests to add information
app.post('/add', (req, res) => {
  // Extract data from the request body
  const { firstName, lastName } = req.body;

  // Validate the required fields
  if (!firstName || !lastName) {
    res.status(400).json({ error: 'Bad Request - Missing required fields' });
    return;
  }

  // Insert the data into the database
  db.run('INSERT INTO users (first_name, last_name) VALUES (?, ?)', [firstName, lastName], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Send the response with the inserted data
    res.json({ id: this.lastID, firstName, lastName });
  });
});

// Define API endpoint for PUT requests to update information
app.put('/update/:id', (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName } = req.body;

  // Validate the required fields
  if (!userId || !firstName || !lastName) {
    res.status(400).json({ error: 'Bad Request - Missing required fields' });
    return;
  }

  // Update the data in the database
  db.run('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, userId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if a row was affected (user with the given ID exists)
    if (this.changes === 0) {
      res.status(404).json({ error: 'Not Found - User not found' });
    } else {
      res.json({ id: userId, firstName, lastName });
    }
  });
});


// Define API endpoint for DELETE requests to delete information
app.delete('/delete/:id', (req, res) => {
  const userId = req.params.id;

  // Validate the required fields
  if (!userId) {
    res.status(400).json({ error: 'Bad Request - Missing user ID' });
    return;
  }

  // Delete the user from the database
  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Check if a row was affected (user with the given ID exists)
    if (this.changes === 0) {
      res.status(404).json({ error: 'Not Found - User not found' });
    } else {
      res.json({ message: 'User deleted successfully', id: userId });
    }
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
