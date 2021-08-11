import mongoose, { Mongoose } from 'mongoose';
import CalendarEvent from '../models/calendarevent';
import moment from 'moment';
import User from '../models/user'
import Organization from '../models/organization';
import _ from 'lodash'

var obj = {};


obj.getEvents = function( userId, start, end ) {
  if (_.isString(userId)) userId = mongoose.Types.ObjectId(userId);
  return CalendarEvent.find({owner: userId, start: {$gte:start, $lt:end} /*, end:{$or:[{$eq:null}, {$lt:end}]}*/})
    .populate({path:'organization', select:{name:1, applications:1, organizationId:1}})
    .populate({path: 'owner', select:{name:1, firstName:1, middleName:1, lastName:1}})
}

obj.userCreateEvent = function( ownerId, type, title, content, start, end, durationType ) {
  var event = {
    owner: ownerId,
    title: title,
    content: content || '',
    start: start,
    end: end,
    durationType: durationType
  };
  if (type) event.type = type;
  return CalendarEvent.create(event);
}
//{ownerId, ownerEmail, type, title, content, start, end, durationType, 
// organizationId, applicationId, componentId, appConfigData, isDone, resultMessage}

obj.appCreateEvent = function( params ) {
  var promises = [];
  var user = null;
  if (!params.ownerId && params.ownerEmail) {
    promises.push(User.findOne({email:params.ownerEmail}, {_id:1}));
  }
  return mongoose.Promise.all(promises)
  .then(results=>{
    if (results.length>0 && results[0]) {
      user = results[0];
    }
    if (params.organizationId) {
      return Organization.findOne({organizationId:params.organizationId})
    } else {
      return null
    }
  })
  .then(organization=>{
    var ownerId = params.ownerId?mongoose.Types.ObjectId(params.ownerId):(user?user._id:null);
    var event = {
      owner: ownerId,
      title: params.title,
      content: params.content || '',
      start: params.start,
      durationType: params.durationType
    };
    if (params.organizationId) event.organization = organization?organization._id:null;
    if (params.applicationId) event.applicationId = params.applicationId;
    if (params.componentId) event.componentId = params.componentId;
    if (params.appConfigData) event.appConfigData = JSON.stringify(params.appConfigData);
    if (params.type) event.type = params.type;
    return CalendarEvent.create(event);      
  })

}
obj.userUpdateEvent = function( _id, type, title, content, start, end, durationType ) {
  var update = {$set:{
    title: title,
    content: content || '',
    start: start,
    end: end,
    durationType: durationType
  }
  };
  if (type) update['$set'].type = type;
  if (_.isString(_id)) _id = mongoose.Types.ObjectId(_id);
  return CalendarEvent.findOneAndUpdate({_id: _id}, update, {new:true});
}
obj.delete = function(userId, eventId ) {
  if (_.isString(userId)) userId = mongoose.Types.ObjectId(userId);
  if (_.isString(eventId)) eventId = mongoose.Types.ObjectId(eventId);
  return CalendarEvent.deleteOne({owner: userId, _id: eventId})
}

export default obj;