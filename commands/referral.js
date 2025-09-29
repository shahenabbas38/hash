const messages = require('../constants/messages');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { escapeMarkdownV2 } = require('../utils/markdown'); // Import escapeMarkdownV2 explicitly
const { ACTIONS } = require('../constants/actions'); // Import ACTIONS for callback_data

/**
 * Handles the initial action for displaying referral information.
 * This function will be passed to requireRegistrationAndExecute.
 * @param {Object} ctx - The Telegraf context object.
 */
const initiateReferralDisplay = async (ctx) => {
    const user = ctx.state.user;

    // Get bot's username for referral link
    const botInfo = await ctx.telegram.getMe();
    const botUsername = botInfo.username;

    // Referral link
    const rawReferralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
    const escapedRawReferralLink = escapeMarkdownV2(rawReferralLink);

    // Use your existing messages.referral.link template (ensure it handles MarkdownV2)
    // Assuming messages.referral.link properly formats its output for MarkdownV2
    const linkSection = messages.referral.link(escapeMarkdownV2(botUsername), escapeMarkdownV2(user.referralCode), escapedRawReferralLink);

    // Fetch referred users and commissions
    const referredUsers = await User.find({ referredBy: user.referralCode }).lean();
    const totalCommissions = await Transaction.aggregate([
        {
            $match: {
                userId: user.telegramId,
                type: 'referral_commission',
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);
    const commissions = totalCommissions.length > 0 ? totalCommissions[0].total : 0;

    let listSection;
    if (referredUsers.length > 0) {
        let referredListMessage = '👥 *المستخدمون الذين تمت إحالتهم:*\n\n';
        referredUsers.forEach((refUser, index) => {
            // Ensure all dynamic parts are escaped for MarkdownV2
            const indexText = escapeMarkdownV2(`${index + 1}.`);
            const displayUsername = refUser.username
                ? `@${escapeMarkdownV2(refUser.username)}`
                : `معرف المستخدم: \`${escapeMarkdownV2(refUser.telegramId)}\``;
            const balanceText = `\\(الرصيد: \`${escapeMarkdownV2(refUser.balance.toFixed(8))} USDT\`\\)`;
            referredListMessage += `${indexText} ${displayUsername} ${balanceText}\n`;
        });
        listSection = referredListMessage;
    } else {
        listSection = messages.referral.noReferrals;
    }

    const commissionsSection = messages.referral.commissions(commissions);

    const fullMessage = `${linkSection}\n\n${listSection}\n\n${commissionsSection}`;

    // Send the message and store its ID for future edits
    const sentMessage = await ctx.replyWithMarkdownV2(fullMessage, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
            inline_keyboard: [
                [
                    // Use the raw referral link for switch_inline_query for easier sharing
                    { text: '📤 مشاركة', switch_inline_query: `انضم إلي على تليجرام: ${rawReferralLink}` }
                ],
                [
                    { text: messages.buttons.backToMenu, callback_data: ACTIONS.MAIN_MENU } // Use constant for callback_data
                ]
            ]
        }
    });
    ctx.session.lastBotMessageId = sentMessage.message_id;
};

// This setup function is exported to be called once during bot initialization
module.exports = {
    setup: (bot) => {
        // No direct commands or actions are handled *within* referral.js itself
        // other than the main 'REFERRAL' action which is handled in server.js
        // via requireRegistrationAndExecute.
        // If there were any other specific actions or commands related to referral
        // that referral.js directly listens to, they would go here.
        // Example (if needed):
        // bot.action('some_referral_sub_action', async (ctx) => { /* ... */ });
    },
    // Export the specific function to be called by requireRegistrationAndExecute
    initiateReferralDisplay
};
