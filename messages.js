// src/constants/messages.js

// Import the official escapeMarkdownV2 from utils
const { escapeMarkdownV2 } = require('../utils/markdown'); // Correct import path

// Create a messages object that can be used throughout the application
const messages = {};

// Deprecated: EnhancedUI removed. Keep a no-op for compatibility.
function getEnhancedUI() { return null; }

// General messages
messages.welcome = '👋 مرحبًا بك في بوت الكريبتو\\!\nاستخدم القائمة أدناه للتنقل\\. نصيحة: الأزرار ترشدك خطوة بخطوة ✨';
messages.generalError = '🚫 حدث خطأ غير متوقع\\. الرجاء المحاولة مرة أخرى لاحقًا\\.';
messages.commandNotFound = '🤷‍♂️ الأمر غير معروف\\. الرجاء استخدام أحد الأوامر المتاحة\\.';
messages.notRegistered = '⛔️ أنت غير مسجل\\. الرجاء استخدام زر "حساب جديد" لإنشاء حساب\\.';
messages.help = 'إليك الأوامر التي يمكنك استخدامها:\n\n' +
    '➡️ *حساب جديد / حسابي*: إدارة حسابك\\.\n' +
    '🔗 *إحالة*: احصل على رابط الإحالة الخاص بك واعرض العمولات\\.\n' +
    '💰 *إيداع*: أضف أموالاً إلى رصيدك\\.\n' +
    '💵 *سحب*: اسحب الأموال من رصيدك\\.\n' +
    '📜 *السجل*: عرض سجل الإيداع والسحب الخاص بك\\.\n\n' +
    'إذا كان لديك أي مشاكل، يرجى الاتصال بالمسؤول\\.';
messages.usagePolicy = `
📜 شروط الاستخدام - Queen Royal BOT

1. 🚫 يُمنع الاحتيال أو محاولة خداع النظام بأي شكل كان  
أي محاولة لاستغلال ثغرات، أو التلاعب في طرق الشحن أو السحب، ستؤدي إلى حظر دائم ومصادرة جميع الأرصدة.

2. 🚫 يُمنع استخدام الحسابات الوهمية أو المتعددة  
كل مستخدم يحق له حساب واحد فقط. عند اكتشاف أي حسابات مرتبطة لنفس الشخص أو نفس الجهاز سيتم حظر جميع الحسابات المعنية دون تنبيه.

3. 🚫 يُمنع تبادل أو بيع أو شراء الرصيد بين المستخدمين خارج البوت  
أي نشاط تجاري غير مرخص أو تحويلات مالية خارج النظام يعرضك للحظر الفوري.

4. 🚫 يُمنع التلاعب بنتائج الألعاب أو استغلال أي ثغرة تقنية في البوت أو الكازينو  
نحتفظ بالحق في مراجعة جميع العمليات المشبوهة واتخاذ إجراءات فورية.

5. ⚠️ كل عمليات الشحن والسحب تخضع للمراجعة والتدقيق من الإدارة  
أي عملية يشتبه فيها بالإحتيال أو التلاعب قد يتم إيقافها أو تأخيرها لحين التحقق.

6. 🕵️‍♂️ الإدارة تحتفظ بحق حظر أو تجميد أو مصادرة أي حساب أو رصيد بدون إشعار مسبق في حال مخالفة الشروط أو الاشتباه بالنشاطات الغير مشروعة.

7. 📝 المستخدم مسؤول بالكامل عن حماية بيانات حسابه وعدم مشاركتها مع الغير. أي استخدام للحساب من طرف ثالث يعتبر تحت مسؤولية المستخدم نفسه.

8. ⏳ أي تحديثات أو تعديلات على الشروط سيتم إشعارك بها داخل البوت ويعتبر استمرارك في استخدام الخدمة موافقة تلقائية عليها.

9. ❗ في حال وجود أي اعتراض أو استفسار تواصل مع الدعم الفني فقط عبر رابط الدعم الرسمي.

---

✅ بالدخول واستخدامك للبوت، أنت توافق على جميع الشروط المذكورة أعلاه. مخالفتك لأي من الشروط تعرضك للعقوبات والإجراءات اللازمة.
`;

// Centralized button/label texts used across keyboards
messages.buttons = {
    account: 'حسابي',
    newAccount: 'حساب جديد',
    referral: 'إحالة',
    deposit: 'إيداع',
    withdraw: 'سحب',
    history: 'السجل',
    yes: 'نعم',
    no: 'لا',
    back: '⬅️ رجوع',
    cancel: '❌ إلغاء',
    startOver: 'البدء من جديد',
    cancelRegistration: 'إلغاء التسجيل',
    backToMenu: '🏠 العودة للقائمة',
    tryAgain: 'المحاولة مرة أخرى',
    cancelDeposit: 'إلغاء الإيداع', // Added for consistency
    cancelWithdrawal: 'إلغاء السحب', // Added for consistency
    enterCustomAmount: 'إدخال مبلغ مخصص',
    withdrawPercent25: '25% من الرصيد',
    withdrawPercent50: '50% من الرصيد',
    withdrawPercent75: '75% من الرصيد',
    withdrawPercent100: '100% من الرصيد'
};

// History/help prompts
messages.history = messages.history || {};
messages.history.selectFilter = 'اختر المعاملات التي تريد عرضها:';
messages.history.promptFilter = '📋 **سجل المعاملات**\n\nاختر المعاملات التي ترغب في عرضها:';
// Added `noTransactions` message for the history module
messages.history.noTransactions = (filter) => {
    if (filter === 'completed') {
        return '✅ **لا توجد معاملات مكتملة**\n\nلم يتم العثور على معاملات مكتملة بعد\\. استمر في التداول\\!'; // Escaped !
    } else if (filter === 'failed') {
        return '❌ **لا توجد معاملات فاشلة**\n\nلم يتم العثور على معاملات فاشلة\\. أخبار جيدة\\!'; // Escaped !
    } else {
        return '📋 **لم يتم العثور على معاملات**\n\nليس لديك سجل معاملات بعد\\. ابدأ بالإيداع أو السحب\\!'; // Escaped !
    }
};

// Admin and system notices
messages.admin = {
    historyNoTransactionsForFilter: 'لم يتم العثور على معاملات لهذا الفلتر\\.',
    withdrawApprovedSent: 'تمت الموافقة على السحب والإرسال\\.',
    withdrawSendFailedRefunded: 'فشل الإرسال\\. تم وضع علامة فشل للطلب وتم استرداد المبلغ للمستخدم\\.',
    withdrawErrorRefunded: 'حدث خطأ\\. فشل الطلب وتم استرداد المبلغ للمستخدم\\.',
    requestNoLongerOpen: 'الطلب لم يعد مفتوحًا\\.',
    withdrawRejectedRefunded: 'تم رفض طلب السحب وتمت إعادة الأموال\\.'
};

// Simple, non-Markdown general notices for plain replies
messages.referredByNotice = (code) => `تمت إحالتك بواسطة مستخدم برمز: \`${escapeMarkdownV2(code)}\``;

// Progress indicators and flow helpers
messages.flow = {
    progressBar: (current, total) => {
        const filled = '🟦'.repeat(current);
        const empty = '⚪'.repeat(total - current);
        return `${filled}${empty}`;
    },
    stepIndicator: (current, total, stepName) => `📊 **الخطوة ${current} من ${total}**: ${escapeMarkdownV2(stepName)}`,
    typingIndicator: (frame = 0) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getTypingIndicator(frame);
        }
        const frames = [
            '🤖 البوت يعالج طلبك\\.\\.\\.',
            '🤖 البوت يعالج طلبك\\.\\.',
            '🤖 البوت يعالج طلبك\\.',
            '🤖 البوت يعالج طلبك'
        ];
        return frames[frame % frames.length];
    },
    successAnimation: (message = '') => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getSuccessAnimation(message);
        }
        const confetti = '🎉✨🎊🎈🎆';
        const baseMessage = message || 'تمت العملية بنجاح!';
        return `${confetti}\n\n✅ **${escapeMarkdownV2(baseMessage)}**\n\n${confetti}`;
    },
    errorRecovery: (errorType, userInput = '') => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getErrorRecovery(errorType, userInput);
        }
        // Fallback error recovery
        const suggestions = {
            'invalid_amount': {
                title: 'مبلغ غير صالح',
                hints: [
                    '💡 **جرب هذه التنسيقات**: 10, 25\\.5, 100\\.75', // Escaped dots in numbers
                    '🎯 **المتطلبات**: أرقام موجبة فقط',
                    '❌ **تجنب**: رموز العملات، الحروف، الأحرف الخاصة'
                ]
            },
            'invalid_address': {
                title: 'عنوان محفظة غير صالح',
                hints: [
                    '💡 **تنسيق BEP20**: يجب أن يبدأ بـ `0x`',
                    '🎯 **الطول**: 42 حرفًا بالضبط',
                    '⚠️ **الشبكة**: يتم دعم عناوين BEP20 فقط',
                    '🔍 **التحقق**: تأكد من نسخ العنوان كاملاً'
                ]
            },
            'invalid_txhash': {
                title: 'تجزئة معاملة غير صالحة',
                hints: [
                    '💡 **التنسيق**: يجب أن يبدأ بـ `0x`',
                    '🎯 **الطول**: 66 حرفًا إجماليًا',
                    '🔍 **المصدر**: انسخ من سجل معاملات محفظتك',
                    '⚠️ **الشبكة**: يجب أن تكون من شبكة BEP20'
                ]
            },
            'insufficient_funds': {
                title: 'رصيد غير كافٍ',
                hints: [
                    '💡 **تحقق**: من رصيدك الحالي',
                    '🎯 **الحل**: أودع المزيد من الأموال أو قلل المبلغ',
                    '📊 **عرض**: استخدم "حسابي" لعرض رصيدك'
                ]
            },
            'invalid_username': { // Added for username validation
                title: 'اسم مستخدم غير صالح',
                hints: [
                    '💡 **المتطلبات**: 3\\-20 حرفًا', // Escaped hyphen
                    '• أحرف، أرقام، وشرطات سفلية فقط',
                    '• يجب أن يكون فريدًا'
                ]
            },
            'network_error': {
                title: 'خطأ في اتصال الشبكة',
                hints: [
                    '💡 **تحقق**: من اتصالك بالإنترنت',
                    '🔄 **أعد المحاولة**: حاول مرة أخرى بعد لحظات قليلة',
                    '📞 **الدعم**: اتصل بالمسؤول إذا استمرت المشكلة'
                ]
            }
        };

        const suggestion = suggestions[errorType] || {
            title: 'خطأ غير متوقع',
            hints: ['💡 **حاول مرة أخرى** أو اتصل بالدعم إذا استمرت المشكلة']
        };

        let message = `❌ **${escapeMarkdownV2(suggestion.title)}**\n\n`;
        if (userInput) {
            message += `📝 **إدخالك**: \`${escapeMarkdownV2(userInput)}\`\n\n`;
        }
        // Hints are already formatted with Markdown and contain literal punctuation.
        // Escaping them here would break the intended Markdown formatting.
        message += suggestion.hints.join('\n');
        message += '\n\n🔄 **الرجاء المحاولة مرة أخرى بالتنسيق الصحيح\\.**'; // Escaped final dot

        return message;
    },
    networkWarning: (address, expectedNetwork = 'BEP20') => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getNetworkWarning(address, expectedNetwork);
        }
        const isBEP20 = address && String(address).startsWith('0x') && String(address).length === 42;
        if (!isBEP20) {
            return `⚠️ **تحذير الشبكة**: تم اكتشاف تنسيق عنوان غير صالح\\!\n\n❌ **المشكلة**: العنوان لا يتطابق مع تنسيق ${escapeMarkdownV2(expectedNetwork)}\n💡 **الحل**: استخدم عنوان ${escapeMarkdownV2(expectedNetwork)} صالحًا\n\n🚨 **خطر**: شبكة خاطئة \\= احتمال فقدان الأموال\\!`; // Escaped !
        }
        return `✅ **فحص الشبكة**: تنسيق العنوان يبدو صحيحًا لـ ${escapeMarkdownV2(expectedNetwork)}`;
    },
    animatedTransition: (fromStep, toStep, transitionType = 'forward') => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getAnimatedTransition(fromStep, toStep, transitionType);
        }
        const transitions = {
            forward: { emoji: '➡️', text: 'متابعة', color: 'green' },
            back: { emoji: '⬅️', text: 'عودة', color: 'blue' },
            complete: { emoji: '✅', text: 'اكتمل', color: 'green' }
        };
        const arrow = transitions[transitionType] || transitions.forward;
        return `${arrow} **جارٍ الانتقال**: ${escapeMarkdownV2(fromStep)} → ${escapeMarkdownV2(toStep)}\n\n⏳ **الرجاء الانتظار\\.\\.\\.**`; // Escaped dots
    },
    processingMessage: (operation = 'جارٍ المعالجة', frame = 0) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.getProcessingMessage(operation, frame);
        }
        const frames = ['⏳', '⏳\\.', '⏳\\.\\.', '⏳\\.\\.\\.']; // Escaped dots
        const loading = frames[frame % frames.length];
        return `${loading} **${escapeMarkdownV2(operation)}**\n\n⏱️ **الرجاء الانتظار بينما نعالج طلبك\\.\\.\\.**`; // Escaped dots
    },

    // Enhanced progress indicators with status icons
    enhancedProgressBar: (current, total) => {
        const steps = ['📝', '💰', '📍', '✅'];
        let progress = '';
        for (let i = 1; i <= total; i++) {
            if (i <= current) {
                progress += steps[i - 1] || '✅';
            } else {
                progress += '⚪';
            }
            if (i < total) progress += ' ➡️ ';
        }
        return progress;
    },

    // Step-by-step progress with visual dots
    stepProgress: (current, total) => {
        const dots = '🔵'.repeat(current) + '⚪'.repeat(total - current);
        return `**التقدم**: ${dots} \\(${current}/${total}\\)`; // Escaped parentheses
    },

    // Status icons for different steps
    statusIcons: {
        registration: '📝',
        amount: '💰',
        address: '📍',
        confirmation: '✅',
        processing: '⏳',
        success: '🎉',
        error: '❌',
        warning: '⚠️'
    },

    // Enhanced step messages with status icons
    enhancedStepMessage: (current, total, stepName, statusIcon, description, hints = '') => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createEnhancedStepMessage(current, total, stepName, description, hints, statusIcon);
        }
        // Fallback step message
        const stepIndicator = `${statusIcon} **الخطوة ${current} من ${total}**: ${escapeMarkdownV2(stepName)}`;
        const progressBar = messages.flow.progressBar(current, total);
        const progressDots = '🔵'.repeat(current) + '⚪'.repeat(total - current);

        // Preserve formatting in description and hints; they are pre-escaped where needed
        let message = `${stepIndicator}\n${progressDots}\n\n${description}`;

        if (hints) {
            message += `\n\n${hints}`;
        }

        // Append a general progress bar at the very bottom
        message += `\n\n${progressBar}`;

        return message;
    }
};

// Registration messages with progress indicators
messages.register = {
    start: (step = 1, total = 3) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createRegistrationStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'بدء التسجيل', messages.flow.statusIcons.registration, '📝 **مرحباً بك في عملية التسجيل\\!**\n\nدعنا ننشئ لك حسابًا جديدًا\\!'); // Escaped ! and .
    },
    promptUsername: (step = 1, total = 3) => { // Step 1 is username in the current flow
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createRegistrationStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'اختر اسم المستخدم', messages.flow.statusIcons.registration, '📝 **اختر اسم المستخدم الخاص بك**', '💡 **المتطلبات**:\n• 3\\-20 حرفًا\n• أحرف، أرقام، وشرطات سفلية فقط\n• يجب أن يكون فريدًا\n\n🎯 **نصيحة**: اختر شيئًا لا يُنسى\\!'); // Escaped hyphen
    },
    // NEW: Added promptReferral function
    promptReferral: (step = 2, total = 3) => { // Step 2 is referral
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createRegistrationStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'أدخل رمز الإحالة', '🔗', '🤝 **أدخل رمز إحالة \\(اختياري\\)**', '💡 **هل لديك رمز إحالة\\؟** أدخله الآن لدعم صديق\\. إذا لم يكن كذلك، يمكنك تخطي هذه الخطوة\\.\n\n🎯 **نصيحة**: الإحالات تكسبك عمولات لاحقًا\\!'); // Escaped ( ) and ?
    },
    promptPassword: (step = 3, total = 3) => { // This might be step 3 if password is re-introduced
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createRegistrationStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'تعيين كلمة المرور', '🔑', '🔑 **الخطوة 3: تأمين حسابك**', '💡 **المتطلبات**:\n• 6 أحرف كحد أدنى\n• يوصى بمزيج من الحروف والأرقام\n• حافظ عليها آمنة\\!\n\n🎯 **نصيحة**: استخدم كلمة مرور قوية يمكنك تذكرها\\!'); // Escaped !
    },
    usernameTaken: '😔 **اسم المستخدم مستخدم بالفعل**\n\n❌ اسم المستخدم هذا قيد الاستخدام بالفعل\\.\n💡 **اقتراحات**:\n• حاول إضافة أرقام \\(مثال: Test123\\)\n• استخدم شرطات سفلية \\(مثال: Test\\_User\\)\n• كن أكثر تحديدًا\n\n🔄 **الرجاء المحاولة مرة أخرى باسم مستخدم مختلف\\.**', // Escaped ., (, )
    usernameLengthError: (input = '') => messages.flow.errorRecovery('invalid_username', input), // New message for length error
    usernameInvalidChars: (input = '') => messages.flow.errorRecovery('invalid_username', input), // New message for invalid characters
    invalidReferral: (code) => `⚠️ **رمز إحالة غير صالح**: \`${escapeMarkdownV2(code)}\`\n\n❌ رمز الإحالة الذي أدخلته غير صالح أو غير موجود\\.\n💡 **يمكنك المتابعة بدون إحالة** أو تجربة رمز مختلف\\.\n\n🔄 **الرجاء تحديد خيار أدناه\\.**`, // New message for invalid referral
    registrationSuccess: (username, referralCode) => `${messages.flow.successAnimation('تم إنشاء الحساب بنجاح!')}\n\n✅ **اسم المستخدم**: \`${escapeMarkdownV2(username)}\`\n✅ **رمز الإحالة**: \`${escapeMarkdownV2(referralCode)}\`\n✅ **الحالة**: نشط\n✅ **الرصيد**: \`${escapeMarkdownV2((0).toFixed(2))} USDT\`\n\n🚀 **أنت جاهز تمامًا\\!** استخدم القائمة أدناه لبدء التداول\\.`, // Escaped ! and .
    registrationSuccessWithReferral: (username, referralCode) => `${messages.flow.successAnimation('تم إنشاء الحساب بنجاح!')}\n\n✅ **اسم المستخدم**: \`${escapeMarkdownV2(username)}\`\n✅ **رمز الإحالة**: \`${escapeMarkdownV2(referralCode)}\`\n✅ **الحالة**: نشط\n✅ **الرصيد**: \`${escapeMarkdownV2((0).toFixed(2))} USDT\`\n\n🎉 **أهلاً بك\\! محيلك يقدر ذلك\\!**\n🚀 **أنت جاهز تمامًا\\!** استخدم القائمة أدناه لبدء التداول\\.`, // Escaped !
    registrationError: '❌ **فشل التسجيل**\n\n🚫 حدث خطأ ما أثناء إنشاء الحساب\\.\n💡 **حاول مرة أخرى** أو اتصل بالدعم إذا استمرت المشكلة\\.', // Escaped .
    alreadyRegistered: '👍 **مسجل بالفعل**\n\n✅ حسابك نشط بالفعل\\.\n📊 استخدم /account لعرض تفاصيلك\\.', // Escaped .
    invalidPasswordLength: (input = '') => messages.flow.errorRecovery('invalid_password', input),
    registrationCanceled: '🚫 **تم إلغاء التسجيل**\n\n❌ تم إيقاف عملية التسجيل\\.\n💡 **للبدء من جديد**: استخدم زر "حساب جديد" مرة أخرى\\.' // Escaped .
};

// Account messages
messages.account = {
    info: (user, referredByDisplay = 'N/A') => { // Added referredByDisplay parameter
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createEnhancedAccountInfo(user);
        }
        const progressBar = messages.flow.progressBar(5, 5);
        const statusDots = '🔵'.repeat(5) + '⚪'.repeat(0);


        return `📊 **معلومات حسابك**
${progressBar} **اكتمل**
${statusDots}

🆔 **معرف تليجرام**: \`${escapeMarkdownV2(user.telegramId)}\`
👤 **اسم المستخدم**: \`${escapeMarkdownV2(user.username)}\`
💰 **الرصيد**: \`${escapeMarkdownV2(user.balance.toFixed(2))} USDT\`
🔗 **رمز الإحالة**: \`${escapeMarkdownV2(user.referralCode)}\`
🤝 **تمت الإحالة بواسطة**: ${referredByDisplay}

🎯 **إجراءات سريعة**: استخدم القائمة أدناه لإدارة حسابك\\!`; // Escaped !
    },
    noAccount: '❌ **لم يتم العثور على حساب**\n\n🚫 تحتاج إلى حساب لعرض هذه المعلومات\\.\n💡 **أنشئ واحدًا الآن**: استخدم زر "حساب جديد"\\!' // Escaped . and !
};

// Deposit messages with enhanced flow
messages.deposit = {
    start: (step = 1, total = 4, balance = null) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createDepositStepMessage(step, total);
        }
        const balanceText = balance !== null ? `\`${balance.toFixed(2)} USDT\`` : 'متاح للمرجعية';
        return messages.flow.enhancedStepMessage(step, total, 'اختر مبلغ الإيداع', messages.flow.statusIcons.amount, '💸 **الخطوة 1: اختر مبلغ إيداعك**', `🎯 **مبالغ سريعة** \\(انقر أدناه\\)\n💡 **مبلغ مخصص** \\(اكتب أي مبلغ\\)\n\n💰 **رصيدك**: ${balanceText}`); // Escaped ( )
    },
    promptAmount: (step = 1, total = 4, balance = null) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createDepositStepMessage(step, total);
        }
        const balanceText = balance !== null ? `\`${balance.toFixed(2)} USDT\`` : 'متاح للمرجعية';
        return messages.flow.enhancedStepMessage(step, total, 'اختر مبلغ الإيداع', messages.flow.statusIcons.amount, '💸 **الخطوة 1: اختر مبلغ إيداعك**', `🎯 **مبالغ سريعة** \\(انقر أدناه\\)\n💡 **مبلغ مخصص** \\(اكتب أي مبلغ\\)\n\n💰 **رصيدك**: ${balanceText}`); // Escaped ( )
    },
    promptConfirm: (amount, step = 2, total = 4) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createDepositStepMessage(step, total, amount);
        }
        return messages.flow.enhancedStepMessage(step, total, 'تأكيد الإيداع', messages.flow.statusIcons.confirmation, `💸 **الخطوة 2: تأكيد إيداعك**\n\n📋 **تفاصيل الإيداع**:\n• المبلغ: \`${escapeMarkdownV2(amount)} USDT\`\n• الشبكة: BEP20 \\(سلسلة بينانس الذكية\\)\n• الأصل: USDT فقط`, '⚠️ **هام**:\n• أرسل USDT فقط \\(BEP20\\)\n• أصول/شبكات أخرى \\= خسارة محتملة\n\n✅ **هل أنت مستعد للمتابعة\\؟**'); // Escaped ( ) = ?
    },
    address: (address, step = 3, total = 4) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createDepositStepMessage(step, total, '', address);
        }
        return messages.flow.enhancedStepMessage(step, total, 'إرسال الأموال', messages.flow.statusIcons.address, `📥 **الخطوة 3: أرسل أموالك**\n\n📍 **عنوان الإيداع \\(USDT BEP20\\)**:\n\`${escapeMarkdownV2(address)}\`\n\n📱 **رمز QR أدناه** \\(امسح باستخدام محفظتك\\)`, '⚠️ **قواعد حرجة**:\n• أرسل USDT فقط \\(BEP20\\)\n• تحقق جيدًا من العنوان\n• تأكيدات الشبكة: 2\\-5 دقائق\n\n🔗 **بعد الإرسال**: قدم تجزئة المعاملة \\(TxHash\\)'); // Escaped ( ), -
    },
    txHashPrompt: (step = 4, total = 4) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createDepositStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'التحقق من المعاملة', messages.flow.statusIcons.processing, '🔗 **الخطوة 4: التحقق من معاملتك**', '📝 **الصق تجزئة معاملتك \\(TxHash\\)**:\n\n💡 **ما الذي تبحث عنه**:\n• يبدأ بـ `0x`\n• طوله 66 حرفًا\n• موجود في سجل معاملات محفظتك\n\n🔍 **سنتحقق منه على السلسلة ونقيد حسابك**'); // Escaped ( ), -
    },
    invalidAmount: (input = '') => messages.flow.errorRecovery('invalid_amount', input),
    confirmationRequired: '⚠️ **مطلوب تأكيد**\n\n❓ الرجاء تأكيد مبلغ إيداعك\\.\n💡 **انقر على "نعم" للمتابعة** أو "لا" للإلغاء\\.\n\n🔄 **في انتظار تأكيدك\\.\\.\\.**', // Escaped .
    canceled: '🚫 **تم إلغاء الإيداع**\n\n❌ تم إيقاف عملية الإيداع\\.\n💡 **للبدء من جديد**: استخدم زر "إيداع" مرة أخرى\\.', // Escaped .
    pending: (frame = 0) => messages.flow.processingMessage('جاري التحقق من الإيداع', frame),
    txHashReceived: '✅ **تم استلام تجزئة المعاملة**\n\n🔍 **جاري التحقق على السلسلة\\.\\.\\.**\n⏱️ **قد يستغرق هذا بضع دقائق**\n\n💡 **ماذا يحدث**:\n• التحقق من المعاملة على BSC\n• تأكيد تحويل USDT\n• التحقق من تأكيدات الشبكة\n\n🎯 **الرجاء الانتظار للتحقق\\.\\.\\.**', // Escaped -, .
    depositSuccess: (amount) => `${messages.flow.successAnimation('تم الإيداع بنجاح!')}\n\n💰 **المبلغ المضاف**: \`${escapeMarkdownV2(amount)} USDT\`\n✅ **الحالة**: مؤكد\n✅ **الشبكة**: BEP20\n\n🎉 **تم تحديث رصيدك\\!**`, // Escaped !
    depositFailed: '❌ **فشل الإيداع**\n\n🚫 لم يتم تأكيد إيداعك\\.\n💡 **أسباب محتملة**:\n• تجزئة معاملة غير صالحة\n• لم يتم العثور على المعاملة على BSC\n• تأكيدات شبكة غير كافية\n\n🔍 **تحقق من TxHash الخاص بك على BscScan** وحاول مرة أخرى\\.', // Escaped .
    invalidTxHash: (input = '') => messages.flow.errorRecovery('invalid_txhash', input),
    alreadyProcessing: '⚠️ **الإيداع قيد المعالجة بالفعل**\n\n🔄 يوجد إيداع قيد المعالجة بالفعل\\.\n💡 **الرجاء الانتظار** حتى تكتمل العملية الحالية\\.\n\n🔄 **أو إلغاء** العملية الحالية للبدء من جديد\\.' // Escaped .
};

// Withdrawal messages with enhanced flow
messages.withdraw = {
    start: (step = 1, total = 4, balance = null) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createWithdrawalStepMessage(step, total);
        }
        const balanceText = balance !== null ? `\`${balance.toFixed(2)} USDT\`` : 'متاح للمرجعية';
        return messages.flow.enhancedStepMessage(step, total, 'اختر مبلغ السحب', messages.flow.statusIcons.amount, '💵 **الخطوة 1: اختر مبلغ سحبك**', `🎯 **اختيارات النسبة المئوية السريعة** \\(انقر أدناه\\)\n💡 **مبلغ مخصص** \\(اكتب أي مبلغ\\)\n\n💰 **رصيدك**: ${balanceText}`); // Escaped ( )
    },
    promptAmount: (step = 1, total = 4, balance = null) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createWithdrawalStepMessage(step, total);
        }
        const balanceText = balance !== null ? `\`${balance.toFixed(2)} USDT\`` : 'متاح للمرجعية';
        return messages.flow.enhancedStepMessage(step, total, 'اختر مبلغ السحب', messages.flow.statusIcons.amount, '💵 **الخطوة 1: اختر مبلغ سحبك**', `🎯 **اختيارات النسبة المئوية السريعة** \\(انقر أدناه\\)\n💡 **مبلغ مخصص** \\(اكتب أي مبلغ\\)\n\n💰 **رصيدك**: ${balanceText}`); // Escaped ( )
    },
    promptAddress: (step = 2, total = 4) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createWithdrawalStepMessage(step, total);
        }
        return messages.flow.enhancedStepMessage(step, total, 'أدخل العنوان', messages.flow.statusIcons.address, '📍 **الخطوة 2: أدخل عنوان المحفظة**', '📝 **الصق عنوان BEP20 الخاص بك**:\n\n⚠️ **متطلبات حرجة**:\n• يتم دعم عناوين BEP20 فقط\n• يجب أن يبدأ بـ `0x`\n• 42 حرفًا إجماليًا\n\n🚨 **تحذير**: شبكة خاطئة \\= فقدان دائم للأموال\\!'); // Escaped ( ) = !
    },
    promptConfirm: (amount, address, step = 3, total = 4) => {
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createWithdrawalStepMessage(step, total, amount, address);
        }
        return messages.flow.enhancedStepMessage(step, total, 'تأكيد السحب', messages.flow.statusIcons.confirmation, `💵 **الخطوة 3: التأكيد النهائي**\n\n📋 **تفاصيل السحب**:\n• المبلغ: \`${escapeMarkdownV2(amount)} USDT\`\n• العنوان: \`${escapeMarkdownV2(address)}\`\n• الشبكة: BEP20 \\(سلسلة بينانس الذكية\\)`, '⚠️ **تحذير نهائي**:\n• تحقق جيدًا من العنوان\n• لا يمكن عكس عمليات السحب\n• تأكد من الشبكة الصحيحة\n\n✅ **هل أنت مستعد للمتابعة\\؟**'); // Escaped ( ) ?
    },
    invalidAmount: (input = '') => messages.flow.errorRecovery('invalid_amount', input),
    insufficientFunds: (balance) => messages.flow.errorRecovery('insufficient_funds', balance.toString()),
    invalidAddress: (input = '') => messages.flow.errorRecovery('invalid_address', input),
    confirmationRequired: '⚠️ **مطلوب تأكيد**\n\n❓ الرجاء تأكيد سحبك\\.\n💡 **انقر على "نعم" للمتابعة** أو "لا" للإلغاء\\.\n\n🔄 **في انتظار تأكيدك\\.\\.\\.**', // Escaped .
    canceled: '🚫 **تم إلغاء السحب**\n\n❌ تم إيقاف عملية السحب\\.\n💡 **للبدء من جديد**: استخدم زر "سحب" مرة أخرى\\.', // Escaped .
    pending: (frame = 0) => messages.flow.processingMessage('جاري معالجة السحب', frame),
    withdrawalSuccess: (amount, address) => `${messages.flow.successAnimation('تم السحب بنجاح!')}\n\n💰 **المبلغ المرسل**: \`${escapeMarkdownV2(amount)} USDT\`\n📍 **إلى العنوان**: \`${escapeMarkdownV2(address)}\`\n✅ **الشبكة**: BEP20\n\n⏱️ **المعالجة**: قد يستغرق بضع دقائق ليظهر في محفظتك\n🔗 **التتبع**: استخدم تجزئة المعاملة على BscScan`, // Escaped !
    withdrawalFailed: '❌ **فشل السحب**\n\n🚫 لم يتمكن من معالجة سحبك\\.\n💡 **أسباب محتملة**:\n• ازدحام الشبكة\n• رسوم غاز غير كافية\n• مشاكل فنية\n\n📞 **اتصل بالدعم** إذا استمرت المشكلة\\.' // Escaped .
};

// Referral messages
messages.referral = {
    link: (botUsername, referralCode, referralLink) => { // Added rawReferralLink
        const EnhancedUI = getEnhancedUI();
        if (EnhancedUI) {
            return EnhancedUI.createEnhancedReferralMessage(botUsername, referralCode);
        }
        const progressBar = messages.flow.progressBar(3, 3);
        const statusDots = '🔵'.repeat(3) + '⚪'.repeat(0);

        return `🤝 **برنامج الإحالة الخاص بك**
${progressBar} **نشط**
${statusDots}

💎 **اكسب عمولة 5%** على كل إيداع يقوم به أصدقاؤك\\!

🔗 **شارك هذا الرابط**:
${referralLink}

🎯 **رمز الإحالة الخاص بك**: \`${escapeMarkdownV2(referralCode)}\`

💡 **كيف يعمل**:\n• شارك رابطك\n• يسجل الأصدقاء باستخدامه\n• تكسب 5% على إيداعاتهم\n• يتم دفع العمولات فورًا\\!`; // Escaped !
    },
    noReferrals: '👥 **لا توجد إحالات بعد**\n\n❌ لم تقم بإحالة أي شخص بعد\\.\n💡 **ابدأ بالمشاركة** رابط الإحالة الخاص بك لكسب العمولات\\!\n\n🎯 **الهدف**: بناء شبكة الإحالة الخاصة بك\\!', // Escaped . and !
    list: (referrals) => {
        if (referrals.length === 0) return messages.referral.noReferrals;
        let msg = `👥 **شبكة الإحالة الخاصة بك**\n\n${messages.flow.progressBar(referrals.length, referrals.length)} **${referrals.length} إحالة نشطة**\n\n`;
        referrals.forEach((ref, index) => {
            const indexText = `${index + 1}\\.`; // Escaped .
            const displayUsername = ref.username
                ? `@${escapeMarkdownV2(ref.username)}`
                : `معرف المستخدم: \`${escapeMarkdownV2(ref.telegramId)}\``;
            const balanceText = `\\(الرصيد: \`${escapeMarkdownV2(ref.balance.toFixed(2))} USDT\`\\)`; // Escaped ( )
            msg += `${indexText} ${displayUsername} ${balanceText}\n`;
        });
        return msg;
    },
    commissions: (commissions) => `💰 **عمولات الإحالة المكتسبة**\n\n${messages.flow.progressBar(5, 5)} **إجمالي الأرباح**\n\n💎 **إجمالي العمولات**: \`${escapeMarkdownV2(commissions.toFixed(2))} USDT\`\n\n🎯 **استمر في الإحالة** لكسب المزيد\\!` // Escaped !
};

// History messages
messages.history = {
    noDeposits: '📈 **لا يوجد سجل إيداع**\n\n❌ لم تقم بأي إيداعات بعد\\.\n💡 **ابدأ التداول**: استخدم زر "إيداع" لإضافة الأموال\\!', // Escaped . and !
    noWithdrawals: '📉 **لا يوجد سجل سحب**\n\n❌ لم تقم بأي عمليات سحب بعد\\.\n💡 **جاهز للسحب**: استخدم زر "سحب" عندما تحتاج إلى أموال\\!', // Escaped . and !
    deposits: (deposits) => {
        if (deposits.length === 0) return messages.history.noDeposits;
        let msg = `📈 **سجل الإيداع الخاص بك**\n\n${messages.flow.progressBar(deposits.length, deposits.length)} **${deposits.length} إيداعًا**\n\n`;
        deposits.forEach((dep, index) => {
            const statusEmoji = dep.status === 'completed' ? '✅' : '❌';
            msg += `**الإيداع ${index + 1}:** ${statusEmoji}\n`;
            msg += `  💰 المبلغ: \`${escapeMarkdownV2(dep.amount.toFixed(2))} USDT\`\n`;
            msg += `  📅 التاريخ: \`${escapeMarkdownV2(dep.createdAt.toLocaleString())}\`\n`; // Use createdAt
            msg += `  📊 الحالة: \`${escapeMarkdownV2(dep.status)}\`\n`;
            if (dep.txHash) msg += `  🔗 تجزئة المعاملة: \`${escapeMarkdownV2(dep.txHash.substring(0, 10))}...${escapeMarkdownV2(dep.txHash.substring(dep.txHash.length - 10))}\`\n`;
            msg += '\n';
        });
        return msg;
    },
    withdrawals: (withdrawals) => {
        if (withdrawals.length === 0) return messages.history.noWithdrawals;
        let msg = `📉 **سجل السحب الخاص بك**\n\n${messages.flow.progressBar(withdrawals.length, withdrawals.length)} **${withdrawals.length} سحبًا**\n\n`;
        withdrawals.forEach((withd, index) => {
            const statusEmoji = withd.status === 'completed' ? '✅' : '❌';
            msg += `**السحب ${index + 1}:** ${statusEmoji}\n`;
            msg += `  💰 المبلغ: \`${escapeMarkdownV2(withd.amount.toFixed(2))} USDT\`\n`;
            msg += `  📅 التاريخ: \`${escapeMarkdownV2(withd.createdAt.toLocaleString())}\`\n`; // Use createdAt
            msg += `  📊 الحالة: \`${escapeMarkdownV2(withd.status)}\`\n`;
            if (withd.txHash) msg += `  🔗 تجزئة المعاملة: \`${escapeMarkdownV2(withd.txHash.substring(0, 10))}...${escapeMarkdownV2(withd.txHash.substring(withd.txHash.length - 10))}\`\n`;
            msg += '\n';
        });
        return msg;
    },
    // Updated promptFilter message for history
    promptFilter: '📊 **سجل المعاملات**\n\nأي المعاملات تود عرضها\\؟ اختر فلترًا أدناه\\:' // Escaped ?
};

// Enhanced feedback messages
messages.feedback = {
    typing: (frame = 0) => messages.flow.typingIndicator(frame),
    processing: (operation = 'جاري المعالجة', frame = 0) => messages.flow.processingMessage(operation, frame),
    success: (message = 'تمت العملية بنجاح!') => messages.flow.successAnimation(message),
    error: (errorType, userInput = '') => messages.flow.errorRecovery(errorType, userInput),
    networkWarning: (address, expectedNetwork = 'BEP20') => messages.flow.networkWarning(address, expectedNetwork),
    transition: (fromStep, toStep, transitionType = 'forward') => messages.flow.animatedTransition(fromStep, toStep, transitionType)
};

// Help messages
messages.help = {
    bep20Guide: () => {
        return `🔗 **كيف تجد عنوان BEP20 الخاص بك**\n\n` +
            `📱 **لمحفظة Trust Wallet:**\n` +
            `1\\. افتح تطبيق Trust Wallet\n` +
            `2\\. اضغط على زر "استلام"\n` +
            `3\\. ابحث عن "USDT" أو "Tether"\n` +
            `4\\. اختر "USDT \\(BEP20\\)"\n` +
            `5\\. انسخ العنوان المعروض\n\n` +
            `📱 **لبينانس (Binance):**\n` +
            `1\\. اذهب إلى المحفظة ➜ Fiat and Spot\n` +
            `2\\. ابحث عن USDT وانقر على "إيداع"\n` +
            `3\\. اختر شبكة "BSC \\(BEP20\\)"\n` +
            `4\\. انسخ عنوان الإيداع\n\n` +
            `📱 **لميتا ماسك (MetaMask):**\n` +
            `1\\. قم بالتبديل إلى سلسلة بينانس الذكية\n` +
            `2\\. أضف رمز USDT \\(BEP20\\) إذا لزم الأمر\n` +
            `3\\. انسخ عنوان محفظتك\n\n` +
            `⚠️ **هام**: استخدم دائمًا شبكة BEP20 لمعاملات USDT\\!`;
    },

    generalSupport: () => {
        return `💬 **هل تحتاج للمساعدة\\؟**\n\n` +
            `🤖 **أنا هنا لمساعدتك\\!** إذا كنت تواجه أي مشاكل أو لديك أسئلة حول:\n\n` +
            `• 💰 **الإيداعات والسحوبات**\n` +
            `• 📊 **رصيد الحساب**\n` +
            `• 📋 **سجل المعاملات**\n` +
            `• 🔗 **برنامج الإحالة**\n` +
            `• 🛡️ **أسئلة الأمان**\n\n` +
            `📞 **للدعم العاجل، اتصل بـ:**\n` +
            `👤 وكيل الدعم: @cryptosupport\\_demo\n` +
            `📧 البريد الإلكتروني: support@cryptobot\\.demo\n` +
            `⏰ وقت الاستجابة: 2\\-4 ساعات\n\n` +
            `💡 **نصيحة**: يرجى تضمين معرف المستخدم الخاص بك ووصف المشكلة بوضوح للحصول على مساعدة أسرع\\!`;
    },

    depositVerification: () => {
        return `🔍 **مساعدة التحقق من الإيداع**\n\n` +
            `❓ **المشاكل الشائعة والحلول:**\n\n` +
            `🕐 **المعاملة تستغرق وقتًا طويلاً جدًا\\؟**\n` +
            `• تأكيدات الشبكة قد تستغرق من 5 إلى 15 دقيقة\n` +
            `• تحقق من محفظتك بحثًا عن حالة "معلق"\n\n` +
            `❌ **فشلت المعاملة\\؟**\n` +
            `• تحقق من أنك استخدمت عنوان BEP20 الصحيح\n` +
            `• تأكد من وجود رسوم غاز كافية في محفظتك\n` +
            `• تحقق مما إذا كان المبلغ يفي بالحد الأدنى من المتطلبات\n\n` +
            `📞 **هل ما زلت بحاجة إلى مساعدة\\؟**\n` +
            `👤 الاتصال: @cryptosupport\\_demo\n` +
            `💡 **تضمين**: تجزئة المعاملة، المبلغ، ووقت الإرسال`;
    },

    contactSupport: () => {
        return `📞 **الاتصال بالدعم**\n\n` +
            `🛟 **احصل على مساعدة فورية من فريق الدعم لدينا\\!**\n\n` +
            `👤 **وكيل دعم مباشر:**\n` +
            `@cryptosupport\\_demo\n\n` +
            `📧 **دعم البريد الإلكتروني:**\n` +
            `support@cryptobot\\.demo\n\n` +
            `⏰ **أوقات الاستجابة:**\n` +
            `• تليجرام: 5\\-30 دقيقة\n` +
            `• البريد الإلكتروني: 2\\-4 ساعات\n\n` +
            `📋 **عند الاتصال بنا، يرجى تضمين:**\n` +
            `• معرف المستخدم الخاص بك: \`${Math.floor(Math.random() * 1000000)}\`\n` +
            `• وصف المشكلة\n` +
            `• لقطات شاشة إذا كانت قابلة للتطبيق\n` +
            `• تفاصيل المعاملة \\(إذا كانت ذات صلة\\)\n\n` +
            `🚀 **نحن هنا للمساعدة 24/7\\!**`;
    }

};

messages.paymentMethod = {
    selectDeposit: 'الرجاء اختيار طريقة الإيداع:',
    selectWithdraw: 'الرجاء اختيار طريقة السحب:',
};

messages.syriatel = {
    // Deposit
    promptDepositAmount: (step = 1, total = 2) => `*إيداع عبر سيرتيل كاش* \\- الخطوة ${escapeMarkdownV2(step)}/${escapeMarkdownV2(total)}\n\nالرجاء إدخال المبلغ الذي تود إيداعه بالليرة السورية \\(مثال: 50000\\)\\.`,
    promptProcessId: (amount, number, step = 2, total = 2) => `*إيداع عبر سيرتيل كاش* \\- الخطوة ${escapeMarkdownV2(step)}/${escapeMarkdownV2(total)}\n\nالرجاء تحويل مبلغ \`${escapeMarkdownV2(amount)} ل\\.س\` إلى الرقم التالي:\n\n\`${escapeMarkdownV2(number)}\`\n\nبعد التحويل، الرجاء إرسال **رقم عملية التحويل** هنا للتحقق\\.`,
    invalidAmount: (input) => `المبلغ الذي أدخلته \`${escapeMarkdownV2(input)}\` غير صالح\\. الرجاء إدخال رقم صحيح موجب\\.`,
    invalidProcessId: (input) => `رقم العملية الذي أدخلته \`${escapeMarkdownV2(input)}\` غير صالح\\. الرجاء التأكد منه وإعادة المحاولة\\.`,
    requestSent: '✅ تم استلام طلب الإيداع الخاص بك وهو قيد المراجعة الآن\\. سيتم إعلامك عند تأكيد الإيداع وإضافة الرصيد إلى حسابك\\.',
    mockVerificationSuccess: (sypAmount, usdtAmount, newBalance) => escapeMarkdownV2(`✅ تم تأكيد الإيداع بنجاح!

💵 المبلغ: ${sypAmount} ل.س
💰 تم إضافة: ${usdtAmount} USDT
🎯 رصيدك الجديد: ${newBalance} USDT`),
    canceled: '🚫 تم إلغاء عملية الإيداع عبر سيرتيل كاش\\.',

    // Withdrawal
    promptWithdrawAmount: (step = 1, total = 3, balance, exchangeRate) => {
        const balanceSYP = (balance * exchangeRate).toLocaleString('en-US');
        const exchangeRateFormatted = exchangeRate.toLocaleString('en-US');
        return `*سحب عبر سيرتيل كاش* \\- الخطوة ${escapeMarkdownV2(step)}/${escapeMarkdownV2(total)}\n\n💱 **سعر الصرف**: \`1 USDT = ${escapeMarkdownV2(exchangeRateFormatted)} ل\\.س\`\n\n💰 **رصيدك الحالي**:\n• \`${escapeMarkdownV2(balance != null ? balance.toFixed(2): '0.00')} USDT\`\n• \`${escapeMarkdownV2(balanceSYP)} ل\\.س\`\n\nالرجاء اختيار المبلغ الذي تود سحبه\\.`;
    },
    promptPhoneNumber: (step = 2, total = 3, amountUSDT, amountSYP) => `*سحب عبر سيرتيل كاش* \\- الخطوة ${escapeMarkdownV2(step)}/${escapeMarkdownV2(total)}\n\n💰 **المبلغ المحدد**:\n• \`${escapeMarkdownV2(amountUSDT)} USDT\`\n• \`${escapeMarkdownV2(amountSYP)} ل\\.س\`\n\nالرجاء إدخال رقم هاتفك \\(سيرتيل\\) الذي تود استلام المبلغ عليه\\.`,
    promptConfirm: (amount, phone, step = 3, total = 3) => `*سحب عبر سيرتيل كاش* \\- الخطوة ${escapeMarkdownV2(step)}/${escapeMarkdownV2(total)}\n\nالرجاء تأكيد تفاصيل عملية السحب:\n\n— المبلغ: \`${escapeMarkdownV2(amount)} USDT\`\n— إلى الرقم: \`${escapeMarkdownV2(phone)}\`\n\nهل تريد المتابعة؟`,
    invalidPhoneNumber: (input) => `رقم الهاتف الذي أدخلته \`${escapeMarkdownV2(input)}\` غير صالح\\. الرجاء إدخال رقم سيرتيل صحيح\\.`,
    requestSent: '✅ تم إرسال طلب السحب الخاص بك بنجاح\\. ستتم معالجته من قبل الإدارة في أقرب وقت ممكن\\.',
    canceled: '🚫 تم إلغاء عملية السحب عبر سيرتيل كاش\\.',
};

// Add admin messages for Syriatel
messages.admin.syriatelDepositRequest = (req, username) => {
    const usernameEscaped = username ? `@${escapeMarkdownV2(username)}` : 'N/A';
    return `Syriatel Deposit Request:\n` +
        `User: ${usernameEscaped}\n` +
        `ID: \`${escapeMarkdownV2(req.userId)}\`\n` +
        `Amount: \`${escapeMarkdownV2(req.amount)} SYP\`\n` +
        `Process ID: \`${escapeMarkdownV2(req.processId)}\``;
};

messages.admin.syriatelWithdrawRequest = (req, username) => {
    const usernameEscaped = username ? `@${escapeMarkdownV2(username)}` : 'N/A';
    return `Syriatel Withdraw Request:\n` +
        `User: ${usernameEscaped}\n` +
        `ID: \`${escapeMarkdownV2(req.userId)}\`\n` +
        `Amount: \`${escapeMarkdownV2(req.amount)} USDT\`\n` +
        `To Phone: \`${escapeMarkdownV2(req.phoneNumber)}\``;
};


module.exports = messages;