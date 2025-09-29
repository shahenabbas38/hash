const messages = require('../constants/messages');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { generateDepositAddress, verifyTransactionOnBlockchain } = require('../utils/blockchain');
const { Markup } = require('telegraf');
const { generateQRCodeDataUrl } = require('../utils/qr');
const { depositAmountKeyboard, confirmDepositKeyboard, txHashKeyboard, cancelDepositKeyboard, successKeyboard, errorRecoveryKeyboard } = require('../ui/keyboards');
const { ACTIONS } = require('../constants/actions');

// دالة تهريب نصوص MarkdownV2
function escapeMarkdownV2(text) {
    if (text === null || text === undefined) return '';
    return text.toString().replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Deposit steps constants
const DEPOSIT_STEP_NONE = 0;
const DEPOSIT_STEP_AMOUNT = 1;
const DEPOSIT_STEP_CONFIRMATION = 2;
const DEPOSIT_STEP_TXHASH = 3;

const initiateDeposit = async (ctx) => {
    const user = ctx.state.user;
    console.log('🔍 DEBUG - initiateDeposit called for user:', user.telegramId, 'Balance:', user.balance);
    
    if (ctx.session.depositStep && ctx.session.depositStep !== DEPOSIT_STEP_NONE) {
        return ctx.replyWithMarkdownV2(messages.deposit.alreadyProcessing, { reply_markup: cancelDepositKeyboard.reply_markup });
    }

    ctx.session.depositStep = DEPOSIT_STEP_AMOUNT;
    await ctx.replyWithMarkdownV2(messages.feedback.typing(0));

    console.log('🔍 DEBUG - Sending promptAmount message with balance:', user.balance);
    const sentMessage = await ctx.replyWithMarkdownV2(
        messages.deposit.promptAmount(1, 4, user.balance),
        { reply_markup: depositAmountKeyboard(1, 4).reply_markup }
    );
    ctx.session.lastBotMessageId = sentMessage.message_id;
};

const depositTextHandler = (bot) => async (ctx, next) => {
    const user = ctx.state.user;
    const messageText = ctx.message?.text?.trim();

    if (ctx.callbackQuery) return next();

    if (user && ctx.session && ctx.session.depositStep && ctx.session.depositStep !== DEPOSIT_STEP_NONE && messageText !== undefined && !messageText.startsWith('/')) {
        switch (ctx.session.depositStep) {
            case DEPOSIT_STEP_AMOUNT:
                const amount = parseFloat(messageText);
                if (isNaN(amount) || amount <= 0) {
                    return ctx.replyWithMarkdownV2(
                        messages.deposit.invalidAmount(escapeMarkdownV2(messageText)),
                        { reply_markup: errorRecoveryKeyboard('action_deposit', 'help_deposit_amount').reply_markup }
                    );
                }
                ctx.session.depositAmount = amount;
                ctx.session.depositStep = DEPOSIT_STEP_CONFIRMATION;

                // Always send new messages instead of editing to preserve keyboards
                const transitionMessage = await ctx.replyWithMarkdownV2(
                    messages.feedback.transition('اختيار المبلغ', 'التأكيد', 'forward'),
                    { parse_mode: 'MarkdownV2' }
                );

                const sentMessage = await ctx.replyWithMarkdownV2(
                    messages.deposit.promptConfirm(amount, 2, 4),
                    {
                        parse_mode: 'MarkdownV2',
                        reply_markup: confirmDepositKeyboard(2, 4).reply_markup
                    }
                );
                ctx.session.lastBotMessageId = sentMessage.message_id;
                break;

            case DEPOSIT_STEP_TXHASH:
                const txHash = messageText;
                const depositAmount = ctx.session.depositAmount;

                if (!txHash || txHash.length < 10) {
                    return ctx.replyWithMarkdownV2(
                        messages.deposit.invalidTxHash(escapeMarkdownV2(txHash)),
                        { reply_markup: errorRecoveryKeyboard(null, 'help_txhash_format').reply_markup }
                    );
                }

                const processingMsg = await ctx.replyWithMarkdownV2(messages.feedback.processing('جاري التحقق من المعاملة', 0));
                let frame = 0;
                const animationInterval = setInterval(async () => {
                    frame = (frame + 1) % 4;
                    try {
                        await ctx.telegram.editMessageText(
                            ctx.chat.id,
                            processingMsg.message_id,
                            null,
                            messages.feedback.processing('جاري التحقق من المعاملة', frame),
                            { parse_mode: 'MarkdownV2' }
                        );
                    } catch {
                        clearInterval(animationInterval);
                    }
                }, 1000);

                try {
                    const isTxValid = await verifyTransactionOnBlockchain(txHash, depositAmount);
                    console.log(isTxValid);
                    clearInterval(animationInterval);
                    try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch {}

                    if (isTxValid) {
                        const completedTx = new Transaction({
                            userId: user.telegramId,
                            type: 'deposit',
                            amount: depositAmount,
                            txHash,
                            status: 'completed',
                            description: 'تم التحقق من الإيداع بنجاح'
                        });
                        await completedTx.save();

                        user.balance += depositAmount;
                        await user.save();

                        if (user.referredBy) {
                            const referrer = await User.findOne({ referralCode: user.referredBy });
                            if (referrer) {
                                const commissionAmount = depositAmount * 0.05;
                                referrer.balance += commissionAmount;
                                await referrer.save();

                                const commissionTransaction = new Transaction({
                                    userId: referrer.telegramId,
                                    type: 'referral_commission',
                                    amount: commissionAmount,
                                    status: 'completed',
                                    description: `عمولة 5% من إيداع ${user.username}'s`,
                                    commissionFromUserId: user.telegramId,
                                    commissionPercentage: 5
                                });
                                await commissionTransaction.save();

                                await bot.telegram.sendMessage(
                                    referrer.telegramId,
                                    `💰 لقد ربحت \`${escapeMarkdownV2(commissionAmount.toFixed(8))}\` USDT كعمولة إحالة من إيداع \`${user.username ? escapeMarkdownV2(user.username) : escapeMarkdownV2(user.telegramId)}\`!`,
                                    { parse_mode: 'MarkdownV2' }
                                );
                            }
                        }

                        await ctx.replyWithMarkdownV2(
                            messages.deposit.depositSuccess(depositAmount),
                            { reply_markup: successKeyboard('action_deposit').reply_markup }
                        );
                    } else {
                        const failedTx = new Transaction({
                            userId: user.telegramId,
                            type: 'deposit',
                            amount: depositAmount,
                            status: 'failed',
                            description: 'فشل التحقق من الإيداع'
                        });
                        await failedTx.save();

                        await ctx.replyWithMarkdownV2(
                            messages.deposit.depositFailed,
                            { reply_markup: errorRecoveryKeyboard(ACTIONS.DEPOSIT, ACTIONS.HELP_DEPOSIT_VERIFICATION).reply_markup }
                        );
                    }
                } catch (error) {
                    console.log(error);
                    clearInterval(animationInterval);
                    try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch {}

                    const failedTx = new Transaction({
                        userId: user.telegramId,
                        type: 'deposit',
                        amount: depositAmount,
                        status: 'failed',
                        description: 'خطأ أثناء التحقق من الإيداع'
                    });
                    await failedTx.save();

                    await ctx.replyWithMarkdownV2(
                        messages.feedback.error('network_error'),
                        { reply_markup: errorRecoveryKeyboard(ACTIONS.DEPOSIT, ACTIONS.HELP_CONTACT_SUPPORT).reply_markup }
                    );
                } finally {
                    ctx.session.depositStep = DEPOSIT_STEP_NONE;
                    ctx.session.depositAmount = null;
                    ctx.session.currentTransactionId = null;
                    ctx.session.lastBotMessageId = null;
                }
                break;

            default:
                let expectedInputMessage = '';
                if (ctx.session.depositStep === DEPOSIT_STEP_AMOUNT) {
                    expectedInputMessage = 'الرجاء إدخال مبلغ صالح \\(مثال: 10\\.5\\)\\.';
                } else if (ctx.session.depositStep === DEPOSIT_STEP_TXHASH) {
                    expectedInputMessage = 'الرجاء تقديم تجزئة المعاملة \\(TxHash\\)\\.';
                } else {
                    expectedInputMessage = 'الرجاء النقر على "نعم" أو "لا" للتأكيد\\.';
                }
                await ctx.replyWithMarkdownV2(
                    `أنت حاليًا في عملية إيداع\\. ${expectedInputMessage} أو انقر على "إلغاء الإيداع" للتوقف\\.`,
                    { reply_markup: cancelDepositKeyboard.reply_markup }
                );
                break;
        }
    } else {
        return next();
    }
};

module.exports = {
    initiateDeposit,
    depositTextHandler,
    DEPOSIT_STEP_AMOUNT,
    DEPOSIT_STEP_NONE,
    DEPOSIT_STEP_CONFIRMATION,
    DEPOSIT_STEP_TXHASH
};
