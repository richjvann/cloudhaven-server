import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import MessageSrvc from '../../services/message'
import {fail} from "../../js/utils"
import mongoose, { Mongoose } from 'mongoose';

export class MessageMgr extends BaseAction {
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }

  route() {
    // 
    // {userId:'', updates:[{name: '', content:''}, ...]}
    this.get({path:"/gettree"}, (req, res) => {
      MessageSrvc.getUserFolderTree( this.authData.user._id )
      .then((folders)=>{
        res.json(folders)
      })
      .then(null, fail(res));
    });

    this.post({path:'/settaskoutcome'}, (req,res) =>{
      MessageSrvc.setTaskOutcome(req.body.taskId, req.body.resultStatus, req.body.resultText)
      .then(result =>{
        res.json({success:result.ok==1, errMsg:result.ok==1?'Grab failed':''});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/returntasktoqueue/:taskId'}, (req,res) =>{
      MessageSrvc.returnTaskToQueue(req.params.taskId)
      .then(result =>{
        res.json({success:result.ok==1, errMsg:result.ok==1?'Grab failed':''});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/grabtask/:taskId/:userId'}, (req,res) =>{
      MessageSrvc.grabTask(req.params.taskId, req.params.userId)
      .then(result =>{
        res.json({success:result.ok==1, errMsg:result.ok==1?'Grab failed':''});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/gettasksforuser/:userId'}, (req,res) =>{
      MessageSrvc.getTasksForUser(req.params.userId)
      .then(tasks =>{
        res.json({success:true, tasks:tasks});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.get({path:'/getunassignedtasksforuser/:userId'}, (req,res) =>{
      MessageSrvc.getUnassignedTasksForUser(req.params.userId)
      .then(tasks =>{
        res.json({success:true, tasks:tasks});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    this.post({path:'/queuetask'}, (req, res)=>{
      //params: groupId, subject, message, applicationId or componentId, and appConfigData
      MessageSrvc.queueTask( req.body )
      .then(newTask =>{
        res.json({success:true, newTask:newTask});
      })
      .catch(error =>{
        res.json({success:false, errMsg:error+''});
      })
    });

    // {recipients:[{type:'', email:''}...], subject, message}
    this.post({path:"/send"}, (req, res) => {
      var params = Object.assign( {folderName: "Inbox"}, req.body );
      MessageSrvc.userCreateMsg( params )
      .then(newMsg =>{
        res.json({success: true, msg: newMsg});
      })
      .catch(err =>{
        res.json({success:false, errMsg: err});
      })
    });

    this.get({path:"/getfoldermsgs/:folderId"}, (req, res) =>{
      MessageSrvc.getFolderMsgs( this.authData.user._id, req.params.folderId )
      .then(messages =>{
        res.json(messages || []);
      })
      .catch(err =>{
        res.json({success:false, errMsg: 'Failed to create message'});
      })
    });

    this.delete({path:'/userdeletemsg/:userId/:folderId/:msgId'}, (req, res) => {
      MessageSrvc.trashMessage(req.params.msgId, req.params.folderId, req.params.userId)
      .then(result =>{
        res.json({success:result});
      })
      .catch(err =>{
        res.json({success:false, errMsg: 'Failed to trash message'});
      })
    })

    this.delete({path:'/deletemsgortask/:messageId'}, (req, res)=>{
      MessageSrvc.deleteMessageOrTask( req.params.messageId )
      .then(result =>{
        res.json({success:result});
      })
      .catch(err =>{
        res.json({success:false, errMsg: 'Failed to delete message'});
      })
    })
   return this.router;
  }
}
