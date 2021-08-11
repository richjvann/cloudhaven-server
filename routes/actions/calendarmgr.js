import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import CalendarSrvc from '../../services/calendar'
import {fail} from "../../js/utils"
import mongoose, { Mongoose } from 'mongoose';
import moment from 'moment'

export class CalendarMgr extends BaseAction {
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }

  route() {
    this.post({path:"/getevents"}, (req, res) => {
      var start = moment(req.body.start).toDate();
      var end = moment(req.body.end).toDate();
      var authData = this.authData;
      CalendarSrvc.getEvents( this.authData.user._id, start, end )
      .then((events)=>{
        res.json(events)
      })
      .then(null, fail(res));
    });

    this.post({path:"/createevent"}, (req, res) => {
      var start = moment(req.body.start).toDate();
      var end = moment(req.body.end).toDate();
      CalendarSrvc.userCreateEvent( req.body.userId, req.body.type, req.body.title, req.body.content, start, end, req.body.durationType )
      .then(newEvent =>{
        res.json({success: true, msg: newEvent});
      })
      .catch(err =>{
        res.json({success:false, errMsg: (err+'')||'Failed to create event'});
      })
    });

    this.post({path:"/appcreateevent"}, (req, res) => {
      var start = moment(req.body.start).toDate();
      var end = (!req.body.end && req.body.durationType=='task')?moment(req.body.start).add(15, 'minutes').toDate():
                  moment(req.body.end).toDate();
      var params = Object.assign(req.body, {start:start, end:end});
      CalendarSrvc.appCreateEvent( params )
      .then(newEvent =>{
        res.json({success: true, newEvent: newEvent});
      })
      .catch(err =>{
        res.json({success:false, errMsg: 'Failed to create event'});
      })
    });

    this.post({path:"/updateevent"}, (req, res) => {
      var start = moment(req.body.start).toDate();
      var end = moment(req.body.end).toDate();
      CalendarSrvc.userUpdateEvent( req.body._id, req.body.type, req.body.title, req.body.content, start, end, req.body.durationType )
      .then(newEvent =>{
        res.json({success: true, msg: newEvent});
      })
      .catch(err =>{
        res.json({success:false, errMsg: 'Failed to create event'});
      })
    });

    this.delete({path:'/deleteevent/:userId/:eventId'}, (req, res) => {
      CalendarSrvc.delete(req.params.userId, req.params.eventId)
      .then(result =>{
        res.json({success:result.deletedCount==1});
      })
    })
   return this.router;
  }
}
