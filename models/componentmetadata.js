import mongoose from 'mongoose';
var Schema = mongoose.Schema;

var ComponentMetaDataSchema = new Schema({
  library: {type: String, required:true},
  component: {type: String, required: true},
  props: [{
    name: {type: String, required: true},
    dataType: String,
    defaultValue: String,
    description: String
  }],
  slots: [{
    name: {type: String, required: true},
    description: String
  }],
  events: [{
    name: {type: String, required: true},
    description: String
  }]
});

ComponentMetaDataSchema.index({user:1, applicationId:1, name: 1 });
module.exports = mongoose.model('ComponentMetaData', ComponentMetaDataSchema);