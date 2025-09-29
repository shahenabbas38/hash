const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

// Define the User Schema
const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    unique: true,
    required: true,
    index: true // Index for faster lookups
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents to have null or missing username
    trim: true    // Remove whitespace from beginning/end of the string
  },
  password: {
    type: String,
    required: true,
    select: false // Do not return password by default on queries
  },
  balance: {
    type: Number,
    default: 0,
    min: 0 // Balance cannot be negative
  },

  // === Loyalty fields ===
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  lastLoyaltyClaimAt: {
    type: Date,
    default: null
  },

  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true, // Store referral codes in uppercase
    trim: true
  },
  referredBy: {
    type: String, // Referral code of the user who referred this user
    trim: true
  },
  depositHistory: [ // Array of objects for deposit transactions
    {
      amount: { type: Number, required: true },
      txHash: { type: String, unique: true, sparse: true }, // Transaction hash on blockchain
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
    }
  ],
  withdrawalHistory: [ // Array of objects for withdrawal transactions
    {
      amount: { type: Number, required: true },
      txHash: { type: String, unique: true, sparse: true }, // Transaction hash on blockchain
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
    }
  ],
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

// Middleware to hash the password before saving the user
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
  }
  next();
});

// Method to compare entered password with hashed password in DB
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create the User model from the schemaس
const User = mongoose.model('User', userSchema);

module.exports = User;
