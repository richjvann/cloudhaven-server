import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import Organization from '../../models/organization'
import Roles from '../../models/workflowroles'
import mongoose from 'mongoose'

export class OrganizationGroupMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  
  route() {
    this.post({path:"/", overrideRoles:['SYSADMIN', 'USER']}, (req, res) => {
      var group = req.body.organizationGroup;
      Organization.findOneAndUpdate(
        {_id:mongoose.Types.ObjectId(req.body.organizationId), groups: {$not:{$elemMatch: {name:group.name}}}},
        {$push:{'groups':group}}, {new:true})
      .then(newOrg =>{
        if (newOrg) {
          res.json({success:true, newOrg: newOrg});
        } else {
          res.json({success:false, errMsg: 'Failed to add group '+group.name});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });
    this.put({path:"/:organizationId/:groupId"}, (req, res) => {
      var update = {};
      update['groups.$[elem].name'] = req.body.name;
      Organization.findByIdAndUpdate(req.params.organizationId, {$set:update}, 
        {new:true, arrayFilters:[{'elem._id':mongoose.Types.ObjectId(req.params.groupId)}]})
      .then((newOrg)=>{
        res.json({success:true, newOrg:newOrg})
      })
      .catch((error)=>{
        if (error.code == 11000) {
          res.json({success:false, errMsg: 'Duplicate organization.'})
        }
      })
    });
    this.delete({path:"/:organizationId/:groupId"}, (req, res) => {
      Organization.findByIdAndUpdate( req.params.organizationId, {$pull:{groups:{_id:req.params.groupId}}} )
      .then(newOrg=>{
        if (newOrg) {
          res.json({success:true, newOrg:newOrg});
        } else {
          res.json({success:false, errMsg: 'Failed to delete group.'});
        }
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });

    return this.router;
  }
}
