/* user.js User model */

const mongoose = require('mongoose')
const validator = require('validator')
const ObjectId = mongoose.Schema.Types.ObjectId;

const CommentSchema = new mongoose.Schema({
	user: {
		type: ObjectId,
		ref: "User"
	},
	message: {
		type: String,
		required: true
	}, 
	date: {
		type: Date,
		required: true
	},
	reply: [{
		user: {
			type: ObjectId,
			ref: "User"
		},
		message: {
			type: String,
			required: true
		}, 
		date: {
			type: Date,
			required: true
		},
		isDeleted: {
			type: Boolean, 
			required: true
		}, 
		deletedText: {
			type: String
		}
	}], 
	isDeleted: {
		type: Boolean, 
		required: true
	}, 
	deletedText: {
		type: String
	}
})
// let's make a mongoose model a little differently
const EventSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true
	},
	creator: {
		type: ObjectId,
		ref: "User",
		required: true
	},
	location: {
		type: String,
		required: true
	},
	date: {
		type: Date,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	img: {
		type: [String]
	}, 
	eventType: [{
		type: ObjectId,
		ref: "Category",
		required: true
	}],
	comments: {
		type: [CommentSchema]
		// type: mongoose.Mixed // it will comment class
	},
	followers: [{
		type: ObjectId,
		ref: "User"
	}],
	numFollows: {
		type: Number,
		required: true
	},
	allowComments: {
		type: Boolean,
		required: true
	},
	notification: {
		type: String,
		default: ""
	},
	address: {
		type: String
	}
})

const Event = mongoose.model('Event', EventSchema)
const Comment = mongoose.model('Comment', CommentSchema)
module.exports = { Event : Event, Comment: Comment }





