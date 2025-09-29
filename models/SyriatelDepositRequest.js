// E:/3dxTeam/CryptoBot/models/SyriatelDepositRequest.js
const mongoose = require('mongoose');

const syriatelDepositRequestSchema = new mongoose.Schema({
    userId: { type: Number, required: true, index: true },
    username: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    processId: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'approved', 'rejected'], default: 'open', index: true },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
});

module.exports = mongoose.model('SyriatelDepositRequest', syriatelDepositRequestSchema);