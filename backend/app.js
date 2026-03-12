const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Environment variables load karne ke liye

// User Model Import karein
const User = require('./models/UserSchema');
const authRoutes = require("./routes/auth");
const app = express();

const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:5173', // Vite ka URL
    credentials: true
}));

// Middleware (handle JSON data)
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => console.error('❌ DB Connection Error:', err));


// --- API ROUTES ---

// 1. Create User (Register)
app.use('/api/auth', authRoutes);


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// New things added
