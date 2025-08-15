const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');

// Initialize cities (for one-time setup)
router.get('/init', async (req, res) => {
    try {
        await cityController.initializeCities();
        res.json({ message: 'Cities initialized successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error initializing cities' });
    }
});

// Get all cities
router.get('/', cityController.getAllCities);

// Update city fees
router.put('/', cityController.updateCityFees);

module.exports = router;
