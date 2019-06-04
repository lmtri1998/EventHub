/*
* This file contains code to make a pop up for modifying event
*/

/*
* To make the pop up. If event is null, make a pop up with
* empty fields. Both callbacks accept event objects
*/
function ModPopUp(event, domCallBack, serverCallBack) {
    console.log(event);
    const optionList = [];
    const maxTitle = 40;

    this.popUp = makePopUp(event);

    getOptionList();

    /*----------------------------------------------------------------------*/
    /*------------------------- DOM Manipulation ---------------------------*/
    /*----------------------------------------------------------------------*/

    const submitButton = this.popUp.querySelector('#eventSubmit');
    const cancelButton = this.popUp.querySelector('#eventCancel');
    const mapButton = this.popUp.querySelector('#mapPickButton');
    const locationInput = this.popUp.querySelector('#locationInput');
    const addressInput = this.popUp.querySelector('#addressInput');
    const opSelect = this.popUp.querySelector("#categoryInput")
    // used to get mapPopUp
    let mapPopUp = null;

    this.popUp.addEventListener('click', closePopUp.bind(this));
    cancelButton.addEventListener('click', closePopUpCancel.bind(this));
    submitButton.addEventListener('click', createNewEvent.bind(this));
    mapButton.addEventListener('click', mapButtonClick.bind(this));

    // Server call here to get the category
    function getOptionList() {
        $.ajax({
            method:'GET',
            url: `/categories`,
            success: function(res) {
                for (let i = 0 ; i < res.length ; i++) {
                    optionList.push(res.type);
                    let op = createNewElement('option', null, null, res[i].type);
                    opSelect.appendChild(op);
                    if (event != null) {
                        for (let i = 0 ; i < event.type.length ; i++) {
                            for (let j = 0 ; j < opSelect.options.length ; j++) {
                                if (opSelect.options[j].value == event.type[i]) {
                                    opSelect.options[j].selected = true;
                                }
                            }
                        }
                    }
                }
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                }
            }
        });
    }

    function mapButtonClick() {
        if (mapPopUp == null) {
            makeGoogleMapPopUp.bind(this)();
        }
        else {
            this.popUp.appendChild(mapPopUp);
        }
    }

    function makeGoogleMapPopUp() {
        // used to store user return text
        let searchText = "";
        let address = null;

        const holder = createNewElement('div', null, 'mapPopUp', null);
        const indiv = createNewElement('div', null, 'mapHolder', null);
        const map = createNewElement('iframe', null, 'modMap', null);
        
        const myTool = createNewElement('div', null, "modMapToolContainer", null);
        const setButton = createNewElement('img', 'mapSetButton', 'mapSet', "Set");
        setButton.src = "/pictures/webPic/mapCheck.png";
        const cancelButton = createNewElement('img', 'mapSetButton', 'mapCancel', "Cancel");
        cancelButton.src = "/pictures/webPic/mapCross.png"
        setButton.addEventListener("mouseover", changeHoverPic);
        setButton.addEventListener("mouseout", changeUnhoverPic);
        cancelButton.addEventListener("mouseover", changeHoverPic);
        cancelButton.addEventListener("mouseout", changeUnhoverPic);

        myTool.append(cancelButton, setButton);

        const input = createNewElement('input', null, 'mapInputField', null);
        input.type = 'text';
        input.placeholder = 'Please your place location..';

        indiv.appendChild(map);
        indiv.append(myTool, input);
        
        holder.appendChild(indiv);
        getGoogleMapForMod(map, input);

        this.popUp.appendChild(holder);
        mapPopUp = holder;

        // set event listeners
        cancelButton.addEventListener('click', mapClose.bind(this));
        setButton.addEventListener('click', mapSet.bind(this));

        function getGoogleMapForMod(googleMap, inputBox) {
            googleMap.src = "https://www.google.com/maps/embed/v1/view?zoom=17&center=43.6628917,-79.39565640000001&key=AIzaSyAoTRQ4XHxOlEQVJO-3yMI_15G0lBZWH0U";
            const eventLoc = new google.maps.LatLng(43.6628917, -79.39565640000001); // uoft
            const bounds = new google.maps.LatLngBounds(eventLoc);

            const autoComplete = new google.maps.places.Autocomplete(inputBox, {
                bounds: bounds
            });
            autoComplete.setFields(
                ['formatted_address', 'geometry', 'name']);

            autoComplete.addListener('place_changed', onPlaceChanged);

            function onPlaceChanged() {
                const place = autoComplete.getPlace();
                if (place.geometry) {
                    googleMap.src = `https://www.google.com/maps/embed/v1/place?zoom=17&q=${place.formatted_address}&key=AIzaSyAoTRQ4XHxOlEQVJO-3yMI_15G0lBZWH0U`;
                    address = place.formatted_address;
                    searchText = place.name;
                }
                else {
                    inputBox.placeholder = 'Please a location..';
                }
            }
        }

        function mapClose(e) {
            coordinates = null;
            this.popUp.removeChild(mapPopUp);
        }

        function mapSet() {
            locationInput.value = searchText;
            if (address != null) {
                addressInput.value = address;
            }
            this.popUp.removeChild(mapPopUp);
        }

        function changeHoverPic(e) {
            if (e.target.id == 'mapSet') {
                e.target.src = "/pictures/webPic/mapCheckDark.png";
            }
            else {
                e.target.src = "/pictures/webPic/mapCrossDark.png";
            }   
        }

        function changeUnhoverPic(e) {
            if (e.target.id == 'mapSet') {
                e.target.src = "/pictures/webPic/mapCheck.png";
            }
            else {
                e.target.src = "/pictures/webPic/mapCross.png";
            }   
        }
    }

    function makePopUp(event) {
        const holder = createNewElement('div', null, 'makePopUp', null);
        const innerHolder = createNewElement('div', 'postHolder');
        const form = createNewElement('form', null, 'postInfoForm', null);
        form.action = "/event";
        form.enctype = "multipart/form-data"
        form.method = "post";  
        // for basic info
        const basicInfo = createNewElement('div', 'block', 'basicInfo', null);
        const basicHeader = createNewElement('div', 'blockHeader', null, 'Basic Info');
        const headerHr = createNewElement('hr', 'headerLine', null, null); // not
        basicHeader.appendChild(headerHr);
        const basicList = createNewElement('ul', 'inputFormList', null, null);
        // for option
        const opLi = createNewElement('li', null, null, null);
        const opLabel = createNewElement('label', null, null , 'Category:');
        opLabel.htmlFor = 'categoryInput';
        const opSelect = createNewElement('select', 'inputBox', 'categoryInput', null);
        opSelect.name = "types";
        opSelect.multiple = true;
        opLi.appendChild(opLabel);
        opLi.appendChild(opSelect);
        // for title input
        const titleLi = createNewElement('li', null, null, null);
        const titleLabel = createNewElement('label', null, null, 'Title:');
        titleLabel.htmlFor = 'titleInput';
        const titleInput = createNewElement('input', 'inputBox', 'titleInput', null);
        titleInput.type = 'text';
        titleInput.name = 'title'
        titleInput.maxlength = maxTitle;
        titleLi.appendChild(titleLabel);
        titleLi.appendChild(titleInput);
        // for date input
        const dateLi = createNewElement('li', null, null, null);
        const dateLabel = createNewElement('label', null, null, 'Date:');
        dateLabel.htmlFor = 'dateInput';
        const dateInput = createNewElement('input', 'inputBox', 'dateInput', null);
        dateInput.type = 'datetime-local';
        dateInput.name = "date";
        const curDate = new Date();
        dateInput.min = `${curDate.getFullYear()}` + "-" 
        + (curDate.getMonth() + 1 < 10 ? "0" + (curDate.getMonth() + 1) : (curDate.getMonth() + 1)) + "-"
        + (curDate.getDate() < 10 ? "0" + curDate.getDate() : curDate.getDate()) + 'T'
        + (curDate.getHours() < 10 ? "0" + curDate.getHours() : curDate.getHours()) + ":"
        + (curDate.getMinutes() < 10 ? "0" + curDate.getMinutes() : curDate.getMinutes());

        dateLi.appendChild(dateLabel);
        dateLi.appendChild(dateInput);
        // for location
        const locationLi = createNewElement('li', null, null, null);
        const locationLabel = createNewElement('label', null, null, 'Location:');
        locationLabel.htmlFor = 'locationInput';
        const locationInput = createNewElement('input', 'inputBox', 'locationInput', null);
        const mapPick = createNewElement('div', null, 'mapPickButton', 'Pick on Google Map');
        locationInput.type = 'text';
        locationInput.name = 'location';
        locationLi.appendChild(locationLabel);
        locationLi.appendChild(locationInput);
        locationLi.appendChild(mapPick);
        // combine basic ul
        basicList.appendChild(opLi);
        basicList.appendChild(titleLi);
        basicList.appendChild(dateLi);
        basicList.appendChild(locationLi);
        // put basic info to form
        basicInfo.appendChild(basicHeader);
        basicInfo.appendChild(basicList);
        form.appendChild(basicInfo);

        // for img des info
        const mainInfo = createNewElement('div', 'block', 'desImgInfo', null);
        const mainHeader = createNewElement('div', 'blockHeader', null, 'Main Info');
        const header2Hr = createNewElement('hr', 'headerLine', null, null); // not
        mainHeader.appendChild(header2Hr);
        const mainList = createNewElement('ul', 'inputFormList', null, null);
        // for img list
        const imgLi = createNewElement('li', null, null, null);
        const imgLabel = createNewElement('label', null, null, 'Upload Pictures: ');
        const imgUl = createNewElement('ul', null, 'imageList', null);
        imgLi.appendChild(imgLabel);
        imgLi.appendChild(imgUl);
        // for des list
        const desLi = createNewElement('li', null, null, null);
        const desLabel = createNewElement('label', null, null, 'Description: ');
        desLabel.htmlFor = 'descriptionInput';
        const desInput = createNewElement('textarea', 'inputBox', 'descriptionInput', null);
        const descriptionInput = createNewElement('input', 'descriptionInput');
        descriptionInput.type = "hidden";
        descriptionInput.name = "description"
        desLi.appendChild(desLabel);
        desLi.appendChild(desInput);
        desLi.appendChild(descriptionInput);
        // for allow comment
        const allowLi = createNewElement('li', null, null, null);
        const allowLabel = createNewElement('label', null, null, 'Allow Comments:');
        allowLabel.htmlFor = 'allowComments';
        const allowInput = createNewElement('input', null, 'allowComments', 'Comment');
        allowInput.type = 'checkbox';
        allowInput.name = 'allowComments'
        if (event) {
            allowInput.checked = event.allowComments;
        }
        allowLi.appendChild(allowLabel);
        allowLi.appendChild(allowInput);
        // combine main ul
        mainList.appendChild(imgLi);
        mainList.appendChild(desLi);
        mainList.appendChild(allowLi);
        // put main to form
        mainInfo.appendChild(mainHeader);
        mainInfo.appendChild(mainList);
        // for hidden coor
        const address = createNewElement('input', null, 'addressInput', null);
        address.type = "hidden";
        address.name = "address";

        form.append(address);
        form.appendChild(mainInfo);

        // make two buttons
        const cancelButton = createNewElement('input', null, 'eventCancel', null);
        cancelButton.type = 'button';
        cancelButton.value = 'Cancel';
        const submitButton = createNewElement('input', null, 'eventSubmit', null);
        submitButton.type = 'submit';
        submitButton.value = 'Post your Event';
        // put them to form
        form.appendChild(cancelButton);
        form.appendChild(submitButton);

        // finish up
        innerHolder.appendChild(form);
        holder.appendChild(innerHolder);
        if (event != null) {
            titleInput.value = event.title;
            locationInput.value = event.location;
            const date1 = event.date;
            const dateString = `${date1.getFullYear()}` + "-" 
                            + (date1.getMonth() + 1 < 10 ? "0" + (date1.getMonth() + 1) : (date1.getMonth() + 1)) + "-"
                            + (date1.getDate() < 10 ? "0" + date1.getDate() : date1.getDate()) + 'T'
                            + (date1.getHours() < 10 ? "0" + date1.getHours() : date1.getHours()) + ":"
                            + (date1.getMinutes() < 10 ? "0" + date1.getMinutes() : date1.getMinutes());
            dateInput.value = dateString;
            desInput.value = event.description;

            // for img
            for (let i = 0 ; i < event.img.length ; i++) {
                const img = newImgInput();
                img.querySelector(".imgSrc").value = event.img[i];
                img.firstChild.style.backgroundImage = "url(" + event.img[i] + ")";
                const closeImgButton = createNewElement("img", "imgInputCloseButton")
                closeImgButton.src = "/pictures/webPic/close.png";
                img.firstChild.appendChild(closeImgButton)
                closeImgButton.addEventListener("click", e => {
                    e.target.parentElement.parentElement.remove();
                })
                imgUl.appendChild(img);

            }

            submitButton.value = "Save";
        }
        imgUl.appendChild(newImgInput());

        return holder;
    }

    // Create the new Img Input for uploading photos.
    function newImgInput() {
        const li = createNewElement("li");
        const imgButton = createNewElement("div", "imgInputButton");
        const imgInput = createNewElement("input", "imgInput");
        imgInput.type = "file";
        imgInput.name = "eventPhotos"
        imgInput.accept = "image/*";
        const imgSrc = createNewElement("input", "imgSrc");
        imgSrc.type = "hidden";
        imgSrc.name = "imgSrc"
        imgInput.addEventListener("change", updateEventPhoto);
        imgButton.appendChild(imgInput);
        imgButton.appendChild(imgSrc);
        li.appendChild(imgButton);
        
        return li;
    }

    /*----------------------------------------------------------------------*/
    /*-- This part here is used for event handlers-------------------------*/
    /*----------------------------------------------------------------------*/

    // update event photo
    function updateEventPhoto(e) {
        let filepath = e.target.files[0];
        if (filepath != null){
            e.target.parentElement.querySelector(".imgSrc").value = "new";
            changeColorNormal(e.target.parentElement);
            let oldImg = e.target.parentElement.style.backgroundImage;
            e.target.parentElement.style.backgroundImage=`url(${URL.createObjectURL(filepath)})`;
            if (oldImg == "") {
                const closeImgButton = createNewElement("img", "imgInputCloseButton")
                closeImgButton.src = "/pictures/webPic/close.png";
                closeImgButton.addEventListener("click", e => {
                    e.target.parentElement.parentElement.remove();
                })
                e.target.parentElement.appendChild(closeImgButton);
                document.querySelector("#imageList").appendChild(newImgInput());
            }
        }
    }

    // Create new event after error checking.
    function createNewEvent(e) {
        if(e.target.id == "eventSubmit") {
            e.preventDefault();
            // selectors
            const selectCat = this.popUp.querySelector('#categoryInput');
            const imgContainer = this.popUp.querySelector('#imageList');
            const date = this.popUp.querySelector('#dateInput');
            const title = this.popUp.querySelector('#titleInput');
            const loc = this.popUp.querySelector('#locationInput');
            const description = this.popUp.querySelector('#descriptionInput');
            const descriptionInput = document.querySelector('.descriptionInput');
            descriptionInput.value = description.value;
  
            if(selectCat.selectedOptions.length != 0  && title.value != "" && loc.value != "" && description.value != "") {
                // do work here
                changeColorNormal(selectCat)
                changeColorNormal(title);
                changeColorNormal(loc);
                changeColorNormal(date);
                changeColorNormal(description);
                if (serverCallBack != null) {
                    serverCallBack($("#postInfoForm")).then( event => {
                        console.log("Success");
                        this.popUp.parentElement.removeChild(this.popUp);
                        if (domCallBack != null){
                            domCallBack(event);
                        }
                    }).catch(err => {
                        // status code will be err.status!!!!!!!!
                        switch (err.status){
                            case 400: 
                                let location = err.responseJSON.location;
                                if (location == "types") {
                                    loc.style.borderColor = "red";
                                    alert("Invalid Event Categories Choosen!")
                                } else { // Date
                                    date.style.borderColor = "red";
                                    alert("Invalid Date!");
                                }
                                break;
                            case 401: // NOT LOGGED IN!!!
                                openLogInPopup("Sessions expired! Please log in again").then(function() {
                                    window.location.reload(true);
                                }).catch(function() {
                                    window.location.reload(true);
                                })
                                break;
                            case 422: 
                                let indexes = err.responseJSON.invalid;
                                console.log(indexes);
                                if (!indexes)
                                    break;
                                indexes.forEach(index => {
                                    document.querySelectorAll(".imgInputButton")[index].style.borderColor = "red";
                                })
                                alert("Invalid file type, please only upload images!")
                                // let invalidFile = imgContainer.querySelectorAll(".imgInputButton")[err.responseText]
                                // invalidFile.style.borderColor = "red"
                                break;
                            case 500: 
                                alert("Internal Server Error\n")
                                break;
                            default:
                        }
                    });
                    // SPINNING CIRCLE!!!
                } else {
                    this.popUp.parentElement.removeChild(this.popUp);
                }

            }
            else { 
                changeColorError(selectCat);
                changeColorError(title);
                changeColorError(loc);
                changeColorError(date);
                changeColorError(description);
            }
        }
    }

    // close self
    function closePopUp(e) {
        if (e.target.id == "makePopUp" && e.target.id != "eventCancel") {
            this.popUp.parentElement.removeChild(this.popUp);
        }
    }
    function closePopUpCancel(e) {
         this.popUp.parentElement.removeChild(this.popUp);

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

    // Change the border color of empty input to grey
    function changeColorNormal(element) {
        element.style.borderColor = "rgb(180, 176, 176)";
    }
}

ModPopUp.prototype.getPopUp = function () {
    return this.popUp;
}