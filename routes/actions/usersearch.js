import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import User from '../../models/user'
import UserSrvc from '../../services/user'
import {fail} from "../../js/utils"
import _ from 'lodash'
import mongoose from 'mongoose';

export class UserSearch extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin);
  }

  route() {
    this.post({path:"/"}, (req, res) => {
      var phrase = req.body.phrase;
      var searchCriteria = {
        $or: [{ email:  { $regex: phrase, $options: 'i'} },
          { firstName: { $regex: phrase, $options: 'i'} },
          { lastName: { $regex: phrase, $options: 'i'} },
          { ssn: { $regex: phrase, $options: 'i'} }]
      }
      if (req.body.dateOfBirth) {
        var lowBnd = moment(req.body.dateOfBirth).startOf('day');
        var highBnd = moment(lowBnd).add(1, 'days');
        searchCriteria.dateOfBirth = { $gte: lowBnd.toDate(), $lt: highBnd.toDate()};
      }
      User.find( searchCriteria )
      .then((users)=>{
        res.json(users);
      })
      .catch((err)=>{
        res.json({errMsg:"Can't find user.", success:false})
      });
    });

    this.post({path:'/emailnamesearch', overrideRoles:['SYSADMIN', 'USER']}, (req, res) =>{
      if (!req.body.searchPhrase && !req.body.dateOfBirth) {
        res.json([]);
        return;
      }
      UserSrvc.userSearch( req.body.searchPhrase, req.body.dateOfBirth )
      .then(users=>{
        res.json(users)
      })
      .catch(error=>{
        console.log(error+'');
        res.json(null);
      })
    });
  
    return this.router;
  }
}
