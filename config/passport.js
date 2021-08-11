var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;

// load up the user model
var User = require('../models/user');
var EmailVerifyCode = require('../models/emailverifycode');
var config = require('../config/database'); // get db config file

module.exports = function(passport) {
  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = config.secret;
  passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    User.findOne({_id: jwt_payload._id}, {email:1, password:1, status:1, firstName:1, middleName:1, lastName:1, roles:1})
    .then(user =>{
      if (user.status == 'Email Verification Pending') {
        user = user.toObject();
        EmailVerifyCode.findOne({mode:'email', email:user.email})
        .then(emc=>{
          if (!emc) {
            user.status = 'Verification Code Expired';
          }
          return user;
        })
      } else {
        return user;
      }
    })
    .then(user=>{
      if (user) {
          done(null, user);
      } else {
          done(null, false);
      }
    })
    .catch(err=> {
       return done(err, false);
    });
  }));
};