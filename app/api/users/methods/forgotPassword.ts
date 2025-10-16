import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { emailRegex } from '@netsu/js-utils';
import { clientContentError } from '/app/utils/serverErrors';

Meteor.methods({
    'users.forgotPassword': async ({ email, language = 'pt' }: { email: string; language?: 'pt' | 'en' | 'es' }) => {
        check(email, String);
        check(language, String);

        const cleanedEmail = email.trim().toLowerCase();

        // Validate email format
        if (!emailRegex.test(cleanedEmail)) {
            return clientContentError('Email is invalid');
        }

        // Check if user exists
        const user = await Meteor.users.findOneAsync({ 'emails.address': cleanedEmail });
        
        if (!user) {
            // For security reasons, we don't reveal if the email exists or not
            // but we return success to prevent email enumeration attacks
            return { success: true, message: 'If this email exists in our system, you will receive a password reset link.' };
        }

        try {
            // Store language temporarily in a global context for email template access
            (global as any).currentEmailLanguage = language;
            console.log(`Setting email language context to: ${language}`);
            
            // Send reset password email
            await Accounts.sendResetPasswordEmail(user._id, cleanedEmail);
            
            // Clear the temporary language context
            delete (global as any).currentEmailLanguage;
            
            console.log(`Password reset email sent to: ${cleanedEmail} in ${language}`);
            
            return { 
                success: true, 
                message: 'If this email exists in our system, you will receive a password reset link.' 
            };
        } catch (error) {
            console.error('Error sending reset password email:', error);
            throw new Meteor.Error('email-send-failed', 'Failed to send reset password email');
        }
    }
});