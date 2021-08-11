function hasRequiredRole( userRoles, requiredRoles) {
  var userRoleMap = userRoles.reduce(function(mp, role){
      mp[role] = true;
      return mp;
  },{});
  return requiredRoles.find((role)=>userRoleMap[role]);
}
export function checkRoleWithPassport(authData, roles, passport, sourceTag ){
    var func = function(req, res, next){
      passport.authenticate('jwt', function(err, user, info){
        if (!info) info = {};
        if(err) { return next(err); }
          if(!user) {
            if (info.name === "TokenExpiredError") {
              return res.status(401).json({ message: "Your token has expired. Please generate a new one" });
          } else {
              return res.status(401).json({ message: (info.message + (sourceTag?(` at(${sourceTag})`):'')) });
          }
        }
        if (authData) authData.user = user;
        req.userId = user._id;
        if(!roles || roles.length == 0) {
            next()
          } else if(roles[0]=='ANY' || hasRequiredRole( user.roles, roles)) {
            next()
          } else {
            res.status(403).send('forbidden' + (sourceTag?(` at(${sourceTag})`):''))
          }
      })(req, res, next)
    }
    return func;
  }
