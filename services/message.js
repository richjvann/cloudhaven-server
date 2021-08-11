import mongoose from 'mongoose';
import Folder from '../models/folder';
import Message from '../models/message';
import User from '../models/user'
import Organization from '../models/organization'
import _ from 'lodash'

var obj = {};

function ensureRequiredFolders( userId, folders ) {
  var requiredFolders = {Inbox:1, Sent:1, Trash:1};
  folders.forEach(f=>{
    if (!f.parentFolder) {
      delete requiredFolders[f.name];
    }
  });
  var foldersToAdd = Object.keys(requiredFolders).map(fn=>({name:fn, user:userId}));
  return foldersToAdd.length>0?Folder.insertMany(foldersToAdd):mongoose.Promise.resolve([]);
}
obj.getUserFolderTree = function( userId ) {
    return Folder.find( {user:userId} )
    .then( folders =>{
      return ensureRequiredFolders(userId, folders)
      .then(addlFolders=>{
        return folders.concat(addlFolders);
      })
    })
    .catch(error=>{
      console.log(error);
    })
};

obj.getFolderMsgs = function( userId, folderId ) {
  if (_.isString(userId)) userId = mongoose.Types.ObjectId(userId);
  if (_.isString(folderId)) folderId = mongoose.Types.ObjectId(folderId);
  return Message.find({sharings: {$elemMatch:{user:userId, folder:folderId}}})
    .populate({path: 'sharings.user', select:{name:1, firstName:1, middleName:1, lastName:1}})
}


obj.setTaskOutcome = function( pTaskId, resultStatus, resultText) {
  var taskId = mongoose.Types.ObjectId(pTaskId);
  return Message.updateOne({_id:taskId}, {$set:{isDone:true, resultStatus:resultStatus||'', resultMessage:resultText||''}})
}

obj.grabTask = function( pTaskId, pUserId ) {
  var taskId = mongoose.Types.ObjectId(pTaskId);
  var userId = mongoose.Types.ObjectId(pUserId);
  return Message.findOne({_id:taskId}, {sharings:1})
  .then(task=>{
    var saveGroupId = task.sharings[0].groupId;
    return Message.updateOne({_id:taskId}, {$set:{saveGroupId:saveGroupId, sharings:[{user:userId, recipientType:'taskgroup'}]}})
  })
}

obj.returnTaskToQueue = function( pTaskId ) {
  var taskId = mongoose.Types.ObjectId(pTaskId);
  var userId = mongoose.Types.ObjectId(pUserId);
  return Message.findOne({_id:taskId}, {saveGroupId:1})
  .then(task=>{
    var saveGroupId = task.saveGroupId;
    return Message.updateOne({_id:taskId}, {$set:{sharings:[{groupId:saveGroupId, recipientType:'taskgroup'}]}})
  })
}

obj.getTasksForUser = function( pUserId ) {
  var userId = mongoose.Types.ObjectId(pUserId);
  return Message.find({sharings:{$elemMatch:{recipientType:'taskgroup', user:userId}}})
  .populate('organization')
  .then(tasks=>{
    return tasks.map((task)=>{
      var t = task.toObject();
      if (t.organization && t.applicationId) {
        var app = Object.assign({organization:t.organization}, t.organization.applications.find((a)=>{
          var aId = a._id.toString();
          var taId = t.applicationId;
          return aId == taId;
//          a._id.toString()==t.applicationId
        })||{})
        var retTask = Object.assign({app:app}, t);
        return retTask;
      }
    })
  })
}

//Get all of the tasks for all of the groups for which a user is a member
//params: userId
obj.getUnassignedTasksForUser = function( pUserId ) {
  var userId = mongoose.Types.ObjectId(pUserId);
  return Organization.find({'groups.members':{$elemMatch:{$eq:userId}}})
  .then(orgs =>{
    var groupMap = {};
    var groupIds = orgs.reduce((ar,o)=>{
      var org = o.toObject();
      var groupsWithUser = org.groups.filter(g=>(g.members.find(m=>(m.toString()==pUserId))));
      groupsWithUser.forEach(g=>{
        groupMap[g._id.toString()] = Object.assign({groupOrg:o}, g);
      })
      var grpIds = groupsWithUser.map(g=>(g._id));
      ar = ar.concat(grpIds);
      return ar;
    },[]);
    return Message.find({sharings:{$elemMatch:{recipientType:'taskgroup', groupId:{$in:groupIds}}}})
    .then(tasks=>{
      return tasks.map((t)=>{
        var task = _.omit(Object.assign({},t.toObject()), ['sharings']);
        task.group = groupMap[t.sharings[0].groupId.toString()];
        return task;
      })
    })
  })
}

//params: senderId, subject, message, taskGroup:{organizationId, groupName}, application:{organizationId, applicationId}
obj.queueTask = function( params ) {
  var promise = new Promise(function( resolve, reject) {
    var orgIds = [params.taskGroup.organizationId];
    if (params.application.organizationId!=params.taskGroup.organizationId) {
      orgIds.push(params.application.organizationId);
    }
    var filter = {organizationId:{$in:orgIds}};
    Organization.find(filter)
    .then(orgs =>{
      return orgs.reduce((mp,o)=>{
        mp[o.organizationId] = o;
        return mp;
      },{})
    })
    .then(orgMap=>{
      var groupOrg = orgMap[params.taskGroup.organizationId];
      if (!groupOrg) {
        reject(`Unrecognized task group organizationId (${params.taskGroup.organizationId}).`);
        return;
      }
      var group = groupOrg.groups.find(g=>(g.name==params.taskGroup.groupName));
      if (!group) {
        reject(`Unrecognized task group name (${params.taskGroup.groupName}).`);
        return;
      }
      var appOrg = orgMap[params.application.organizationId];
      if (!appOrg) {
        reject(`Unrecognized application organizationId (${params.application.organizationId}).`);
        return;
      }
      var app = appOrg.applications.find(a=>(a.applicationId==params.application.applicationId));
      if (!app) {
        reject(`Unrecognized applicationId (${params.application.applicationId}).`);
        return;
      }
      var sharing = {recipientType: 'taskgroup', organization:groupOrg._id, groupId:group._id}
      var message = {
        sendingUser: params.senderId,
        sharings: [sharing],
        subject: params.subject||'',
        message: params.message||'',
        organization: appOrg._id,
        applicationId: app._id
      };
      if (params.application.appConfigData) message.appConfigData = JSON.stringify(params.application.appConfigData);  
      return Message.create(message);
    })
    .then(newTask =>{
      resolve(newTask);
    })
    .catch(err =>{
      reject(err);
    })
  });
  return promise;
}
  

//params: senderId, recipients, taskGroup, folderName, subject, message
//recipients: [{type: 'to|cc|bcc', email: <email>}, ...]
//taskGroup: {organizationId:'', groupName:''}
obj.userCreateMsg = function( params ) {
  var promise = new Promise(function( resolve, reject) {
    var emailToUserMap = {};
    var organizationId = null;
    var componentId = null;
    var applicationId = null;
    var emails = params.recipients.map((r)=>{
      if (!_.isString(r)) {
        if (!r.type) {
          reject('No type (to, cc, bcc) specified for recipient.');
        }
        if (r.type == 'group') {

        } else {
          if (!r.email) {
            reject('No username (email) specified for recipient.');
          }
        }
      }
      return _.isString(r)?r:r.email;
    });
    if (!params.senderId && params.senderEmail) {
      emails.push( params.senderEmail );
    }
    var promises = [];
    promises.push(User.find({email:{ $in: emails}}, {_id:1, email:1}));
    if (params.application) {
      var filter = {organizationId:params.application.organizationId};
      if (params.application.applicationId) {
        filter.applications = {$elemMatch:{applicationId:params.application.applicationId}};
      } else if (params.application.componentId) {
        filter.components = {$elemMatch:{componentId:params.application.componentId}};
      } else {
        reject('Missing applicationId or componentId');
      }
    }
    promises.push(Organization.findOne(filter));
    mongoose.Promise.all(promises)
    .then(results=>{
      if (results.length>1) {
        var org = results[1];
        if (!org) {
          reject(`Unrecognized ${params.applicationId?'application':'component'}.`);
        }
        organizationId = org._id;
        if (params.application.applicationId) {
          var app = org.applications.find(a=>(a.applicationId==params.application.applicationId));
          applicationId = app?app._id.toString():'';
        } else if (params.application.componentId) {
          var component = org.components.find(c=>(c.componentId)==params.application.componentId);
          componentId = component?component._id.toString():'';

        }
      }
      var users = results[0];
      var userIds = [];
      emailToUserMap = users.reduce((mp,u)=>{
        mp[u.email] = u;
        userIds.push(u._id);
        return mp;
      },{});
      return Folder.find({user:{$in:userIds}, name: {$in:['Sent','Trash', params.folderName]}}, {user:1, name:1})
    })
    .then(folders=>{
      var sentFolder = null;
      var userToFolderMap = folders.reduce((mp,f)=>{
        mp[f.name+'|'+f.user] = f;
        if (f.name == 'Sent') sentFolder = f;
        return mp;
      },{})
      var sharings = params.recipients.map((r)=>{
        var userId = emailToUserMap[r.email]._id;
        return {
          user: userId,
          recipientType: r.type,
          folder: userToFolderMap[params.folderName+'|'+userId]
        };
      });
      if (sentFolder) {
        sharings.push({user:params.senderId, recipientType:'sender', folder: sentFolder._id})
      }
      var message = {
        sendingUser: params.senderId || emailToUserMap[params.senderEmail],
        sharings: sharings,
        subject: params.subject||'',
        message: params.message||''
      };
      if (params.application.organizationId) message.organization = organizationId;
      if (params.application.applicationId) message.applicationId = applicationId;
      if (params.application.componentId) message.componentId = componentId;
      if (params.application.appConfigData) message.appConfigData = JSON.stringify(params.application.appConfigData);
  
      return Message.create(message);
    })
    .then(newMsg =>{
      resolve(newMsg);
    })
    .catch(err =>{
      reject(err);
    })
  });
  return promise;
}
obj.trashMessage = function(msgId, folderId, userId) {
  if (_.isString(msgId)) msgId = mongoose.Types.ObjectId(msgId);
  if (_.isString(userId)) userId = mongoose.Types.ObjectId(userId);
  if (_.isString(folderId)) folderId = mongoose.Types.ObjectId(folderId);
  var trashFolder = null;
  var deleteFolder = null;
  var promise = new Promise(function( resolve, reject) {
    Folder.find({user:userId, $or:[{name: 'Trash'}, {_id:folderId}]}, {user:1, name:1})
    .then(folders =>{
      deleteFolder = folders.find(f=>(f._id.toString() == folderId.toString()));
      trashFolder = folders.find(f=>(f.name=='Trash'));
      if (deleteFolder.name == 'Trash') {
        return Message.findOneAndUpdate({_id: msgId, sharings:{$elemMatch:{user:userId, folder:trashFolder._id}}},
          {$pull:{sharings:{user:userId, folder:folderId}}}, {new:true})
      } else {
        return Message.findOneAndUpdate({_id: msgId}, 
          {$set:{'sharings.$[elem].folder':trashFolder._id}}, {arrayFilters: [{'elem.folder':deleteFolder._id}], new:true}) 
      }
    })
    .then(newMsg=>{
      if (newMsg && newMsg.sharings.length==0) {
        Message.remove( {_id: msgId})
        .then(result => {
          resolve(true);
        })
      } else {
        resolve(true);
      }
    })
    .catch(err => {
      console.log(err);
      resolve(false);
    })
  })
  obj.deleteMessageOrTask = function(msgId) {
    if (_.isString(msgId)) msgId = mongoose.Types.ObjectId(msgId);
    return Message.deleteOne( {_id: msgId});
  }
}

export default obj;