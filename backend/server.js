/* server.js - mar11 - 6pm - mongoose*/
'use strict'
const log = console.log

//const express = require('express')
//const port = process.env.PORT || 3000
const { ObjectID } = require('mongodb')
const  mongoose  = require('mongoose')
const { EventHubDB } = require('../db/EventHubDB')

const { Event } = require('../models/event')
const { User } = require('../models/user')
const { Category } = require('../models/category')


// const interest = new Interest({
// 	interest: "CS"
// })
// interest.save(function (a, b) {})
const user1 = new User({
	email: "user@admin.admin",
	password: "user",
	username: "user",
	birthday: new Date("2000 Feb 29"),
	description: "I am a boring admin",
	interests: new mongoose.Types.ObjectId("5c96b146c3d6016a80449783"),
	followedEvents: [],
	follows: [],
	profilePic: "../imgFile/face.jpg"
});
let a = []
for(let i = 0; i < 100000; i++){
	a.push({User:"be", Txt:"fjsaid;fjasdfkja;", hi:"ifjdsalfjasdflkjas"})
}
const event1 = new Event({
	title: "Anime North 2019",
	creator: new mongoose.Types.ObjectId(user1._id),
	location: "Toronto Congress Centre / Delta Hotels by Marriott Toronto Airport (formerly the International Plaza) 650 Dixon Road Toronto, Ontario M9W 1J1",
	date: new Date(),
	description: "Anime North is Toronto's largest fan-run Japanese Animation convention.",
	img: ["../w4.png"],
	eventType: new mongoose.Types.ObjectId(interest._id),
	comments: a,
	numFollows: 0
});
user1.save(function (err, cs) {
	console.log(err)
});
 event1.save(function (err, cs) {
    if (err) return console.error(err);
    console.log("aya");
  });