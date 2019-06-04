/*
* This file contains code to for our admin profile webpage
*/

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

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
const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// PICTURE LOCATIONS!!!
const logoSrc = "/pictures/webPic/logo.png";
const settingIconSrc = "/pictures/webPic/settings.png";
const messgaeSrc = "/pictures/webPic/msg.png";
const deleteIconSrc = "/pictures/webPic/delete.png";
const viewIconSrc = "/pictures/webPic/view-icon.png";

// below used for this webpage
let currentSelectedEvent = null;
let currentSelectedUser = null;
let currentMsgEvnet = null;
// const allEvents = [];
// const allUsers = [];


/*----------------------------------------------------------------------*/
/*-- Server call functions here --*/
/*----------------------------------------------------------------------*/


function sendMsg(){
    // For phase 2, this will be sending msg to each user that is following this event.
    const msg = document.querySelector(".msgContent").value
	console.log(currentSelectedEvent)
	const url = '/events/sendNotif/' + currentSelectedEvent
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

function delEvent(){
    // will connect with server and delete event there
	return new Promise((resolve, reject) => {
		if(!currentSelectedEvent){
			alert("Something Went Worng. Please try again later");
			reject();
		}
		$.ajax({
			method:'DELETE',
			url: '/events/' + currentSelectedEvent,
			dataType: 'json',
			success: function(results) {
				resolve(results);
			},
			statusCode: {
				404: function (){
					alert("Something Went Worng. Reload the Page Now!");
					window.location.reload();
				},
				401: function (){
					alert("Something Went Worng. Reload the Page Now!");
					window.location.reload();
				},
				500: function (){
					alert("Internal Server Error\n");
					reject()
				}
			}
		});
	});
    
}

function delUser(){
	// will connect with server and delete event there
	return new Promise((resolve, reject) => {
		if(!currentSelectedUser){
			alert("Something Went Worng. Please try again later");
			reject();
		}
		$.ajax({
			method:'DELETE',
			url: '/users/' + currentSelectedUser,
			dataType: 'json',
			success: function(results) {
				resolve(results);
			},
			statusCode: {
				404: function (){
					alert("Something Went Worng. Reload the Page Now!");
					window.location.reload();
				},
				401: function (){
					alert("Something Went Worng. Reload the Page Now!");
					window.location.reload();
				},
				422: function (){
					alert("You Cannot Delete Admin!")
					window.location.reload();
				},
				500: function (){
					alert("Internal Server Error\n");
					reject()
				}
			}
		});
	});
}

function getEvent(id) {
	url = '/event/' + id
	return new Promise((resolve, reject) => {	
		$.ajax({
			method:'GET',
			url: url,
			dataType: 'json',
			success: function(event) {
				resolve(event);
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

/*----------------------------------------------------------------------*/
/*-- DOM manipulations below. Some functions may involve server calls---*/
/*----------------------------------------------------------------------*/

// DOM OBJECTS!!
const profileArea = document.querySelector("#profileArea");
const settingIcon = document.querySelector("#settingIcon");
const msgBox = document.querySelector("#msgBox");
const delBox = document.querySelector("#delBox");
const userListWrapper = document.querySelector("#userListWrapper");
const eventListWrapper = document.querySelector("#eventListWrapper");

// for use in make new event
const make = document.querySelector(".make");

// EVENT LISTENERS!!!
settingIcon.addEventListener("click", e => {
    const urlStr = window.location.href;
	const urlArr = urlStr.split('/');
    currentSelectedUser = urlArr[urlArr.length - 1];
    settingClicked(e);
});
msgBox.addEventListener("click", msgBoxClicked);
delBox.addEventListener("click", delBoxClicked);
document.querySelector("#modifyUsers").addEventListener("click", loadUsers);
document.querySelector("#modifyEvents").addEventListener("click", loadEvents);

// for use in make new event
make.addEventListener('click', makeNewEvent);

/*----------------------------------------------------------------------*/
/*------------------------- DOM functions ------------------------------*/
/*----------------------------------------------------------------------*/

function getEventDate(date) {
    return `${dayName[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getHours()}:${date.getMinutes()}`;
}

function openMsgBox() {
    msgBox.style.display = "inline-block";
}

function hideMsgBox() {
    currentMsgEvnet = null;
    msgBox.style.display = "none";
    msgBox.querySelector(".msgContent").value = "";
}

function openDelBox() {
    s = currentSelectedEvent == null ? "user" : "event";
    delBox.querySelector("h2").textContent = " Are you sure you want to delete this " + s;
    delBox.style.display = "inline-block";
}

function hideDelBox() {
    currentSelectedEvent = null;
    currentSelectedUser = null;
    delBox.style.display = "none";
}

function loadEvents(){
    userListWrapper.style.display = "none";
    eventListWrapper.style.display = "inline-block";
}

function loadUsers() {
    eventListWrapper.style.display = "none";
    userListWrapper.style.display = "inline-block";
}

function createUserDom(user){
    const name = createNewElement("span", "name", null, user.usrName);
    const bday = createNewElement("span", "bday", null, user.bday);
    const del = createNewElement("img", "delete");
    del.src = deleteIconSrc;
    
    const userDiv = createNewElement("div", "user", `userName${user.usrName}`);
    userDiv.append(name, bday, del);
    userDiv.addEventListener("click", function (e){
        currentSelectedUser = user;
        userClicked(e);
    })
    return userDiv;
}

/*----------------------------------------------------------------------*/
/*-- This part here is used for event listeners-------------------------*/
/*----------------------------------------------------------------------*/
function eventClicked(e) {
    e.preventDefault();
    if (e.target.className == "msg"){
        openMsgBox();
    } else if (e.target.className == "delete"){
        openDelBox();
    } else if (e.target.className == "viewEvent") {
		getEvent(currentSelectedEvent).then(event => {
			event.date = new Date(event.date)
			openViewPopUp(event);
		}).catch(err => {
			console.log(err)
		})
    } else if (e.target.className != "toolDiv"){
		getEvent(currentSelectedEvent).then(event => {
			event.date = new Date(event.date)
			openEditPopUp(event);
		}).catch(err => {
			console.log(err)
		})
    }
}


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

/*-- Edit event section --*/

function openEditPopUp(event) {
    const popup = new ModPopUp(event, domCallback, editServerCallback);
    document.body.appendChild(popup.getPopUp());
}

function domCallback(newEvent) {
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
	
function editServerCallback(form) {
    return new Promise ((resolve, reject) => {
		form.ajaxSubmit({
			url: '/event/' + currentSelectedEvent,
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

function openViewPopUp(event) {
    const popUp = new EventPopUp(event, 2);
    document.body.appendChild(popUp.getEventPopUp());   
}

/*-- Setting change section --*/
function selectUser(userDiv, e){
	currentSelectedUser = userDiv.id;
	currentSelectedEvent = null;
    userClicked(e);
}
function selectEvent(eventDiv, e){
	currentSelectedEvent = eventDiv.id;
	currentSelectedUser = null;
	eventClicked(e);
}
function userClicked(e) {
    e.preventDefault();
    if (e.target.className == "delete"){
        openDelBox();
    } else {
        console.log("AJAX!")
        let url = `/profile/setting/${currentSelectedUser}`;
        $.ajax({
            method:'GET',
            url: url,
            dataType: 'json',
            success: function(mix) {
                loadUserSetting(mix.user, mix.cats);
                exitSettingCallback = function (){
                    document.location.reload();
                }
            },
            statusCode: {
                500: function (){
                    alert("Internal Server Error\n");
				},
				404: function () {
					alert("Cannot load user info, refresh now");
					window.location.reload();
				}
            }
        });
    }
}

// CONNECT WITH BACK-END!!!
function saveUser(){
    return new Promise((resolve, reject) => {
		const interestList = document.querySelector("#interestList").childNodes;
		const hiddenList = document.querySelector(".interestsHidden").childNodes;
		interestList.forEach((cat, index) => {
			hiddenList[index].selected = cat.style.backgroundColor == darkGreen;
        })
        let url = `/profile/update/${currentSelectedUser}`;
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


function msgBoxClicked(e) {
    if (msgBox.style.display != "none"){
        if (e.target == msgBox) {
            hideMsgBox();
        }
        else if (e.target.className == "submitMsg"){
			e.preventDefault();
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

function delBoxClicked(e){
	e.preventDefault()
    if (delBox.style.display != "none"){
        if (e.target == delBox || e.target.className == "NO") {
            hideDelBox();
        } else if (e.target.className == "YES"){
			$.ajax({
				method:'GET',
				url: '/checkLoggedIn',
				dataType: 'json',
				success: function(res) {
					if (res.loggedIn){
						if (currentSelectedEvent == null){
							delUser(currentSelectedUser).then((_) => {
								window.location.reload();
							});
							loadUsers();
						} else {
							delEvent().then(results => {
								window.location.reload();
							}).catch(err => {
								console.log(err)
							});
							
							loadEvents();
						}
						hideDelBox();
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
};


// Close the make new event pop up and reset all input fields.
function cancelCreateNewEvent(e) {
	if(e.target.id == "eventCancel") {
		e.preventDefault();
		makePopUp.style.display = "none";
		removeMakeNewEVentContent();
	}
}

/*----------------------------------------------------------------------*/
/*-- Helper function --*/
/*----------------------------------------------------------------------*/

function loadPage() {
    loadEvents();
}

// start here
loadPage();
document.querySelector("#topBar li").click()
