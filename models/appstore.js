var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var AppStoreSchema = new Schema({
    organization: { type:Schema.ObjectId, ref:'Organization', required: true },
    table: { type: String, required: true},
    key: { type: String, required:true},
    jsonData: { type: String, required: true }
});

AppStoreSchema.index({organization:1, table: 1, key:1});
module.exports = mongoose.model('AppStore', AppStoreSchema);