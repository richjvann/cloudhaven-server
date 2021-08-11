import BaseController  from './basecontroller';
import User from '../models/user'
import Organization from '../models/organization';
import AuditLog from '../models/auditlog'
import Roles from '../models/workflowroles'
import mongoose from 'mongoose'
import moment from 'moment'

//import CaseWorkflowAssignment from '../models/caseworkflowassignment';

const MAX_RESULTS = 100;

export class UserController extends BaseController{
  constructor(){
    super(User, '_id',
      [Roles.SysAdmin],
      [Roles.SysAdmin]
    );
  }
  list() {
    return this.model
    .find({})
    .populate({path:'orgMemberships.organization', select:{name:1}})
    .limit(MAX_RESULTS)
    .then((modelInstances) => {
      return modelInstances;
    });
  }
  update(id, updates) {
    this.logAuditData( id, 'update', updates);
    var dateOfBirth = updates.dateOfBirth?moment(updates.dateOfBirth).toDate():null;
    return User.updateOne({_id:mongoose.Types.ObjectId(id)}, 
      {$set:{ email:updates.email, 
        firstName:updates.firstName, middleName:updates.middleName, lastName:updates.lastName, 
        dateOfBirth: dateOfBirth, ssn: updates.ssn, status: updates.status,
        language:updates.language, roles:updates.roles}},
      {new:true})
      .then((user) => {
        return user;
      })
      .catch(error=>{
        console.log(error);
      })
  }
  delete(id) {
    return mongoose.Promise.all([
//      AuditLog.find({user:id})
      AuditLog.deleteMany({user:id})
    ])
    .then(results=>{
/*      if (results[1].length>0) {
        return mongoose.Promise.reject({name:'ValidationError', message:'In use - delete not allowed.'});
      } else {*/
        return super.delete(id);
//      }
   })
  }
}

export class OrganizationController extends BaseController{
  constructor(){
    super(Organization, '_id',
      [Roles.SysAdmin],
      [Roles.SysAdmin]);
  }
  list() {
    return this.model
    .find({})
    .populate('applications.accessControl.organizations.organization')
    .populate('applications.accessControl.users.user')
    .limit(MAX_RESULTS)
    .then((modelInstances) => {
      return modelInstances;
    });
  }
}
