var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserDataSchema = new Schema({
    user: { type:Schema.ObjectId, ref:'User', required: true },
    name: { type: String, required: true},
    content: { type: String, required: true }
});

UserDataSchema.index({user:1, lastName: 1, middleName:1, firstName:1});
module.exports = mongoose.model('UserData', UserDataSchema);