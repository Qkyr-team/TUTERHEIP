/* js/auth/user-profile.js — Создание профиля пользователя в базе */
async function ensureUserProfile(likelyRole){
  if(!FIREBASE_CONFIGURED || !auth.currentUser) return;

  const uid = auth.currentUser.uid;
  const ref = db.collection('users').doc(uid);

  try{
    const snap = await ref.get();

    if(!snap.exists){

      // Роль нового аккаунта определяется текущей панелью регистрации.
      await ref.set({
        email: auth.currentUser.email || '',
        role: likelyRole === 'teacher' ? 'teacher' : 'student',
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });

    } else {

      // При обычном входе роль никогда автоматически не меняется.
      await ref.update({
        lastLoginAt: new Date().toISOString()
      });
    }

  } catch(err){
    console.error('ensureUserProfile failed', err);
  }
}
