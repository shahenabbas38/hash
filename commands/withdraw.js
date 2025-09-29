const messages = require('../constants/messages');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { validateWalletAddress, sendFundsToBlockchain } = require('../utils/blockchain');
const { Markup } = require('telegraf');
const { formatUsdt } = require('../utils/format');
const { withdrawalAmountKeyboard, confirmWithdrawalKeyboard, addressInputKeyboard, cancelWithdrawalKeyboard, successKeyboard, errorRecoveryKeyboard } = require('../ui/keyboards'); // Import all necessary keyboards

// Withdrawal steps constants
const WITHDRAWAL_STEP_NONE = 0;
const WITHDRAWAL_STEP_AMOUNT = 1;
const WITHDRAWAL_STEP_ADDRESS = 2;
const WITHDRAWAL_STEP_CONFIRMATION = 3;
const WITHDRAWAL_STEP_PROCESSING = 4; // New step for "pending" state after confirmation

/**
 * Initiates the withdrawal flow. This function is called when the 'Withdraw' button
 * or /withdraw command is used.
 * @param {Telegraf.Context} ctx - The Telegraf context object.
 */
const initiateWithdrawal = async (ctx) => {
    const user = ctx.state.user;
    if (user.balance <= 0) {
        return ctx.replyWithMarkdownV2(messages.withdraw.insufficientFunds(user.balance.toFixed(8)), { parse_mode: 'MarkdownV2' });
    }
    // Check for existing withdrawal process
    if (ctx.session.withdrawalStep && ctx.session.withdrawalStep !== WITHDRAWAL_STEP_NONE) {
        return ctx.reply(messages.deposit.alreadyProcessing, { reply_markup: cancelWithdrawalKeyboard.reply_markup });
    }

    ctx.session.withdrawalStep = WITHDRAWAL_STEP_AMOUNT;

    // Send the initial withdrawal amount selection message and store its ID
    const sentMessage = await ctx.replyWithMarkdownV2(
        messages.withdraw.promptAmount(1, 4, user.balance),
        { reply_markup: withdrawalAmountKeyboard(1, 4, user.balance).reply_markup }
    );
    ctx.session.lastBotMessageId = sentMessage.message_id;
};

/**
 * Handles text messages during an ongoing withdrawal flow.
 * This function will be registered as a global middleware.
 * @param {Telegraf} bot - The Telegraf bot instance.
 * @returns {function(ctx: Telegraf.Context, next: Function): Promise<void>} An async middleware function.
 */
const withdrawalTextHandler = (bot) => async (ctx, next) => {
    const user = ctx.state.user;
    const messageText = ctx.message?.text?.trim();

    // Check if the message is a callback query (button press) and not a text input
    if (ctx.callbackQuery) {
        return next(); // Pass to next middleware/handler if it's a button action
    }

    // Only proceed if there's an active withdrawal step and it's a text message (not a command)
    if (user && ctx.session && ctx.session.withdrawalStep && ctx.session.withdrawalStep !== WITHDRAWAL_STEP_NONE && messageText !== undefined && !messageText.startsWith('/')) {
        switch (ctx.session.withdrawalStep) {
            case WITHDRAWAL_STEP_AMOUNT:
                const amount = parseFloat(messageText);
                if (isNaN(amount) || amount <= 0) {
                    return ctx.replyWithMarkdownV2(
                        messages.withdraw.invalidAmount(messageText),
                        { reply_markup: errorRecoveryKeyboard('action_withdraw', 'help_withdraw_amount').reply_markup }
                    );
                }
                if (amount > user.balance) {
                    return ctx.replyWithMarkdownV2(
                        messages.withdraw.insufficientFunds(user.balance.toFixed(8)),
                        { reply_markup: errorRecoveryKeyboard('action_withdraw', 'help_insufficient_funds').reply_markup }
                    );
                }

                ctx.session.withdrawalAmount = amount;
                ctx.session.withdrawalStep = WITHDRAWAL_STEP_ADDRESS;

                // Always send a new message instead of editing to preserve keyboards
                const addressMessage = await ctx.replyWithMarkdownV2(
                    messages.withdraw.promptAddress(2, 4),
                    {
                        parse_mode: 'MarkdownV2',
                        reply_markup: addressInputKeyboard(2, 4).reply_markup
                    }
                );
                ctx.session.lastBotMessageId = addressMessage.message_id;
                break;

            case WITHDRAWAL_STEP_ADDRESS:
                const walletAddress = messageText;
                if (!validateWalletAddress(walletAddress)) {
                    return ctx.replyWithMarkdownV2(
                        messages.withdraw.invalidAddress(walletAddress),
                        { reply_markup: errorRecoveryKeyboard('action_withdraw', 'help_bep20_address').reply_markup }
                    );
                }

                ctx.session.withdrawalAddress = walletAddress;
                ctx.session.withdrawalStep = WITHDRAWAL_STEP_CONFIRMATION;

                // Always send a new message instead of editing to preserve keyboards
                const confirmMessage = await ctx.replyWithMarkdownV2(
                    messages.withdraw.promptConfirm(ctx.session.withdrawalAmount, walletAddress, 3, 4),
                    {
                        parse_mode: 'MarkdownV2',
                        reply_markup: confirmWithdrawalKeyboard(3, 4).reply_markup
                    }
                );
                ctx.session.lastBotMessageId = confirmMessage.message_id;
                break;

            case WITHDRAWAL_STEP_PROCESSING:
                // User might send text while withdrawal is processing. Guide them.
                ctx.replyWithMarkdownV2(
                    'سحبك قيد المعالجة حاليًا. الرجاء الانتظار أو انقر على "إلغاء السحب" إذا كنت ترغب في التوقف.',
                    { reply_markup: cancelWithdrawalKeyboard.reply_markup }
                );
                break;
            default:
                // If in a withdrawal step but input doesn't match expected, re-prompt and guide.
                let expectedInputMessage = '';
                if (ctx.session.withdrawalStep === WITHDRAWAL_STEP_AMOUNT) {
                    expectedInputMessage = 'الرجاء إدخال مبلغ صالح (مثال: 10.0).';
                } else if (ctx.session.withdrawalStep === WITHDRAWAL_STEP_ADDRESS) {
                    expectedInputMessage = 'الرجاء إدخال عنوان محفظة USDT BEP20 الخاص بك.';
                } else {
                    expectedInputMessage = 'الرجاء النقر على "نعم" أو "لا" للتأكيد.';
                }
                ctx.replyWithMarkdownV2(
                    `أنت حاليًا في عملية سحب. ${expectedInputMessage} أو انقر على "إلغاء السحب" للتوقف.`,
                    { reply_markup: cancelWithdrawalKeyboard.reply_markup }
                );
                break;
        }
    } else {
        return next(); // Not in withdrawal flow, pass to next middleware
    }
};

module.exports = {
    initiateWithdrawal,
    withdrawalTextHandler,
    WITHDRAWAL_STEP_NONE,
    WITHDRAWAL_STEP_AMOUNT,
    WITHDRAWAL_STEP_ADDRESS,
    WITHDRAWAL_STEP_CONFIRMATION,
    WITHDRAWAL_STEP_PROCESSING
};
