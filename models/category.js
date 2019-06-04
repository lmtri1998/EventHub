/* user.js User model */

const mongoose = require('mongoose')

// let's make a mongoose model a little differently
const CategorySchema = new mongoose.Schema({
	type: {
		type: String,
		required: true,
		unique: true,
		trim: true
	}
})

const Category = mongoose.model('Category', CategorySchema)

module.exports = { Category }







