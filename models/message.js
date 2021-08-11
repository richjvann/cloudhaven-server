import mongoose from 'mongoose';
import ScheduleItem from './scheduleitem';
import Sharing from './sharing';
var Schema = mongoose.Schema;
var scheduleItemSchema = ScheduleItem.schema;
var sharingSchema = Sharing.schema;

var MessageSchema = new Schema({
    sendingUser: {type: Schema.ObjectId, ref: 'User'},
    sharings: [sharingSchema],
    subject: { type: String, required: true},
    message: { type: String, required: true },
    date: { type: Date, default: new Date() },
    organization: { type: Schema.ObjectId, ref: 'Organization'},
    applicationId: {type:String, default: ''},
    componentId: {type:String, default: ''},
    appConfigData: String, //any string value including stringified JSON
    wasRead: {type: Boolean, default: true},
    saveGroupId: {type: String},
    isDone: {type: Boolean, default: false},
    resultStatus: {type: String, enum:['Incomplete', 'Completed']},
    resultMessage: String,
    schedule: scheduleItemSchema
});

MessageSchema.index({user:1, name: 1, applicationId:1, appAuxId: 1});
module.exports = mongoose.model('Message', MessageSchema);