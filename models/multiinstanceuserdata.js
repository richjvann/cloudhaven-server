var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MultiInstanceUserDataSchema = new Schema({
    owner: { type:Schema.ObjectId, ref:'User', required: true },
    organization: { type:Schema.ObjectId, ref:'Organization', required: true },
    key: { type: String, required:true},
    content: { type: String, required: true },
    created_at: { type: Date, required: true, default: Date.now},
    modified_at: { type: Date, required: false}
});

module.exports = mongoose.model('MultiInstanceUserData', MultiInstanceUserDataSchema);