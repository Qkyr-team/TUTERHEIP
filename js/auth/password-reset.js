/* js/auth/password-reset.js — Сброс пароля по email */
async function resetPassword(event) {
    event.preventDefault();

    const emailInput = document.getElementById('authEmail');
    const errorEl = document.getElementById('authError');

    const email = emailInput?.value.trim();

    if (!email) {
        errorEl.textContent =
            'Введите email, на который зарегистрирован аккаунт.';
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);

        errorEl.textContent =
            'Письмо для восстановления пароля отправлено на ваш email.';

        console.log('PASSWORD RESET EMAIL SENT:', email);

    } catch (error) {

        console.error('PASSWORD RESET ERROR:', error);

        switch (error.code) {

            case 'auth/invalid-email':
                errorEl.textContent =
                    'Вrole: likelyRole,едите корректный email.';
                break;

            case 'auth/user-not-found':
                errorEl.textContent =
                    'Аккаунт с таким email не найден.';
                break;

            case 'auth/too-many-requests':
                errorEl.textContent =
                    'Слишком много попыток. Попробуйте позже.';
                break;

            default:
                errorEl.textContent =
                    'Не удалось отправить письмо. Попробуйте ещё раз.';
        }
    }
}
