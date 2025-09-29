// ===== FIXED HEADER =====
require('dotenv').config();                              // 1) حمّل .env أولاً
const { Telegraf, Markup } = require('telegraf');        // 2) استورد Telegraf/Markup
const { BOT_TOKEN: ENV_BOT_TOKEN, MONGODB_URI, ADMIN_CHAT_ID, SYRIATEL_DEPOSIT_NUMBER } = require('./utils/env'); // 3) ثم utils/env

// استخدم BOT_TOKEN من .env، وإن كان غير موجود خذ من utils/env كخيار احتياطي
const BOT_TOKEN = process.env.BOT_TOKEN || ENV_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN مفقود! تأكد من ملف .env أو utils/env');
  process.exit(1); 
}
const bot = new Telegraf(BOT_TOKEN);

// ===== بقية الاستيرادات كما هي =====
const { createSessionMiddleware } = require('./middlewares/session');
const { attachUser } = require('./middlewares/user');
const mongoose = require('mongoose');
const connectDB = require('./utils/db');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const messages = require('./constants/messages');
const WithdrawalRequest = require('./models/WithdrawalRequest');
const SyriatelDepositRequest = require('./models/SyriatelDepositRequest');
const { claimWeeklyLoyalty } = require('./services/loyalty');

const {
  getDynamicMainMenuKeyboard,
  getHistoryFilterKeyboard,
  cancelRegistrationKeyboard,
  cancelDepositKeyboard,
  cancelWithdrawalKeyboard,
  getPaymentMethodKeyboard,
  syriatelDepositAmountKeyboard,
  syriatelWithdrawalAmountKeyboard,
  syriatelWithdrawalPhoneKeyboard,
  confirmSyriatelWithdrawalKeyboard,
  depositAmountKeyboard,
  confirmDepositKeyboard,
  txHashKeyboard,
  withdrawalAmountKeyboard,
  confirmWithdrawalKeyboard,
  addressInputKeyboard,
  successKeyboard,
  errorRecoveryKeyboard
} = require('./ui/keyboards');
const { ACTIONS, actionRegexFromPrefix } = require('./constants/actions');
const { verifyTransactionOnBlockchain, sendFundsToBlockchain, generateDepositAddress } = require('./utils/blockchain');
const { generateQRCodeBuffer } = require('./utils/qr');
const { escapeMarkdownV2 } = require('./utils/markdown');

const {
  initiateRegistration, registerTextHandler, REGISTRATION_STEP_NONE
} = require('./commands/register');

const {
  initiateDeposit, depositTextHandler,
  DEPOSIT_STEP_NONE, DEPOSIT_STEP_AMOUNT, DEPOSIT_STEP_CONFIRMATION, DEPOSIT_STEP_TXHASH
} = require('./commands/deposit');

const {
  initiateWithdrawal, withdrawalTextHandler,
  WITHDRAWAL_STEP_NONE, WITHDRAWAL_STEP_CONFIRMATION, WITHDRAWAL_STEP_PROCESSING, WITHDRAWAL_STEP_ADDRESS, WITHDRAWAL_STEP_AMOUNT
} = require('./commands/withdraw');

console.log('🔍 DEBUG - Imported withdrawal constants:', {
  WITHDRAWAL_STEP_NONE,
  WITHDRAWAL_STEP_AMOUNT,
  WITHDRAWAL_STEP_ADDRESS,
  WITHDRAWAL_STEP_CONFIRMATION,
  WITHDRAWAL_STEP_PROCESSING
});

const accountCommand = require('./commands/account');
const historyCommand = require('./commands/history');
const referralCommand = require('./commands/referral');
const startCommand = require('./commands/start');

// ====== قناة الانضمام — قفل شامل ======
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@dxteamofficial';

// الحالات المقبولة كعضو
const GOOD_STATUSES = new Set(['creator', 'administrator', 'member']);

// نصوص القفل (خاصة بالانضمام فقط)
const gateMessages = {
  mustJoin: '📢 للمتابعة، رجاءً انضم لقناتنا الرسمية أولاً:',
  verify: '✅ تحقّق من الاشتراك',
  ok: '✅ تم التحقق من اشتراكك!',
  still: '❌ لسه ما لقيناك مشترك. انضم واضغط "تحقّق" مرة ثانية.',
};

// رابط القناة
function channelLink() {
  const uname = CHANNEL_USERNAME.replace(/^@/, '');
  return `https://t.me/${uname}`;
}

// كيبورد الانضمام + التحقق (يمكنك إبقاؤه بدون Markup أو استخدام Markup إن أردت)
function joinGateKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📲 انضم للقناة', url: channelLink() }],
        [{ text: gateMessages.verify, callback_data: 'verify_membership' }],
      ],
    },
  };
}

// فحص العضوية في القناة
async function isMemberOfChannel(ctx) {
  try {
    const mem = await ctx.telegram.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    return GOOD_STATUSES.has(mem.status);
  } catch (e) {
    console.warn('Membership check failed:', e.message);
    return false;
  }
}

/**
 * ميدلوير قفل شامل:
 * يمنع كل الأوامر/الأزرار قبل الاشتراك بالقناة،
 * ويستثني فقط زر "تحقّق من الاشتراك" حتى يشتغل القفل.
 */
bot.use(async (ctx, next) => {
  const isVerifyAction =
    ctx.updateType === 'callback_query' &&
    ctx.update?.callback_query?.data === 'verify_membership';

  if (isVerifyAction) {
    return next(); // اسمح بزر التحقق يمرّ
  }

  const ok = await isMemberOfChannel(ctx);
  if (!ok) {
    await ctx.reply(gateMessages.mustJoin, joinGateKeyboard());
    return; // إيقاف أي هاندلر آخر
  }

  return next(); // المستخدم مشترك — كمل لباقي الهاندلرز
});

// زر "تحقّق من الاشتراك"
bot.action('verify_membership', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const ok = await isMemberOfChannel(ctx);
  if (ok) {
    try { await ctx.editMessageText(gateMessages.ok); }
    catch { await ctx.reply(gateMessages.ok); }
  } else {
    const kb = joinGateKeyboard();
    try { await ctx.editMessageText(gateMessages.still, kb); }
    catch { await ctx.reply(gateMessages.still, kb); }
  }
});


// ===== نهاية بلوك القفل =====



// ملاحظة مهمة: لا تضيف bot.launch() هنا إذا كان موجود عندك مسبقاً في آخر الملف


// --- Database Connection and Bot Setup ---
connectDB()
    .then(() => {
        console.log('✅ MongoDB connected, proceeding with bot setup...');

        // --- Middleware Setup ---

        // Telegraf session middleware using MongoDB for persistence
        bot.use(createSessionMiddleware(mongoose.connection.db, {
            registrationStep: REGISTRATION_STEP_NONE,
            depositStep: DEPOSIT_STEP_NONE,
            withdrawalStep: WITHDRAWAL_STEP_NONE,
            depositAmount: null,
            withdrawalAmount: null,
            withdrawalAddress: null,
            referredBy: null,
            registrationData: null,
            lastBotMessageId: null, // Initialize new session property
            // ADD Syriatel session state
            syriatelDepositStep: 0,
            syriatelWithdrawStep: 0,
            syriatelAmount: null,
            syriatelPhoneNumber: null,
        }));

        // Global middleware to fetch user data and attach it to ctx.state.user
        bot.use(attachUser);

        // 🎁 Loyalty points handler
        bot.action(ACTIONS.LOYALTY, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}

            const user = ctx.state.user;
            if (!user) {
                return ctx.reply('❌ يجب التسجيل أولاً.');
            }

            try {
                const result = await claimWeeklyLoyalty(user);
                await ctx.reply(result.msg, { parse_mode: 'MarkdownV2' });
            } catch (e) {
                console.error('❌ Loyalty claim error:', e);
                await ctx.reply('🚫 حدث خطأ أثناء معالجة نقاط الولاء. حاول لاحقاً.');
            }
        });

        // --- Syriatel Text Handlers ---
        // We define these here for simplicity. They could be moved to their own command files.
        const syriatelDepositTextHandler = (bot) => async (ctx, next) => {
            const user = ctx.state.user;
            const text = ctx.message?.text?.trim();
            if (!user || !ctx.session.syriatelDepositStep || !text || text.startsWith('/')) return next();

            switch (ctx.session.syriatelDepositStep) {
                case 1: // Expecting amount
                    const amount = parseInt(text, 10);
                    if (isNaN(amount) || amount <= 0) {
                        return ctx.replyWithMarkdownV2(messages.syriatel.invalidAmount(text));
                    }
                    ctx.session.syriatelAmount = amount;
                    ctx.session.syriatelDepositStep = 2;
                    await ctx.replyWithMarkdownV2(messages.syriatel.promptProcessId(amount, SYRIATEL_DEPOSIT_NUMBER || '09XXXXXXXX', 2, 2));
                    break;
                case 2: // Expecting process ID
                    const processId = text;
                    if (!/^\d+$/.test(processId) || processId.length < 5) {
                        return ctx.replyWithMarkdownV2(messages.syriatel.invalidProcessId(text));
                    }
                    
                    // Store the amount before clearing session to prevent null reference
                    const depositAmountSYP = ctx.session.syriatelAmount;
                    
                    // Mock verification - simulate successful verification
                    await ctx.replyWithMarkdownV2(escapeMarkdownV2('🔎 جاري التحقق من عملية التحويل...'));
                    
                    // Reset session immediately to prevent interference
                    ctx.session.syriatelDepositStep = 0;
                    ctx.session.syriatelAmount = null;
                    
                    // Simulate processing delay
                    setTimeout(async () => {
                        try {
                            // Convert SYP to USDT using exchange rate
                            const exchangeRate = Number(process.env.EXCHANGE_RATE_SYP_PER_USDT || 5000);
                            const usdtAmount = depositAmountSYP / exchangeRate;
                            
                            // Add to user balance
                            user.balance += usdtAmount;
                            await user.save();
                            
                            // Create transaction record
                            await new Transaction({
                                userId: user.telegramId,
                                type: 'deposit',
                                amount: usdtAmount,
                                status: 'completed',
                                description: `Syriatel Cash Deposit: ${depositAmountSYP} SYP`,
                                txHash: `SYR_${processId}_${Date.now()}`
                            }).save();
                            
                            // Send success message
                            await ctx.replyWithMarkdownV2(messages.syriatel.mockVerificationSuccess(
                                depositAmountSYP,
                                usdtAmount.toFixed(2),
                                user.balance.toFixed(2)
                            ));
                            
                        } catch (error) {
                            console.error('Error processing Syriatel deposit:', error);
                            await ctx.replyWithMarkdownV2(escapeMarkdownV2('❌ حدث خطأ أثناء معالجة الإيداع. يرجى المحاولة مرة أخرى.'));
                        }
                    }, 2000); // 2 second delay for simulation
                    break;
            }
        };

        const syriatelWithdrawTextHandler = (bot) => async (ctx, next) => {
            const user = ctx.state.user;
            const text = ctx.message?.text?.trim();
            if (!user || !ctx.session.syriatelWithdrawStep || !text || text.startsWith('/')) return next();

            switch (ctx.session.syriatelWithdrawStep) {
                case 1: // Expecting amount
                    const amount = parseFloat(text);
                    if (isNaN(amount) || amount <= 0 || amount > user.balance) {
                        return ctx.replyWithMarkdownV2(messages.withdraw.invalidAmount(text));
                    }
                    ctx.session.syriatelAmount = amount;
                    ctx.session.syriatelWithdrawStep = 2;
                    
                    const exchangeRate = Number(process.env.EXCHANGE_RATE_SYP_PER_USDT || 5000);
                    const amountSYP = (amount * exchangeRate).toLocaleString('en-US');
                    const amountUSDT = amount.toFixed(2);
                    
                    await ctx.replyWithMarkdownV2(
                        messages.syriatel.promptPhoneNumber(2, 3, amountUSDT, amountSYP),
                        { reply_markup: syriatelWithdrawalPhoneKeyboard(2, 3).reply_markup }
                    );
                    break;
                case 2: // Expecting phone number
                    // Basic validation for a Syrian number
                    if (!/^09\d{8}$/.test(text)) {
                        return ctx.replyWithMarkdownV2(messages.syriatel.invalidPhoneNumber(text));
                    }
                    ctx.session.syriatelPhoneNumber = text;
                    ctx.session.syriatelWithdrawStep = 3;
                    await ctx.replyWithMarkdownV2(
                        messages.syriatel.promptConfirm(ctx.session.syriatelAmount, text, 3, 3),
                        { reply_markup: confirmSyriatelWithdrawalKeyboard(3, 3).reply_markup }
                    );
                    break;
            }
        };

        // Register global text handlers for multi-step flows
        // Order matters: specific text handlers should come before more general ones.
        bot.use(registerTextHandler()); // No bot instance needed for registerTextHandler
        bot.use(syriatelDepositTextHandler(bot));
        bot.use(syriatelWithdrawTextHandler(bot));
        bot.use(depositTextHandler(bot));
        bot.use(withdrawalTextHandler(bot));

        // NEW: Setup command/action handlers from specific modules that export a setup function
        historyCommand.setup(bot);
        referralCommand.setup(bot);
        accountCommand.setup(bot);


        // --- Command Handlers ---
        // Integrate start command properly
        startCommand(bot); // Pass the bot instance to the start command handler

        bot.help(async (ctx) => {
            await ctx.reply(messages.help, { parse_mode: 'MarkdownV2' });
        });

        // --- Inline Button Handlers ---
        // Centralized handler for checking registration status for most actions
        const requireRegistrationAndExecute = async (ctx, commandHandlerFn) => {
            try {
                await ctx.answerCbQuery();
            } catch (error) {
                if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) {
                    console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`);
                    return;
                }
                throw error;
            }

            if (!ctx.state.user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            // Execute the passed function directly
            return commandHandlerFn(ctx);
        };

        bot.action(ACTIONS.ACCOUNT, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            if (ctx.state.user) {
                // Use the account command's display function for consistency
                return accountCommand.initiateAccountDisplay(ctx);
            } else {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
        });
        bot.action(ACTIONS.INITIATE_REGISTRATION, async (ctx) => {
        console.log("🔥 INITIATE_REGISTRATION pressed:", ctx.update.callback_query?.data);

        try { await ctx.answerCbQuery(); } catch (e) {}

        if (!ctx.state.user) {
            return initiateRegistration(ctx);
        } else {
            console.log("⚠️ User already registered:", ctx.state.user.telegramId);
            return ctx.reply("انت مسجّل بالفعل ✅");
        }
        });


        // MODIFIED: This now shows the method selection menu
        bot.action(ACTIONS.DEPOSIT, (ctx) => {
            const showDepositMethods = async (ctx) => {
                console.log('🔍 DEBUG - Deposit action triggered');
                
                // Refresh user data to ensure we have the latest balance
                const refreshedUser = await User.findOne({ telegramId: ctx.state.user.telegramId });
                if (refreshedUser) {
                    ctx.state.user = refreshedUser;
                }
                
                console.log('🔍 DEBUG - User:', ctx.state.user?.telegramId, 'Balance:', ctx.state.user?.balance);
                
                // Clear any existing session state to prevent contamination
                ctx.session.withdrawalStep = WITHDRAWAL_STEP_NONE;
                ctx.session.withdrawalAmount = null;
                ctx.session.withdrawalAddress = null;
                ctx.session.syriatelWithdrawStep = 0;
                ctx.session.syriatelPhoneNumber = null;
                
                console.log('🔍 DEBUG - Session state:', JSON.stringify({
                    depositStep: ctx.session.depositStep,
                    withdrawalStep: ctx.session.withdrawalStep,
                    syriatelDepositStep: ctx.session.syriatelDepositStep,
                    syriatelWithdrawStep: ctx.session.syriatelWithdrawStep
                }));
                console.log('🔍 DEBUG - Message being sent:', messages.paymentMethod.selectDeposit);
                await ctx.replyWithMarkdownV2(
                    escapeMarkdownV2(messages.paymentMethod.selectDeposit),
                    { reply_markup: getPaymentMethodKeyboard('deposit').reply_markup }
                );
            };
            return requireRegistrationAndExecute(ctx, showDepositMethods);
        });
        // UX: quick-pick deposit amount buttons
        bot.action(actionRegexFromPrefix(ACTIONS.DEPOSIT_QUICK_PREFIX), async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const amount = Number(ctx.match[1]);
            ctx.session.depositAmount = amount;
            ctx.session.depositStep = DEPOSIT_STEP_TXHASH;
            const depositAddress = generateDepositAddress(ctx.state.user.telegramId);
            const escapedDepositAddress = escapeMarkdownV2(depositAddress); // Only escape dynamic content

            // Always send a new message instead of editing
            const depositKeyboard = txHashKeyboard(3, 4);
            console.log('🔍 DEBUG - Deposit txHash keyboard:', JSON.stringify(depositKeyboard, null, 2));
            
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.deposit.address(escapedDepositAddress, 3, 4),
                {
                    parse_mode: 'MarkdownV2',
                    reply_markup: depositKeyboard.reply_markup
                }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
            console.log('🔍 DEBUG - Deposit address message sent with ID:', sentMessage.message_id);
            try {
                await ctx.replyWithPhoto({ source: await generateQRCodeBuffer(depositAddress) }, { caption: `يمكنك أيضاً مسح الرمز 📱 لإيداع USDT (BEP20).
💰 المبلغ: ${escapeMarkdownV2(amount)} USDT
📋 بعد الإرسال، الصق تجزئة المعاملة هنا.` });
            } catch (e) {
                console.error('Failed to send QR image:', e.message);
            }
        });
        bot.action(ACTIONS.DEPOSIT_CUSTOM, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            
            ctx.session.depositStep = DEPOSIT_STEP_AMOUNT;
            
            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.deposit.promptAmount(1, 4),
                { parse_mode: 'MarkdownV2', reply_markup: cancelDepositKeyboard.reply_markup }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });
        // MODIFIED: This now shows the method selection menu
        bot.action(ACTIONS.WITHDRAW, (ctx) => {
            const showWithdrawMethods = async (ctx) => {
                console.log('🔍 DEBUG - Withdraw action triggered');
                
                // Refresh user data to ensure we have the latest balance
                const refreshedUser = await User.findOne({ telegramId: ctx.state.user.telegramId });
                if (refreshedUser) {
                    ctx.state.user = refreshedUser;
                }
                
                console.log('🔍 DEBUG - User:', ctx.state.user?.telegramId, 'Balance:', ctx.state.user?.balance);
                
                // Clear any existing session state to prevent contamination
                ctx.session.depositStep = DEPOSIT_STEP_NONE;
                ctx.session.depositAmount = null;
                ctx.session.syriatelDepositStep = 0;
                ctx.session.syriatelAmount = null;
                
                console.log('🔍 DEBUG - Message being sent:', messages.paymentMethod.selectWithdraw);
                await ctx.replyWithMarkdownV2(
                    escapeMarkdownV2(messages.paymentMethod.selectWithdraw),
                    { reply_markup: getPaymentMethodKeyboard('withdraw').reply_markup }
                );
            };
            return requireRegistrationAndExecute(ctx, showWithdrawMethods);
        });

        // Handler for BEP20 (the original flow)
        bot.action(ACTIONS.DEPOSIT_METHOD_BEP20, (ctx) => requireRegistrationAndExecute(ctx, initiateDeposit));
        bot.action(ACTIONS.WITHDRAW_METHOD_BEP20, (ctx) => requireRegistrationAndExecute(ctx, initiateWithdrawal));

        // --- SYRIATEL DEPOSIT FLOW ---
        bot.action(ACTIONS.DEPOSIT_METHOD_SYRIATEL, (ctx) => {
            const initiateSyriatelDeposit = async (ctx) => {
                console.log('🔍 DEBUG - Syriatel DEPOSIT action triggered');
                console.log('🔍 DEBUG - About to call messages.syriatel.promptDepositAmount(1, 2)');
                const depositMessage = messages.syriatel.promptDepositAmount(1, 2);
                console.log('🔍 DEBUG - Generated deposit message:', depositMessage);
                
                ctx.session.syriatelDepositStep = 1;
                await ctx.replyWithMarkdownV2(
                    depositMessage,
                    { reply_markup: syriatelDepositAmountKeyboard(1, 2).reply_markup }
                );
            };
            return requireRegistrationAndExecute(ctx, initiateSyriatelDeposit);
        });

        bot.action(actionRegexFromPrefix(ACTIONS.DEPOSIT_SYRIATEL_QUICK_PREFIX), async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const amount = Number(ctx.match[1]);
            ctx.session.syriatelAmount = amount;
            ctx.session.syriatelDepositStep = 2;
            await ctx.replyWithMarkdownV2(messages.syriatel.promptProcessId(amount, SYRIATEL_DEPOSIT_NUMBER || '09XXXXXXXX', 2, 2));
        });

        bot.action(ACTIONS.CANCEL_DEPOSIT_SYRIATEL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            ctx.session.syriatelDepositStep = 0;
            ctx.session.syriatelAmount = null;
            await ctx.replyWithMarkdownV2(messages.syriatel.canceled);
            // Show main menu
            await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
        });

        // --- SYRIATEL WITHDRAWAL FLOW ---
        bot.action(ACTIONS.WITHDRAW_METHOD_SYRIATEL, (ctx) => {
            const initiateSyriatelWithdrawal = async (ctx) => {
                const user = ctx.state.user;
                console.log('🔍 DEBUG - Syriatel WITHDRAWAL action triggered');
                console.log('🔍 DEBUG - User balance:', user.balance);
                
                if (user.balance <= 0) {
                    return ctx.replyWithMarkdownV2(messages.withdraw.insufficientFunds(user.balance.toFixed(2)));
                }
                
                const exchangeRate = Number(process.env.EXCHANGE_RATE_SYP_PER_USDT || 5000);
                console.log('🔍 DEBUG - About to call messages.syriatel.promptWithdrawAmount with exchange rate:', exchangeRate);
                const withdrawalMessage = messages.syriatel.promptWithdrawAmount(1, 3, user.balance, exchangeRate);
                console.log('🔍 DEBUG - Generated withdrawal message:', withdrawalMessage);
                
                ctx.session.syriatelWithdrawStep = 1;
                await ctx.replyWithMarkdownV2(
                    withdrawalMessage,
                    { reply_markup: syriatelWithdrawalAmountKeyboard(1, 3, user.balance, exchangeRate).reply_markup }
                );
            };
            return requireRegistrationAndExecute(ctx, initiateSyriatelWithdrawal);
        });

        const handleSyriatelWithdrawPercentage = (percentage) => async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user || user.balance <= 0) return;
            const amount = percentage === 1 ? user.balance : user.balance * percentage;
            ctx.session.syriatelAmount = amount;
            ctx.session.syriatelWithdrawStep = 2;
            
            const exchangeRate = Number(process.env.EXCHANGE_RATE_SYP_PER_USDT || 5000);
            const amountSYP = (amount * exchangeRate).toLocaleString('en-US');
            const amountUSDT = amount.toFixed(2);
            
            await ctx.replyWithMarkdownV2(
                messages.syriatel.promptPhoneNumber(2, 3, amountUSDT, amountSYP),
                { reply_markup: syriatelWithdrawalPhoneKeyboard(2, 3).reply_markup }
            );
        };

        bot.action(ACTIONS.WITHDRAW_SYRIATEL_PERCENT_25, handleSyriatelWithdrawPercentage(0.25));
        bot.action(ACTIONS.WITHDRAW_SYRIATEL_PERCENT_50, handleSyriatelWithdrawPercentage(0.50));
        bot.action(ACTIONS.WITHDRAW_SYRIATEL_PERCENT_75, handleSyriatelWithdrawPercentage(0.75));
        bot.action(ACTIONS.WITHDRAW_SYRIATEL_PERCENT_100, handleSyriatelWithdrawPercentage(1));

        bot.action(ACTIONS.CONFIRM_WITHDRAW_SYRIATEL_YES, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user || ctx.session.syriatelWithdrawStep !== 3) return;

            const amount = ctx.session.syriatelAmount;
            const phone = ctx.session.syriatelPhoneNumber;

            user.balance -= amount;
            await user.save();

            const reqDoc = await new WithdrawalRequest({
                userId: user.telegramId,
                username: user.username,
                amount: amount,
                method: 'SYRIATEL_CASH',
                phoneNumber: phone,
                status: 'open'
            }).save();

            // Notify admin
            const adminText = messages.admin.syriatelWithdrawRequest(reqDoc, user.username);
            const adminKeyboard = {
                inline_keyboard: [[
                    { text: '✅ Confirm', callback_data: `admin_withdraw_approve_${reqDoc._id}` },
                    { text: '❌ Reject', callback_data: `admin_withdraw_reject_${reqDoc._id}` }
                ]]
            };
            try {
                await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminText, { reply_markup: adminKeyboard, parse_mode: 'MarkdownV2' });
            } catch (e) { console.error('Failed to notify admin of Syriatel withdrawal:', e); }

            await ctx.replyWithMarkdownV2(messages.syriatel.requestSent);
            // Reset session
            ctx.session.syriatelWithdrawStep = 0;
            ctx.session.syriatelAmount = null;
            ctx.session.syriatelPhoneNumber = null;
        });

        bot.action(ACTIONS.CONFIRM_WITHDRAW_SYRIATEL_NO, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            ctx.session.syriatelWithdrawStep = 0;
            ctx.session.syriatelAmount = null;
            ctx.session.syriatelPhoneNumber = null;
            await ctx.replyWithMarkdownV2(messages.syriatel.canceled);
            await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
        });

        bot.action(ACTIONS.CANCEL_WITHDRAWAL_SYRIATEL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            ctx.session.syriatelWithdrawStep = 0;
            ctx.session.syriatelAmount = null;
            ctx.session.syriatelPhoneNumber = null;
            await ctx.replyWithMarkdownV2(messages.syriatel.canceled);
            await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
        });

        bot.action(ACTIONS.BACK_WITHDRAW_SYRIATEL_TO_AMOUNT, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            // When on confirmation step, go back to amount selection
            ctx.session.syriatelWithdrawStep = 1;
            ctx.session.syriatelPhoneNumber = null; // Clear the phone number
            const user = ctx.state.user;
            const exchangeRate = Number(process.env.EXCHANGE_RATE_SYP_PER_USDT || 5000);
            const withdrawalMessage = messages.syriatel.promptWithdrawAmount(1, 3, user.balance, exchangeRate);
            await ctx.replyWithMarkdownV2(
                withdrawalMessage,
                { reply_markup: syriatelWithdrawalAmountKeyboard(1, 3, user.balance, exchangeRate).reply_markup }
            );
        });

        // NEW: Handler for back button from step 2 (phone number) to step 1 (amount)
        // This uses the same action but we'll handle the logic based on current step
        // The above handler already covers both step 3->1 and step 2->1 transitions

        // Percentage-based withdrawal quick-picks and custom
        const handleWithdrawalAmountSelection = (percentage) => async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user || user.balance <= 0) {
                return ctx.replyWithMarkdownV2(messages.withdraw.insufficientFunds(user ? user.balance.toFixed(2) : '0.00'), { parse_mode: 'MarkdownV2' });
            }
            const amount = percentage === 1 ? user.balance : user.balance * percentage;

            // Check if the calculated amount is valid given current balance and minimum withdrawal
            if (isNaN(amount) || amount <= 0 || amount > user.balance) {
                return ctx.replyWithMarkdownV2(
                    messages.withdraw.invalidAmount(amount), // Use error recovery message
                    errorRecoveryKeyboard(null, 'help_withdraw_amount')
                );
            }

            ctx.session.withdrawalAmount = amount;
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_ADDRESS;
            
            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.withdraw.promptAddress(2, 4),
                { parse_mode: 'MarkdownV2', reply_markup: addressInputKeyboard(2, 4).reply_markup }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        };

        bot.action(ACTIONS.WITHDRAW_PERCENT_25, handleWithdrawalAmountSelection(0.25));
        bot.action(ACTIONS.WITHDRAW_PERCENT_50, handleWithdrawalAmountSelection(0.50));
        bot.action(ACTIONS.WITHDRAW_PERCENT_75, handleWithdrawalAmountSelection(0.75)); // Corrected value
        bot.action(ACTIONS.WITHDRAW_PERCENT_100, handleWithdrawalAmountSelection(1));

        bot.action(ACTIONS.WITHDRAW_CUSTOM, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user || user.balance <= 0) return ctx.replyWithMarkdownV2(messages.withdraw.insufficientFunds(user ? user.balance.toFixed(2) : '0.00'), { parse_mode: 'MarkdownV2' });
            
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_AMOUNT;
            
            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.withdraw.promptAmount(1, 4, user.balance),
                { parse_mode: 'MarkdownV2', reply_markup: withdrawalAmountKeyboard(1, 4, user.balance).reply_markup }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });

        // MODIFIED: Pass the specific initiate function for referral and history
        bot.action(ACTIONS.REFERRAL, (ctx) => requireRegistrationAndExecute(ctx, referralCommand.initiateReferralDisplay));
        bot.action(ACTIONS.HISTORY, (ctx) => requireRegistrationAndExecute(ctx, historyCommand.initiateHistoryDisplay));

        bot.action(ACTIONS.USAGE_POLICY, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            await ctx.reply(messages.usagePolicy, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                     [{ text: '⬅️ رجوع', callback_data: ACTIONS.MAIN_MENU }]
                    ]
                }
            });
        });

        // --- Confirmation Action Handlers (YES/NO) ---
        bot.action(ACTIONS.CONFIRM_DEPOSIT_YES, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            const user = ctx.state.user;

            if (!user || ctx.session.depositStep !== DEPOSIT_STEP_CONFIRMATION) {
                return ctx.replyWithMarkdownV2(messages.generalError, { parse_mode: 'MarkdownV2' });
            }

            const depositAmount = ctx.session.depositAmount;
            const depositAddress = generateDepositAddress(user.telegramId);
            const escapedDepositAddress = escapeMarkdownV2(depositAddress);

            ctx.session.depositStep = DEPOSIT_STEP_TXHASH;

            const qrBuffer = await generateQRCodeBuffer(depositAddress);
            // Always send a new message instead of editing
            const confirmDepositKeyboard = txHashKeyboard(3, 4);
            console.log('🔍 DEBUG - Confirm deposit txHash keyboard:', JSON.stringify(confirmDepositKeyboard, null, 2));
            
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.deposit.address(escapedDepositAddress, 3, 4),
                {
                    reply_markup: confirmDepositKeyboard.reply_markup,
                    parse_mode: 'MarkdownV2'
                }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
            console.log('🔍 DEBUG - Confirm deposit address message sent with ID:', sentMessage.message_id);
            try {
                await ctx.replyWithPhoto({ source: qrBuffer }, { caption: `يمكنك أيضاً مسح الرمز 📱 لإيداع USDT (BEP20).
                    💰 المبلغ: ${escapeMarkdownV2(amount)} USDT
                    📋 بعد الإرسال، الصق تجزئة المعاملة هنا.` });
            } catch (e) {
                console.error('Failed to send QR image:', e.message);
            }
        });

        bot.action(ACTIONS.CONFIRM_DEPOSIT_NO, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            ctx.session.depositStep = DEPOSIT_STEP_NONE;
            ctx.session.depositAmount = null;
            ctx.session.currentTransactionId = null;
            ctx.session.lastBotMessageId = null; // Clear message ID
            await ctx.replyWithMarkdownV2(messages.deposit.canceled, { parse_mode: 'MarkdownV2' });
            // Always ensure the main menu is sent as a new message, not edited, after a cancellation
            const sentWelcomeMessage = await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
            ctx.session.lastBotMessageId = sentWelcomeMessage.message_id; // Update to the welcome message ID
        });

        // Back navigation for deposit
        bot.action(ACTIONS.BACK_DEPOSIT_TO_AMOUNT, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            ctx.session.depositStep = DEPOSIT_STEP_AMOUNT;
            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.deposit.promptAmount(1, 4), 
                { 
                    parse_mode: 'MarkdownV2', 
                    reply_markup: depositAmountKeyboard(1, 4).reply_markup 
                }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });
        bot.action(ACTIONS.BACK_DEPOSIT_TO_CONFIRMATION, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            if (!ctx.session.depositAmount) {
                // If amount is somehow missing, restart the amount selection flow
                const sentMessage = await ctx.replyWithMarkdownV2(messages.deposit.promptAmount(1, 4), { reply_markup: depositAmountKeyboard(1, 4).reply_markup });
                ctx.session.lastBotMessageId = sentMessage.message_id;
                return;
            }
            ctx.session.depositStep = DEPOSIT_STEP_CONFIRMATION;
            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.deposit.promptConfirm(ctx.session.depositAmount, 2, 4),
                {
                    parse_mode: 'MarkdownV2',
                    reply_markup: confirmDepositKeyboard(2, 4).reply_markup
                }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });

        // Back to main menu action
        bot.action(ACTIONS.MAIN_MENU, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            // Reset session state
            ctx.session.registrationStep = REGISTRATION_STEP_NONE;
            ctx.session.depositStep = DEPOSIT_STEP_NONE;
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_NONE;
            ctx.session.depositAmount = null;
            ctx.session.withdrawalAmount = null;
            ctx.session.withdrawalAddress = null;
            ctx.session.currentTransactionId = null;
            ctx.session.lastBotMessageId = null; // Clear message ID

            console.log('🔍 DEBUG - Main menu action triggered, user registered:', !!ctx.state.user);
            const mainMenuKeyboard = getDynamicMainMenuKeyboard(!!ctx.state.user);
            console.log('🔍 DEBUG - Generated main menu keyboard:', JSON.stringify(mainMenuKeyboard, null, 2));

            // Always send a new message instead of editing
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.welcome, 
                { 
                    parse_mode: 'MarkdownV2', 
                    reply_markup: mainMenuKeyboard.reply_markup
                }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
            console.log('🔍 DEBUG - Main menu message sent with ID:', sentMessage.message_id);
        });

        bot.action(ACTIONS.CONFIRM_WITHDRAW_YES, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            const user = ctx.state.user;

            if (!user || ctx.session.withdrawalStep !== WITHDRAWAL_STEP_CONFIRMATION) {
                return ctx.replyWithMarkdownV2(messages.generalError, { parse_mode: 'MarkdownV2' });
            }

            const withdrawalAmount = ctx.session.withdrawalAmount;
            const withdrawalAddress = ctx.session.withdrawalAddress;
            const escapedWithdrawalAddress = escapeMarkdownV2(withdrawalAddress);


            // New admin-approval flow:
            // 1) Reserve funds by reducing balance
            user.balance -= withdrawalAmount;
            await user.save();
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_PROCESSING;
            // Send new message for processing
            const processingMsg = await ctx.replyWithMarkdownV2(messages.withdraw.pending(), { parse_mode: 'MarkdownV2' });
            // Store this message ID as well if we need to update it later
            ctx.session.lastBotMessageId = processingMsg.message_id;

            // 2) Create a request and notify admin
            const reqDoc = await new WithdrawalRequest({
                userId: user.telegramId,
                username: user.username,
                amount: withdrawalAmount,
                walletAddress: withdrawalAddress,
                status: 'open'
            }).save();

            const usernameEscaped = user.username ? `@${escapeMarkdownV2(user.username)}` : 'N/A';
            const adminText = `Withdraw request:\n` +
                `User: ${usernameEscaped}\n` +
                `ID: \`${escapeMarkdownV2(user.telegramId)}\`\n` +
                `Amount: \`${escapeMarkdownV2(withdrawalAmount)} USDT\`\n` +
                `To: \`${escapedWithdrawalAddress}\``; // Ensure address is also in code block for clarity
            const adminKeyboard = {
                inline_keyboard: [[
                    { text: '✅ Confirm', callback_data: `admin_withdraw_approve_${reqDoc._id}` },
                    { text: '❌ Reject', callback_data: `admin_withdraw_reject_${reqDoc._id}` }
                ]]
            };
            try {
                await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminText, { reply_markup: adminKeyboard, parse_mode: 'MarkdownV2' });
            } catch (e) {
                console.error('Failed to notify admin:', e);
            }
            // Session cleanup regardless; result will be delivered via admin action
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_NONE;
            ctx.session.withdrawalAmount = null;
            ctx.session.withdrawalAddress = null;
            ctx.session.currentTransactionId = null;
        });

        bot.action(ACTIONS.CONFIRM_WITHDRAW_NO, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_NONE;
            ctx.session.withdrawalAmount = null;
            ctx.session.withdrawalAddress = null;
            ctx.session.currentTransactionId = null;
            // Clear lastBotMessageId
            ctx.session.lastBotMessageId = null;
            await ctx.replyWithMarkdownV2(messages.withdraw.canceled, { parse_mode: 'MarkdownV2' });
            // Always ensure the main menu is sent as a new message, not edited, after a cancellation
            const sentWelcomeMessage = await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
            ctx.session.lastBotMessageId = sentWelcomeMessage.message_id; // Update to the welcome message ID
        });

        // Back navigation for withdrawal
        bot.action(ACTIONS.BACK_WITHDRAW_TO_ADDRESS, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            // When on address step, go back to amount selection
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_AMOUNT;
            ctx.session.withdrawalAddress = null; // Clear the address
            const user = ctx.state.user;
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.withdraw.promptAmount(1, 4, user.balance), 
                { reply_markup: withdrawalAmountKeyboard(1, 4, user.balance).reply_markup }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });

        bot.action(ACTIONS.BACK_WITHDRAW_TO_AMOUNT, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            // When on address step, go back to amount selection
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_AMOUNT;
            ctx.session.withdrawalAddress = null; // Clear the address
            const user = ctx.state.user;
            const sentMessage = await ctx.replyWithMarkdownV2(
                messages.withdraw.promptAmount(1, 4, user.balance), 
                { reply_markup: withdrawalAmountKeyboard(1, 4, user.balance).reply_markup }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        });

        // MODIFIED: The main approval handler now checks the request method
        bot.action(actionRegexFromPrefix(ACTIONS.ADMIN_APPROVE_PREFIX), async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const requestId = ctx.match[1];
            const reqDoc = await WithdrawalRequest.findById(requestId);
            if (!reqDoc || reqDoc.status !== 'open') {
                return ctx.replyWithMarkdownV2(messages.admin.requestNoLongerOpen, { parse_mode: 'MarkdownV2' });
            }
            const user = await User.findOne({ telegramId: reqDoc.userId });

            if (reqDoc.method === 'SYRIATEL_CASH') {
                // Manual approval for Syriatel Cash
                reqDoc.status = 'approved';
                reqDoc.processedAt = new Date();
                await reqDoc.save();
                await new Transaction({
                    userId: reqDoc.userId, type: 'withdrawal', amount: reqDoc.amount,
                    description: `Syriatel Cash to ${reqDoc.phoneNumber}`, status: 'completed'
                }).save();
                if (user) await bot.telegram.sendMessage(user.telegramId, `✅ تم إرسال مبلغ السحب ${reqDoc.amount} USDT إلى رقمك ${escapeMarkdownV2(reqDoc.phoneNumber)}`);
                await ctx.editMessageText(`✅ Approved Syriatel withdrawal for ${user.username || user.telegramId}.`);

            } else if (reqDoc.method === 'USDT_BEP20') {
                // Original blockchain logic
                const escapedAddress = escapeMarkdownV2(reqDoc.walletAddress);
                try {
                    const txHash = await sendFundsToBlockchain(reqDoc.walletAddress, reqDoc.amount);
                    if (txHash) {
                        await new Transaction({
                            userId: reqDoc.userId, type: 'withdrawal', amount: reqDoc.amount,
                            walletAddress: reqDoc.walletAddress, txHash, status: 'completed',
                            description: 'Withdrawal approved by admin'
                        }).save();
                        reqDoc.status = 'approved';
                        reqDoc.processedAt = new Date();
                        await reqDoc.save();
                        if (user) await bot.telegram.sendMessage(user.telegramId, messages.withdraw.withdrawalSuccess(reqDoc.amount, escapedAddress), { parse_mode: 'MarkdownV2' });
                        await ctx.editMessageText(messages.admin.withdrawApprovedSent);
                    } else {
                        // refund balance
                        if (user) { user.balance += reqDoc.amount; await user.save(); }
                        reqDoc.status = 'rejected';
                        reqDoc.processedAt = new Date();
                        await reqDoc.save();
                        if (user) await bot.telegram.sendMessage(user.telegramId, messages.withdraw.withdrawalFailed, { parse_mode: 'MarkdownV2' });
                        await ctx.editMessageText(messages.admin.withdrawSendFailedRefunded);
                    }
                } catch (e) {
                    console.error('Admin approve error:', e);
                    if (user) { user.balance += reqDoc.amount; await user.save(); }
                    reqDoc.status = 'rejected';
                    reqDoc.processedAt = new Date();
                    await reqDoc.save();
                    if (user) await bot.telegram.sendMessage(user.telegramId, messages.generalError, { parse_mode: 'MarkdownV2' });
                    await ctx.editMessageText(messages.admin.withdrawErrorRefunded);
                }
            }
        });

        // ADD: Admin handlers for Syriatel Deposit
        bot.action(actionRegexFromPrefix(ACTIONS.ADMIN_SYRIATEL_DEPOSIT_APPROVE_PREFIX), async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const requestId = ctx.match[1];
            const reqDoc = await SyriatelDepositRequest.findById(requestId);
            if (!reqDoc || reqDoc.status !== 'open') {
                return ctx.replyWithMarkdownV2(messages.admin.requestNoLongerOpen);
            }
            const user = await User.findOne({ telegramId: reqDoc.userId });
            if (user) {
                // NOTE: You need to define the exchange rate from SYP to USDT
                const exchangeRate = 5000; // Example: 1 USDT = 5000 SYP
                const usdtAmount = reqDoc.amount / exchangeRate;

                user.balance += usdtAmount;
                await user.save();

                await new Transaction({
                    userId: user.telegramId, type: 'deposit', amount: usdtAmount,
                    status: 'completed', description: `Syriatel Deposit: ${reqDoc.amount} SYP`
                }).save();

                reqDoc.status = 'approved';
                reqDoc.processedAt = new Date();
                await reqDoc.save();

                await bot.telegram.sendMessage(user.telegramId, `✅ تم تأكيد إيداعك بقيمة ${reqDoc.amount} ل.س وتم إضافة ${usdtAmount.toFixed(2)} USDT إلى رصيدك.`);
                await ctx.editMessageText(`✅ Approved Syriatel deposit for ${user.username || user.telegramId}.`);
            }
        });

        bot.action(actionRegexFromPrefix(ACTIONS.ADMIN_SYRIATEL_DEPOSIT_REJECT_PREFIX), async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const requestId = ctx.match[1];
            const reqDoc = await SyriatelDepositRequest.findById(requestId);
            if (!reqDoc || reqDoc.status !== 'open') {
                return ctx.replyWithMarkdownV2(messages.admin.requestNoLongerOpen);
            }
            reqDoc.status = 'rejected';
            reqDoc.processedAt = new Date();
            await reqDoc.save();
            const user = await User.findOne({ telegramId: reqDoc.userId });
            if (user) {
                await bot.telegram.sendMessage(user.telegramId, `❌ تم رفض طلب الإيداع الخاص بك بقيمة ${reqDoc.amount} ل.س.`);
            }
            await ctx.editMessageText(`❌ Rejected Syriatel deposit for ${user.username || user.telegramId}.`);
        });


        // Action handlers for cancelling operations
        bot.action(ACTIONS.CANCEL_REGISTRATION, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            ctx.session.registrationStep = REGISTRATION_STEP_NONE;
            ctx.session.tempUsername = null;
            ctx.session.referredBy = null; // Clear referredBy from main session
            ctx.session.registrationData = null; // Clear registrationData on cancel
            ctx.session.lastBotMessageId = null; // Clear message ID
            await ctx.replyWithMarkdownV2(messages.register.registrationCanceled || 'Registration canceled.', { parse_mode: 'MarkdownV2' });
            const sentWelcomeMessage = await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
            ctx.session.lastBotMessageId = sentWelcomeMessage.message_id; // Update to the welcome message ID
        });

        bot.action(ACTIONS.REGISTER_NO_REFERRAL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            // Continue registration without referral
            const { registerUser } = require('./commands/register');
            await registerUser(ctx, null);
        });

        bot.action(ACTIONS.CANCEL_DEPOSIT, async (ctx) => {
            // FIX: Corrected typo from ctx.answerCbCbQuery() to ctx.answerCbQuery()
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            ctx.session.depositStep = DEPOSIT_STEP_NONE;
            ctx.session.depositAmount = null;
            ctx.session.currentTransactionId = null;
            ctx.session.lastBotMessageId = null; // Clear message ID
            await ctx.replyWithMarkdownV2(messages.deposit.canceled || 'Deposit canceled.', { parse_mode: 'MarkdownV2' });
            const sentWelcomeMessage = await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
            ctx.session.lastBotMessageId = sentWelcomeMessage.message_id; // Update to the welcome message ID
        });

        bot.action(ACTIONS.CANCEL_WITHDRAWAL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (error) { if (error.response && error.response.error_code === 400 && error.response.description.includes('query is too old')) { console.warn(`Ignoring expired callback query from user ${ctx.from?.id}: ${error.message}`); return; } throw error; }
            ctx.session.withdrawalStep = WITHDRAWAL_STEP_NONE;
            ctx.session.withdrawalAmount = null;
            ctx.session.withdrawalAddress = null;
            ctx.session.currentTransactionId = null;
            ctx.session.lastBotMessageId = null; // Clear message ID
            await ctx.replyWithMarkdownV2(messages.withdraw.canceled || 'Withdrawal canceled.', { parse_mode: 'MarkdownV2' });
            const sentWelcomeMessage = await ctx.replyWithMarkdownV2(messages.welcome, { reply_markup: getDynamicMainMenuKeyboard(!!ctx.state.user).reply_markup });
            ctx.session.lastBotMessageId = sentWelcomeMessage.message_id; // Update to the welcome message ID
        });

        // Help action handlers
        bot.action(ACTIONS.HELP_BEP20_ADDRESS, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            await ctx.replyWithMarkdownV2(messages.help.bep20Guide(), { parse_mode: 'MarkdownV2' });
        });

        bot.action(ACTIONS.HELP_GENERAL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            await ctx.replyWithMarkdownV2(messages.help.generalSupport(), { parse_mode: 'MarkdownV2' });
        });

        bot.action(ACTIONS.HELP_DEPOSIT_VERIFICATION, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            await ctx.replyWithMarkdownV2(messages.help.depositVerification(), { parse_mode: 'MarkdownV2' });
        });

        bot.action(ACTIONS.HELP_CONTACT_SUPPORT, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            await ctx.replyWithMarkdownV2(messages.help.contactSupport(), { parse_mode: 'MarkdownV2' });
        });


        // --- Error Handling ---
        bot.catch((err, ctx) => {
            console.error(`❌ Error for ${ctx.updateType} in chat ${ctx.chat.id} (${ctx.chat.type}):`, err);
            // Ensure error message is also MarkdownV2 compatible
            ctx.replyWithMarkdownV2(messages.generalError, { parse_mode: 'MarkdownV2' });
        });

        // --- Launch the bot ---
        bot.launch()
            .then(() => {
                console.log('🚀 Bot launched successfully!');
            })
            .catch((err) => {
                console.error('⚠️ Failed to launch bot:', err);
                process.exit(1);
            });

        // Enable graceful stop
        process.once('SIGINT', () => {
            console.log('Stopping bot due to SIGINT...');
            bot.stop('SIGINT');
            mongoose.connection.close(() => {
                console.log('MongoDB connection closed.');
                process.exit(0);
            });
        });
        process.once('SIGTERM', () => {
            console.log('Stopping bot due to SIGTERM...');
            bot.stop('SIGTERM');
            mongoose.connection.close(() => {
                console.log('MongoDB connection closed.');
                process.exit(0);
            });
        });
    })
    .catch(err => {
        console.error('Fatal: Failed to connect to MongoDB, cannot start bot:', err);
        process.exit(1);
    });

