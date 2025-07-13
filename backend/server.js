// server.js with Enhanced Logging

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dataRoutes = require('./routes/dataRoutes');

console.log('Server script starting...');

// Initialize the app
const app = express();
console.log('Express app initialized.');

// --- MIDDLEWARE SECTION ---

// Define the list of allowed frontend origins (whitelist)
const allowedOrigins = [
  'http://localhost:3000',
  'https://mas-rebuilt.netlify.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
console.log('CORS middleware enabled.');

app.use(express.json());
console.log('JSON middleware enabled.');


// --- CONNECT TO MONGODB ---
console.log('Attempting to connect to MongoDB...');
const MONGO_URI = process.env.MONGO_URI;

// Security check: Log if the URI exists but mask the password
if (MONGO_URI) {
  console.log('MONGO_URI found.');
} else {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1); // Exit if the URI is not found
}

mongoose.connect(MONGO_URI)
    .then(() => {
        // This is the message we want to see
        console.log('SUCCESS: MongoDB Connected.');

        // The server should only start listening AFTER the database is connected.
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`SUCCESS: Server is running and listening on port ${PORT}`));

    })
    .catch(err => {
        // This will tell us if the connection itself is failing
        console.error('ERROR: MongoDB connection failed. Error details below:');
        console.error(err);
        process.exit(1); // Exit the process if we can't connect to the DB
    });


// --- ROUTES ---
app.get('/', (req, res) => {
    res.send('Welcome to the Timetable API');
});

// Use the imported routes
app.use('/api/data', dataRoutes);
console.log('API routes configured.');