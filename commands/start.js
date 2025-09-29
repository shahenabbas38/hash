const messages = require('../constants/messages');
const User = require('../models/User');
const Transaction = require('../models/Transaction'); // Added missing import
const { initiateRegistration } = require('./register');
const { getDynamicMainMenuKeyboard } = require('../ui/keyboards'); // Import the dynamic keyboard

/**
 * Handles the /start command.
 * Welcomes the user and checks for a referral code.
 * @param {Telegraf} bot - The Telegraf bot instance.
 */
module.exports = (bot) => {
    bot.start(async (ctx) => {
        const telegramId = ctx.from.id;
        const username = ctx.from.username;
        const startPayload = ctx.startPayload; // This will contain the referral code if present

        // Check if the user is already registered
        let user = await User.findOne({ telegramId: telegramId });

        // Always clear referredBy at the start of a session for existing users
        // or if no valid referral is found for a new user.
        ctx.session = ctx.session || {};
        ctx.session.referredBy = null;
        // Also clear any stale in-progress flows to avoid cross-session leftovers
        ctx.session.depositStep = 0; // Assuming DEPOSIT_STEP_NONE is 0
        ctx.session.depositAmount = null;
        ctx.session.currentTransactionId = null;
        ctx.session.withdrawalStep = 0; // Assuming WITHDRAWAL_STEP_NONE is 0
        ctx.session.withdrawalAmount = null;
        ctx.session.withdrawalAddress = null;
        ctx.session.lastBotMessageId = null; // Clear message ID on start

        // Ensure no lingering pending transactions remain in DB for this user
        if (ctx.from && ctx.from.id) {
            try {
                await Transaction.updateMany(
                    { userId: ctx.from.id, status: 'pending' },
                    { $set: { status: 'failed', description: 'Auto-failed pending on new session' } }
                );
            } catch (e) {
                console.error(`Failed to auto-fail pending transactions for ${ctx.from.id}:`, e);
            }
        }

        if (user) {
            // User is already registered
            await ctx.replyWithMarkdownV2(messages.register.alreadyRegistered);
            const sentMessage = await ctx.reply(messages.welcome, getDynamicMainMenuKeyboard(true));
            ctx.session.lastBotMessageId = sentMessage.message_id; // Store message ID
        } else {
            // New user. Check for referral code.
            let referredBy = null;
            if (startPayload) {
                // Normalize code and validate against DB
                const normalizedCode = String(startPayload).trim().toUpperCase();
                const referrer = await User.findOne({ referralCode: normalizedCode });
                if (referrer) {
                    referredBy = referrer.referralCode; // persist canonical code
                    await ctx.replyWithMarkdownV2(messages.referredByNotice(referrer.referralCode));
                    console.log(`User ${telegramId} referred by ${referrer.referralCode}`);
                } else {
                    console.log(`Invalid referral code received: ${startPayload}`);
                }
            }
            // Store referredBy in session or context to use during registration
            ctx.session.referredBy = referredBy; // This requires session middleware to be enabled

            const sentMessage = await ctx.reply(messages.welcome, getDynamicMainMenuKeyboard(false));
            ctx.session.lastBotMessageId = sentMessage.message_id; // Store message ID
            // Use the centralized registration initiator to ensure referral is carried over
            await initiateRegistration(ctx);
        }
    });
};
