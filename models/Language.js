const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  en: { type: String, default: '' },
  ar: { type: String, default: '' }
}, {
  timestamps: true
});

const Language = mongoose.model('Language', languageSchema);
module.exports = Language;
