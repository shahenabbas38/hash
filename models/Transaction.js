const mongoose = require('mongoose');

// Define the Transaction Schema
const transactionSchema = new mongoose.Schema({
    userId: {
        type: Number, // Corresponds to the telegramId of the User
        required: true,
        index: true // Index for faster lookups related to a specific user
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'referral_commission'], // Type of transaction
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0 // Transaction amount cannot be negative
    },
    // For deposits and withdrawals via blockchain
    txHash: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple documents to have null or missing txHash
        trim: true
    },
    // For withdrawals
    walletAddress: {
        type: String,
        trim: true,
        // Only required for withdrawal transactions
        required: function() { return this.type === 'withdrawal'; }
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], // Only track pending/completed/failed
        default: 'pending'
    },
    description: {
        type: String,
        trim: true // Optional description for the transaction
    },
    // For referral commissions, store who earned it from whose deposit
    commissionFromUserId: {
        type: Number, // The Telegram ID of the user whose deposit generated this commission
        required: function() { return this.type === 'referral_commission'; }
    },
    commissionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: function() { return this.type === 'referral_commission'; }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Create the Transaction model from the schema
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;

