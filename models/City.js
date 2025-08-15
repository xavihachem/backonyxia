const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    desktopFee: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    houseFee: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Index handled via field definition (unique: true)

const City = mongoose.model('City', citySchema);

module.exports = City;
