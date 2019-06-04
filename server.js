'use strict'
const log = console.log

const express = require('express')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');
const session = require('express-session')
const hbs = require('hbs')

const { ObjectID } = require('mongodb')
const fs = require('fs');
// Mongoose
const  mongoose  = require('mongoose')
const {EventHubDB} = require('./db/EventHubDB')
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
app.use(bodyParser.json());
// parse incoming parameters to req.body
app.use(bodyParser.urlencoded({ extended:true }))
app.use(fileUpload());
// Add express sesssion middleware

app.use(session({
	secret: 'oursecret',
	resave: true,
	saveUninitialized: false,
	cookie: {
		expires: 600000,
		httpOnly: true
	},
	rolling: true
}))
// set the view library
app.set('view engine', 'hbs')

// static js directory
app.use("/js", express.static(__dirname + '/public/js'))
app.use("/css", express.static(__dirname + '/public/css'))
app.use("/html", express.static(__dirname + '/public/html'))
app.use("/pictures", express.static(__dirname + '/public/pictures'))
app.use("/uploads", express.static(__dirname + '/public/uploads'))

// Mongoose
mongoose.set('useCreateIndex', true);

/**************************************************
 *                                                *
 *   Middle Wares!                                *
 *                                                *
***************************************************/
// Add middleware to check for logged-in users
// User this for signup and sign in.
const sessionChecker = (req, res, next) => {
	if (req.session.user_id) {
		User.findById(req.session.user_id).then((user) => {
			if (!user) {
				res.redirect('/users/logout')
			} else {
				req.session.user_id = user._id
				req.session.username = user.username
				res.redirect('/')
			}
		}).catch((error) => {
			res.redirect('/login')
		})
	} else {
		next()
	}
}

// Middleware for authentication for resources 
const ajaxAuthenticate = (req, res, next) => {
	if (req.session.user_id) {
		User.findById(req.session.user_id).then((user) => {
			if (!user) {
				res.status(401).send();
			} else {
				req.session.user_id = user._id;
				req.session.username = user.username;
				next()
			}
		}).catch((error) => {
			res.status(500).send();
		})
	} else {
		res.status(401).send();
	}
}

const authenticateAdminNonAjax = (req, res, next) => {
	if(req.session.user_id) {
		User.findById(req.session.user_id).then((user) => {
			if (!user) {
				res.redirect("/users/logout")
			} else {
				if(user.admin) {
					req.session.user_id = user._id
					req.session.username = user.username
					next()
				} else {
					res.redirect('/')
				}
			}
		}).catch((error) => {
			res.redirect('/')
		})
	} else {
		res.redirect('/')
	}
}

const authenticateAdmin = (req, res, next) => {
	if(req.session.user_id) {
		User.findById(req.session.user_id).then((user) => {
			if (!user) {
				res.status(401).send();
			} else {
				if(user.admin) {
					req.session.user_id = user._id
					req.session.username = user.username
					next()
				} else {
					res.status(401).send();
				}
			}
		}).catch((error) => {
			res.status(500).send();
		})
	} else {
		res.status(401).send();
	}
}

/**************************************************
 *                                                *
 *   Helper Functions                             *
 *                                                *
***************************************************/
function backednEventToFrontendEvent(event){
    
	let types = [];
    event.eventType.forEach(type => {
        types.push(type.type)
    })
    return  {
                id: event._id,
				creator: event.creator.username,
				creatorId: event.creator._id,
                title: event.title,
                location: event.location,
                date: event.date,
                description: event.description,
                img: event.img,
				type: types,
				coordinates: event.coordinates,
				notification: event.notification,
				address: event.address,
				allowComments: event.allowComments
            }
    
}

function checkImageFile(file) {
	const result = file.mimetype.match(/image[/]/);
	if (result == null || result.index != 0) {
		return -1;
	}
	return 0;
}

function saveFile(file){
	let [filename, filetype] = file.name.split(".")
	let suffix = ".";
	let num = 0;
	while(fs.existsSync(uploadPhotosDir + filename + suffix + filetype)){
		suffix = `${++num}.`;
	}	
	return new Promise (function(resolve, reject) {
		file.mv(uploadPhotosDir + filename + suffix + filetype).then(_ => {
			resolve('/uploads/'+ filename + suffix + filetype);
		}).catch(err => {
			reject(err);
		});
	});
}

function removeFile(files) {
	files.forEach(filename => {
		fs.unlink(__dirname + '/public/' + filename, (e)=>{})
	})
}

/**************************************************
 *                                                *
 *   DataBase Find Helpers                        *
 *                                                *
***************************************************/
const findUser = (username) => {
	return new Promise( (resolve, reject) => {
		User.findOne({"username": username}, (err, user) => {
			if (err) 
				reject(DB_ERR);
			if (user) {
				resolve(user);
			} else {
				reject(DB_NO_RESULT);
			}
		});
	});
};

const findCategories = (categories) => {
	return new Promise( (resolve, reject) => {
		Category.find({"type": categories}, (err, results) =>{
			if (err) 
				reject(DB_ERR);
			if (results) {
				if (typeof categories == "string"){
					categories = [categories];
				}

				if(results && (results.length == categories.length)){
					resolve(results);
				} else {
					reject(DB_NO_RESULT);
				}
			} else {
				reject(DB_NO_RESULT);
			}
		});
	});
};

/**************************************************
 *                                                *
 *   MAIN PAGE SERVER REQUEST!!!                  *
 *                                                *
***************************************************/
app.get('/', (req, res) => {
	res.redirect("/html/redirect.html")
	return;
	// check if we have active session cookie
	Category.find().then((cats) => {
		let tab = "";
		if(cats.length != 0) {
			for(let i = 0; i < cats.length; i++) {
				tab += "<li><a onclick='changeTab(event)' id='" + cats[i]._id +"' href=''>" + cats[i].type + "</a></li>"  
			}
		}
		if (req.session.user_id) {
			//res.sendFile(__dirname + '/public/dashboard.html')
			res.render('main.hbs', {
				tab: tab,
				status: "Log out",
				signInOrNot: "My profile"
			})
		} else {
			res.render('main.hbs', {
				tab: tab,
				status: "Log in",
				signInOrNot: "Sign up"
			})
		}
	}).catch((err) => {
		res.status(500).send()
	})
	
})

/**************************************************
 *                                                *
 *   Log-In/Log-out Related Server Requests       *
 *                                                *
***************************************************/
app.get('/checkLoggedIn', ajaxAuthenticate, (req, res) => {
	res.send({loggedIn: true});
})

// route for login
app.get('/login', sessionChecker, (req, res) => {
	res.sendFile(__dirname + '/public/html/signIn.html')
})

//route for signup
app.get('/signup', (req, res) => {
	res.sendFile(__dirname + '/public/html/signUp.html')
})

// For creating user.
/*
Request body expects:
{
	"uname": <username>
	"psw": <password>
	"psw_repeat": <repeat password>
}
*/
app.post('/users/signup', (req, res) => {
	User.find({"username": req.body.uname}, (err, user) => {
		if(err) {
			res.status(404).send(err)
		}
		// If not exist then create new user and save.
		if(user.length == 0) {
			if(req.body.psw != req.body.psw_repeat) {
				res.render('signUp.hbs', {
					msg: 'Reapeated password does not match password!'
				})
			}
			else {
				const user  = new User({
					password: req.body.psw, // Do encryption first.
					username: req.body.uname,
					description: "",
					interests: [],
					followedEvents: [],
					follows: [],
					admin: false,
					profilePic: '/pictures/profilePic/face.jpg',
					notifications: []
				})
				user.save().then((user) => {
						res.redirect('/login')
					}, (error) => {
						res.status(400).send(error) // 400 for bad request
				})	
			}
		}
		else {
			res.render('signUp.hbs', {
				msg: 'Username already exists!'
			})
		}
	})
})

// User login and logout routes
app.post('/users/login', (req, res) => {
	const username = req.body.uname
	const password = req.body.psw
	User.findByEmailPassword(username, password).then((user) => {
		// Add the user to the session cookie that we will
		// send to the client		
		if(user) {
			req.session.user_id = user._id
			req.session.username = user.username
			// Take to main page.
			res.redirect('/')
		}
		else {
			res.status(401).render('signIn.hbs', {
				msg: 'Incorect Username/Password!'
			})
		}
	}).catch((error) => {
		res.status(401).render('signIn.hbs', {
			msg: 'Incorect Username/Password!'
		})
	})
})// Get the object, make sure that all detail are correct before returning.


app.get('/users/logout', (req, res) => {
	req.session.destroy((error) => {
		if (error) {
			res.status(500).send(error)
		} else {
			res.redirect('/')
		}
	})
})

/**************************************************
 *                                                *
 *   Basic Events Server Requests                 *
 *                                                *
***************************************************/

// Load events for the main page
app.post('/loadEvents', (req, res) => {
	const last_event = req.body.last_event;
	const load_count = parseInt(req.body.load);
	let offset_count = parseInt(req.body.currentLoads);
	const category = req.body.category;
	let hasCat = (category != null && ObjectID.isValid(category));

	if(isNaN(load_count) || isNaN(offset_count)){
		res.status(404).send();
		return;
	}
	if (load_count <= 0 || offset_count < 0){
		res.status(422).send();
		return;
	}
	let date = new Date();
	date.setDate(date.getDate() - 1);
	date.setHours(0, 0, 0, 0);
	Event.find( hasCat ? {eventType: category, date: {$gte: date} } :{date: {$gt: date}} ,
				['img', 'eventType', 'title', 'creator', 'location', 'date', 'description', '_id', 'address', 'allowComments'],
                {sort: {date: 1}}).populate('eventType').populate('creator', 'username').exec((err, events) => {
		if (err) {
			res.status(500).send(err);
			return
		}
			
		if (offset_count >= events.length){
			res.send([]);
			return
		} else if (offset_count != 0 && last_event != null){
			for(let i = offset_count; i < events.length; i++){
				if (events[i]._id.toString() == last_event){
					offset_count = i + 1;
					break;
				}
			}
		} 

		let frontendEvents = [];

		for(let i = offset_count; i < events.length && i < offset_count + load_count; i++){
			frontendEvents.push(backednEventToFrontendEvent(events[i]))
		}
		res.send(JSON.stringify(frontendEvents));

	});
});

// Load event based on key words
app.get('/events/search/:filter', (req, res)=> {
	const filter = req.params.filter.slice(2, req.params.filter.length - 1).toUpperCase()
	Event.find().populate({path: "creator", select: ["username"]}).then(events => {
		if(events.length == 0) {
			res.send(JSON.stringify([]))
			return;
		}
		let frontendEvents = [];
		events.forEach((event) => {
			if(filter != "") {
				if(event.title.toUpperCase().indexOf(filter) > - 1 || event.location.toUpperCase().indexOf(filter) > -1 || (event.address && event.address.toUpperCase().indexOf(filter) > -1)) {
					frontendEvents.push(backednEventToFrontendEvent(event))
				}
			}
		})
		res.send(JSON.stringify(frontendEvents));
	}).catch(err =>{
		res.status(500).send()
	})
})

// For new event.
// Request body is an event object class.
app.post('/addevent', ajaxAuthenticate, (req, res) => {

	findUser(req.session.username).then(usr => {
		findCategories(req.body.types).then(results => {
			if (new Date(req.body.date) == "Invalid Date"){
				res.status(400).send({location: "date"});
			} else {
				let eventType = [];
				for(let i = 0; i< results.length; i++) {
					eventType.push(results[i]._id);
				}
				function saveEvent(imgs) {
					return new Promise (function(resolve, reject) {
						const newEvent = new Event({
							title: req.body.title,
							creator: usr._id,
							location: req.body.location,
							date: new Date(req.body.date),
							description: req.body.description,
							img: imgs,
							eventType: eventType,
							comments: [],
							numFollows: 0,
							allowComments: req.body.allowComments == null ? false : true,
							address: req.body.address
						})
						// save restaurant to the database
						newEvent.save().then((event) => {
							resolve(event);
						}).then((error) => {
							reject(error);
						})	
					})
				}
				if(req.files == null){ // There are no files
					saveEvent(["/pictures/eventPic/w3.jpg"]).then(event => {
						event.creator = usr;
						res.send(backednEventToFrontendEvent(event));
					}).catch(err => {
						res.status(500).send(err);
					});
				} else {
					let eventPhotos = req.files.eventPhotos;
					if (eventPhotos[0] == null) { // If this is not an array, i.e. only one file
						if (checkImageFile(eventPhotos) != 0) {
							res.status(422).send({
								invalid: [0]
							})
							return
						}
						saveFile(eventPhotos).then(filename => {
							saveEvent([filename]).then(event => {
								event.creator = usr;
								res.send(backednEventToFrontendEvent(event));
							}).catch(err => {
								res.status(500).send(err);
							})
						}
						).catch(err => {
							res.send(500).send(err);
						})
					} else {
						const invalid = [];
						let good = true;
						for (let i = 0 ; i < eventPhotos.length ; i++) {
							if (checkImageFile(eventPhotos[i]) != 0) {
								invalid.push(i);
								good = false;
							}
						}
						if (!good) {
							res.status(422).send({
								invalid: invalid
							});
							return;
						}
						let promises = [];
						eventPhotos.forEach(file => {
							promises.push(saveFile(file));
						});
						Promise.all(promises).then(files => {
							saveEvent(files).then(event => {
								event.creator = usr;
								res.send(backednEventToFrontendEvent(event));
							}).catch(err => {
								res.status(500).send(err);
							})
						}).catch(err => {
							res.status(500).send(err);
						})
					}
				}
			}
		}).catch(err => {
			if (err == DB_ERR) {
				res.status(500).send();
			} else {
				res.status(400).send({location: "types"});
			}
		});
	}).catch(err => {
		res.status(500).send();
	})	
})

// Get the event given the id.	
app.get('/event/:id', (req, res) => {
	if (!ObjectID.isValid(req.params.id)){
		res.status(404).send();
		return;
	}
	Event.findById(req.params.id).populate("eventType").populate("creator").then(event => {
		if(!event)
			res.status(400).send();
		else {
			res.send(backednEventToFrontendEvent(event))
		}
	}).catch(err => {
		res.status(500).send();
	})
})

// Edit an event
app.patch('/event/:id', ajaxAuthenticate, (req, res) => {

	if (!ObjectID.isValid(req.params.id)){
		res.status(400).send();
		return;
	}
	Event.findById(req.params.id).populate("creator").then(event => {

		if (!event){
			res.status(400).send();
			return;
		}
		findUser(req.session.username).then(user => {
			if (event.creator._id.toString() !== user._id.toString() && user.admin == false){
				res.status(401).send()
				return;
			}
			findCategories(req.body.types).then(results => {
				let deleteImg = []
				let saveImg = []
				event.img.forEach(img => {
					if (req.body.imgSrc.indexOf(img) == -1){
						deleteImg.push(img);
					} else {
						saveImg.push(img);
					}
				})
				event.img = saveImg;
				removeFile(deleteImg);
				
				if(new Date(req.body.date) == "Invalid Date"){
					res.status(400).send({location: "date"});
					return;
				}
				let eventType = [];
				results.forEach(result => {
					eventType.push(result._id);
				})
				let coordinates;
				if (req.body.lat != null && req.body.lng != null) {
					const lat = parseFloat(req.body.lat);
					const lng = parseFloat(req.body.lng);
					if (!isNaN(lat) && !isNaN(lng)) {
						coordinates = {
							lat: lat,
							lng: lng
						}
					}
				}
				function updateEvent(files) {
					event.title =  req.body.title;
					event.location =  req.body.location;
					event.date = new Date(req.body.date);
					event.description =  req.body.description;
					event.img = saveImg.concat(files);
					event.eventType = eventType,
					event.allowComments = req.body.allowComments == null ? false : true,
					event.coordinates = coordinates
					event.save().then((savedEvent, err) => {
						if(!err){
							savedEvent.creator = event.creator;
							res.send(backednEventToFrontendEvent(savedEvent))
						}
					})
				}
				if(req.files == null){
					updateEvent([]);
				} else {
					let eventPhotos = req.files.eventPhotos;
					if (eventPhotos[0] == null) {
						if (checkImageFile(eventPhotos) != 0) {
							res.status(422).send({
								invalid: [req.body.imgSrc.indexOf("new")]
							})
							return
						}
						saveFile(eventPhotos).then( filename => {
							updateEvent(filename);
						}).catch(err => {
							res.status(500).send();
						})
					} else {
						const invalid = []
						for (let i = 0 ; i < eventPhotos.length ; i++) {
							if (checkImageFile(eventPhotos[i]) != 0) {
								let index = 0;
								req.body.imgSrc.forEach((img, ind) => {
									if (img == "new"){
										if(index == i){
											invalid.push(ind)
											return
										}
										index++;
									}
								})
							}
						}
						if (invalid.length > 0) {
							res.status(422).send({
								invalid: invalid
							})
							return
						}
						let promises = [];
						eventPhotos.forEach(file => {
							promises.push(saveFile(file));
						});
						Promise.all(promises).then(files => {
							updateEvent(files);
						}).catch(err => {
							res.status(500).send(err);
						})
					}
				} 

			}).catch(err => {
				if (err == DB_NO_RESULT){
					//send erro to relode the page
					res.status(400).send();
				}
				else {
					res.status(500).send();
				}
			})
		}).catch(err => {
			res.status(500).send();
		})
	}).catch(err => {
		res.status(500).send();
	})
})

/*
Request body expects:
{
	"notification": <notif>
}
*/
app.patch('/events/sendNotif/:event_id', ajaxAuthenticate, (req, res) => {
	const id = req.params.event_id
	Event.findById(id).then(event => {
		if(!event) {
			return res.status(404).send()
		}
		else {
			findUser(req.session.username).then((user) => {
				if(event.creator.toString() == req.session.user_id || user.admin == true) {
					event.notification = req.body.notification
					event.save().then((e) => {
						res.send({});
						return
					}).catch(err => {
						res.status(500).send()
					})
				}
				else {
					res.status(401).send()
				}
			})
		}
	}).catch(err => {
		res.status(500).send()
	})
})

/**************************************************
 *                                                *
 *   User's Event Related Server Requests         *
 *                                                *
***************************************************/

app.get('/profile/events/upcomming/:id', (req, res) => {
	let userid = req.params.id;
	let date = new Date();
	date.setDate(date.getDate() - 1);
	date.setHours(0, 0, 0, 0);
	User.findById(userid, ["followedEvents", "notifications"], {sort: {date: 1}}).populate({
		path: "followedEvents",
		match: { date: {$gt: date}},
		populate: {path: "creator"}
	}).then(user => {
		let frontendEvents = [];
		user.followedEvents.forEach(event => {
			let eventObj = backednEventToFrontendEvent(event);
			if(event.notification) {
				eventObj.notification = event.notification
			}				
			frontendEvents.push(eventObj);
		})
		res.send(JSON.stringify(frontendEvents));
	}).catch(err => {
		res.status(500).send();
	})
})

app.get('/profile/events/past/:id', (req, res) => {
	let userid = req.params.id;
	let date = new Date();
	User.findById(userid, ["followedEvents", "notifications"], {sort: {date: -1}}).populate({
		path: "followedEvents",
		match: { date: {$lte: date}},
		populate: {path: "creator"}
	}).then(user => {
		let frontendEvents = [];
		user.followedEvents.forEach(event => {
			let eventObj = backednEventToFrontendEvent(event);
			if(event.notification) {
				eventObj.notification = event.notification
			}		
			frontendEvents.push(eventObj);
		})
		res.send(JSON.stringify(frontendEvents));
	}).catch(err => {
		res.status(500).send();
	})
})

app.get('/profile/events/myevents/:id', (req,res) => {
	const id = req.params.id;
	Event.find({creator: id}, null, {sort: {date: 1}}).populate({path: "creator", select: ["username"]}).populate({path: "eventType", select: ["type"]}).then(events => {
		let frontendEvents = []
		events.forEach(event => {
			let eventObj = backednEventToFrontendEvent(event);
			frontendEvents.push(eventObj);
		})
		res.send(JSON.stringify(frontendEvents));
	}).catch(err => {
		res.status(500).send()
	})
})

app.get('/profile/events/followedUsers/:id', (req,res) => {
	const id = req.params.id;
	User.findById(id, ["follows"]).then(user => {
		Event.find({creator: user.follows}, null, {sort: {_id: 1}}).populate({path: "creator", select: ["username"]}).then(events => {
			let frontendEvents = []
			events.forEach(event => {
				let eventObj = backednEventToFrontendEvent(event);
				frontendEvents.push(eventObj);
			})
			res.send(JSON.stringify(frontendEvents));
		}).catch(err => {
			res.status(500).send()
		})
	}).catch(err => {
		res.status(500).send()
	})
})

/**************************************************
 *                                                *
 *   User Related Server Requests                 *
 *                                                *
***************************************************/
// User when click on my Profile
app.get('/users/profile', (req, res) => {
	if(req.session.user_id) {
		res.redirect('/profile/' + req.session.user_id)
	}
	else {
		res.redirect('/')
	}
})

// Change user's password
app.patch('/users/changePassword', ajaxAuthenticate, (req, res) => {
	const password = req.body.oldpsw;
	const newPassword = req.body.psw;
	const repeat = req.body.confirmpsw;
	if(newPassword != repeat){
		res.status(400).send();
	}

	User.findByEmailPassword(req.session.username, password).then((user) => {
		// Add the user to the session cookie that we will
		// send to the client		
		if(user) {
			req.session.user_id = user._id
			req.session.username = user.username
			user.password = newPassword;
			user.save().then(user => {
				res.send();
			})
		}
		else {
			res.status(400).send();
		}
	}).catch((error) => {
		res.status(400).send();
	})
})/

// For getting user with the id displayed.
// request session should have id and username field.
app.get('/profile/:id', (req, res) => {
	const id = req.params.id;
	// Good practise is to validate the id
	if (!ObjectID.isValid(id)) {
		return res.status(404).send()
	}
	User.findById(id).populate({path: 'interests'}).then((usr) => {
		if(!usr) {
			res.redirect("/html/noRes.html");
		} else {
			// If not sme as session display the follow button and info.
			if (!req.session.user_id) {
				res.render('profile.hbs', {
					login: false
				})
				return;
			}
			else if(req.session.user_id != usr._id.toString()) {
				User.findById(req.session.user_id).then(sessionUser => {
					const check = sessionUser.follows.filter((user) => user.toString() == id);
					if(check.length == 1) {
						res.render('profile.hbs', {
							followBtn: "Followed",
							login: true
						})
					}
					else {
						res.render('profile.hbs', {
							followBtn: "Follow",
							login: true
						})
					}
					return
				})
			}
			else {
				if(usr.admin) {
					res.render('profile.hbs', {
						admin: "Admin",
						settingIcon: "icon",
						profile: "User",
						login: true
					})
				}
				else {
					res.render('profile.hbs', {
						settingIcon: "icon",
						profile: "User",
						login: true
					})
				}
				return
			}
		}
	}).catch((err) => {
		res.status(500).send(err)
	})
})

//For users data
app.get('/profile/data/:id', (req, res) => {
	const id = req.params.id
	if (!ObjectID.isValid(id)) {
		return res.status(404).send()
	}
	User.findById(id, ['username', 'description', 'interests', 'profilePic']).populate({path: 'interests'}).then((usr) => {
		if(!usr) {
			return res.status(404).send()
		}
		else {
			res.send(usr)
		}
	}).catch((err) => {
		return res.status(500).send()
	})

})	

// Get users data and categories
app.get('/profile/setting/:id', (req,res) => {
	const id = req.params.id
	if (!ObjectID.isValid(id)) {
		return res.status(404).send()
	}
	User.findById(id, ['username', 'description', 'interests', 'profilePic']).populate({path: 'interests'}).then((usr) => {
		if(!usr) {
			return res.status(404).send()
		}
		else {
			Category.find().then((cats) => {
				if(cats.length == 0) {
					res.status(404).send()
				}
				else {
					res.send({user: usr, cats: cats})
				}
			}).catch((err) => {
				res.status(500).send()
			})
		}
	}).catch((err) => {
		return res.status(500).send()
	})
})

// For updating user.
/*
Request body expects:
{
	"username": <username>
	"description": <description>
	"categories": <categories>
}
// IAN DO YOUR PROFILE IMAGE THING
*/
app.patch('/profile/update/:id', ajaxAuthenticate, (req, res) => {
	const id = req.session.user_id;
	// Good practise is to validate the id
    if (!ObjectID.isValid(id) || !ObjectID.isValid(req.params.id)) {
		return res.status(404).send()
	}
	User.findById(id).then((req_user) => {
		if(!req_user) {
			res.status(404).send();
			return;
		} 
		User.findById(req.params.id).populate("interests").then((usr) => {
			if(!usr) {
				res.status(404).send();
				return;
			}
			if (id != req.params.id && req_user.admin == false){
				req.status(401).send();
				return
			} 
			if (req.body.username != usr.username) {
				findUser(req.body.username).then( user => {
					res.status(409).send();
				}).catch(err => {
					if (err == DB_NO_RESULT){
						checkImg()
					} else {
						res.status(500).send();
					}
				})
			} else {
				checkImg()
			}
			function checkImg(){
				if (req.files) {
					let profilePhoto = req.files.profilePhoto;
					if (checkImageFile(profilePhoto) != 0) {
						res.status(422).send()
						return
					}
					saveFile(profilePhoto).then(filename => {
						saveUser(filename);
					}).catch( err => {
						res.status(500).send();
					})
				} else {
					saveUser();
				}
				
			}
			function saveUser(filename){
				usr.username = req.body.username
	
				usr.description = req.body.description
				if(filename) {
					removeFile([usr.profilePic]);
					usr.profilePic = filename;
				}
				if(!req.body.categories){
					usr.interests = [];
					usr.save().then((user) => {
						if(req_user._id == usr._id){
							req.session.user_id = user._id
							req.session.username = user.username
						}
						res.send({
							username: user.username,
							description: user.description,
							interests: user.interests,
							profilePic: user.profilePic
						})
					}, (error) => {
						res.status(400).send(error) // 400 for bad request
					})
					return;
				}
				// Get the categories
				findCategories(req.body.categories).then((results) => {
					let categories = [];
					for(let i = 0; i< results.length; i++) {
						categories.push(results[i]._id);
					}
					usr.interests = categories;
					usr.save().then((user) => {
						if(req_user._id == usr._id){
							req.session.user_id = user._id
							req.session.username = user.username
						}
						res.send({
							username: user.username,
							description: user.description,
							interests: results,
							profilePic: user.profilePic
						})
					}, (error) => {
						res.status(400).send(error) // 400 for bad request
					})
				}).catch((err) => {
					if(err == DB_ERR) {
						res.status(500).send()
					}
					else {
						res.status(400).send()
					}
				})
			}
		})
	}).catch((err) => {
		res.status(500).send(err)
	}) 
})


/**************************************************
 *                                                *
 *   Admin Related Server Requests                *
 *                                                *
***************************************************/
app.get('/admin', authenticateAdminNonAjax, (req, res) => {
	res.redirect('/admin/' + req.session.user_id)
})

// Load the admin profile.
app.get('/admin/:id', authenticateAdminNonAjax, (req, res) => {
	const id = req.params.id;
	if (!ObjectID.isValid(id)) {
		return res.status(404).send()
	}
	User.find({ username: { $ne: "Deleted User" } }, ["username", "description", "interests", "profilePic"]).sort('username').exec().then((users) => {
		if(!users) {
			return res.status(500).send()
		}

		Event.find({title: {$ne: "Deleted Event"}}, ['img', 'eventType', 'title', 'creator', 'location', 'date', 'description', '_id', 'allowComments'])
			 .populate('eventType').populate('creator', 'username').sort("title").exec().then(events => {

			if(!events){
				return res.status(500).send();
			}
			let current_user;
			let usersDOM = "";
			users.forEach((user) => {

				if(user._id.toString() == req.session.user_id)
					current_user = user;
				usersDOM += `<div class="user" id="${user._id}" onclick="selectUser(this, event)"><span class="name">${user.username}</span><img class="delete" src="/pictures/webPic/delete.png"></div>`
			})

			let eventsDOM = "";
			events.forEach((event) => {
				eventsDOM += `<div class="event" id="${event._id}" onclick="selectEvent(this, event)"><span class="title">${event.title}</span><span class="location">${event.location}</span><span class="date">${event.date}</span><div class="toolDiv"><img class="delete" src="/pictures/webPic/delete.png"><img class="msg" src="/pictures/webPic/msg.png"><img class="viewEvent" src="/pictures/webPic/view-icon.png"></div></div>`
			})
			if (current_user){
				Category.find({_id: current_user.interests}).then(interests => {
					if(!interests)
						res.status(500).send()
					let str = "";
					interests.forEach(interest => {
						str += `#${interest.type} `;
					})
					res.render('adminProfile.hbs', {
						users: usersDOM,
						events: eventsDOM,
						profilePic: current_user.profilePic,
						username: current_user.username,
						description: current_user.description,
						interests: str
					})						
				})
			} else {
				res.status(500).send();
			}
		})
		
	}).catch((err) => {
		return res.status(500).send()
	})
	
})


/**************************************************
 *                                                *
 *   Follow Users/Event Related Server Requests   *
 *                                                *
***************************************************/



// For updating user.
/*
Request body expects:
{
	"id": <id>
}
*/
app.patch('/users/follows/user', ajaxAuthenticate, (req, res) => {
	const follow_id = req.body.id
	const curr_user_id = req.session.user_id
	if (!ObjectID.isValid(curr_user_id)) {
		res.status(404).send()
		return
	}
	if (!ObjectID.isValid(follow_id)) {
		res.status(404).send()
		return 
	}
	User.findById(follow_id).then((follow) => {
		if(!follow) {
			res.status(404).send()
			return 
		} else {
			User.findById(curr_user_id).then(follower => {
				if(!follower) {
					res.status(404).send()
					return
				}
				const check2 = follower.follows.filter((usr) => usr.equals(follow._id));
				if(check2.length == 1) {
					res.send({});
				}
				follower.follows.push(follow)
				follower.save().then(usr2 => {
					res.send({});
					return 
				}).catch(err => {
					res.status(500).send()
				})
			}).catch(err => {
				res.status(500).send()
			})
		}
	}).catch(err => {
		res.status(500).send()
	})
})

// For updating user.
/*
Request body expects:
{
	"id": <id>
}
*/
app.patch('/users/unfollows/user', ajaxAuthenticate, (req, res) => {
	const follow_id = req.body.id
	const curr_user_id = req.session.user_id
	if (!ObjectID.isValid(curr_user_id)) {
		res.status(404).send()
		return
	}
	if (!ObjectID.isValid(follow_id)) {
		res.status(404).send()
		return 
	}
	User.findById(follow_id).then((follow) => {
		if(!follow) {
			res.status(404).send()
			return 
		}
		User.findById(curr_user_id).then(follower => {
			if(!follower) {
				res.status(404).send()
				return
			}
			const arr2 = follower.follows.filter((user) => (user.toString() != follow._id.toString()))
			follower.follows = arr2

			follower.save().then(usr2 => {
				res.send({});
				return 
			}).catch(err => {
				res.status(500).send()
			})
		
		}).catch(err => {
			res.status(500).send()
		})

	}).catch(err => {
		res.status(500).send()
	})
})
// For updating user.
/*
Request body expects:
{
	"event_id": <event_id>
}
*/
app.patch('/users/follows/event', ajaxAuthenticate, (req, res) => {
	const user_id = req.session.user_id;
	if (!ObjectID.isValid(user_id)) {
		return res.status(404).send()
	}
	if (!ObjectID.isValid(req.body.event_id)) {
		return res.status(404).send()
	}
	Event.findById(req.body.event_id).then((event) => {
		if(!event) {
			res.status(404).send({
				errMsg: "Event not found..",
				link: "/"
			})
		}
		else {
			User.findById(user_id).then((user) => {

				if(!user) {
					res.status(404).send()
				}
				const check = user.followedEvents.filter((event) => event._id.equals(req.body.event_id));
				if (check.length == 1) {
					res.send({user: user._id, event: event._id});
					return;
				}
				else {
					// Add the event id to the user.
					user.followedEvents.push(event._id)
					// Add the user to the event.
					event.followers.push(user._id)
					// Increment the event numFollows
					event.numFollows++;
					user.save().then((obj) => {
						event.save().then((event_obj) => {
							res.send({"user":obj._id, "event": event_obj._id})
						}, (err) => {
							res.status(400).send(err) // 400 for bad request
						})
					}, (error) => {
						res.status(400).send(error) // 400 for bad request
					})
				}
			}).catch((err) => {
				res.status(500).send(err)
			})
		}
	}).catch((err) => {
		res.status(500).send(err)
	})
})

/*
Request body expects:
{
	"event_id": <event_id>
}
*/
app.patch('/users/unfollows/event', ajaxAuthenticate, (req, res) => {
	if (!ObjectID.isValid(req.session.user_id)) {
		return res.status(404).send()
	}
	if (!ObjectID.isValid(req.body.event_id)) {
		return res.status(404).send()
	}
	Event.findById(req.body.event_id).then((event) => {
		if(!event) {
			res.status(404).send({
				errMsg: "Event not found..",
				link: "/"
			})
			return;
		}
		User.findById(req.session.user_id).then((user) => {
			if (!user) {
				res.status(404).send({
					errMsg: "User not found.."
				});
				return;
			}
			let c = 0;
			for (let i = 0 ; i < user.followedEvents.length; i++) {
				if (user.followedEvents[i].equals(req.body.event_id)) {
					user.followedEvents.splice(i, 1);
					c++;
					break;
				}
			}
			for (let i = 0 ; i < event.followers.length ; i++) {
				if (event.followers[i].equals(req.session.user_id)) {
					event.followers.splice(i, 1);
					event.numFollows--;
					c++;
					break;
				}
			}
			if (c == 0) {
				res.status(404).send({
					errMsg: "Not currently followed.."
				});
				return;
			}	
			user.save((usr) => {
				event.save((evt) => {
					res.send({
						user: user._id,
						event: event._id
					});
				}, (err) => {
					res.status(500).send();
				})
			}, (err) => {
				res.status(500).send();
			})
		}).catch((err) => {
			res.status(500).send();
		})
	}).catch((err) => {
		res.status(500).send();
	});
});

/**************************************************
 *                                                *
 *   Get Category Server Requests                 *
 *                                                *
***************************************************/

// Every cats
app.get('/categories', (req, res) => {
	Category.find().then((cats) => {
		if(cats.length == 0) {
			res.status(404).send()
		}
		else {
			res.send(cats)
		}
	}).catch((err) => {
		res.status(500).send()
	})
})


/**************************************************
 *                                                *
 *   Delete User and Events Server Requests       *
 *                                                *
***************************************************/

app.delete('/users/:id', authenticateAdmin, (req, res) => {
	const id = req.params.id
	if (!ObjectID.isValid(id)){
		res.status(404).send();
		return;
	}
	User.findById(id).exec().then(user => {
		if(!user){
			res.status(404).send();
			return
		}
		if(user.admin){
			res.status(422).send();
			return;
		}
		user.remove();
		Event.find({creator: user._id}, "_id").then(events => {
			let promises = [];
			events.forEach(event => {
				promises.push(deleteEvent(event._id));
			})
			Promise.all(promises).then(function (){
				res.send({});
			}).catch(function(err){
				res.status(500).send();
			})
		})
	}).catch(err => {
		res.status(500).send();
	})
})
function deleteEvent(id) {
	return new Promise((resolve, reject) => {
		Event.findByIdAndDelete(id).populate("followers").exec().then(event => {
			if (!event) {
				reject(DB_NO_RESULT)
			}
			let promises = [];
			event.followers.forEach(user => {
				if(user != null){
					let arr = user.followedEvents.filter(eId => eId.toString() != event._id.toString())
					user.followedEvents = arr;
					promises.push(user.save());
				}
			})
			Promise.all(promises).then(users => {
				resolve();
			}).catch(err => {
				reject(DB_ERR)
			});
		}).catch(err => {
			reject(DB_ERR)
		})
	})
}

app.delete('/events/:id', authenticateAdmin, (req, res) => {
	const id = req.params.id
	if (!ObjectID.isValid(id)){
		res.status(404).send();
		return;
	}
	deleteEvent(id).then(function (){
		res.send({});
	}).catch(function (err){
		if (err == DB_NO_RESULT) {
			res.status(404).send();
		} else {
			res.status(500).send();
		}
	})
})


/**************************************************
 *                                                *
 *   Viewing Event Related Server Requests        *
 *                                                *
***************************************************/

// for comment part
const deletedMsg = "This comment has being deleted.."
/* 
response expects:
{
	"isJoined": <true or false>
	"isOwner": <true or false>
	"numJoined": <only when isOwner is true>
}
*/
app.get('/isJoined/:eventId', (req, res) => {
	if (!req.session.user_id) {
		res.send({
			isJoined: false,
			isOwner: false
		});
	}
	else {
		if (!ObjectID.isValid(req.params.eventId)) {
			res.status(400).send();
        	return;
		}
		Event.findById(req.params.eventId).then((event) => {
			if (!event) {
				res.status(404).send({
					errMsg: "Event not found..",
					link: "/"
				});
				return;
			}
			if (event.creator.equals(req.session.user_id)) {
				res.send({
					isJoined: false,
					isOwner: true,
					numJoined: event.numFollows
				});
				return;
			}
			for (let i = 0 ; i < event.followers.length ; i++) {
				if (event.followers[i].equals(req.session.user_id)) {
					res.send({
						isJoined: true,
						isOwner: false
					});
					return;
				}
			}
			res.send({
				isJoined: false,
				isOwner: false
			});
		}).catch((err) => {
			res.status(500).send();
		});
	}
});

// helper to parse the comment before sending
function parseComments(comments) {
	comments.forEach((comment) => {
		if(comment.isDeleted) {
			comment.deletedText = "";
		}
		if (comment.user == null) {
			comment.user = {
				username: "Deleted User",
				profilePic: "/pictures/profilePic/noUser.png"
			}
		}
		comment.reply.forEach((reply) => {
			if (reply.isDeleted) {
				reply.deletedText = "";
			}
			if (reply.user == null) {
				reply.user = {
					username: "Deleted User",
					profilePic: "/pictures/profilePic/noUser.png"
				}
			}
		})
	})
}

/* 
response expects:
{
    "comments": <comments>
    "isEnd": <0 or 1>
}
*/
app.get('/comment/:eventId/:quantity/:date', (req, res) => {
    if (!ObjectID.isValid(req.params.eventId)) {
        res.status(400).send({
			errMsg: "Bad id.."
		});
        return;
    }
    const quantity = parseInt(req.params.quantity);
    if (isNaN(quantity) || quantity <= 0) {
        res.status(400).send();
        return;
    }
    Event.findById(req.params.eventId).populate({ path: 'comments.user', select: ['profilePic', 'username']}).populate({path: 'comments.reply.user' , select: 'username'}).then((event) => {
        if (!event) {
            res.status(404).send({
				errMsg: "Event not found..",
				link: '/'
			});
            return;
        }
        let startIndex = 0;
		const date = new Date(req.params.date);
        if (date != null) {
			for (let i = 0 ; i < event.comments.length ; i++) {
				let dbDate = new Date(event.comments[i].date);
				if (dbDate < date) {
					break;
				}
				else{
					startIndex += 1;
				}
			}
			if (startIndex == event.comments.length) {
				res.send({
					comments: [],
					isEnd: 1
				})
			}
        }
        let end = 0;
        const endIndex = startIndex + quantity;
        if (endIndex >= event.comments.length) {
            end = 1;
		}
		const commentsToSend = event.comments.slice(startIndex, endIndex);
		parseComments(commentsToSend);
        res.send({
            comments: commentsToSend,
            isEnd: end
        });
    }).catch((error) => {
        res.status(500).send();
    })
});

/* 
response expects:
{
    "comments": <new comments sent after the comment id comment>
}
*/
app.get('/newComment/:eventId/:date', (req, res) => {
    if (!ObjectID.isValid(req.params.eventId)) {
        res.status(400).send();
        return;
	}
    Event.findById(req.params.eventId).populate({ path: 'comments.user', select: ['profilePic', 'username']}).populate({path: 'comments.reply.user' , select: 'username'}).then((event) => {
        if (!event) {
            res.status(404).send({
				errMsg: "Event not found..",
				link: '/'
			});
            return;
		}
		const date = new Date(req.params.date);
		if (date == null) {
			res.send({
				comments: []
			});
		}
		else {
			let endIndex = 0;
			for (let i = 0 ; i < event.comments.length ; i++) {
				let dbDate = new Date(event.comments[i].date);
				if (dbDate <= date) {
					break;
				}
				else {
					endIndex += 1;
				}
			}
			const commentsToSend = event.comments.slice(0, endIndex);
			parseComments(commentsToSend);
			res.send({
				comments: commentsToSend
			});
		}
    }).catch((error) => {
        res.status(500).send();
    })
});

/* 
Request body expects:
{
	"eventId": <id>
    "text": <comment>
}
*/
app.post('/comment', ajaxAuthenticate, (req, res) => {
    if (req.body.text == null || req.body.text.trim() === "") {
        res.status(422).send({
			errMsg: "Empty comment not accepted.."
		});
    }
    if (!ObjectID.isValid(req.body.eventId)) {
        res.status(404).send({
			errMsg: 'Invalid event id..'
		});
    }
    const eventId = req.body.eventId;
    Event.findById(eventId).then((event) => {
        if (!event) {
            res.status(404).send({
				errMsg: "Event not found..",
				link: "/"
			});
        }
        else if (event.allowComments == false) {
            res.status(403).send({
				errMsg: "Comments are not allowed for this event.."
			});
        }
        else {
            User.findById(req.session.user_id).then((user) => {
                if (!user) {
					res.status(401).send({
						errMsg: "User not found.."
					})
                    return;
				}
                // create new comment and put it to event
                const comment = new Comment({
					user: new ObjectID(user._id), 
					// get rid of trailing white space
                    message: req.body.text.replace(/\s+$/g, ""), 
                    date: new Date(),
					reply: [], 
					isDeleted: false
				});
                Event.findByIdAndUpdate(eventId, { $push: { comments: { $each: [comment], $position: 0 } } }, {new: true}).then((event) => {
                    if (!event.comments.id(comment._id)) {
                        res.status(500).send({
							errMsg: ""
						});
                        return;
					}
                    res.send({
						_id: comment._id, 
						user: {
							_id: user._id,
							username: user.username,
							profilePic: user.profilePic
						},
						message: comment.message, 
						date: comment.date
					});
                }).catch((error) => {
                    res.status(500).send({
						errMsg: "Server error..",
					});
                })
            }).catch((error) => {
                res.status(500).send({
					errMsg: "Server error..",
				});
            })
        }
    }).catch((error) => {
        res.status(500).send({
			errMsg: "Server error..",
		});
    })
});

/* 
Request body expects:
{
    "eventId": <id>
    "commentId": <id>
    "text": <comment>
}
*/
app.post('/reply', ajaxAuthenticate, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(400).send({
			errMsg: ""
		});
    }
    else if (req.body.text == null || req.body.text.trim() === "") {
        res.status(422).send({
			errMsg: ""
		});
    }
    else {
        User.findById(req.session.user_id).then((user) => {
            if (!user) {
                res.status(401).send({
					errMsg: "User not found.."
				});
                return;
            }
            const comment = new Comment({
				_id: new ObjectID(),
                user: new ObjectID(user._id), 
                message: req.body.text, 
				date: new Date(), 
				isDeleted: false
            });
            Event.findOne({_id : req.body.eventId}).then((event) => {
                if (!event) {
                    res.status(404).send({
						errMsg: "Event not found..",
						link: "/"
					});
                    return;
				}
				const theComment = event.comments.id(req.body.commentId);
                if (!theComment) {
                    res.status(404).send({
						errMsg: "Comment not found.."
					});
                    return;
                }
				if (!event.allowComments) {
					res.status(403).send({
						errMsg: "Reply not allowed.."
					})
					return;
				}
				theComment.reply.unshift(comment);
                event.save((event) => {
					res.send({
						_id: comment._id, 
						user: {
							_id: user._id,
							username: user.username,
						},
						message: comment.message, 
						date: comment.date
					});
				}, (err) => {
					res.status(500).send({
						errMsg: ""
					});
				})
            }).catch((error) => {
                res.status(500).send({
					errMsg: ""
				});
            })
        }).catch((error) => {
            res.status(500).send({
				errMsg: ""
			});
        })
    }
})

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
}
*/
app.delete('/comment/remove', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(400).send({
			errMsg: "Bad id.."
		});
    }
    else {
        Event.findByIdAndUpdate(req.body.eventId, {$pull : {comments : {_id : req.body.commentId}}}).then((event) => {
            if (!event) {
                res.status(404).send({
					errMsg: "Event not found.."
				});
                return;
			}
			const comment = event.comments.id(req.body.commentId);
            if (!comment) {
                res.status(404).send({
					errMsg: "Comment not found.."
				});
                return;
            }
            res.send({
				_id: comment._id, 
				user: {
					_id: comment.user._id,
					username: comment.user.username,
					profilePic: comment.user.profilePic
				},
				message: comment.message, 
				date: comment.date
			});
        }).catch((error) => {
            res.status(500).send({
				errMsg: "Server error.."
			});
        })
    }
})

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
    "replyId": <id>
}
*/
app.delete('/reply/remove', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId) || !ObjectID.isValid(req.body.replyId)) {
        res.status(404).send();
    }
    else {
        Event.findOne({_id : req.body.eventId, "comments._id" : req.body.commentId}).then((event) => {
            if (!event) {
                res.status(404).send();
                return;
            }
            const comment = event.comments.id(req.body.commentId);
            const reply = comment.reply.filter((reply) => reply._id.equals(req.body.replyId));
            if (reply.length != 1) {
                res.status(404).send();
                return;
            }
            comment.reply.splice(comment.reply.indexOf(reply[0]), 1);
            event.save().then((event) => {
                res.send({
						_id: reply[0]._id, 
						user: {
							_id: reply[0].user._id,
							username: reply[0].user.username,
							profilePic: reply[0].user.profilePic
						},
						message: reply[0].message, 
						date: reply[0].date
					});
            }).catch((error) => {
                res.status(500).send();
            })
        }).catch((error) => {
            res.status(500).send();
        })
    }
});

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
}
*/
app.patch('/comment/delete', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(404).send();
    }
    else {
        Event.findOne({_id: req.body.eventId, "comments._id" : req.body.commentId, "comments.isDeleted" : false}).then((event) => {
            if (!event) {
                res.status(404).send({
					errMsg: "Comment not found or comment deleted.."
				});
                return;
            }
            const comment = event.comments.id(req.body.commentId);
			comment.isDeleted = true;
			comment.deletedText = comment.message;
			comment.message = deletedMsg;
            event.save().then((event) => {
				res.send({
					newText: deletedMsg
				})
			}, (err) => {
				res.status(500).send();
			});
        }).catch((error) => {
            res.status(500).send();
        })
    }
});

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
    "replyId": <id>
}
*/
app.patch('/reply/delete', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId) || !ObjectID.isValid(req.body.replyId)) {
        res.status(404).send();
    }
    else {
        Event.findOne({_id : req.body.eventId}).then((event) => {
            if (!event) {
                res.status(404).send();
                return;
            }
			const comment = event.comments.id(req.body.commentId);
			if (!comment) {
				res.status(404).send();
			}
			let replyIndex = -1;
			for (let i = 0 ; i < comment.reply.length ; i++) {
				if (comment.reply[i]._id.equals(req.body.replyId)) {
					replyIndex = i;
				}
			}
            if (replyIndex == -1) {
                res.status(404).send();
                return;
			}
			if (comment.reply[replyIndex].isDeleted == true) {
				res.status(400).send();
				return;
			}
			comment.reply[replyIndex].isDeleted = true;
			comment.reply[replyIndex].deletedText = comment.reply[replyIndex].message;
			comment.reply[replyIndex].message = deletedMsg;
            event.save().then((event) => {
                res.send({
					newText: deletedMsg
				});
            }).catch((error) => {
                res.status(500).send();
            });
        }).catch((error) => {
            res.status(500).send();
        })
    }
});

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
}
*/
app.patch('/comment/recover', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId)) {
        res.status(404).send();
    }
    else {
        Event.findOne({_id: req.body.eventId, "comments._id" : req.body.commentId, "comments.isDeleted" : true}).then((event) => {
            if (!event) {
                res.status(404).send({
					errMsg: "Comment not found or comment recovered.."
				});
                return;
            }
			const comment = event.comments.id(req.body.commentId);
			if (comment.isDeleted == false) {
				res.status(400).send({
					errMsg: "Cannot recover normal comment.."
				})
			}
			comment.isDeleted = false;
			comment.message = comment.deletedText;
			comment.deletedText = "";
            event.save().then((event) => {
				res.send({
					newText: comment.message
				})
			}, (err) => {
				res.status(500).send();
			});
        }).catch((error) => {
            res.status(500).send();
        })
    }
});

/* 
Request body expects:
{
	"eventId": <id>
    "commentId": <id>
    "replyId": <id>
}
*/
app.patch('/reply/recover', authenticateAdmin, (req, res) => {
    if (!ObjectID.isValid(req.body.eventId) || !ObjectID.isValid(req.body.commentId) || !ObjectID.isValid(req.body.replyId)) {
        res.status(404).send();
    }
    else {
        Event.findOne({_id : req.body.eventId}).then((event) => {
            if (!event) {
                res.status(404).send();
                return;
            }
			const comment = event.comments.id(req.body.commentId);
			if (!comment) {
				res.status(404).send();
			}
			let replyIndex = -1;
			for (let i = 0 ; i < comment.reply.length ; i++) {
				if (comment.reply[i]._id.equals(req.body.replyId)) {
					replyIndex = i;
				}
			}
            if (replyIndex == -1) {
                res.status(404).send();
                return;
			}
			if (comment.reply[replyIndex].isDeleted == false) {
				res.status(400).send({
					errMsg: "Reply is not deleted.."
				});
				return;
			}
			comment.reply[replyIndex].isDeleted = false;
			comment.reply[replyIndex].message = comment.reply[replyIndex].deletedText;
			comment.reply[replyIndex].deletedText = "";
            event.save().then((event) => {
                res.send({
					newText: comment.reply[replyIndex].message
				});
            }).catch((error) => {
                res.status(500).send();
            });
        }).catch((error) => {
            res.status(500).send();
        })
    }
});


app.listen(port, () => {
	log(`Listening on port ${port}...`)
});
