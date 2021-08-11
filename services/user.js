import mongoose, { Mongoose } from 'mongoose';
import Folder from '../models/folder';
import User from '../models/user';
import _ from 'lodash'

var obj = {};

obj.createUserMessageFolders = function( userId ) {
  var promise = new Promise(function( resolve, reject){
    if (_.isString(userId)) userId = mongoose.Types.ObjectId(userId);
    Folder.find( {user:userId}, {name:1} )
    .then((folders)=>{
      var folderMap = (folders||[]).reduce((mp,f)=>{
        mp[f.name] = f;
        return mp;
      },{});
      return ['Inbox', 'Sent', 'Trash'].reduce((ar, fn)=>{
        if (!folderMap[fn]) {
          ar.push({user: userId, name: fn});
        }
        return ar;
      },[]);
    })
    .then((folders) => {
      if (folders.length==0) {
        resolve(true);
      } else {
        Folder.insertMany(folders)
        .then(result=>{
          resolve(true);
        })    
      }
    })
  })
  return promise;
};
obj.userSearch = function( searchPhrase, dateOfBirth ) {
  function makeFilter(searchPhrase) {
    return  {$or: [
      { email: { '$regex': searchPhrase+'', '$options': 'i'}},
      { firstName: { '$regex': searchPhrase+'', '$options': 'i'}},
      { lastName: { '$regex': searchPhrase+'', '$options': 'i'}}
    ]};  
  }
  var filter = {};
  if (searchPhrase) {
    if (searchPhrase.indexOf(' ')>0) {
      var parts = searchPhrase.split(' ').filter(sp=>(sp!=''));
      filter = parts.reduce((f,p)=>{
        f.$and.push(makeFilter(p));
        return f;
      },{$and: []});
    } else {
      filter = makeFilter(searchPhrase);
    }
  }
  if (dateOfBirth) {
    var lowBnd = moment(req.body.dateOfBirth).startOf('day');
    var highBnd = moment(lowBnd).add(1, 'days');
    filter.dateOfBirth = { $gte: lowBnd.toDate(), $lt: highBnd.toDate()};
  }
  return User.find(filter, {email:1, firstName:1, middelName:1, lastName:1, dateOfBirth:1 });
}

export default obj;
