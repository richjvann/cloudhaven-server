import mongoose from "mongoose"
var Schema = mongoose.Schema;
var accessControlSchema = new Schema ({
    unlimited: {type: Boolean, default: true},
    organizations: [
      {
        organization: { type: Schema.ObjectId, ref: 'Organization'},
        status: {type: String, enum:['Pending', 'Allowed', 'Suspended'], default:'Pending'}
      }
    ],
    users: [
      {
        user: {type: Schema.ObjectId, ref: 'User'},
        status: {type: String, enum:['Pending', 'Allowed', 'Suspended'], default:'Pending'}
      }
    ]
});
accessControlSchema.set('toJSON', { virtuals: true });
export default accessControlSchema;