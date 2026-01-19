const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User");

module.exports = function initPassport(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (_, __, profile, done) => {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = await User.create({
            username: profile.displayName,
            email: profile.emails[0].value,
          });
        }
        done(null, user);
      }
    )
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FB_CLIENT_ID,
        clientSecret: process.env.FB_CLIENT_SECRET,
        callbackURL: "/auth/facebook/callback",
        profileFields: ["id", "displayName", "emails"],
      },
      async (_, __, profile, done) => {
        const email =
          profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            username: profile.displayName,
            email,
          });
        }
        done(null, user);
      }
    )
  );
};
