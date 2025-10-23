import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';

import ptCommon from '/app/i18n/locales/pt/common';
import enCommon from '/app/i18n/locales/en/common';
import esCommon from '/app/i18n/locales/es/common';

type Language = 'pt' | 'en' | 'es';

const translations = {
    pt: ptCommon,
    en: enCommon,
    es: esCommon
};

// Translation helper with {{param}} interpolation support
const t = (key: string, lang: Language, params: Record<string, string> = {}) => {
    const value = key.split('.').reduce((obj: any, k) => obj?.[k], translations[lang]);
    
    if (typeof value !== 'string') return key;
    
    return value.replace(/\{\{(\w+)\}\}/g, (_match: string, paramKey: string) => 
        params[paramKey] || _match
    );
};

const getUserEmail = (user: any) => user.emails?.[0]?.address || 'usuário';

const createResetPasswordTemplate = (language: Language) => ({
    subject: () => t('auth.emailResetPasswordSubject', language),
    
    text(user: any, url: string) {
        const userEmail = getUserEmail(user);
        return `
${t('auth.emailResetPasswordGreeting', language, { email: userEmail })}

${t('auth.emailResetPasswordBody', language)}

${url}

${t('auth.emailResetPasswordWarning', language)}

${t('auth.emailResetPasswordExpiration', language)}

${t('auth.emailResetPasswordSignature', language)}
        `.trim();
    },
    
    html(user: any, url: string) {
        const userEmail = getUserEmail(user);
        
        return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1890ff; text-align: center;">${t('auth.resetPasswordTitle', language)}</h2>
    
    <p><strong>${t('auth.emailResetPasswordGreeting', language, { email: userEmail })}</strong>,</p>
    
    <p>${t('auth.emailResetPasswordBody', language)}</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" 
           style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t('auth.emailResetPasswordButtonText', language)}
        </a>
    </div>
    
    <p>${t('auth.emailResetPasswordLinkText', language)}</p>
    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${url}
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e8e8e8;">
    
    <p style="color: #666; font-size: 14px;">
        ${t('auth.emailResetPasswordWarning', language)}<br>
        ${t('auth.emailResetPasswordExpiration', language)}
    </p>
    
    <p style="color: #666; font-size: 14px;">
        ${t('auth.emailResetPasswordSignature', language)}
    </p>
</div>
        `.trim();
    }
});

// Cache templates to avoid recreation
const templateCache = new Map<Language, ReturnType<typeof createResetPasswordTemplate>>();

const getTemplate = (language: Language) => {
    if (!templateCache.has(language)) {
        templateCache.set(language, createResetPasswordTemplate(language));
    }
    return templateCache.get(language)!;
};

// Send reset password email with specific language
export const sendResetPasswordEmailWithLanguage = async (userId: string, email: string, language: Language) => {
    const originalTemplate = Accounts.emailTemplates.resetPassword;
    
    try {
        Accounts.emailTemplates.resetPassword = getTemplate(language);
        await Accounts.sendResetPasswordEmail(userId, email);
    } finally {
        Accounts.emailTemplates.resetPassword = originalTemplate;
    }
};

// Configure email templates and accounts settings
export const configureAccountsEmails = () => {
    if (!Meteor.isServer) return;

    console.log('Configuring email settings for accounts');
    
    Accounts.emailTemplates.siteName = 'Posting Platform';
    Accounts.emailTemplates.from = 'Posting Platform <noreply@posting-platform.com>';
    Accounts.emailTemplates.resetPassword = createResetPasswordTemplate('pt');

    Accounts.config({
        sendVerificationEmail: false,
        forbidClientAccountCreation: false,
        loginExpirationInDays: 90,
    });
    
    console.log('[DONE] Email configuration completed');
};