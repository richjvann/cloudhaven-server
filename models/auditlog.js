import mongoose from "mongoose"
var Schema = mongoose.Schema;

var auditLogSchema = new Schema( {
  user: { type: Schema.ObjectId, ref: 'User'},
  isPHI: { type:Boolean, default: false},
  model: { type: String, required: true},
  recordId: {type: String, required: true},
  publicId: {type: String },
  operation: { type: String, enum:['create', 'read', 'update', 'delete'], required:true},
  data: String,
  datetime: { type: Date, required: true, default: Date.now}
});
export default mongoose.model( 'AuditLog', auditLogSchema );