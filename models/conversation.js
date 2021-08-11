var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var ConversationSchema = new Schema({
  created_at: { type: Date, required: true, default: Date.now},
  owner: { type:Schema.ObjectId, ref:'User', required: true },
  organization: { type:Schema.ObjectId, ref:'Organization' },
  applicationId: String,
  topic: { type: String, required: false},
  comments: [{ type:Schema.ObjectId, ref:'MultiInstanceUserData'}]
});

module.exports = mongoose.model('Conversation', ConversationSchema);