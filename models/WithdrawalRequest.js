// E:/3dxTeam/CryptoBot/models/WithdrawalRequest.js
const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
    userId: { type: Number, required: true, index: true },
    username: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['USDT_BEP20', 'SYRIATEL_CASH'], required: true },
    walletAddress: { type: String, trim: true }, // No longer required
    phoneNumber: { type: String, trim: true },   // For Syriatel Cash
    status: { type: String, enum: ['open', 'approved', 'rejected'], default: 'open', index: true },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);