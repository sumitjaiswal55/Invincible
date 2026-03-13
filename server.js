const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sujal06tiwari_db_user:kvzGWFjXQcugGQY4@invencible.5ookquu.mongodb.net/?appName=invencible";
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
    }
});

// Mock AI Explain Endpoint
app.post('/api/explain', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    const mockExplanations = [
        "This code appears to be a program that operates with a function. It uses console.log for output and demonstrates basic programming concepts. The code is syntactically correct and ready to run. You can click \"Run Code\" to see the output.",
        "The provided code snippet shows variable declarations and logic flow. Output generation is present. This is a good example of basic programming. Feel free to modify it and re-run!",
        "This code contains proper syntax and uses standard methods. It is ready for execution. You can enhance it by adding more complex logic, functions, or algorithms."
    ];
    const randomExplanation = mockExplanations[Math.floor(Math.random() * mockExplanations.length)];
    
    setTimeout(() => {
        res.json({ explanation: randomExplanation });
    }, 1500);
});

// Piston Code Execution API mapping
const pistonLanguageMap = {
    'javascript': { language: 'javascript', version: '18.15.0' },
    'python': { language: 'python', version: '3.10.0' },
    'cpp': { language: 'c++', version: '10.2.0' }
};

app.post('/api/execute', async (req, res) => {
    const { language, code } = req.body;
    
    if (!language || !pistonLanguageMap[language]) {
        return res.status(400).json({ error: 'Unsupported language' });
    }

    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: pistonLanguageMap[language].language,
            version: pistonLanguageMap[language].version,
            files: [{ content: code }],
        });
        
        const result = response.data.run;
        if (result.stderr) {
            res.json({ output: result.stderr });
        } else {
            res.json({ output: result.stdout || "Code executed successfully (no output)" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

// Auth Routes
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ userId: newUser._id, username }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ message: 'User registered successfully', token, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ message: 'Login successful', token, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Socket.io for Real-time collaboration
const userSocketMap = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            name: userSocketMap[socketId]
        };
    });
}

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
        userSocketMap[socket.id] = username || 'Anonymous';
        socket.join(roomId);
        
        const clients = getAllConnectedClients(roomId);
        io.to(roomId).emit('room-users', clients);
        
        socket.to(roomId).emit('user-joined', {
            socketId: socket.id,
            name: userSocketMap[socket.id]
        });
    });

    socket.on('code-change', ({ roomId, code }) => {
        socket.to(roomId).emit('receive-code', code);
    });
    
    socket.on('language-change', ({ roomId, language }) => {
        socket.to(roomId).emit('receive-language', language);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('user-left', {
                    socketId: socket.id,
                    name: userSocketMap[socket.id]
                });
            }
        });
    });

    socket.on('disconnect', () => {
        delete userSocketMap[socket.id];
        console.log('User Disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));