import mongoose from "mongoose"
var Schema = mongoose.Schema;

var eventLogSchema = new Schema( {
  OSC: { type: Schema.ObjectId, ref: 'OSCSetup'},
  category: String,
  type: { type: String, required:true, enum:['Event', 'Error'], default:'Event'},
  event: String,
  datetime: { type: Date, required: true, default: Date.now}
});
export default mongoose.model( 'EventLog', eventLogSchema );