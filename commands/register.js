// Environment variables
const { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH } = require('../constants/config'); // Ensure MIN_PASSWORD_LENGTH is here
const messages = require('../constants/messages');
const { getDynamicMainMenuKeyboard, cancelRegistrationKeyboard, registrationKeyboard } = require('../ui/keyboards');
const User = require('../models/User');
const { ACTIONS } = require('../constants/actions');
const { escapeMarkdownV2 } = require('../utils/markdown'); // Import escapeMarkdownV2
const { hashPassword } = require('../utils/password'); // Import hashPassword for password hashing

// Step constants for registration flow
const REGISTRATION_STEP_NONE = 0;
const REGISTRATION_STEP_USERNAME = 1;
const REGISTRATION_STEP_PASSWORD = 2;
const REGISTRATION_STEP_REFERRAL = 3;

/**
 * Initiates the user registration process.
 * Sends the initial prompt for username selection.
 * @param {Object} ctx - The Telegraf context object.
 */
const initiateRegistration = async (ctx) => {
    // Set the registration step to indicate we are waiting for a username
    ctx.session.registrationStep = REGISTRATION_STEP_USERNAME;
    ctx.session.registrationData = {}; // Initialize registration data
    // Capture referral code from /start payload if present (e.g., /start referralcode)
    ctx.session.referredBy = ctx.match && ctx.match[1] ? ctx.match[1] : null;

    const currentStep = 1;
    const totalSteps = 3; // Username, Password, Referral

    const sentMessage = await ctx.replyWithMarkdownV2(
        messages.register.promptUsername(currentStep, totalSteps),
        {
            reply_markup: registrationKeyboard(currentStep, totalSteps).reply_markup
        }
    );
    // Store the message ID for future edits
    ctx.session.lastBotMessageId = sentMessage.message_id;
};

/**
 * Handles text input during the registration flow.
 * This is a middleware that should be registered globally.
 */
const registerTextHandler = () => async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) {
        return next(); // Not a text message, skip
    }

    const userId = ctx.from.id;
    const user = ctx.state.user; // User from middleware

    // If user is already registered, skip this handler entirely for new registration attempts
    if (user && ctx.session.registrationStep === REGISTRATION_STEP_NONE) {
        return next();
    }

    // Only proceed if there's an active registration step
    if (ctx.session.registrationStep === REGISTRATION_STEP_NONE) {
        console.log(`[Registration] Skipping text from ${userId}. No active registration step. message="${ctx.message.text}"`);
        return next();
    }

    const text = ctx.message.text.trim();

    switch (ctx.session.registrationStep) {
        case REGISTRATION_STEP_USERNAME:
            // Validate username input
            if (text.length < MIN_USERNAME_LENGTH || text.length > MAX_USERNAME_LENGTH) {
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.usernameLengthError(text),
                    { parse_mode: 'MarkdownV2', reply_markup: cancelRegistrationKeyboard }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id; // Update message ID
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(text)) {
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.usernameInvalidChars(text),
                    { parse_mode: 'MarkdownV2', reply_markup: cancelRegistrationKeyboard }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id; // Update message ID
                return;
            }

            // Check if username already exists
            const existingUser = await User.findOne({ username: text.toLowerCase() });
            if (existingUser) {
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.usernameTaken(text),
                    { parse_mode: 'MarkdownV2', reply_markup: cancelRegistrationKeyboard }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id; // Update message ID
                return;
            }

            ctx.session.registrationData.username = text;
            ctx.session.registrationStep = REGISTRATION_STEP_PASSWORD; // Move to password step
            const currentStepPassword = 2;
            const totalStepsPassword = 3;

            // Prompt for password
            try {
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.promptPassword(currentStepPassword, totalStepsPassword),
                    { reply_markup: cancelRegistrationKeyboard.reply_markup }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id;
            } catch (error) {
                console.error('Failed to send message for password prompt:', error);
                // Fallback to sending a new message
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.promptPassword(currentStepPassword, totalStepsPassword),
                    { reply_markup: cancelRegistrationKeyboard.reply_markup }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id;
            }
            break;

        case REGISTRATION_STEP_PASSWORD:
            const password = text;

            // Basic password length validation (can be enhanced)
            if (password.length < MIN_PASSWORD_LENGTH) {
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.invalidPasswordLength(password),
                    { parse_mode: 'MarkdownV2', reply_markup: cancelRegistrationKeyboard }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id;
                return;
            }

            ctx.session.registrationData.password = password;
            ctx.session.registrationStep = REGISTRATION_STEP_REFERRAL;
            const currentStepReferral = 3;
            const totalStepsReferral = 3;

            // Check if referral code was already provided via /start link
            if (ctx.session.referredBy) {
                const referrerUser = await User.findOne({ referralCode: ctx.session.referredBy });
                if (referrerUser && referrerUser.telegramId !== userId) { // Prevent self-referral
                    await registerUser(ctx, referrerUser.telegramId);
                } else {
                    await registerUser(ctx, null); // Register without referrer if invalid or self-referral
                }
            } else {
                // Prompt for referral code if not provided via /start
                try {
                    const sentMessage = await ctx.replyWithMarkdownV2(
                        messages.register.promptReferral(currentStepReferral, totalStepsReferral),
                        { reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ المتابعة بدون إحالة', callback_data: ACTIONS.REGISTER_NO_REFERRAL }],
                                [{ text: '❌ إلغاء التسجيل', callback_data: ACTIONS.CANCEL_REGISTRATION }]
                            ]
                        }}
                    );
                    ctx.session.lastBotMessageId = sentMessage.message_id;
                } catch (error) {
                    console.error('Failed to send message for referral prompt:', error);
                    // Fallback to sending a new message
                    const sentMessage = await ctx.replyWithMarkdownV2(
                        messages.register.promptReferral(currentStepReferral, totalStepsReferral),
                        { reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ المتابعة بدون إحالة', callback_data: ACTIONS.REGISTER_NO_REFERRAL }],
                                [{ text: '❌ إلغاء التسجيل', callback_data: ACTIONS.CANCEL_REGISTRATION }]
                            ]
                        }}
                    );
                    ctx.session.lastBotMessageId = sentMessage.message_id;
                }
            }
            break;

        case REGISTRATION_STEP_REFERRAL:
            const referralCode = text.toUpperCase(); // Assuming referral codes are uppercase
            const referrerUser = await User.findOne({ referralCode: referralCode });

            if (referrerUser && referrerUser.telegramId !== userId) { // Prevent self-referral
                await registerUser(ctx, referrerUser.telegramId);
            } else {
                // Invalid or self-referral, inform user and allow them to proceed without referral
                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.register.invalidReferral(referralCode),
                    {
                        parse_mode: 'MarkdownV2',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ المتابعة بدون إحالة', callback_data: 'register_no_referral' }],
                                [{ text: '❌ إلغاء التسجيل', callback_data: 'cancel_registration' }]
                            ]
                        }
                    }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id;
            }
            break;

        default:
            // If text is received in an unexpected step, just move to the next middleware
            return next();
    }
};

/**
 * Registers the user in the database after all steps are complete.
 * @param {Object} ctx - The Telegraf context object.
 * @param {string|null} referredByTelegramId - The Telegram ID of the referrer, or null if no referrer.
 */
const registerUser = async (ctx, referredByTelegramId) => {
    const userId = ctx.from.id;
    const username = ctx.session.registrationData.username;
    const password = ctx.session.registrationData.password; // Get plain password
    const referralCode = generateReferralCode(userId); // Generate a unique referral code

    try {
        const hashedPassword = await hashPassword(password); // Hash the password

        const newUser = new User({
            telegramId: userId,
            username: username,
            password: hashedPassword, // Save hashed password
            referralCode: referralCode,
            referredBy: referredByTelegramId,
            balance: 0,
            registrationDate: new Date()
        });
        await newUser.save();

        if (referredByTelegramId) {
            await ctx.replyWithMarkdownV2(messages.register.registrationSuccessWithReferral(escapeMarkdownV2(username), escapeMarkdownV2(referralCode)), { parse_mode: 'MarkdownV2' });
        } else {
            await ctx.replyWithMarkdownV2(messages.register.registrationSuccess(escapeMarkdownV2(username), escapeMarkdownV2(referralCode)), { parse_mode: 'MarkdownV2' });
        }

        ctx.session.registrationStep = REGISTRATION_STEP_NONE; // Reset step
        ctx.session.registrationData = null; // Clear registration data
        ctx.session.referredBy = null; // Clear session referral
        ctx.session.lastBotMessageId = null; // Clear message ID after completion

        // Offer main menu after successful registration
        await ctx.replyWithMarkdownV2(messages.welcome, getDynamicMainMenuKeyboard(true));

    } catch (error) {
        console.error('Error saving new user:', error);
        await ctx.replyWithMarkdownV2(messages.generalError, { parse_mode: 'MarkdownV2' });
        // Reset session on error to allow user to retry
        ctx.session.registrationStep = REGISTRATION_STEP_NONE;
        ctx.session.registrationData = null;
        ctx.session.referredBy = null;
        ctx.session.lastBotMessageId = null;
    }
};

// Helper function to generate a simple referral code
function generateReferralCode(userId) {
    // A simple approach: combine a part of the user ID with a random string
    // In a real application, you might want a more robust unique ID generation.
    const uniquePart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${userId.toString().slice(-4)}${uniquePart}`;
}

module.exports = {
    initiateRegistration,
    registerTextHandler,
    registerUser,
    REGISTRATION_STEP_NONE,
    REGISTRATION_STEP_USERNAME,
    REGISTRATION_STEP_PASSWORD,
    REGISTRATION_STEP_REFERRAL
};
