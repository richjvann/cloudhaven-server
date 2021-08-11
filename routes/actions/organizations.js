import BaseAction from './baseaction'
import {fail} from "../../js/utils"
import Organization from '../../models/organization'
import Roles from '../../models/workflowroles'
import mongoose from 'mongoose'

export class Organizations extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }
  
  route() {
    this.get({path:'/'}, (req, res) =>{
      Organization.find({isSuspended:{ $ne: true}}, {name: 1, organizationId: 1})
      .then(orgs =>{
        res.json({success:true, organizations:orgs});
      })
      .catch(error => {
        res.json({success:false, errMsg:error})
      })
    });

    return this.router;
  }
}
