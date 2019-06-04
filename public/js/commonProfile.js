/*
* This file contains common code between user profile and admin profile
*/

let exitSettingCallback = null;

/*----------------------------------------------------------------------*/
/*-- Server call functions here --*/
/*----------------------------------------------------------------------*/

// load the user setting from the server
function settingClicked(e) {
    e.preventDefault();
	const urlStr = window.location.href
	const urlArr = urlStr.split('/')
	const id = urlArr[urlArr.length - 1]
  
	const url = '/profile/setting/' + id
	$.ajax({
		method:'GET',
		url: url,
		dataType: 'json',
		success: function(mix) {
			loadUserSetting(mix.user, mix.cats); 
		},
		error: function(err) {
		}
	});   
}

// check for button clicks and do session checking according to which 
// pop up is clicked
function popupClicked(e) {
    if (e.target.id == "popUp"){
        e.preventDefault();
        exitPopup();
    } else if ( e.target.id == "saveButton") {
        e.preventDefault();
		$.ajax({
			method:'GET',
			url: '/checkLoggedIn',
			dataType: 'json',
			success: function(res) {
				if (res.loggedIn){
					saveUser().then(user => {
						updateProfileArea(user);
						exitPopup();
						if (exitSettingCallback)
							exitSettingCallback();
					}).catch(err => {
					});
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
    } else if (e.target.className == "interestSelection") {
        e.preventDefault();
        selectInterest(e.target);
    }
}

// this function handles the password changing events. It creates a pop up
// and handles all the server call to change to user password
function openPasswordPopup() {
    const logo = createNewElement("img", "logo");
    logo.src = "/pictures/webPic/logo.png";
    const message = createNewElement("h2", null, null, "Password Setting");
    const oldPassword = createNewElement("h4", null, null, "Old Password");
    const oldPasswordInput = createNewElement("input");
    oldPasswordInput.type = "password";
    oldPasswordInput.name = "oldpsw";
	oldPasswordInput.placeholder = "Enter Old Password";
	oldPasswordInput.required = true;
    const newPassword = createNewElement("h4", null, null, "New Password");
    const newPasswordInput = createNewElement("input");
    newPasswordInput.type = "password";
    newPasswordInput.name = "psw";
	newPasswordInput.placeholder = "Enter New Password";
	newPasswordInput.minLength = "4";
	newPasswordInput.required = true;
	
	const confirmPassword = createNewElement("h4", null, null, "Confirm Password");
    const confirmPasswordInput = createNewElement("input");
    confirmPasswordInput.type = "password";
    confirmPasswordInput.name = "confirmpsw";
	confirmPasswordInput.placeholder = "Repeat Password again";
	confirmPasswordInput.minLength = "4";
	confirmPasswordInput.required = true;

	const errMsg = createNewElement("h5", "errMsg", null, "");
    const submit = createNewElement("input");
    submit.type = "submit";
    submit.value = "Confirm";
    const loginPop = createNewElement("form", null, "passPop");
    loginPop.append(logo, message, oldPassword, oldPasswordInput, newPassword, newPasswordInput, confirmPassword, confirmPasswordInput, errMsg, submit);
    const background = createNewElement("div", null, "passPopBackground");
    background.appendChild(loginPop);
    document.body.appendChild(background);

	background.addEventListener('click', e => {
		if (e.target.id == "passPopBackground"){
			e.preventDefault();
			e.target.remove();
		}
	})
	submit.addEventListener("click", function(e){
		if(newPasswordInput.value.length < 4){

		} else {
			e.preventDefault();
			$("#passPop").ajaxSubmit({
				method:'PATCH',
				url: `/users/changePassword`,
				dataType: 'json',
				statusCode: {
					401: function () {
						openLogInPopup("Sessions expired! Please log in again").then(function() {
							window.location.reload(true);
						}).catch(function (){
							window.location.reload(true);
						})
					},
					400: function(err) {
						while (errMsg.firstChild) {
							errMsg.removeChild(errMsg.firstChild);
						}
						errMsg.appendChild(document.createTextNode("Incorect Password!"))
						oldPasswordInput.value = "";
						newPasswordInput.value = "";
						confirmPasswordInput.value = "";
					},
					200: function() {
						background.remove();
					}
				}
			});
		}
	})
}

/*----------------------------------------------------------------------*/
/*------------------------- DOM Manipulation ---------------------------*/
/*----------------------------------------------------------------------*/
	
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



function loadUserSetting(user, categories) {
	 const profilePic = createNewElement("div", null, "profilePicSetting");
	profilePic.style.backgroundImage = `url(${user.profilePic})`;

	const choosePhoto = createNewElement("input", null, "choosePhoto");
	choosePhoto.type = "file";
	choosePhoto.accept = "image/*";
	choosePhoto.name = "profilePhoto"
	choosePhoto.addEventListener("change", updatePhoto);

	const editPhoto = createNewElement("div", null, "editPhoto");
	editPhoto.append(profilePic, choosePhoto);

	const userName = createNewElement("h2", null, null, "Username");
	
	const userNameInput = createNewElement("input", null, "userNameInput");
	userNameInput.type = "text";
	userNameInput.value =  user.username;
	userNameInput.name = "username";
	
	const descr = createNewElement("h2", null, null, "Description");
	
	const descriptionInput = createNewElement("textarea", null, "userDescriptionInput");
	descriptionInput.value = user.description;
	const hiddenDescription = createNewElement("input", "hiddenDescription");
	hiddenDescription.type = "hidden";
	hiddenDescription.name = "description";
	const interests = createNewElement("h2", null, null, "Interests");
	
	const interestList = createNewElement("div", null, "interestList");
	const hiddenList = createNewElement("select", "interestsHidden");
	hiddenList.style.display = "hidden";
	hiddenList.name = "categories";
	hiddenList.multiple = true;
	
	 for(let i = 0; i < categories.length; i++){
		let cat = categories[i].type;
		let interest = createNewElement("div", "interestSelection", `catID${cat}`, cat);
		let interestOption = createNewElement("option", null, null, cat);
		hiddenList.style.display = "none";
		hiddenList.appendChild(interestOption);
		user.interests.forEach(function(obj) {
			if(obj.type == cat) {
				interest.style.backgroundColor = darkGreen;
			}
		})
		interestList.appendChild(interest);

	}
	
	const interestContainer = createNewElement("div", null, "interestContainer");
	interestContainer.append(interests, interestList, hiddenList);

	const editProfile = createNewElement("div", null, "editProfile");
	editProfile.append(userName, userNameInput, descr, descriptionInput, hiddenDescription, interestContainer);
	

	const saveButton = createNewElement("input", null, "saveButton");
	saveButton.type = "submit";
	saveButton.value = "Save";

	const profileForm = createNewElement("form", null, "profileForm");
	profileForm.append(editPhoto, editProfile, saveButton);

	const settingArea = createNewElement("div", "settingsArea");
	settingArea.appendChild(profileForm);
	const popup =  createNewElement("div", null, "popUp");
	popup.appendChild(settingArea);
	popup.addEventListener("click", popupClicked);

	document.querySelector("body").appendChild(popup);
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

// DOM SAVING
function updatePhoto(e) {
    let filepath = e.target.files[0];
    if (filepath != null){
        document.getElementById('profilePicSetting').style.backgroundImage = `url(${URL.createObjectURL(filepath)})`;
    }
}
