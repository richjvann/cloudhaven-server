import mongoose from 'mongoose';
var Schema = mongoose.Schema;

var FolderSchema = new Schema({
    parentFolder: {type: Schema.ObjectId, ref: 'Folder'},
    user: { type:Schema.ObjectId, ref:'User' },
//    group: { type:Schema.Object, ref:'Group'},
    firstComeFirstServe: {type: Boolean, default: false},
    organization: { type: Schema.ObjectId, ref: 'Organization'},
    unassignedQueueGroupId: {type: String},
    applicationId: {type:String, default: ''},
    name: { type: String, required: true} //Folder name
});

FolderSchema.index({user:1, applicationId:1, name: 1 });
module.exports = mongoose.model('Folder', FolderSchema);