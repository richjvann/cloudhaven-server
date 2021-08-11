import mongoose from "mongoose"
var Schema = mongoose.Schema;

var emailMatch = [/^[^@]+@[^\.]+\..+$/, "Please fill a valid email address"];

//CloudHaven Setup
var SetupSchema = new Schema( {
  defaultFromEmail: {type:String, match: emailMatch },
  ccEmail: {type:String, match: emailMatch }
});
export default mongoose.model( 'Setup', SetupSchema );