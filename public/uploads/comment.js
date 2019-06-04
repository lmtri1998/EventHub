'use strict'
const log = console.log

const express = require('express')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');
const session = require('express-session')
const { ObjectID } = require('mongodb')
const fs = require('fs');
// Mongoose
const  mongoose  = require('mongoose')
const { EventHubDB } = require('./db/EventHubDB')
const { Event, Comment } = require('./models/event')
const { User } = require('./models/user')
const { Category } = require('./models/category')

// Express
const port = process.env.PORT || 3000
const app = express();

const uploadPhotosDir = `${__dirname}/public/uploads/`

const DB_ERR = -1;
const DB_NO_RESULT = -2;
// body-parser middleware setup.  Will parse the JSON and convert to object
// app.use(bodyParser.json());
// parse incoming parameters to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:true }))
app.use(fileUpload());
// Add express sesssion middleware
app.use(session({
	secret: 'oursecret',
	resave: false,
	saveUninitialized: false,
	cookie: {
		expires: 600000,
		httpOnly: true
	}
}))
// set the view library
app.set('view engine', 'hbs')

// static js directory
app.use("/js", express.static(__dirname + '/public/js'))
app.use("/css", express.static(__dirname + '/public/css'))
app.use("/html", express.static(__dirname + '/public/html'))
app.use("/pictures", express.static(__dirname + '/public/pictures'))
app.use("/uploads", express.static(__dirname + '/public/uploads'))

// Add middleware to check for logged-in users
const sessionChecker = (req, res, next) => {
	req.session.username = "admin"
    next();
    // if (req.session.user) {
	// 	res.redirect('dashboard')
	// } else {
	// 	next();
	// }
}

/* 
Request body expects:
{
	"eventId": <id>
    "text": <comment>
    "user" : <user name>
}
*/
app.post('/comment', (req, res) => {
    if (req.body.text == null || req.body.text.trim() === "") {
        res.status(422).send();
    }
    if (!ObjectID.isValid(req.body.eventId)) {
        res.status(404).send();
    }
    const eventId = req.body.eventId;
    Event.findById(eventId).then((event) => {
        if (!event) {
            res.status(404).send();
        }
        if (event.allowComments == false) {
            res.status(400).send();
        }
        User.findOne({"username" : req.body.user}).then((user) => {
            if (!user) {
                res.status(404).send();
            }
            // create new comment and put it to event
            const comment = new Comment({
                user: new ObjectID(user._id), 
                message: req.body.text, 
                date: new Date(),
                reply: []
            });
            Event.findByIdAndUpdate(eventId, { $push: { comments: { $each: [comment], $position: 0 } } }, {new: true}).then((event) => {
                if (!event.comments.id(comment._id)) {
                    res.status(500).send();
                }
                res.send({comment});
            }).catch((error) => {
                res.status(500).send();
            })
        }).catch((error) => {
            res.status(500).send();
        })
    }).catch((error) => {
        res.status(500).send();
    })
})

/* 
Request body expects:
{
    "eventId": <id>
    "commentId": <id>
    "text": <comment>
    "user" : <user name>
}
*/
app.post('/reply', (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(404).send();
    }
    if (req.body.text == null || req.body.text.trim() === "") {
        res.status(422).send();
    }
    User.findOne({"username" : req.body.user}).then((user) => {
        if (!user) {
            res.status(404).send();
        }
        const comment = new Comment({
            user: new ObjectID(user._id), 
            message: req.body.text, 
            date: new Date()
        });
        Event.findOneAndUpdate({_id : req.body.eventId, "comments._id" : req.body.commentId}, {$push : {"comments.$.reply" : { $each: [comment], $position: 0 } } }, {new: true}).then((event) => {
            if (!event) {
                res.status(404).send();
            }
            const theComment = event.comments.id(req.body.commentId);
            if (!theComment) {
                res.status(404).send();
            }
            const addedReply = theComment.reply.filter((reply) => reply._id.equals(comment._id));
            if (addedReply.length != 1) {
                res.status(500).send();
            }
            res.send(comment);
        }).catch((error) => {
            res.status(500).send();
        })
    }).catch((error) => {
        res.status(500).send();
    })
})

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
}
*/
app.delete('/comment', (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(404).send();
    }
    Event.findByIdAndUpdate(req.body.eventId, {$pull : {comments : {_id : req.body.commentId}}}).then((event) => {
        if (!event) {
            res.status(404).send();
        }
        if (!event.comments.id(req.body.commentId)) {
            res.status(404).send();
        }
        res.send("good");
    }).catch((error) => {
        res.status(500).send();
    })
})

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
    "replyId": <id>
}
*/
app.delete('/reply', (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId) || !ObjectID.isValid(req.body.replyId)) {
        res.status(404).send();
    }
    Event.findOne({_id : req.body.eventId, "comments._id" : req.body.commentId}).then((event) => {
        if (!event) {
            res.status(404).send();
        }
        const comment = event.comments.id(req.body.commentId);
        const reply = comment.reply.filter((reply) => reply._id.equals(req.body.replyId));
        if (reply.length != 1) {
            res.status(404).send();
        }
        comment.reply.splice(comment.reply.indexOf(reply[0]), 1);
        event.save().then((event) => {
            res.send("good");
        }).catch((error) => {
            res.status(500).send();
        })
    }).catch((error) => {
        res.status(500).send();
    })
})

/* 
Request body expects:
{
	"eventId": <id>
    "begin": <begin number>
    "quantity": <number of comments>
}
response expects:
{
    "comments": <comments>
    "isEnd": <0 or 1>
}
*/
app.get('/comment', (req, res) => {
    if (!ObjectID.isValid(req.body.eventId)) {
        res.status(404).send();
    }
    const begin = parseInt(req.body.begin);
    const quantity = parseInt(req.body.quantity);
    if (isNaN(begin) || isNaN(quantity) || begin < 0 || quantity <= 0) {
        res.status(400).send();
    }
    Event.findById(req.body.eventId).populate({ path: 'comments.user', select: ['profilePic', 'username']}).populate({path: 'comments.reply.user' , select: 'username'}).then((event) => {
        log(event)
        if (!event) {
            res.status(404).send();
        }
        if (req.body.begin >= event.comments.length) {
            res.send({
                comments: [],
                isEnd: 1
            })
        }
        let end = 0;
        const endIndex = begin + quantity;
        if (endIndex >= event.comments.length) {
            end = 1;
        }
        res.send({
            comments: event.comments.slice(begin, endIndex),
            isEnd: end
        });
    }).catch((error) => {
        res.status(500).send();
    })
});

//////////////////////
app.listen(port, () => {
	log(`Listening on port ${port}...`)
});

