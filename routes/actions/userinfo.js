import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import User from '../../models/user'
import {fail} from "../../js/utils"
import _ from 'lodash'
import mongoose from 'mongoose';

export class UserInfo extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin);
  }

  route() {
    this.put({path:"/update/:userId"}, (req, res)=>{
      var userId = mongoose.Types.ObjectId(req.params.userId);
      User.updateOne({_id:userId}, {$set:Object.assign({},req.body)})
      .then(result=>{
        res.json({success:true})
      })
      .catch(error=>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.post({path:"/", tag:'Update UserInfo'}, (req, res) => {
      User.findById(req.userId)
      .then((user)=>{
        res.json(user)
      })
      .then(null, fail(res));
    });

    this.get({path:"/:userId", overrideRoles:[Roles.ANY], tag:'UserInfo get'}, (req, res) => {
      User.findById(req.params.userId)
      .then((user)=>{
        res.json(user)
      })
      .catch(err=>{
        res.json(null);
      })
    });

    this.post({path:"/getusers", overrideRoles:[Roles.ANY], tag:'Get Users'}, (req, res) => {
      var userIds = req.body.userIds.map(id=>(mongoose.Types.ObjectId(id)));
      User.find({_id:{$in:userIds}})
      .then((users)=>{
        res.json(users)
      })
      .catch(err=>{
        res.json(null);
      })
    });

    //(search criteria) {email, ssn}
    this.post({path:"/lookup", overrideRoles:[Roles.ANY], tag:'Lookup User'}, (req, res) => {
      User.findOne(req.body)
      .then((user)=>{
        res.json(_.pick(user,["_id", "email", "firstName", "middleName", "lastName"]))
      })
    });
  
    return this.router;
  }
}

