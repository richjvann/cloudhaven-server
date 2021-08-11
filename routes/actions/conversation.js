import BaseAction from './baseaction'
import Roles from '../../models/workflowroles'
import MultiInstanceUserData from '../../models/multiinstanceuserdata';
import Conversation from '../../models/conversation';
import {fail} from "../../js/utils"
import mongoose, { Mongoose } from 'mongoose';

export class ConversationMgr extends BaseAction{
  constructor(){
    super();
    this.setRoles(Roles.SysAdmin, Roles.User);
  }

  route() {
    this.post({path:"/", overrideRoles:[Roles.ANY]}, (req, res) => {
      Conversation.findOne({
          organization:mongoose.Types.ObjectId(req.body.application.organizationId),
          applicationId: req.body.application._id,
          topic: req.body.topic})
      .populate('owner')
      .populate({path:'comments', populate: {path: 'owner'}})
      .then((conversation)=>{
        res.json(conversation)
      })
      .then(null, fail(res));
    });

    this.get({path:"/list", overrideRoles:[Roles.ANY]}, (req, res) => {
      var userId = mongoose.Types.ObjectId(req.body.userId);
      Conversation.find({})
      .populate('owner')
      .populate('organization')
      .populate({path:'comments', populate: {path: 'owner'}})
      .then((conversations)=>{
        res.json(conversations)
      })
      .then(null, fail(res));
    });

    // {userId:'', topic: '', content: ''}
    this.post({path:"/create", overrideRoles:[Roles.ANY]}, (req, res) => {
      var userId = mongoose.Types.ObjectId(req.body.userId);
      var orgId = mongoose.Types.ObjectId(req.body.application.organizationId);

      MultiInstanceUserData.create({
        owner:userId,
        organization: orgId,
        key: (req.body.application._id||'') + ':' + (req.body.topic||''),
        content: req.body.content})
      .then(comment=>{
        return Conversation.findOneAndUpdate(
          {organization:orgId,
            applicationId: req.body.application._id,
            topic: req.body.topic||''},
          { $set: {
          owner: userId,
          organization: orgId,
          applicationId: req.body.application._id,
          topic: req.body.topic,
          comments:[comment._id]
        }}, {upsert: true, new: true})
        .populate('owner')
        .populate({path:'comments', populate: {path: 'owner'}})
      })
      .then((conversation)=>{
        res.json({success:true, conversation:conversation})
      })
      .then(null, fail(res));
    });

    // {conversationId:'', authorId:'', content: ''}
    this.post({path:"/addcomment", overrideRoles:[Roles.ANY]}, (req, res) => {
      var authorId = mongoose.Types.ObjectId(req.body.authorId);
      var conversationId = mongoose.Types.ObjectId(req.body.conversationId);
      var newComment = null;
      Conversation.findOne({_id:conversationId}, {organization:1, applicationId:1, topic:1})
      .then(c=>{
        var key = (c.applicationId||'') + ':' + (c.topic||'');
        return MultiInstanceUserData.create({owner:authorId, organization:c.organization, key:key, content: req.body.content})
      })
      .then(comment=>{
        newComment = comment;
        return Conversation.findOneAndUpdate(
          {_id:conversationId},
          {$push:{comments:comment._id}},
          {new:true}
        )
      })
      .then((conversation)=>{
        res.json(newComment)
      })
      .then(null, fail(res));
    });

    // {contentId:'', content: ''}
    this.post({path:"/updatecomment", overrideRoles:[Roles.ANY]}, (req, res) => {
      var varUserDataId = mongoose.Types.ObjectId(req.body.contentId);

      MultiInstanceUserData.findOneAndUpdate({_id:varUserDataId}, 
        {$set:{content: req.body.content, modified_at: new Date()}}, {new: true} )
      .then((varUserData)=>{
        res.json({success:true, content:varUserData})
      })
      .then(null, fail(res));
    });
      
      this.delete({path:"/comment/:conversationId/:commentId", overrideRoles:[Roles.ANY]}, (req, res) => {
        var conversationId = mongoose.Types.ObjectId(req.params.conversationId);
        var commentId = mongoose.Types.ObjectId(req.params.commentId);

        Conversation.findOneAndUpdate( {_id: conversationId}, {$pull:{comments:{_id:commentId}}}, {new: true} )
        .then(conversation=>{
          return MultiInstanceUserData.deleteOne({_id: commentId})
        })
        .then(results=>{
          if (results && results.n>0) {
            res.json({success:true});
          }
        })
        .catch(error=>{
          res.json({success:false, errMsg:error+''});
        })
      });  
  
      return this.router;
  }
}
