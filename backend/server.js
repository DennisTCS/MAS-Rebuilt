const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dataRoutes = require('./routes/dataRoutes');

// Initialize the app
const app = express();

// --- MIDDLEWARE SECTION ---

// 1. Define the list of allowed frontend origins (whitelist)
const allowedOrigins = [
  'http://localhost:3000', // Your local React app
  'https://YOUR_NETLIFY_SITE_NAME.netlify.app' // The live Netlify URL (you will replace this placeholder later)
];

// 2. Set up CORS options
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// 3. Enable CORS with your specific options
app.use(cors(corsOptions));

// 4. Enable the server to parse and understand incoming JSON bodies.
app.use(express.json());


// --- CONNECT TO MONGODB ---
// Use an environment variable for your MongoDB URI for security
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error(err));


// --- ROUTES ---
app.get('/', (req, res) => {
    res.send('Welcome to the Timetable API');
});

// Use the imported routes
app.use('/api/data', dataRoutes);


// --- DEFINE PORT AND START SERVER ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));