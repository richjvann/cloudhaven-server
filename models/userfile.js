import mongoose from "mongoose";
var Schema = mongoose.Schema;

var userFileSchema = new Schema( {
  user: { type:Schema.ObjectId, ref:'User', required: true },
  name: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String /*, required: true*/ },
  body: { type: Buffer /*, required: true*/ }
});
export default mongoose.model( 'UserFile', userFileSchema );
