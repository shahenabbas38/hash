const Transaction = require('../models/Transaction');
const messages = require('../constants/messages');
// CHANGED: Import the entire keyboards module instead of destructuring
const keyboards = require('../ui/keyboards');
const { escapeMarkdownV2 } = require('../utils/markdown'); // Import escapeMarkdownV2
const { ACTIONS } = require('../constants/actions'); // Import ACTIONS constants

/**
 * Renders the user's transactions based on a filter.
 * @param {Object} ctx - The Telegraf context object.
 * @param {string|null} filter - The filter to apply ('completed', 'failed', 'deposit', 'withdrawal'), or null for all.
 */
const renderTransactions = async (ctx, filter) => {
    const user = ctx.state.user;
    const match = { userId: user.telegramId };

    // Apply different types of filters
    if (filter === 'completed' || filter === 'failed') {
        match.status = filter;
    } else if (filter === 'deposit' || filter === 'withdrawal') {
        match.type = filter;
    }

    // IMPORTANT: Avoid orderBy() if it leads to runtime errors due to missing indexes.
    // Fetch all and sort in memory if needed, but for simple cases, MongoDB's sort is fine.
    const txs = await Transaction.find(match).sort({ createdAt: -1 }).limit(20).lean();

    if (txs.length === 0) {
        // Always send a new message instead of editing
        const sentMessage = await ctx.replyWithMarkdownV2(
            messages.history.noTransactions(filter),
            {
                parse_mode: 'MarkdownV2',
                reply_markup: keyboards.getHistoryFilterKeyboard().reply_markup
            }
        );
        ctx.session.lastBotMessageId = sentMessage.message_id;
        return;
    }

    let msg = `📋 معاملاتك \\(${filter ? escapeMarkdownV2(filter === 'completed' ? 'مكتملة' : filter === 'failed' ? 'فاشلة' : filter === 'deposit' ? 'إيداع' : 'سحب') : 'الكل'}\\):\n\n`;

    txs.forEach((t, idx) => {
        // Ensure all dynamic parts are escaped for MarkdownV2
        const idxText = escapeMarkdownV2(`${idx + 1}.`); // Escape dot
        const type = escapeMarkdownV2(t.type === 'deposit' ? 'إيداع' : t.type === 'withdrawal' ? 'سحب' : t.type);
        const status = escapeMarkdownV2(t.status === 'completed' ? 'مكتملة' : t.status === 'failed' ? 'فاشلة' : t.status);
        const amount = escapeMarkdownV2(t.amount.toFixed(8)); // Escape amount
        const date = escapeMarkdownV2(new Date(t.createdAt).toLocaleString());
        // Truncate and escape TxHash and Wallet Address
        const txHashDisplay = t.txHash ? `\`${escapeMarkdownV2(t.txHash.substring(0, 10))}...${escapeMarkdownV2(t.txHash.substring(t.txHash.length - 10))}\`` : 'غير متوفر';
        const walletAddressDisplay = t.walletAddress ? `\`${escapeMarkdownV2(t.walletAddress.substring(0, 10))}...${escapeMarkdownV2(t.walletAddress.substring(t.walletAddress.length - 10))}\`` : 'غير متوفر';
        const description = t.description ? escapeMarkdownV2(t.description) : 'غير متوفر';

        msg += `${idxText} *النوع:* ${type}\n`;
        msg += `   *المبلغ:* ${amount} USDT\n`;
        msg += `   *الحالة:* ${status}\n`;
        msg += `   *التاريخ:* ${date}\n`;
        if (t.type === 'deposit') {
            msg += `   *تجزئة المعاملة:* ${txHashDisplay}\n`;
        } else if (t.type === 'withdrawal') {
            msg += `   *إلى العنوان:* ${walletAddressDisplay}\n`;
        }
        if (description !== 'غير متوفر') {
            msg += `   *الوصف:* ${description}\n`;
        }
        msg += '\n';
    });

    // Always send a new message instead of editing to ensure keyboard displays properly
    const sentMessage = await ctx.replyWithMarkdownV2(msg, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboards.getHistoryFilterKeyboard().reply_markup
    });
    ctx.session.lastBotMessageId = sentMessage.message_id;
};

/**
 * Handles the initial action for displaying history filter options.
 * This function will be passed to requireRegistrationAndExecute.
 * @param {Object} ctx - The Telegraf context object.
 */
const initiateHistoryDisplay = async (ctx) => {
    const initialMessage = await ctx.replyWithMarkdownV2(
        messages.history.promptFilter,
        {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboards.getHistoryFilterKeyboard().reply_markup
        }
    );
    ctx.session.lastBotMessageId = initialMessage.message_id;
};

// Export both a setup function (for registering bot.command/bot.action)
// and the specific initiation function for the inline button action.
module.exports = {
    setup: (bot) => {
        // Command handler for /history (calls the initiate display function)
        bot.command('history', initiateHistoryDisplay);

        // Action handler for displaying all transactions
        bot.action(ACTIONS.HISTORY_ALL, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            await renderTransactions(ctx, null); // Null for all transactions
        });

        // Action handler for displaying completed transactions
        bot.action(ACTIONS.HISTORY_COMPLETED, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            await renderTransactions(ctx, 'completed');
        });

        // Action handler for displaying failed transactions
        bot.action(ACTIONS.HISTORY_FAILED, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            await renderTransactions(ctx, 'failed');
        });

        // Action handler for displaying deposit transactions
        bot.action(ACTIONS.HISTORY_DEPOSITS, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            await renderTransactions(ctx, 'deposit');
        });

        // Action handler for displaying withdrawal transactions
        bot.action(ACTIONS.HISTORY_WITHDRAWALS, async (ctx) => {
            try { await ctx.answerCbQuery(); } catch (_) {}
            const user = ctx.state.user;
            if (!user) {
                return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
            }
            await renderTransactions(ctx, 'withdrawal');
        });
    },
    // Export the specific function to be called by requireRegistrationAndExecute
    renderTransactions,
    initiateHistoryDisplay
};

// Centralized inline keyboard builders for the bot UI
const { Markup } = require('telegraf');
// const { ACTIONS } = require('../constants/actions'); // Already imported above
// const messages = require('../constants/messages'); // Already imported above

/**
 * لوحات مفاتيح محسّنة ذات أزرار مرمزة بالألوان وتدفق بصري أفضل
 */
class EnhancedKeyboards {
    /**
     * تنشئ زرًا مرمّزًا بالألوان مع رمز تعبيري ونص
     * @param {string} text - نص الزر
     * @param {string} callback - بيانات رد الاتصال
     * @param {string} color - لون الزر (green, red, blue, yellow, purple, orange)
     * @param {string} emoji - رمز تعبيري للزر
     * @returns {Object} زر منسق
     */
    static createColoredButton(text, callback, color = 'blue', emoji = '') {
        const colors = {
            green: '🟢',
            red: '🔴',
            blue: '🔵',
            yellow: '🟡',
            purple: '�',
            orange: '🟠'
        };

        const colorEmoji = colors[color] || colors.blue;
        const buttonText = emoji ? `${emoji} ${text}` : text;

        return Markup.button.callback(buttonText, callback);
    }

    /**
     * تنشئ لوحة مفاتيح لمؤشر التقدم تعرض الخطوة الحالية مع مرئيات محسّنة
     * @param {number} current - الخطوة الحالية
     * @param {number} total - إجمالي الخطوات
     * @param {Array} buttons - مصفوفة من صفوف الأزرار
     * @param {string} stepName - اسم الخطوة الحالية
     * @returns {Object} لوحة مفاتيح مع مؤشر التقدم
     */
    static createProgressKeyboard(current, total, buttons, stepName = '') {
        const progressDots = '🔵'.repeat(current) + '⚪'.repeat(total - current);
        const progressRow = [
            Markup.button.callback(
                `📊 الخطوة ${current}/${total} ${stepName}`,
                'progress_indicator' // هذا الـ callback عادةً لا يقوم بأي عملية
            )
        ];

        const progressIndicatorRow = [
            Markup.button.callback(
                progressDots,
                'progress_indicator' // هذا الـ callback عادةً لا يقوم بأي عملية
            )
        ];

        return Markup.inlineKeyboard([progressRow, progressIndicatorRow, ...buttons]);
    }

    /**
     * تنشئ لوحة مفاتيح للتنقل في التدفق مع أزرار الرجوع/الأمام وتصميم محسّن
     * @param {Array} mainButtons - أزرار الإجراءات الرئيسية
     * @param {Object} options - خيارات التنقل
     * @returns {Object} لوحة مفاتيح للتنقل في التدفق
     */
    static createFlowKeyboard(mainButtons, options = {}) {
        const { showBack = false, showCancel = true, backCallback = null, cancelCallback = null, showHome = false, homeCallback = null } = options;

        let keyboard = [mainButtons];

        if (showBack && backCallback) {
            keyboard.push([
                this.createColoredButton('⬅️ رجوع', backCallback, 'blue', '⬅️')
            ]);
        }

        if (showHome && homeCallback) {
            keyboard.push([
                this.createColoredButton('🏠 الرئيسية', homeCallback, 'purple', '🏠')
            ]);
        }

        if (showCancel && cancelCallback) {
            keyboard.push([
                this.createColoredButton('❌ إلغاء', cancelCallback, 'red', '❌')
            ]);
        }

        return Markup.inlineKeyboard(keyboard);
    }

    /**
     * تنشئ لوحة مفاتيح للانتقال المتحرك
     * @param {string} transitionType - نوع الانتقال
     * @param {string} nextCallback - رد اتصال الخطوة التالية
     * @returns {Object} لوحة مفاتيح الانتقال
     */
    static createTransitionKeyboard(transitionType = 'forward', nextCallback = null) {
        const transitions = {
            forward: { emoji: '➡️', text: 'متابعة', color: 'green' },
            back: { emoji: '⬅️', text: 'العودة', color: 'blue' },
            complete: { emoji: '✅', text: 'اكتمل', color: 'green' }
        };

        const transition = transitions[transitionType] || transitions.forward;

        if (nextCallback) {
            return Markup.inlineKeyboard([
                [this.createColoredButton(transition.text, nextCallback, transition.color, transition.emoji)]
            ]);
        }

        return Markup.inlineKeyboard([
            [Markup.button.callback(`${transition.emoji} ${transition.text}`, 'transition_continue')]
        ]);
    }
}

/**
 * لوحة مفاتيح القائمة الرئيسية (تتكيف مع حالة التسجيل) مع تصميم محسّن
 */
const getDynamicMainMenuKeyboard = (userIsRegistered) => {
    const accountButtonText = userIsRegistered ? messages.buttons.account : messages.buttons.newAccount;
    const accountButtonCallback = userIsRegistered ? ACTIONS.ACCOUNT : ACTIONS.INITIATE_REGISTRATION;

    return Markup.inlineKeyboard([
        [
            EnhancedKeyboards.createColoredButton(messages.buttons.deposit, ACTIONS.DEPOSIT, 'green', '💰')
        ],
        [
            EnhancedKeyboards.createColoredButton(accountButtonText, accountButtonCallback, 'green', '👤'),
            EnhancedKeyboards.createColoredButton(messages.buttons.referral, ACTIONS.REFERRAL, 'blue', '🔗')
        ],
        [
            EnhancedKeyboards.createColoredButton(messages.buttons.withdraw, ACTIONS.WITHDRAW, 'yellow', '💸')
        ],
        [
            EnhancedKeyboards.createColoredButton(messages.buttons.history, ACTIONS.HISTORY, 'purple', '📊')
        ],
                [
            // زر نقاط الولاء الجديد
            EnhancedKeyboards.createColoredButton('🎁 نقاط الولاء', ACTIONS.LOYALTY, 'orange', '🎁')
        ],
        [
            { text: '📜 سياسة الاستخدام', callback_data: ACTIONS.USAGE_POLICY }
        ]

    ]);
};

/**
 * لوحة مفاتيح فلتر السجل.
 */
const getHistoryFilterKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            EnhancedKeyboards.createColoredButton('عرض الكل', ACTIONS.HISTORY_ALL, 'blue', '📜'),
            EnhancedKeyboards.createColoredButton('مكتملة', ACTIONS.HISTORY_COMPLETED, 'green', '✅')
        ],
        [
            EnhancedKeyboards.createColoredButton('فاشلة', ACTIONS.HISTORY_FAILED, 'red', '❌'),
            EnhancedKeyboards.createColoredButton('الإيداعات', ACTIONS.HISTORY_DEPOSITS, 'green', '💰')
        ],
        [
            EnhancedKeyboards.createColoredButton('السحوبات', ACTIONS.HISTORY_WITHDRAWALS, 'yellow', '💸'),
            EnhancedKeyboards.createColoredButton(messages.buttons.backToMenu, ACTIONS.MAIN_MENU, 'purple', '🏠')
        ]
    ]);
};

// لوحات مفاتيح إلغاء محسّنة برموز الألوان وتجربة مستخدم أفضل
const cancelRegistrationKeyboard = Markup.inlineKeyboard([
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.cancelRegistration, ACTIONS.CANCEL_REGISTRATION, 'red', '❌'),
        EnhancedKeyboards.createColoredButton(messages.buttons.startOver, ACTIONS.INITIATE_REGISTRATION, 'blue', '🔄')
    ],
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.backToMenu, ACTIONS.MAIN_MENU, 'purple', '🏠')
    ]
]);

const cancelDepositKeyboard = Markup.inlineKeyboard([
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.cancelDeposit, ACTIONS.CANCEL_DEPOSIT, 'red', '❌'),
        EnhancedKeyboards.createColoredButton(messages.buttons.tryAgain, ACTIONS.DEPOSIT, 'blue', '🔄')
    ],
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.backToMenu, ACTIONS.MAIN_MENU, 'purple', '🏠')
    ]
]);

const cancelWithdrawalKeyboard = Markup.inlineKeyboard([
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.cancelWithdrawal, ACTIONS.CANCEL_WITHDRAWAL, 'red', '❌'),
        EnhancedKeyboards.createColoredButton(messages.buttons.tryAgain, ACTIONS.WITHDRAW, 'blue', '🔄')
    ],
    [
        EnhancedKeyboards.createColoredButton(messages.buttons.backToMenu, ACTIONS.MAIN_MENU, 'purple', '🏠')
    ]
]);

// لوحات مفاتيح تدفق محسّنة مع رموز الألوان ومؤشرات التقدم
const confirmDepositKeyboard = (step = 2, total = 4) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`💰 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    const actionRow = [
        EnhancedKeyboards.createColoredButton(messages.buttons.yes, ACTIONS.CONFIRM_DEPOSIT_YES, 'green', '✅'),
        EnhancedKeyboards.createColoredButton(messages.buttons.no, ACTIONS.CONFIRM_DEPOSIT_NO, 'red', '❌')
    ];

    const navigationRow = [
        EnhancedKeyboards.createColoredButton(messages.buttons.back, ACTIONS.BACK_DEPOSIT_TO_AMOUNT, 'blue', '⬅️'),
        EnhancedKeyboards.createColoredButton(messages.buttons.cancel, ACTIONS.CANCEL_DEPOSIT, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, actionRow, navigationRow]);
};

const txHashKeyboard = (step = 4, total = 4) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`🔍 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    const navigationRow = [
        EnhancedKeyboards.createColoredButton(messages.buttons.back, ACTIONS.BACK_DEPOSIT_TO_CONFIRMATION, 'blue', '⬅️'),
        EnhancedKeyboards.createColoredButton(messages.buttons.cancel, ACTIONS.CANCEL_DEPOSIT, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, navigationRow]);
};

const confirmWithdrawalKeyboard = (step = 3, total = 4) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`✅ الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    const actionRow = [
        EnhancedKeyboards.createColoredButton(messages.buttons.yes, ACTIONS.CONFIRM_WITHDRAW_YES, 'green', '✅'),
        EnhancedKeyboards.createColoredButton(messages.buttons.no, ACTIONS.CONFIRM_WITHDRAW_NO, 'red', '❌')
    ];

    const navigationRow = [
        EnhancedKeyboards.createColoredButton(messages.buttons.back, ACTIONS.BACK_WITHDRAW_TO_ADDRESS, 'blue', '⬅️'),
        EnhancedKeyboards.createColoredButton(messages.buttons.cancel, ACTIONS.CANCEL_WITHDRAWAL, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, actionRow, navigationRow]);
};

// لوحة مفاتيح تسجيل محسّنة مع مؤشرات الخطوات
const registrationKeyboard = (step = 1, total = 3) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`📝 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    const cancelRow = [
        EnhancedKeyboards.createColoredButton('إلغاء التسجيل', ACTIONS.CANCEL_REGISTRATION, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, cancelRow]);
};

// لوحة مفاتيح اختيار مبلغ الإيداع المحسّنة مع تنظيم بصري أفضل
const depositAmountKeyboard = (step = 1, total = 4) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`💰 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    // أزرار المبلغ السريع مع ترميز الألوان وتنظيم أفضل
    const quickAmounts = [
        [
            EnhancedKeyboards.createColoredButton('10 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}10`, 'green', '💸'),
            EnhancedKeyboards.createColoredButton('25 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}25`, 'green', '💸')
        ],
        [
            EnhancedKeyboards.createColoredButton('50 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}50`, 'green', '💸'),
            EnhancedKeyboards.createColoredButton('100 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}100`, 'green', '💸')
        ],
        [
            EnhancedKeyboards.createColoredButton('250 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}250`, 'green', '💸'),
            EnhancedKeyboards.createColoredButton('500 USDT', `${ACTIONS.DEPOSIT_QUICK_PREFIX}500`, 'green', '💸')
        ]
    ];

    const customRow = [
        EnhancedKeyboards.createColoredButton('إدخال مبلغ مخصص', ACTIONS.DEPOSIT_CUSTOM, 'blue', '✏️')
    ];

    const cancelRow = [
        EnhancedKeyboards.createColoredButton('إلغاء الإيداع', ACTIONS.CANCEL_DEPOSIT, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, ...quickAmounts, customRow, cancelRow]);
};

// لوحة مفاتيح اختيار مبلغ السحب المحسّنة مع تنظيم بصري أفضل
const withdrawalAmountKeyboard = (step = 1, total = 4, balance = null) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`💸 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    // أزرار النسبة المئوية مع المبالغ المحسوبة إذا تم توفير الرصيد
    const percentageButtons = [];
    if (balance !== null && balance > 0) {
        const amounts = {
            25: (balance * 0.25).toFixed(4),
            50: (balance * 0.50).toFixed(4),
            75: (balance * 0.75).toFixed(4),
            100: balance.toFixed(4)
        };

        percentageButtons.push([
            EnhancedKeyboards.createColoredButton(`25% (${amounts[25]} USDT)`, ACTIONS.WITHDRAW_PERCENT_25, 'yellow', '💸'),
            EnhancedKeyboards.createColoredButton(`50% (${amounts[50]} USDT)`, ACTIONS.WITHDRAW_PERCENT_50, 'yellow', '💸')
        ]);
        percentageButtons.push([
            EnhancedKeyboards.createColoredButton(`75% (${amounts[75]} USDT)`, ACTIONS.WITHDRAW_PERCENT_75, 'yellow', '💸'),
            EnhancedKeyboards.createColoredButton(`100% (${amounts[100]} USDT)`, ACTIONS.WITHDRAW_PERCENT_100, 'yellow', '💸')
        ]);
    } else {
        // العودة إلى النص العام إذا لم يتم توفير رصيد
        percentageButtons.push([
            EnhancedKeyboards.createColoredButton('25% من الرصيد', ACTIONS.WITHDRAW_PERCENT_25, 'yellow', '💸'),
            EnhancedKeyboards.createColoredButton('50% من الرصيد', ACTIONS.WITHDRAW_PERCENT_50, 'yellow', '💸')
        ]);
        percentageButtons.push([
            EnhancedKeyboards.createColoredButton('75% من الرصيد', ACTIONS.WITHDRAW_PERCENT_75, 'yellow', '💸'),
            EnhancedKeyboards.createColoredButton('100% من الرصيد', ACTIONS.WITHDRAW_PERCENT_100, 'yellow', '💸')
        ]);
    }

    const customRow = [
        EnhancedKeyboards.createColoredButton('إدخال مبلغ مخصص', ACTIONS.WITHDRAW_CUSTOM, 'blue', '✏️')
    ];

    const cancelRow = [
        EnhancedKeyboards.createColoredButton('إلغاء السحب', ACTIONS.CANCEL_WITHDRAWAL, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, ...percentageButtons, customRow, cancelRow]);
};

// لوحة مفاتيح إدخال العنوان المحسّنة مع تحذير اكتشاف الشبكة
const addressInputKeyboard = (step = 2, total = 4) => {
    const progressDots = '🔵'.repeat(step) + '⚪'.repeat(total - step);

    const progressRow = [
        Markup.button.callback(`📍 الخطوة ${step} من ${total}`, 'progress_indicator')
    ];

    const progressIndicatorRow = [
        Markup.button.callback(progressDots, 'progress_indicator')
    ];

    const helpRow = [
        EnhancedKeyboards.createColoredButton('❓ كيفية العثور على عنوان BEP20', ACTIONS.HELP_BEP20_ADDRESS, 'blue', '❓')
    ];

    const navigationRow = [
        EnhancedKeyboards.createColoredButton('⬅️ رجوع', ACTIONS.BACK_WITHDRAW_TO_AMOUNT, 'blue', '⬅️'),
        EnhancedKeyboards.createColoredButton('❌ إلغاء', ACTIONS.CANCEL_WITHDRAWAL, 'red', '❌')
    ];

    return Markup.inlineKeyboard([progressRow, progressIndicatorRow, helpRow, navigationRow]);
};

// لوحة مفاتيح النجاح المحسّنة مع الإجراءات التالية
const successKeyboard = (nextAction = null) => {
    const buttons = [
        EnhancedKeyboards.createColoredButton('🏠 العودة للقائمة الرئيسية', ACTIONS.MAIN_MENU, 'purple', '🏠')
    ];

    if (nextAction) {
        buttons.unshift(EnhancedKeyboards.createColoredButton('🔄 قم بآخر', nextAction, 'green', '🔄'));
    }

    return Markup.inlineKeyboard([buttons]);
};

// لوحة مفاتيح استعادة الأخطاء المحسّنة
const errorRecoveryKeyboard = (retryAction = null, helpAction = null) => {
    const buttons = [];

    if (retryAction) {
        buttons.push(EnhancedKeyboards.createColoredButton('🔄 حاول مرة أخرى', retryAction, 'blue', '🔄'));
    }

    if (helpAction) {
        buttons.push(EnhancedKeyboards.createColoredButton('❓ الحصول على مساعدة', helpAction, 'yellow', '❓'));
    }

    buttons.push(EnhancedKeyboards.createColoredButton('🏠 العودة للقائمة الرئيسية', ACTIONS.MAIN_MENU, 'purple', '🏠'));

    return Markup.inlineKeyboard([buttons]);
};

/**
 * Keyboard to select a payment method (deposit or withdraw).
 */
const getPaymentMethodKeyboard = (type = 'deposit') => {
    const bep20_action = type === 'deposit' ? ACTIONS.DEPOSIT_METHOD_BEP20 : ACTIONS.WITHDRAW_METHOD_BEP20;
    const syriatel_action = type === 'deposit' ? ACTIONS.DEPOSIT_METHOD_SYRIATEL : ACTIONS.WITHDRAW_METHOD_SYRIATEL;

    return Markup.inlineKeyboard([
        [
            Markup.button.callback('USDT (BEP20)', bep20_action),
            Markup.button.callback('سيرتيل كاش', syriatel_action)
        ],
        [
            Markup.button.callback(messages.buttons.backToMenu, ACTIONS.MAIN_MENU)
        ]
    ]);
};

/**
 * Keyboard for Syriatel Cash deposit amount selection.
 */
const syriatelDepositAmountKeyboard = (step = 1, total = 2) => {
    return Markup.inlineKeyboard([
        // Quick amount buttons
        [
            Markup.button.callback('10,000', `${ACTIONS.DEPOSIT_SYRIATEL_QUICK_PREFIX}10000`),
            Markup.button.callback('25,000', `${ACTIONS.DEPOSIT_SYRIATEL_QUICK_PREFIX}25000`)
        ],
        [
            Markup.button.callback('50,000', `${ACTIONS.DEPOSIT_SYRIATEL_QUICK_PREFIX}50000`),
            Markup.button.callback('100,000', `${ACTIONS.DEPOSIT_SYRIATEL_QUICK_PREFIX}100000`)
        ],
        [Markup.button.callback('إلغاء الإيداع', ACTIONS.CANCEL_DEPOSIT_SYRIATEL)]
    ]);
};

/**
 * Keyboard for Syriatel Cash withdrawal amount selection.
 */
const syriatelWithdrawalAmountKeyboard = (step = 1, total = 3, balance = 0, exchangeRate = 5000) => {
    const buttons = [];
    if (balance > 0) {
        const amounts = {
            25: (balance * 0.25).toFixed(2),
            50: (balance * 0.50).toFixed(2),
            75: (balance * 0.75).toFixed(2),
            100: balance.toFixed(2)
        };
        
        buttons.push([
            Markup.button.callback(`25% (${amounts[25]} USDT)`, ACTIONS.WITHDRAW_SYRIATEL_PERCENT_25),
            Markup.button.callback(`50% (${amounts[50]} USDT)`, ACTIONS.WITHDRAW_SYRIATEL_PERCENT_50)
        ]);
        buttons.push([
            Markup.button.callback(`75% (${amounts[75]} USDT)`, ACTIONS.WITHDRAW_SYRIATEL_PERCENT_75),
            Markup.button.callback(`100% (${amounts[100]} USDT)`, ACTIONS.WITHDRAW_SYRIATEL_PERCENT_100)
        ]);
    }
    buttons.push([Markup.button.callback('إلغاء السحب', ACTIONS.CANCEL_WITHDRAWAL_SYRIATEL)]);
    return Markup.inlineKeyboard(buttons);
};

/**
 * Keyboard for Syriatel Cash withdrawal phone number input (step 2).
 */
const syriatelWithdrawalPhoneKeyboard = (step = 2, total = 3) => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(messages.buttons.back, ACTIONS.BACK_WITHDRAW_SYRIATEL_TO_AMOUNT),
            Markup.button.callback(messages.buttons.cancel, ACTIONS.CANCEL_WITHDRAWAL_SYRIATEL)
        ]
    ]);
};

/**
 * Keyboard for confirming a Syriatel Cash withdrawal.
 */
const confirmSyriatelWithdrawalKeyboard = (step = 3, total = 3) => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(messages.buttons.yes, ACTIONS.CONFIRM_WITHDRAW_SYRIATEL_YES),
            Markup.button.callback(messages.buttons.no, ACTIONS.CONFIRM_WITHDRAW_SYRIATEL_NO)
        ],
        [
            Markup.button.callback(messages.buttons.back, ACTIONS.BACK_WITHDRAW_SYRIATEL_TO_AMOUNT),
            Markup.button.callback(messages.buttons.cancel, ACTIONS.CANCEL_WITHDRAWAL_SYRIATEL)
        ]
    ]);
};

module.exports = {
    EnhancedKeyboards,
    getDynamicMainMenuKeyboard,
    getHistoryFilterKeyboard, // ADDED: Export this function
    cancelRegistrationKeyboard,
    cancelDepositKeyboard,
    cancelWithdrawalKeyboard,
    getPaymentMethodKeyboard,
    syriatelDepositAmountKeyboard,
    syriatelWithdrawalAmountKeyboard,
    syriatelWithdrawalPhoneKeyboard,
    confirmSyriatelWithdrawalKeyboard,
    confirmDepositKeyboard,
    txHashKeyboard,
    confirmWithdrawalKeyboard,
    registrationKeyboard,
    depositAmountKeyboard,
    withdrawalAmountKeyboard,
    addressInputKeyboard,
    successKeyboard,
    errorRecoveryKeyboard
};