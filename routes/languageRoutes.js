const express = require('express');
const router = express.Router();
const Language = require('../models/Language');

// Get all language entries
router.get('/', async (req, res) => {
  try {
    const languages = await Language.find({});
    res.json({ success: true, data: languages });
  } catch (err) {
    console.error('Error fetching languages:', err);
    res.status(500).json({ success: false, message: 'Error fetching languages', error: err.message });
  }
});

module.exports = router;
