/* server.js - mar11 - 6pm - mongoose*/
'use strict'
const log = console.log

const express = require('express')
const port = process.env.PORT || 3000
const bodyParser = require('body-parser')
const { ObjectID } = require('mongodb')
const  mongoose  = require('mongoose')
const { EventHubDB } = require('../db/EventHubDB')

const { Event } = require('../models/event')
const { User } = require('../models/user')
const { Interest } = require('../models/interest')

// express
const app = express();
// body-parser middleware - will parse the JSON and convert to object
app.use(bodyParser.json())

// Loading events for Home page
app.get('/home', (req, res) => {
    let date = new Date();
    date.setHours(0, 0, 0, 0); //Set it to midnight
    Event.find({date: { $gte: date}}, ['img', 'eventType', 'title', 'creator', 'location', 'date', 'description', 'comments', '_id'],
                {sort: {date: 1}}).populate('eventType').populate('creator', 'username').populate('comments.user').exec((err, events) => {
        
        if (err) {
            res.status("500").send()
            return
        }
        let frontendEvents = [];
        events.forEach(event => {
            frontendEvents.push(backednEventToFrontendEvent(event))
        })
        console.log(frontendEvents)
        res.json(frontendEvents)
    })
})

app.get('/profile/:username', (req, res) => {
    let date = new Date();
    const username = req.params.username
    User.findOne({username: username}, ['interests', 'followedEvents', 'email', 'username', 'birthday', 'description', 'admin', 'profilePic'])
        .populate('interests').populate('followedEvents').exec((err, user) => {
        
        
        
    })
    log(req.body)
})



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
function backednUserToFrontendUser(user){    
    let types = [];
    user.interests.forEach(type => {
        types.push(type.interest)
    })
    return  {
                id: user._id,
                interests: user.interests,
                title: event.title,
                location: event.location,
                date: event.date,
                description: event.description,
                img: event.img,
                type: types,
                comments: comments
            }
    
}
const date = new Date();
date.setHours(0, 0, 0, 0);
User.findOne({username: "admin"}, ['interests', 'followedEvents', 'email', 'username', 'birthday', 'description', 'admin', 'profilePic'])
.populate('interests').populate({path: 'followedEvents', options: { sort: { 'date': -1 } } }).exec((err, user) => {
    if (err) {
        res.status("500").send()
    }
    // User not found
    if (user == null) {
        res.status("400").send()
    }
    const userEvents = [];
    const pastEvents = [];
    const comingEvents = [];
    user.followedEvents.forEach(event => {
        if (event.creator == user._id){
            userEvents.push(backednEventToFrontendEvent(event))
        }
        else if(event.date < date){
            pastEvents.push(backednEventToFrontendEvent(event))
        } else {
            comingEvents.push(backednEventToFrontendEvent(event))
        }
    })
    log({user: user, pastEvents: pastEvents, comingEvents: comingEvents, userEvents: userEvents})
})

// app.listen(port, () => {
// 	log(`Listening on port ${port}...`)
// }) 