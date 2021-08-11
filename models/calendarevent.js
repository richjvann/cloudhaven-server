import mongoose from 'mongoose';
import Sharing from './sharing';
var Schema = mongoose.Schema;
var sharingSchema = Sharing.schema;

var CalendarEventSchema = new Schema({
    owner: {type: Schema.ObjectId, ref: 'User'},
    sharings: [sharingSchema],
    type: { type: String, default: 'Event'},
    title: { type: String, required: true},
    content: { type: String, required: true },
    start: { type: Date, default: new Date() },
    end: { type: Date, default: new Date() },
    durationType: {type: String, enum:['allday', 'timed']},
    organization: { type: Schema.ObjectId, ref: 'Organization'}, //org of the app or component
    applicationId: {type:String, default: ''},
    componentId: {type:String, default: ''},
    appConfigData: String, //any string value including stringified JSON
    isDone: {type: Boolean, default: false},
    resultMessage: String
});

CalendarEventSchema.index({owner:1, start: 1});
module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);