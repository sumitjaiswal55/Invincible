const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: String,
    role: { type: String, enum: ['Student', 'Bachelor', 'Owner'], default: 'Bachelor' },
    baseLocationName: String,
    baseCoordinates: {
        lat: Number,
        lng: Number
    },

    trustScore: { type: Number, default: 5.0 },

    preferences: {
        isVeg: { type: Boolean, default: false },
        smokingAllowed: { type: Boolean, default: false },
        maxBudget: Number
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);