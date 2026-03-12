const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserSchema');

// 1. SIGNUP / REGISTER API
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, baseLocationName, baseCoordinates, preferences } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            baseLocationName,
            baseCoordinates,
            preferences
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "User created based on your custom schema!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. User find karo
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, msg: "User not found" });

        // 2. Password check karo
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, msg: "Invalid credentials" });

        // 3. Token generate karo
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "TitanSecret",
            { expiresIn: '1d' }
        );

        // 4. Password ko remove karke baaki data bhejo
        const { password: pw, ...userData } = user._doc;

        res.status(200).json({
            success: true,
            token,
            user: userData // Isme ab preferences aur coordinates bhi aayenge
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

/// 
