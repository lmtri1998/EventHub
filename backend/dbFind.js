/* server.js - mar11 - 6pm - mongoose*/
'use strict'
const log = console.log

const { ObjectID } = require('mongodb')
const  mongoose  = require('mongoose')
const { EventHubDB } = require('../db/EventHubDB')

const { Event } = require('../models/event')
const { User } = require('../models/user')
const { Category } = require('../models/category')
const { Comment } = require('../models/event')
function getFrontendEvent(objID){
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    Event.find({date: { $gt: date}}, ['img', 'eventType', 'title', 'creator', 'location', 'date', 'description', 'comments', '_id'],
                {sort: {date: 1}}).populate('eventType').populate('creator', 'username').populate('comments.user').exec((err, events) => {
        
        if (err) {
            log("HfI")
            return
        }
        log(events)
        let frontendEvents = [];
        events.forEach(event => {
            frontendEvents.push(backednEventToFrontendEvent(event))
        })
        console.log(frontendEvents)

    })

    // const q = Event.findOne({_id: objID}).populate('eventType').populate('creator').exec((err, event) => {
    //     if (err) return handleError(err);
    //     return {
    //         id: event._id,
    //         creator: event.creator.username,
    //         title: event.title,
    //         location: event.location,
    //         date: event.date,
    //         description: event.description,
    //         img: event.img,
    //         type: event.type,
    //         comments: event.comments
    //     }
    // });
}

function backednEventToFrontendEvent(event){
    let comments = [];
    event.comments.forEach(comment => {
        comments.push({
            id: comment._id,
            date: comment.date,
            username: comment.user.username,
            txt: comment.message
        });
    });
    
    let types = [];
    event.eventType.forEach(type => {
        types.push(type.interest)
    })
    return  {
                id: event._id,
                creator: event.creator.username,
                title: event.title,
                location: event.location,
                date: event.date,
                description: event.description,
                img: event.img,
                type: types,
                comments: comments
            }
    
}

function handleError(err){
    console.log(err)
}

log(getFrontendEvent("5c96d01859f3f4177cc40daa"));
