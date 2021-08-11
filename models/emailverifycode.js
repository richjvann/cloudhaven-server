var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EmailVerifyCodeSchema = new Schema({
  email: {type: String, required: true },
  code: {type: String, required: true },
  mode: {type: String, required: true, enum:['email', 'password']},
  dateCreated: { type: Date, default: Date.now(), expires: "10m"}
});

module.exports = mongoose.model('EmailVerifyCode', EmailVerifyCodeSchema);