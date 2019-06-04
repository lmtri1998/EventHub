/*
* This file contains code to for our main webpage
*/

/*----------------------------------------------------------------------*/
/*-- Global variables below --*/
/*----------------------------------------------------------------------*/

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const events = [];

const LOAD_NUM = 30;
let currentLoads = 0;
let last_event = null;
let loading = false;
let currentTab = null;
let searching = false;

/*----------------------------------------------------------------------*/
/*-- Server call functions here --*/
/*----------------------------------------------------------------------*/

// the server bar server call
function searchInServer(filter) {
	url = `/events/search/s=${filter}`
	searching = true
	$li.removeClass('selected');
	$.ajax({
		method:'GET',
		url: url,
		dataType: 'json',
		success: function(new_events) {
			events.length = 0
			new_events.forEach(element => {
				element.date = new Date(element.date);
				events.push(element);
			});
			loadDisplay();
		},
		statusCode: {
			500: function (){
				alert("Internal Server Error\n");
			},
			400: function (){
				alert("Something Went Wrong. Please Reload the page.")
				window.location.reload();
			}
		}
	});
}

// make a new event 
function makeNewEvent(e) {
	if(e.target.className == "make") {
		e.preventDefault();
		$.ajax({
			method:'GET',
			url: '/checkLoggedIn',
			dataType: 'json',
			success: function(res) {
				if (res.loggedIn){
					const popUp = new ModPopUp(null, domCallback, makeEventServerCallback);
					document.body.appendChild(popUp.getPopUp());
				} else {
					openLogInPopup("Want to make a post? Please sign in!").then (_ => {
						window.location.reload(true); 
					})
				}
			},
			statusCode: {
				401: function() {
					openLogInPopup("Want to make a post? Please sign in!").then (_ => {
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

// handles checking for the session 
function changeSignUp(e) {
	if(e.target.innerText == "My profile") {
		e.preventDefault();
		$.ajax({
			method:'GET',
			url: '/checkLoggedIn',
			dataType: 'json',
			success: function(res) {
				if (res.loggedIn){
					window.location.href = "/users/profile";
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
	else {
		e.preventDefault();
		window.location.href = "/signup";
	}
}

// a server callback used to pass into the mod event popup
function makeEventServerCallback(form) {
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

// a request to server to load all events
function loadEvents(refresh) {
	if (loading || searching){
		return Promise.reject();
	}
	return new Promise((resolve, reject) => {
		let data;
		if (currentTab == null) {
			data = {currentLoads: currentLoads, load: LOAD_NUM, last_event: last_event}
		} else {
			data = {currentLoads: currentLoads, load: LOAD_NUM, last_event: last_event, category: currentTab}
		} 

		loading = true;
		$.ajax({
			method:'POST',
			data: data,
			url: '/loadEvents',
			dataType: 'json',
			success: function(new_events) {
				new_events.forEach(element => {
					element.date = new Date(element.date);
					events.push(element);
					currentLoads += 1;
				});
				let prev_last = last_event;
				if (events.length > 0)
					last_event = events[events.length - 1].id;
				if(refresh || (prev_last !== last_event)){
					loadDisplay();
				}
				loading = false;
				resolve();
			},
			statusCode: {
				500: function (){
					alert("Internal Server Error\n");
				},
				404: function (){
					alert("Something Went Wrong. Please Reload the page.")
					window.location.reload();
				}, 
				422: function (){
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

/*-- all selectors needed---*/
const eventList = document.querySelector(".eventList");
const search = document.querySelector(".search");
const searchContent = document.querySelector("#searchContent");
const mainSection = document.querySelector("#mainSection");
const logIn = document.querySelector(".login");
const signUp = document.querySelector(".signup");
const allEvent = document.querySelector("#all");
const cs = document.querySelector("#cs");
const math = document.querySelector("#math");
const group = document.querySelector("#group");
const party = document.querySelector("#party");
const other = document.querySelector("#other");

// for use in make new event
const make = document.querySelector(".make");

/*--------Add event listeners to each element below----------*/
signUp.addEventListener('click', changeSignUp);
logIn.addEventListener('click', changeLogIn);
search.addEventListener('click', startSearch);
searchContent.addEventListener('keyup', searchForContent);

mainSection.addEventListener('click', dropSearch);

make.addEventListener('click', makeNewEvent);

// Load the display for testing.
function loadDisplay() {
	removeEventFromScreen();
	if(events.length == 0) {
		const noReult = createNewElement("img", null, "noReult", null)
		noReult.src = "../pictures/webPic/nores.png";
		eventList.appendChild(noReult)
	}
	for(let i = 0; i < events.length; i++) {
		addEvent(events[i]);
	}
}

/*----------------------------------------------------------------------*/
/*------------------------- DOM functions ------------------------------*/
/*----------------------------------------------------------------------*/

// Help remove all event from the screen.
function removeEventFromScreen() {
	while (eventList.firstChild) {
		eventList.removeChild(eventList.firstChild);
	}
}

// Change the border color of empty input to red to indicate error.
function changeColorError(selector) {
	if(selector.value == "") {
		selector.style.borderColor = "red";
	}
	else {
		selector.style.borderColor = "";
	}
}

/*--------------- add new event to the page ---------------*/

// Create and add new event to the eventList div
function addEvent(event) {
	const eventObj = createNewElement('div', 'event');
    eventObj.id = event.id;
    const imgHolder = createNewElement('div', 'eventImgHolder');
	const img = createNewElement('img', 'eventPhoto');
	if(event.img[0] == null) {
		img.src = "../pictures/eventPic/w3.jpg"
	}
	else {
		img.src = event.img[0];
	}
	img.alt = "Smiley face";
	const eventInfo = createNewElement('div', 'eventInfo');
	eventInfo.style.float = 'left';
	const calendarContainer = createNewElement('div', 'calendarContainer');
	calendarContainer.style.float = 'left';
	const info = createNewElement('div', 'info');
	info.style.float = 'right';
	const calendar = createNewElement('div', 'calendar');
	const month = createNewElement('p', 'month', null, monthNames[event.date.getMonth()]);
	const date = createNewElement('p', 'date', null, event.date.getDate());
	calendar.appendChild(month);
	calendar.appendChild(date);
	calendarContainer.appendChild(calendar);
	const title = createNewElement('p', 'title', null, event.title);
	const dateInfo = createNewElement('p', 'dateInfo', null, getDate(event.date));
	const location = createNewElement('p', 'location', null, event.location);
	info.appendChild(title);
	info.appendChild(location);
	info.appendChild(dateInfo);
	eventInfo.appendChild(calendarContainer);
    eventInfo.appendChild(info);
    eventObj.appendChild(imgHolder);
	imgHolder.appendChild(img);
	eventObj.appendChild(eventInfo);
	eventObj.addEventListener('click', openPopUp);
	eventList.appendChild(eventObj);
}
	
/*----------------------------------------------------------------------*/
/*-- This part here is used for event listeners-------------------------*/
/*-- Some involving create new elements using the DOM functions above---*/
/*----------------------------------------------------------------------*/
	
/*----------------------------------------------------------------------*/
/*-- Search bar section --*/
/*----------------------------------------------------------------------*/

// Expand the search bar on click.
function startSearch(e) {
	if (e.target.className == "search" || e.target.id == "searchIcon" || e.target.id == "searchContent") {
		e.preventDefault();
		search.style.right = "-55px";
		searching = true;
	}
}

// Collapse the search on click.
function dropSearch(e) {
	if(!(e.target.className == "search" || e.target.id == "searchIcon" || e.target.id == "searchContent")) {
		e.preventDefault();
		search.style.right = "-255px";
		searching = false
	}
}

// Display search event base on key type.
function searchForContent(e) {
	let filter = searchContent.value;
	searchInServer(filter)
}

/*----------------------------------------------------------------------*/
/*-- Naviation bar section section --*/
/*----------------------------------------------------------------------*/

function changeLogIn(e) {
	if(e.target.innerText == "Log out") {
		e.preventDefault();
		window.location.href = "/users/logout"
	}
	else if (e.target.innerText == "Log in") {
		e.preventDefault();
		window.location.href = "/login"	
	}
}

function changeTab(e) {
	e.preventDefault();
	searching = false;
	last_event = null;
	events.length = 0;
	currentLoads = 0;
	if (e.target.id == "all"){
		currentTab = null;
		loadEvents(true).then( _ => {
			scrollTop();
		}).catch(err => {
			// empty
		});
	} else {
		currentTab = e.target.id;
		loadEvents(true).then(_ => {
			scrollTop();
		}).catch(err => {
			//empty
		});
	}
}

// Open the specific event pop up to view the detail.
function openPopUp(e) {
	for(let i = 0; i < e.path.length; i++) {
		if(e.path[i].className == "event") {
			e.preventDefault();
            const eventToPop = getEvent(e.path[i].id);
			const popUp = new EventPopUp(eventToPop, 0);
			const mainBody = document.querySelector('body');
			mainBody.appendChild(popUp.getEventPopUp());
			break;
		}
	}
}

/*----------------------------------------------------------------------*/
/*-- Make new event section --*/
/*----------------------------------------------------------------------*/

function domCallback(newEvent) {

	events.unshift(newEvent);
	scrollTop();
}

// Create new event after error checking.
function createNewEvent(e) {
	if(e.target.id == "eventSubmit") {
		e.preventDefault();
		const categ = selectCat.options[selectCat.selectedIndex].value;
		const imgList = [];
		const len = imgContainer.querySelectorAll(".imgInputButton").length;
		for (let i = 0; i < len - 1; i++) {
			imgList.push(imgContainer.querySelectorAll(".imgInputButton")[i].style.backgroundImage.slice(4, -1).replace(/"/g, "")); // == "url("src.png")
		}
		if(date.value != "" && title.value != "" && loc.value != "") {
			const newEvent = new Event(title.value, loc.value, convertTime(date.value), description.value, imgList, categ, user.usrName);
			addEvent(newEvent);
			events.push(newEvent);
			removeMakeNewEVentContent();
		}
		else { 
			changeColorError(title);
			changeColorError(loc);
			changeColorError(date);
			changeColorError(description);
		}
	}
}

// Close the make new event pop up and reset all input fields.
function cancelCreateNewEvent(e) {
	if(e.target.id == "eventCancel") {
		e.preventDefault();
		makePopUp.style.display = "none";
		search.style.display = "";
		removeMakeNewEVentContent();
	}
}

function updateEventPhoto(e) {
	let filepath = e.target.files[0];
	if (filepath != null){
		filepath = filepath.name;
		let oldImg = e.target.parentElement.style.backgroundImage;
		e.target.parentElement.style.backgroundImage = "url(" + filepath + ")";
		if (oldImg == "")
			document.querySelector("#imageList").appendChild(newImgInput());
	}
}

// Help get the date format from Date()
function getDate(date) {
	return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ` + date.getHours() + ":" 
           + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
}

// get the event
function getEvent(id) {
    for(let i = 0; i < events.length; i++) {
		if(events[i].id == id) {
			return events[i];
		}
	}
    return null;
}

// init the webpage
$("#all").click();

$(".eventList").scroll(function(){
	if (last_event != null){
		let element = $(`#${last_event}`);
		if (element.length && element.position().top <= window.innerHeight){
			if(!loading){
				loadEvents()
			}
		}
	}
 })

 function scrollTop(){
	if (loading) {
		return;
	}
	$('.eventList').animate({ scrollTop: 0 }, {
		duration: 400,
		complete: () => {
			loadDisplay();
		} 
	})
 }
