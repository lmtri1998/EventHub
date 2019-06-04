/*
* This file contains all classes needed for our website.
*/

let numOfEvents = 0; // total number of events

// Event
class Event {
	constructor(title, location , date, description, img, type, username){
	this.username = username;
	this.title = title;
	this.location = location; // ""
	this.date = date; // Js Date() type
	this.description = description;
	this.img = img;
	this.type = type;
    this.comment = [];
    this.commentLoaded = 0;
	
	// Temporary id
	this.id = numOfEvents;
	numOfEvents++;
	}
  
	addComment(comment) {
        this.comment.push(comment);
    }

	sortComment(sortFunc) {
		this.comment.sort(sortFunc);
	}
}

// Comment
class Comment {
    constructor(id, username, txt, date) {
        this.id = id;
        this.date = date; // Js Date() type
        this.username = username;
        this.txt = txt;
        this.reply = []; // next reply Comment
        this.replyLoaded = 0;
    }

    addReply(comment) {
        this.reply.push(comment);
    }

    sortReply(sortFunc) {
        this.reply.sort(sortFunc);
    }
}

// User
class User {
    constructor(usrName, pic, description, bday, interests){
        this.usrName = usrName;
        this.pic = pic;
        this.description = description;
        this.bday = bday;
        this.location = location;
        this.interests = interests;
        this.notifications = null;
    }
}