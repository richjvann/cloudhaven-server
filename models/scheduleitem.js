import mongoose from "mongoose"
var Schema = mongoose.Schema;

const schedulePeriods = ['Once', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

var scheduleItemSchema = new Schema({
  period: { type: String, enum:schedulePeriods, default:schedulePeriods[0]},
  date: { type: Date },
  hour: {type: Number, min: 0, max: 23},
  minute: {type: Number, min: 0, max: 59},
  dayOfWeek: {type: Number, min: 0, max: 6},
  dayOfMonth: {type: Number, min: 1, max: 31}
});
export default mongoose.model( 'ScheduleItem', scheduleItemSchema );