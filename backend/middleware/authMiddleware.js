const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'No auth token, access denied' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'TitanSecret');
        if (!verified) {
            return res.status(401).json({ success: false, message: 'Token verification failed, authorization denied' });
        }

        req.user = verified.id;
        req.userRole = verified.role;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = authMiddleware;
