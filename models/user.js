/* user.js User model */

const mongoose = require('mongoose')
const validator = require('validator')
const ObjectId = mongoose.Schema.Types.ObjectId;
const bcrypt = require('bcryptjs')

// let's make a mongoose model a little differently
const UserSchema = new mongoose.Schema({
	password: {
		type: String,
		required: true,
		minlength: 4
	},
	username:{
		type: String,
		required: true,
		minlength: 1,
		trim: true,
		unique: true
	},
	birthday:{
		type: Date,
	},
	description:{
		type: String,
	},
	interests:[{
		type: ObjectId,
		ref: "Category",
		required: true
	}],
	followedEvents: [{
		type: ObjectId,
		ref: "Event",
		required: true
	}],
	follows: [{
		type: ObjectId,
		ref: "User",
		required: true
	}],
	admin: {
		type: Boolean,
		required: true
	},
	profilePic: {
		type: String,
		required: true
	},
})

// Our own user finding function 
UserSchema.statics.findByEmailPassword = function(username, password) {
	const User = this

	return User.findOne({username: username}).then((user) => {
		if (!user) {
			return Promise.reject()
		}
		return new Promise((resolve, reject) => {
			bcrypt.compare(password, user.password, (error, result) => {
				if (result) {
					resolve(user);
				} else {
					reject();
				}
			})
		})
	})
}

// This function runs before saving user to database
UserSchema.pre('save', function(next) {
	const user = this

	if (user.isModified('password')) {
		bcrypt.genSalt(10, (error, salt) => {
			bcrypt.hash(user.password, salt, (error, hash) => {
				user.password = hash
				next()
			})
		})
	} else {
		next();
	}

})

const User = mongoose.model('User', UserSchema)

module.exports = { User }







