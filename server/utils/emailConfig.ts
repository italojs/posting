import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';

// Import translations
import ptCommon from '/app/i18n/locales/pt/common';
import enCommon from '/app/i18n/locales/en/common';
import esCommon from '/app/i18n/locales/es/common';

const translations = {
    pt: ptCommon,
    en: enCommon,
    es: esCommon
};

/**
 * Get the current language from the global context set by the method call
 * Falls back to Portuguese if not set
 */
const getUserLanguage = (): 'pt' | 'en' | 'es' => {
    try {
        // Get language from global context (set by the method call)
        const contextLanguage = (global as any).currentEmailLanguage;
        console.log(`Email template getting language from context: ${contextLanguage}`);
        
        if (contextLanguage && ['pt', 'en', 'es'].includes(contextLanguage)) {
            return contextLanguage;
        }
        
        console.log('No valid language in context, defaulting to Portuguese');
        return 'pt'; // Default to Portuguese
    } catch (error) {
        console.warn('Error getting user language from context, defaulting to Portuguese:', error);
        return 'pt';
    }
};

/**
 * Get translated text with interpolation support
 */
const t = (key: string, lang: 'pt' | 'en' | 'es', params: Record<string, string> = {}) => {
    const keys = key.split('.');
    let value: any = translations[lang];
    
    for (const k of keys) {
        value = value?.[k];
    }
    
    if (typeof value !== 'string') {
        return key; // Return key if translation not found
    }
    
    // Simple interpolation
    return value.replace(/\{\{(\w+)\}\}/g, (match: string, paramKey: string) => {
        return params[paramKey] || match;
    });
};

/**
 * Configure email templates and accounts settings
 * This should be called during server startup
 */
export const configureAccountsEmails = () => {
    if (!Meteor.isServer) return;

    console.log('Configuring email settings for accounts');
    
    // Configure email templates
    Accounts.emailTemplates.siteName = 'Posting Platform';
    Accounts.emailTemplates.from = 'Posting Platform <noreply@posting-platform.com>';
    
    // Configure reset password email template
    Accounts.emailTemplates.resetPassword = {
        subject(user) {
            const lang = getUserLanguage();
            return t('auth.emailResetPasswordSubject', lang);
        },
        text(user, url) {
            const lang = getUserLanguage();
            const userEmail = user.emails?.[0]?.address || 'usuário';
            
            return `
${t('auth.emailResetPasswordGreeting', lang, { email: userEmail })}

${t('auth.emailResetPasswordBody', lang)}

${url}

${t('auth.emailResetPasswordWarning', lang)}

${t('auth.emailResetPasswordExpiration', lang)}

${t('auth.emailResetPasswordSignature', lang)}
            `.trim();
        },
        html(user, url) {
            const lang = getUserLanguage();
            const userEmail = user.emails?.[0]?.address || 'usuário';
            
            return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1890ff; text-align: center;">${t('auth.resetPasswordTitle', lang)}</h2>
    
    <p><strong>${t('auth.emailResetPasswordGreeting', lang, { email: userEmail })}</strong>,</p>
    
    <p>${t('auth.emailResetPasswordBody', lang)}</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" 
           style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t('auth.emailResetPasswordButtonText', lang)}
        </a>
    </div>
    
    <p>${t('auth.emailResetPasswordLinkText', lang)}</p>
    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${url}
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e8e8e8;">
    
    <p style="color: #666; font-size: 14px;">
        ${t('auth.emailResetPasswordWarning', lang)}<br>
        ${t('auth.emailResetPasswordExpiration', lang)}
    </p>
    
    <p style="color: #666; font-size: 14px;">
        ${t('auth.emailResetPasswordSignature', lang)}
    </p>
</div>
            `.trim();
        }
    };

    // Configure accounts settings (use correct property name)
    Accounts.config({
        sendVerificationEmail: false,
        forbidClientAccountCreation: false,
        // Use correct property name for token expiration
        loginExpirationInDays: 90, // User session expires in 90 days
    });
    
    console.log('[DONE] Email configuration completed');
};