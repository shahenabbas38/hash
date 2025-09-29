const Transaction = require('../models/Transaction');
const messages = require('../constants/messages');
// CHANGED: Import the entire keyboards module instead of destructuring
const keyboards = require('../ui/keyboards');
const { escapeMarkdownV2 } = require('../utils/markdown'); // Import escapeMarkdownV2
const { ACTIONS } = require('../constants/actions'); // Import ACTIONS constants

const noTransactions = (filter) => {
    if (filter === 'completed') {
        return '✅ **لا توجد معاملات مكتملة**\n\nلم يتم العثور على معاملات مكتملة بعد\\. استمر في التداول\\!'; // Escaped !
    } else if (filter === 'failed') {
        return '❌ **لا توجد معاملات فاشلة**\n\nلم يتم العثور على معاملات فاشلة\\. أخبار جيدة\\!'; // Escaped !
    } else {
        return '📋 **لم يتم العثور على معاملات**\n\nليس لديك سجل معاملات بعد\\. ابدأ بالإيداع أو السحب\\!'; // Escaped !
    }
};

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
            noTransactions(filter),
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
