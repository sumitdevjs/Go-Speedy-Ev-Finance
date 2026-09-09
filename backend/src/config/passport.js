const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const env = require('./env');
const authService = require('../modules/auth/auth.service');

/**
 * Configure Passport with Google OAuth 2.0 strategy.
 * We use a stateless JWT approach so we only use passport for the
 * OAuth dance itself — no session serialisation needed.
 */
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const callbackURL =
    env.GOOGLE_CALLBACK_URL ||
    (env.BACKEND_URL
      ? `${env.BACKEND_URL.replace(/\/$/, '')}/api/auth/google/callback`
      : `http://localhost:${env.PORT || 5000}/api/auth/google/callback`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateOAuthUser(profile);
          return done(null, user);
        } catch (err) {
          console.error('[Passport Google Strategy Error]:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// Minimal serialise/deserialise — only needed by express-session for the
// brief period between the OAuth callback and the redirect.
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
