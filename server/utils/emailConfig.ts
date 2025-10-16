import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';

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
        subject() {
            return 'Redefinir sua senha - Posting Platform';
        },
        text(user, url) {
            const userEmail = user.emails?.[0]?.address || 'usuário';
            
            return `
Olá ${userEmail},

Você solicitou a redefinição de sua senha na Posting Platform.

Para criar uma nova senha, clique no link abaixo ou cole-o no seu navegador:
${url}

Se você não solicitou esta redefinição, pode ignorar este email com segurança.

Esta solicitação expirará em 3 dias.

Equipe Posting Platform
            `.trim();
        },
        html(user, url) {
            const userEmail = user.emails?.[0]?.address || 'usuário';
            
            return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1890ff; text-align: center;">Redefinir sua senha</h2>
    
    <p>Olá <strong>${userEmail}</strong>,</p>
    
    <p>Você solicitou a redefinição de sua senha na <strong>Posting Platform</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" 
           style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Redefinir Senha
        </a>
    </div>
    
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${url}
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e8e8e8;">
    
    <p style="color: #666; font-size: 14px;">
        Se você não solicitou esta redefinição, pode ignorar este email com segurança.<br>
        Esta solicitação expirará em 3 dias.
    </p>
    
    <p style="color: #666; font-size: 14px;">
        Equipe Posting Platform
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