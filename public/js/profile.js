/*
* This file contains code to for our profile webpage
*/

/*----------------------------------------------------------------------*/
/*-- Global variables below --*/
/*----------------------------------------------------------------------*/

// COLORS!!
const darkGreen = "rgb(43, 122, 120)";
const lightGreen = "rgb(58, 175, 169)";

// DEFAULT ARRAYSS!!
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// PICTURE LOCATIONS!!!
const logoSrc = "/pictures/webPic/logo.png";
const settingIconSrc = "/pictures/webPic/settings.png";
const messgaeSrc = "/pictures/webPic/msg.png";
const eventEditSrc = "/pictures/webPic/eventEdit.png";

// GLOBAL VARIABLS (for page info below)
let currentSelectedEvent = null;

// event lists
const comingEvents = [];
const pastEvents = [];
const myEvents = [];
const followedUserEvents = [];


/*----------------------------------------------------------------------*/
/*-- Server call functions here --*/
/*----------------------------------------------------------------------*/

// get user info from the server
function getUserInfo() {
	const urlStr = window.location.href
	const urlArr = urlStr.split('/')
	const id = urlArr[urlArr.length - 1]
  
	const url = '/profile/data/' + id
	console.log("hello")
	$.ajax({
		method:'GET',
		url: url,
		dataType: 'json',
		success: function(usr) {
			updateProfileArea(usr)
		},
		error: function(err) {
			//Fix This!!!
			console.log("LOAD EVENT ERR!!");
		}
	});
}

function sendMsg(){
	const msg = document.querySelector(".msgContent").value
	console.log(msg)
	const url = '/events/sendNotif/' + currentSelectedEvent.id
	console.log(url)
	$.ajax({
		method:'PATCH',
		data: {notification: msg},
		url: url,
		dataType: 'json',
		success: function(data) {
			console.log(data)
		},
		statusCode: {
			500: function (){
				alert("Internal Server Error\n");
			},
			404: function () {
				alert("Event does not exists. Reload page");
				window.location.reload()
			}, 
			401: function() {
				alert("No permission! U sucks hahahahaha!");
			}
		}
	});
}

// does the server saving when user is modifying 
function saveUser(){
    return new Promise((resolve, reject) => {
		const interestList = document.querySelector("#interestList").childNodes;
		const hiddenList = document.querySelector(".interestsHidden").childNodes;
		interestList.forEach((cat, index) => {
			hiddenList[index].selected = cat.style.backgroundColor == darkGreen;
		})
		const urlStr = window.location.href
		const urlArr = urlStr.split('/')
		const id = urlArr[urlArr.length - 1]
        let url = `/profile/update/${id}`
		document.querySelector(".hiddenDescription").value = document.querySelector("#userDescriptionInput").value 
		$("#profileForm").ajaxSubmit({
			url: url, 
			type: 'patch', 
			enctype: 'multipart/form-data',
			processData: false,  // Important!
			success: function (user) {
				resolve(user);
			},
			error: function (err) {
				console.log(err);
				reject(err);
            },
            statusCode: {
                401: function() {
					openLogInPopup("Session Expired! Please sign in!").then (_ => {
						window.location.reload(true); 
					})
				},
				500: function() {
					alert("Internal Server Error\n")
                },
                404: function() {
                    alert("Something went wrong reload the page\n");
                    window.location.reload(true); 
                },
                409: function() {
                    alert("User name exists\n");
                },
                422: function() {
                    alert("Invalid Profile Picture\n");
                }
            }
		});	
	});
}

/*----------------------------------------------------------------------*/
/*-- DOM manipulations below. Some functions may involve server calls---*/
/*----------------------------------------------------------------------*/

/*--------------- Bunch of selectors -----------------------*/

// for use in make new event
const make = document.querySelector(".make");

// DOM OBJECTS!!
const eventSection = document.querySelector("#eventSection");
const profileArea = document.querySelector("#profileArea");
const settingIcon = document.querySelector("#settingIcon");
const msgBox = document.querySelector("#msgBox");
const notBox = document.querySelector("#notBox");
const followBtn = document.querySelector("#followButton");
const upComing = document.querySelector("#upComing");
const past = document.querySelector("#pastEvents");
const userEvents = document.querySelector("#myEvents");
const friendEvents = document.querySelector("#followUserEvents");

/*--------------- Bunch of add-listener calls -----------------------*/

// EVENT LISTENERS!!!
if(settingIcon != null) {
	settingIcon.addEventListener("click", settingClicked);
}
msgBox.addEventListener("click", msgBoxClicked);
notBox.addEventListener("click", notBoxClicked);
if(upComing) {
	upComing.addEventListener("click", loadUpComing);
}
if(past) {
	past.addEventListener("click", loadPastEvents);
}
userEvents.addEventListener("click", loadMyEvents);
if(friendEvents) {
	friendEvents.addEventListener("click", loadFollowedUserEvents);
}
if(followBtn) {
	followBtn.addEventListener("click", followClicked);
}
// Below for make new event
// or edit?????????????????????
make.addEventListener('click', makeNewEvent);

/*----------------------------------------------------------------------*/
/*------------------------- DOM functions ------------------------------*/
/*----------------------------------------------------------------------*/

/*-----------------For page view below------------*/

function addEvent(event) {
    const img = createNewElement("img", "eventImg");
	img.src = event.img[0];
	    
    const darkSheet = createNewElement("div", "darkSheet");

    const title = createNewElement("h1", null, null, event.title);
    
    const location = createNewElement("h3", null, null, event.location);

    const time = createNewElement("h3", null, null, getEventDate(event.date));
    
    const eventInfo = createNewElement("div", "eventInfo");
    eventInfo.append(title, location, time);

    const infoContainer = createNewElement("div", "infoContainer");
    infoContainer.append(img, darkSheet, eventInfo);

    const logo = document.createElement("img");
    logo.src = logoSrc;

    const eventHub = createNewElement("h1", null, null, "Event Hub");

    const eventLogo = createNewElement("div", "eventLogo");
    eventLogo.append(logo, eventHub);
    
    const side = createNewElement("div", "side");
    side.appendChild(eventLogo);

    const eventDiv = createNewElement("div", "event", event.id)
    eventDiv.append(infoContainer, side);
    eventDiv.addEventListener("click", function (e) {
        currentSelectedEvent = event;
        eventClicked(e);
    })
    eventSection.appendChild(eventDiv);
}

function addUserEvent(event) {
    const img = createNewElement("img", "eventImg");
    img.src = event.img[0];
    
    const darkSheet = createNewElement("div", "darkSheet");

    const title = createNewElement("h1", null, null, event.title);
    
    const location = createNewElement("h3", null, null, event.location);

    const time = createNewElement("h3", null, null, getEventDate(event.date));
    
    const eventInfo = createNewElement("div", "eventInfo");
    eventInfo.append(title, location, time);

    const infoContainer = createNewElement("div", "infoContainer");
    infoContainer.append(img, darkSheet, eventInfo);

    const logo = document.createElement("img");
    logo.src = logoSrc;

    const eventHub = createNewElement("h1", null, null, "Event Hub");

    const eventLogo = createNewElement("div", "eventLogo");
    eventLogo.append(logo, eventHub);
    const side = createNewElement("div", "side");
    side.appendChild(eventLogo);

    const msg = createNewElement("img", "message");
    msg.src = messgaeSrc;
    msg.addEventListener("click", msgClicked)

    const edit = createNewElement('img', "evEdit");
    edit.src = eventEditSrc;

    const eventDiv = createNewElement("div", "event", event.id)
    eventDiv.append(infoContainer, side, msg, edit);
    eventDiv.addEventListener("click", function (e) {
        currentSelectedEvent = event;
        userEventClicked(e);
    })
    eventSection.appendChild(eventDiv);
}

function addEventNotification(event){
	console.log(event)
    let eventDom = document.getElementById(event.id);
    if (eventDom != null && eventDom.querySelector(".notificationIcon") == null){
        let noti = createNewElement("div", "notificationIcon");
        noti.appendChild(createNewElement("span", null, null, "!"));
        eventDom.appendChild(noti);
    }
}
function updateProfileArea(usr) {
	
	if(settingIcon != null) {
		settingIcon.src = settingIconSrc
	}
	profileArea.querySelector(".profilePic").src = usr.profilePic
	profileArea.querySelector(".username").innerText = usr.username
	profileArea.querySelector(".description").innerText = usr.description
	profileArea.querySelector(".username").innerText = usr.username
	let interestString = ""
	usr.interests.forEach(function (obj) {
		interestString += `#${obj.type} `;
	})
	profileArea.querySelector(".interests").innerText = interestString

}

/** Bunch of helper functions for page view dom functions */
// Help get the date format from Date()
function getEventDate(date) {
	return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ` + date.getHours() + ":" 
           + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
}
function openMsgBox() {
    msgBox.style.display = "inline-block";
}

function hideMsgBox() {
    msgBox.style.display = "none";
    msgBox.querySelector(".msgContent").value = "";
}

function openNotificationBox(msg) {
    let notBox = document.querySelector("#notBox");
	let msgSection = document.querySelector(".notificationSection")
    notBox.style.display = "inline-block";
	msgSection.innerText = msg
}

function hideNotificationBox() {
    notBox.style.display = "none";
}
function clearEvents() {
    while(eventSection.firstChild){
        eventSection.removeChild(eventSection.firstChild);
    }
}

function loadUpComing(){
    clearEvents()
    comingEvents.length = 0;
    const urlStr = window.location.href
    const urlArr = urlStr.split('/')
    const id = urlArr[urlArr.length - 1]

    const url = '/profile/events/upcomming/' + id
    $.ajax({
        method:'GET',
        url: url,
        dataType: 'json',
        success: function(new_events) {
            new_events.forEach(event => {
                event.date = new Date(event.date)
                comingEvents.push(event)
            })
			if(comingEvents.length == 0) {
				const noReult = createNewElement("img", null, "noReult", null)
                noReult.src = "/pictures/webPic/nores.png";
                noReult.style = "width: auto;";
                noReult.style.height = "90%";
				eventSection.appendChild(noReult)
			}
			else {
				for (let i = 0; i < comingEvents.length; i++){
					addEvent(comingEvents[i]);
					if(comingEvents[i].notification != "") {
						addEventNotification(comingEvents[i])
					}
				}
			}
        },
        statusCode: {
            500: function (){
                alert("Internal Server Error\n");
            }
        }
    });
}

function loadPastEvents(){
    clearEvents()
    pastEvents.length = 0
    const urlStr = window.location.href
    const urlArr = urlStr.split('/')
    const id = urlArr[urlArr.length - 1]

    const url = '/profile/events/past/' + id
    $.ajax({
        method:'GET',
        url: url,
        dataType: 'json',
        success: function(new_events) {
            for(let i = 0; i < new_events.length; i++) {
                new_events[i].date = new Date(new_events[i].date)
                pastEvents.push(new_events[i])
            }
			if(pastEvents.length == 0) {
				const noReult = createNewElement("img", null, "noReult", null)
                noReult.src = "/pictures/webPic/nores.png";
                noReult.style = "width: auto;";
                noReult.style.height = "90%";
				eventSection.appendChild(noReult)
			}
			else {
				for (let i = 0; i < pastEvents.length; i++){
					addEvent(pastEvents[i]);
					if(pastEvents[i].notification != "") {
						addEventNotification(pastEvents[i])
					}
				}
			}
        },
        statusCode: {
            500: function (){
                alert("Internal Server Error\n");
            }
        }
    });
}

function loadMyEvents(){
    clearEvents()
    myEvents.length = 0;
    const urlStr = window.location.href
    const urlArr = urlStr.split('/')
    const id = urlArr[urlArr.length - 1]

    const url = '/profile/events/myevents/' + id
    $.ajax({
        method:'GET',
        url: url,
        dataType: 'json',
        success: function(new_events) {
				for(let i = 0; i < new_events.length; i++) {
					new_events[i].date = new Date(new_events[i].date)
					myEvents.push(new_events[i])
				}
				if(myEvents.length == 0) {
					const noReult = createNewElement("img", null, "noReult", null)
                    noReult.src = "/pictures/webPic/nores.png";
                    noReult.style = "width: auto;";
                    noReult.style.height = "90%";
					eventSection.appendChild(noReult)
				}
				else {
					if(upComing && past && friendEvents) {
						for (let i = 0; i < myEvents.length; i++){
							addUserEvent(myEvents[i]);
						}
					}
					else {
						for (let i = 0; i < myEvents.length; i++){
							addEvent(myEvents[i]);
						}
					}
				}
        },
        statusCode: {
            500: function (){
                alert("Internal Server Error\n");
            }
        }
    });
}

function loadFollowedUserEvents() {
    clearEvents()
    followedUserEvents.length = 0
    const urlStr = window.location.href
    const urlArr = urlStr.split('/')
    const id = urlArr[urlArr.length - 1]

    const url = '/profile/events/followedUsers/' + id
    $.ajax({
        method:'GET',
        url: url,
        dataType: 'json',
        success: function(new_events) {
            for(let i = 0; i < new_events.length; i++) {
                new_events[i].date = new Date(new_events[i].date)
                followedUserEvents.push(new_events[i])
            }
			if(followedUserEvents.length == 0) {
				const noReult = createNewElement("img", null, "noReult", null)
                noReult.src = "/pictures/webPic/nores.png";
                noReult.style = "width: auto;";
                noReult.style.height = "90%";
				eventSection.appendChild(noReult)
			}
			else {
				for (let i = 0; i < followedUserEvents.length; i++){
					addEvent(followedUserEvents[i]);
				}
			}
        },
        statusCode: {
            500: function (){
                alert("Internal Server Error\n");
            }
        }
    });

}

/** Below is for make new event section with helpers */
/*--------and with edit????????????----------------------------------*/

// Open the make new event pop up
function makeNewEvent(e) {
	if(e.target.className == "make") {
		e.preventDefault();
		$.ajax({
			method:'GET',
			url: '/checkLoggedIn',
			dataType: 'json',
			success: function(res) {
				if (res.loggedIn){
					const popUp = new ModPopUp(null, domCallback, serverCallback);
					document.body.appendChild(popUp.getPopUp());
				} else {
					openLogInPopup("Session Expired! Please sign in!").then (_ => {
						window.location.reload(true); 
					})
				}
			},
			statusCode: {
				401: function() {
					openLogInPopup("Session Expired! Please sign in!").then (_ => {
						window.location.reload(true); 
					})
				},
				500: function() {
					alert("Internal Server Error\n")
				}
			}
		});
	}
}

function domCallback() {
	window.location.reload();
}
function  serverCallback(form) {
	return new Promise ((resolve, reject) => {
		form.ajaxSubmit({
			url: '/addevent', 
			type: 'post', 
			enctype: 'multipart/form-data',
			processData: false,  // Important!
			success: function (data) {
				data.date = new Date(data.date);
				resolve(data);
			},
			error: function (err) {
				reject(err);
			}
		});	
	})
}
function editEventDomCallback() {
    window.location.reload();
}

function editEventServerCallback(form) {
    console.log(form)
	return new Promise ((resolve, reject) => {
		form.ajaxSubmit({
			url: `/event/${currentSelectedEvent.id}`,
			type: 'patch', 
			enctype: 'multipart/form-data',
			processData: false,  // Important!
			success: function (data) {
				data.date = new Date(data.date);
				resolve(data);
			},
			error: function (err) {
				reject(err);
			}
		});	
	})
}

/*----------------------------------------------------------------------*/
/*-- This part here is used for event listeners-------------------------*/
/*---Helper functions for event listeners included----------------------*/
/*---Note some may involve server calls-------------------------------- */
/*----------------------------------------------------------------------*/
// For follow button.
function followClicked(e) {
	e.preventDefault();
    console.log(e.target.id)
	if(e.target.id == "followButton") {
		const urlStr = window.location.href
		const urlArr = urlStr.split('/')
		const id = urlArr[urlArr.length - 1]
        let url = (e.target.textContent == "Follow") ? '/users/follows/user' : '/users/unfollows/user' 
        $.ajax({
            method:'PATCH',
            data: {id: id},
            url: url,
            dataType: 'json',
            success: function(data) {
                window.location.reload();
            },
            statusCode: {
                500: function (){
                    alert("Internal Server Error\n");
                },
                404: function (){
                    alert("Something Went Wrong. Please Reload the page. 1")
                    window.location.reload();
                }, 
                400: function (){
                    alert("Something Went Wrong. Please Reload the page. 2")
                    window.location.reload();
                },
                401: function() {
					openLogInPopup("Session Expired! Please sign in!").then (_ => {
						window.location.reload(true); 
					})
				}
            }
		});
	}
}	

function getEventMsg(id) {
	url = '/event/' + id
	return new Promise((resolve, reject) => {	
		$.ajax({
			method:'GET',
			url: url,
			dataType: 'json',
			success: function(event) {
				console.log(event)
				resolve(event.notification);
			},
			statusCode: {
				500: function (){
					alert("Internal Server Error\n");
					reject()
				},
				400: function (){
					alert("Something Went Wrong. Please Reload the page.")
					window.location.reload();
				}
			}
		});
	});
}


function eventClicked(e) {
    e.preventDefault();
    console.log(e.target.tagName)

    console.log(e.target.tagName == "SPAN")
    if (e.target.className == "notificationIcon" || e.target.tagName == "SPAN"){
		getEventMsg(currentSelectedEvent.id).then(msg => {
			openNotificationBox(msg);
		}).catch(err => {
			console.log(err)
		})
    }
    else {
        openEventPopUp(currentSelectedEvent); // show event 

    } 
} 

function userEventClicked(e) {
    if (e.target.className != "message" && e.target.className != "evEdit"){
        
        openEventPopUp(currentSelectedEvent); // edit event
    }
    else if (e.target.className == "evEdit") {
        openEditPopUp(currentSelectedEvent);
    }
}

function openEventPopUp(event) {
    const popUp = new EventPopUp(event, 0);
    const body = document.querySelector('body');
    body.appendChild(popUp.getEventPopUp());
}


function openEditPopUp(event) {
    const popup = new ModPopUp(event, editEventDomCallback, editEventServerCallback);
    document.body.appendChild(popup.getPopUp());
}

function msgClicked(e) {
    e.preventDefault();
    openMsgBox();
}

function msgBoxClicked(e) {
    if (msgBox.style.display != "none"){
        if (e.target == msgBox) {
            e.preventDefault()
            hideMsgBox();
        }
        else if (e.target.className == "submitMsg"){
            e.preventDefault()
			$.ajax({
				method:'GET',
				url: '/checkLoggedIn',
				dataType: 'json',
				success: function(res) {
					if (res.loggedIn){
						sendMsg();
						hideMsgBox();
					} else {
						openLogInPopup("Session Expired! Please sign in!").then (_ => {
							window.location.reload(true); 
						})
					}
				},
				statusCode: {
					401: function() {
						openLogInPopup("Session Expired! Please sign in!").then (_ => {
							window.location.reload(true); 
						})
					},
					500: function() {
						alert("Internal Server Error\n")
					}
				}
			});
        }
    }
}
function notBoxClicked(e) {
    if (notBox.style.display != "none"){
        if (e.target == notBox) {
            e.preventDefault()
            hideNotificationBox();
        }
    }
}

// EVENT HANDLERS FOR Setting!!!!!

// function popupClicked(e) {
//     if (e.target.id == "popUp"){
//         e.preventDefault();
//         exitPopup();
//     } else if ( e.target.id == "saveButton") {
//         e.preventDefault();
// 		saveUser().then(user => {
// 			updateProfileArea(user);
// 			exitPopup();

// 		}).catch(err => {
// 			// Fix this!
// 			console.log("error saving user");
// 		});

//     } else if (e.target.className == "interestSelection") {
//         e.preventDefault();
//         selectInterest(e.target);
//     }
// }

// DOM SAVING
function updatePhoto(e) {
    let filepath = e.target.files[0];
    if (filepath != null){
        document.getElementById('profilePicSetting').style.backgroundImage = `url(${URL.createObjectURL(filepath)})`;
    }
}

function selectInterest(interest) {
    if (interest.style.backgroundColor == darkGreen){
        interest.style.backgroundColor = lightGreen;
    } else {
        interest.style.backgroundColor = darkGreen;
    }
} 

function exitPopup() {
    let div = document.querySelector("#popUp");
    if (div != null) {
        div.remove();
    }
}

function createNewElement(type, clss, id, txt) {
    const container = document.createElement(type);
    if ( (typeof clss !== "undefined") && clss != null ){
        container.className = clss;
    }
    if ( (typeof txt !== "undefined") && txt != null ){
        container.appendChild(document.createTextNode(txt));
    }
    if ( (typeof id !== "undefined") && id != null ){
        container.id = id;
    }
    return container;
}


getUserInfo();
document.querySelector("#topBar li").click()
