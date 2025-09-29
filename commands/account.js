const messages = require('../constants/messages');
const User = require('../models/User');
const { escapeMarkdownV2 } = require('../utils/markdown');
const { getDynamicMainMenuKeyboard } = require('../ui/keyboards');
const { ACTIONS } = require('../constants/actions');

/**
 * تتولى عرض معلومات الحساب.
 * تقوم الآن بتعديل الرسالة إذا تم تشغيلها بواسطة زر لتحسين تجربة المستخدم،
 * أو ترسل رسالة جديدة إذا تم تشغيلها بواسطة أمر مثل /account.
 * @param {Object} ctx - كائن سياق تيليغراف (Telegraf).
 */
const initiateAccountDisplay = async (ctx) => {
    const user = ctx.state.user;

    // هذا التحقق هو إجراء وقائي. يجب حماية الأمر بواسطة وسيط التسجيل (registration middleware).
    if (!user) {
        return ctx.replyWithMarkdownV2(messages.notRegistered, { parse_mode: 'MarkdownV2' });
    }

    console.log('🔍 DEBUG - Account display for user:', user.telegramId, 'Balance:', user.balance);

    let referredByDisplay = 'N/A';
    if (user.referredBy) {
        const referrer = await User.findOne({ referralCode: user.referredBy }).lean();
        if (referrer && referrer.username) {
            referredByDisplay = `@${escapeMarkdownV2(referrer.username)}`;
        } else if (referrer) {
            // حل بديل إذا كان اسم مستخدم المُحيل غير متاح
            referredByDisplay = `\`${escapeMarkdownV2(user.referredBy)}\` (المستخدم غير موجود)`;
        }
    }

    const accountInfoMessage = messages.account.info(user, referredByDisplay);

    // إنشاء لوحة مفاتيح خاصة بالحساب مع إجراءات سريعة
    const accountKeyboard = {
        inline_keyboard: [
            [
                { text: `💰 ${messages.buttons.deposit}`, callback_data: ACTIONS.DEPOSIT },
                { text: `💸 ${messages.buttons.withdraw}`, callback_data: ACTIONS.WITHDRAW }
            ],
            [
                { text: `📊 ${messages.buttons.history}`, callback_data: ACTIONS.HISTORY },
                { text: `🔗 ${messages.buttons.referral}`, callback_data: ACTIONS.REFERRAL }
            ],
            [
                { text: `🏠 ${messages.buttons.backToMenu}`, callback_data: ACTIONS.MAIN_MENU }
            ]
        ]
    };

    try {
        // إرسال رسالة جديدة دائمًا بدلاً من التعديل لضمان عرض لوحة المفاتيح بشكل صحيح
        const sentMessage = await ctx.replyWithMarkdownV2(
            accountInfoMessage,
            {
                parse_mode: 'MarkdownV2',
                reply_markup: accountKeyboard
            }
        );
        ctx.session.lastBotMessageId = sentMessage.message_id;
    } catch (error) {
        console.error(`خطأ في initiateAccountDisplay للمستخدم ${ctx.from.id}:`, error);
        // كحل بديل، حاول الإرسال بدون parse_mode
        try {
            const sentMessage = await ctx.reply(
                accountInfoMessage.replace(/[*_`\[\]()~>#+-=|{}.!]/g, ''), // إزالة علامات الماركداون
                { reply_markup: accountKeyboard }
            );
            ctx.session.lastBotMessageId = sentMessage.message_id;
        } catch (fallbackError) {
            console.error('فشل الحل البديل أيضًا:', fallbackError);
        }
    }
};

/**
 * تقوم بإعداد معالجات الأوامر والإجراءات لميزة الحساب.
 * @param {Telegraf} bot - كائن بوت تيليغراف (Telegraf).
 */
const setup = (bot) => {
    // تسجيل الأمر /account لاستدعاء دالة العرض.
    bot.command('account', initiateAccountDisplay);
    // ملاحظة: معالج الإجراء لزر "حسابي" موجود في server.js
};

module.exports = {
    setup,
    initiateAccountDisplay
};
