/*
* This file contains code to make a pop up. It includes server code, 
* event handlers and add element for the event pop up window. This 
* pop up will add event listeners to remove itself from the parent
* if background is clicked or close button is clicked.
*/

/*
* This function makes the pop up
* admin 1 : admin, admin 2 : super admin
*/
function EventPopUp(event, adminMode) {
    // used for comment part
    const maxReply = 5;
    const loadNumber = 10;
    const commentRefreshTime = 1000 * 15;
    let end = 0;
    let startDate = new Date();
    let newDate = null;

    let exitRefresh = false;

    const comments = [];

    // global img array for slider
    const imgSlideContent = [];
    let imgSlideIndex = 0;

    // This refer to this pop-up element
    const commentInputWarning = createNewElement('p', 'red', "commentInputWarning", null);
    const moreComment = createMoreBar("Loading");
    moreComment.id = 'moreComment';
    this.popUp = createEventPopUp(event);
    const joinButton = this.popUp.querySelector('#joinButton');
    const commentArea = this.popUp.querySelector('#commentArea');
    const googleMap = this.popUp.querySelector('#googleMap');
    if (event.address != null && event.address != "") {
        getGoogleMap();
    }
    console.log(event);
    isJoined();
    getComments();
    setTimeout(getNewCommentsRefresh, commentRefreshTime);
    moreComment.innerText = "More Comment";
    moreComment.addEventListener('click', moreBarClick);

    /*----------------------------------------------------------------------*/
    /*-- Server call functions here --*/
    /*----------------------------------------------------------------------*/

    // get comments from server for this event
    function getComments() {
        $.ajax({
            method:'GET',
            url: `/comment/${event.id}/${loadNumber}/${startDate.toISOString()}`,
            success: function(res) {
                for (let i = 0 ; i < res.comments.length ; i++) {
                    res.comments[i].date = new Date(res.comments[i].date);
                    if (res.comments[i].reply.length > 0) {
                        res.comments[i].replyLoaded = 0;
                        for (let j = 0 ; j < res.comments[i].reply.length ; j++) {
                            res.comments[i].reply[j].date = new Date(res.comments[i].reply[j].date);
                        }
                    }
                    comments.push(res.comments[i]);
                }
                end = res.isEnd;
                if (res.comments.length > 0){
                    startDate = res.comments[res.comments.length-1].date;
                    if (newDate == null) {
                        newDate = res.comments[0].date;
                    }
                }
                createComments(res.comments);
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function () {
                    alert("Event not found, refresh now.");
                }
            } 
        });
    }

    
    // get new comment from server
    function getNewComments() {
        console.log(newDate);
        if (comments.length == 0) {
            console.log('this branch')
            newDate = null;
            startDate = new Date();
            getComments();
            return;
        }
        $.ajax({
            method:'GET',
            url: `/newComment/${event.id}/${newDate.toISOString()}`,
            success: function(res) {
                for (let i = res.comments.length-1 ; i >= 0 ; i--) {
                    res.comments[i].date = new Date(res.comments[i].date);
                    if (res.comments[i].reply.length > 0) {
                        res.comments[i].replyLoaded = 0;
                        for (let j = 0 ; j < res.comments[i].reply.length ; j++) {
                            res.comments[i].reply[j].date = new Date(res.comments[i].reply[j].date);
                        }
                    }
                    comments.push(res.comments[i]);
                    insertNewCommentBlock(res.comments[i]);
                }
                if (res.comments.length > 0){
                    newDate = res.comments[0].date;
                }
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function () {
                    alert("Event not found, refresh now");
                }
            }
        });
    }

    function getNewCommentsRefresh() {
        setTimeout(getNewCommentsRefresh, commentRefreshTime);
        getNewComments();
    }

    function isJoined() {
        $.ajax({
            method:'GET',
            url: `/isJoined/${event.id}`,
            success: function(res) {
                console.log(res)
                if (res.isOwner) {
                    joinButton.innerText = `${res.numJoined} Joined`;
                    return;
                }
                if (res.isJoined) {
                    joinButton.innerText = "Joined";
                }
                else {
                    joinButton.innerText = "I Want to Join";
                }
                joinButton.addEventListener('click', joinButtonClick);
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                }
                joinButton.innerText = "ERROR";
            }
        });
    }

    // add comment to the server
    function addCommentToServer(text) {
        $.ajax({
            method:'POST',
            data: {eventId: event.id, text: text},
            url: '/comment',
            dataType: 'json',
            success: function(res) {
                res.date = new Date(res.date);
                newDate = res.date;
                insertNewCommentBlock(res);
                comments.push(res);
                inputComment.value = null;
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                    if (err.responseJSON.errMsg){
                        commentInputWarning.innerText = err.responseJSON.errMsg;
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                401: function () {
                    openLogInPopup("Please login to continue.").then(() => {
                        addCommentToServer(text);
                        exitRefresh = true;
                    }).catch(()=>{});
                }
            } 
        });
    }

    // add reply to server
    function addReplyToServer(text, commentBlock) {
        $.ajax({
            method:'POST',
            data: {eventId: event.id, commentId: commentBlock.id, text: text, user: "user"},
            url: '/reply',
            dataType: 'json',
            success: function(res) {
                res.date = new Date(res.date);
                insertNewSubCommentBlock(res, commentBlock);
                replyInput.value = null;
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                    if (err.responseJSON.errMsg){
                        replyInput.classList.add("redInput");
                        replyInput.placeholder = err.responseJSON.errMsg;
                        replyInput.value = null;
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                401: function () {
                    openLogInPopup("Please login to continue.").then(() => {
                        exitRefresh = true;
                        addReplyToServer(text, commentBlock);
                    }).catch(()=>{});
                }
            }
        });
    }

    // delete comment to the server (recoverable)
    function deleteComment(commentBlock, deleteTag) {
        $.ajax({
            method:'PATCH',
            data: {eventId: event.id, commentId: commentBlock.id},
            url: '/comment/delete',
            dataType: 'json',
            success: function(res) {
                // delete it from current page
                commentBlock.querySelector('p').innerText = res.newText;
                deleteTag.innerText = "Recover";
                deleteTag.removeEventListener("click", userDeleteClick);
                deleteTag.addEventListener("click", userRecoverClick);
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function() {
                    alert("Comment deleted.\nPlease refresh the page.");
                }
            }
        });
    };

    function deleteReply(commentBlock, deleteTag) {
        $.ajax({
            method:'PATCH',
            data: {eventId: event.id, commentId: commentBlock.parentElement.id, replyId: commentBlock.id},
            url: '/reply/delete',
            dataType: 'json',
            success: function(res) {
                // delete it from current page
                commentBlock.querySelector('p').innerText = res.newText;
                deleteTag.innerText = "Recover";
                deleteTag.removeEventListener("click", userDeleteClick);
                deleteTag.addEventListener("click", userRecoverClick);
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function() {
                    alert("Reply deleted.\nPlease refresh the page.");
                }
            }
        });
    }

    function recoverComment(commentBlock, recoverTag) {
        $.ajax({
            method:'PATCH',
            data: {eventId: event.id, commentId: commentBlock.id},
            url: '/comment/recover',
            dataType: 'json',
            success: function(res) {
                // delete it from current page
                commentBlock.querySelector('p').innerText = res.newText;
                recoverTag.innerText = "Delete";
                recoverTag.removeEventListener("click", userRecoverClick);
                recoverTag.addEventListener("click", userDeleteClick);
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function() {
                    alert("Comment recovered.\nPlease refresh the page.");
                }
            }
        });
    }

    function recoverReply(commentBlock, recoverTag) {
        $.ajax({
            method:'PATCH',
            data: {eventId: event.id, commentId: commentBlock.parentElement.id, replyId: commentBlock.id},
            url: '/reply/recover',
            dataType: 'json',
            success: function(res) {
                // delete it from current page
                commentBlock.querySelector('p').innerText = res.newText;
                recoverTag.innerText = "Delete";
                recoverTag.removeEventListener("click", userRecoverClick);
                recoverTag.addEventListener("click", userDeleteClick);
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function() {
                    alert("Reply recovered.\nPlease refresh the page.");
                }
            }
        });
    }

    function removeComment(commentBlock) {
        $.ajax({
            method:'DELETE',
            data: {eventId: event.id, commentId: commentBlock.id},
            url: '/comment/remove',
            dataType: 'json',
            success: function(res) {
                commentBlock.parentElement.removeChild(commentBlock);
                // remove this comment from global comment array
                removeCommentsById(res._id);
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.errMsg == "Comment not found..") {
                        commentBlock.parentElement.removeChild(commentBlock);
                        // remove this comment from global comment array
                        removeCommentsById(commentBlock.id);
                    }
                }
            },
            statusCode: {
                404: function() {
                    alert("Comment not found..");
                },
                500: function () {
                    alert("Internal Server ERROR");
                }
            }
        });
    }

    function removeReply(commentBlock) {
        $.ajax({
            method:'DELETE',
            data: {eventId: event.id, commentId: commentBlock.parentElement.id, replyId: commentBlock.id},
            url: '/reply/remove',
            dataType: 'json',
            success: function(res) {
                commentBlock.parentElement.removeChild(commentBlock);
            },
            error: function(err) {
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                404: function() {
                    alert("Reply deleted.\nPlease refresh the page.");
                }
            }
        });
    }

    function joinEvent() {
        $.ajax({
            method:'PATCH',
            data: {event_id: event.id},
            url: '/users/follows/event',
            dataType: 'json',
            success: function(res) {
                joinButton.innerText = 'Joined';
                console.log(res);
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                401: function () {
                    openLogInPopup("Join event? Please login to continue.").then(() => {
                        exitRefresh = true;
                        isJoined();
                    }).catch(()=>{});
                },
                404: function () {
                    alert("Not a Valid Event");
                }
            }
        });
    }

    function unJoinEvent() {
        $.ajax({
            method:'PATCH',
            data: {event_id: event.id},
            url: '/users/unfollows/event',
            dataType: 'json',
            success: function(res) {
                joinButton.innerText = 'I Want to Join';
            },
            error: function(err) {
                if (err.responseJSON) {
                    if (err.responseJSON.link) {
                        doJump(err.responseJSON.link);
                    }
                }
            },
            statusCode: {
                500: function () {
                    alert("Internal Server ERROR");
                },
                401: function () {
                    openLogInPopup("Session expired. Please login to continue.").then(() => {
                        exitRefresh = true;
                        unJoinEvent();
                    }).catch(()=>{});
                }
            }
        });
    }

    function getGoogleMap() {
        googleMap.src = `https://www.google.com/maps/embed/v1/place?key=AIzaSyAoTRQ4XHxOlEQVJO-3yMI_15G0lBZWH0U&q=${event.address}&zoom=17`
    }

    function doJump(link) {
        setTimeout(() => {
            window.location.href = link;
        }, 5000);
    }

    /*----------------------------------------------------------------------*/
    /*-- DOM manipulation to make the pop-up --*/
    /*----------------------------------------------------------------------*/

    /*- Some selectors needed -*/
    // const replyTags = this.popUp.querySelectorAll('.reply');
    // const deleteTags = this.popUp.querySelectorAll('.deleteComment');
    // const moreBars = this.popUp.querySelectorAll('.moreBar');
    const leftArrow = this.popUp.querySelector('#leftArrow');
    const rightArrow = this.popUp.querySelector('#rightArrow');
    const closeButton = this.popUp.querySelector('#close');

    // More selectors
    const commentSubmit = this.popUp.querySelector('#commentSubmit');
    const inputComment = this.popUp.querySelector('#inputComment');

    /*- create reply form here to use -*/
    const replyForm = document.createElement('form');
    replyForm.classList.add("fade");
    const replyInput = document.createElement('input');
    replyInput.type = 'text';
    replyInput.placeholder = 'Your reply..';
    replyInput.id = 'replyInput';
    const replyButton = document.createElement('input');
    replyButton.type = 'submit';
    replyButton.value = 'Reply';
    replyButton.id = 'replyButton';

    replyForm.appendChild(replyInput);
    replyForm.appendChild(replyButton);

    /*--------Add event listeners to each element below----------*/

    leftArrow.addEventListener('click', slideImg);
    rightArrow.addEventListener('click', slideImg);
    closeButton.addEventListener('click', closeClick.bind(this));
    this.popUp.addEventListener('click', backgroundClick.bind(this));

    // do more add
    commentSubmit.addEventListener('click', makeComment);
    replyButton.addEventListener('click', makeReply);

    // make the pop up
    function createEventPopUp(event) {
        const popUp = document.createElement('div');
        popUp.id = 'popUpBackground';
    
        const closeX = document.createElement('div');
        closeX.id = 'close';
        closeX.appendChild(document.createTextNode("close"));
    
        const postHolder = document.createElement('div');
        postHolder.id = 'postHolder';
        // top header
        const topHeader = document.createElement('div');
        topHeader.id = 'topHeader';
        // top header inside
        const h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode(event.title));
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(monthNames[event.date.getMonth()] + " " + event.date.getDate()));
        p.appendChild(document.createElement('br'));
        const location = createNewElement("span", null, "locationText", event.location);
        p.appendChild(location);
        const left = document.createElement('div');
        const lArrow = document.createElement('div'); // not
        left.id = 'leftArrowHolder';
        lArrow.id = 'leftArrow';
        left.appendChild(lArrow);
        const right = document.createElement('div');
        const rArrow = document.createElement('div'); // not
        right.id = 'rightArrowHolder';
        rArrow.id = 'rightArrow';
        right.appendChild(rArrow);
        const imgHolder = document.createElement('div');
        imgHolder.id = 'imgHolder';
        const backImgHolder = document.createElement('div');
        backImgHolder.id = 'backImgHolder';
        const img1 = document.createElement('img');
        const img2 = document.createElement('img');
        img1.classList.add('foreImg');
        img1.classList.add('fade');
        img1.src = event.img[0];
        img2.classList.add('backImg');
        img2.classList.add('fade');
        img2.src = event.img[0];
        imgHolder.appendChild(img1);
        backImgHolder.appendChild(img2);
        imgHolder.appendChild(backImgHolder);
        // push to img array for img slider
        imgSlideContent.push(img2);
        imgSlideContent.push(img1);
        for (let i = 1 ; i < event.img.length ; i++) {
            const img1 = document.createElement('img');
            const img2 = document.createElement('img');
            img1.src = event.img[i];
            img2.src = event.img[i];
            img1.classList.add('hiddenImg');
            img2.classList.add('hiddenImg');
            backImgHolder.appendChild(img2);
            imgHolder.appendChild(img1);
            // same here
            imgSlideContent.push(img2);
            imgSlideContent.push(img1);
            
        }    
        const darkSheet = createNewElement('div', 'darkSheet', null, null);
        const headerInfo = createNewElement('div', null, 'headerInfo', null);
        const anchor = createNewElement('a', null, 'eventOwner', "by " + event.creator);
        anchor.href = `/profile/${event.creatorId}`;
        headerInfo.appendChild(h1);
        headerInfo.appendChild(anchor);
        headerInfo.appendChild(p);
        topHeader.appendChild(imgHolder);
        topHeader.appendChild(darkSheet);
        topHeader.appendChild(left);
        topHeader.appendChild(right);
        topHeader.appendChild(headerInfo);
        // bottom part
        const bottomPart = createNewElement('div', null, 'bottomPart', null);
        // bottom part inside
        const joinButton = document.createElement('div');
        joinButton.id = 'joinButton';
        // need to check if user has already joined
        joinButton.appendChild(document.createTextNode("Loading"));

        const des = createNewElement('div', null, 'description', null);
        const h3 = createNewElement('h3', null, null, "Description"); // not
        des.appendChild(h3);
        const newD = event.description.split('\n');
        for (let i = 0 ; i < newD.length ; i++) {
            let bp = createNewElement('p', null, null, newD[i]); // not
            des.appendChild(bp);
        }
        
        
        //map
        const map = createNewElement('iframe', null, 'googleMap', null);
    
        const cBar = createNewElement('div', null, 'commentBar', null);
        const cForm = createNewElement('form', null, 'commentForm') // not
        const inputC = createNewElement('textarea', null, 'inputComment', null); // not
        inputC.placeholder = "Your comment...";
        inputC.required = true;
        const cSubmit = createNewElement('input', null, 'commentSubmit', null); // not
        cSubmit.value = "Comment";
        cSubmit.type = 'submit';
        cForm.appendChild(inputC);
        cForm.appendChild(cSubmit);
        cForm.appendChild(commentInputWarning);
        cBar.appendChild(cForm);
        // comment part below
        const commentArea = createNewElement('div', null, 'commentArea', null);

        bottomPart.appendChild(joinButton);
        bottomPart.appendChild(des);
        if (event.address != null && event.address != "") {
            bottomPart.appendChild(map);
        }
        
        bottomPart.appendChild(cBar);
        bottomPart.appendChild(commentArea);
    
        postHolder.appendChild(topHeader);
        postHolder.appendChild(bottomPart);
    
        popUp.appendChild(closeX);
        popUp.appendChild(postHolder);

        if (!event.allowComments) {
            cBar.style = "display: none;"
        }
        return popUp;
    }

    function createComments(comments) {
        if (commentArea.lastElementChild == moreComment) {
            commentArea.removeChild(moreComment);
        }
        for (let i = 0 ; i < comments.length; i++) {
            const newComment = createCommentBlock(comments[i], false);
            commentArea.appendChild(newComment);
        }
        if (!end) {
            commentArea.appendChild(moreComment);
        }
    }

    // helper to create a comment block with subcomments inside
    function createCommentBlock(comment, isSubcomment) {        
        const dateString = getTimeString(comment.date);

        const commentBlock = createNewElement('div', 'commentBlock', `${comment._id}`, null);
        
        const name = createNewElement('span', 'userName', null, comment.user.username);
        const userTag = createNewElement('div', 'userTag', null, null);
        if (adminMode == 2) {
            const rem = createNewElement('span', 'adminTag', null, 'Delete Permanently');
            userTag.appendChild(rem);
            rem.addEventListener('click', userRemoveClick);
        }
        if (adminMode && !comment.isDeleted) {
            const del = createNewElement('span', 'adminTag', null, 'Delete');
            userTag.appendChild(del);
            del.addEventListener('click', userDeleteClick);
        }
        if (adminMode && comment.isDeleted) {
            const rec = createNewElement('span', 'adminTag', null, 'Recover');
            userTag.appendChild(rec);
            rec.addEventListener('click', userRecoverClick);
        }
        if (isSubcomment == false && event.allowComments) {
            const reply = createNewElement('span', 'reply', null, "Reply"); // not
            reply.addEventListener('click', userReplyClick)
            userTag.appendChild(reply);
        }
        userTag.appendChild(document.createTextNode(dateString));
        const hr = createNewElement('hr', null, null, null);
        const pp = createNewElement('p', null, null, comment.message);

        // make a basic block here
        if (isSubcomment == false) {
            const profilePic = comment.user.profilePic;
            const pImg = createNewElement('img', 'profilePic', comment.user._id, null);
            pImg.src = profilePic;
            pImg.addEventListener("click", function (e) {
                window.location.href = `/profile/${comment.user._id}`;;
            })
            commentBlock.appendChild(pImg);
        }
        commentBlock.appendChild(name);
        commentBlock.appendChild(userTag);
        commentBlock.appendChild(hr);
        commentBlock.appendChild(pp);
        
        // now for the reply part
        if (comment.reply != null && comment.reply.length > 0) {
            for (let i = 0 ; i < comment.reply.length && i < maxReply ; i++) {
                const newReply = createCommentBlock(comment.reply[i], true);
                newReply.classList.add('subCommentBlock');
                commentBlock.appendChild(newReply);
                // commentBlock.insertBefore(newReply, commentBlock.children[commentBlock.children.length-1]);
                comment.replyLoaded += 1;
            }
            if (comment.reply.length > maxReply) {
                const barContainer = createNewElement('div', 'centerWrapper', `${comment._id}`, null);
                barContainer.appendChild(createMoreBar("More Reply"));
                barContainer.addEventListener('click', moreBarClick);
                commentBlock.appendChild(barContainer);
            }
        }
        
        return commentBlock;
    }

    // helper to create a more reply bar
    function createMoreBar(text) {
        const bar = createNewElement('div', 'moreBar', null, text);
        return bar;
    }

    // insert a new comment block
    function insertNewCommentBlock(comment){
        const commentBlock = createCommentBlock(comment, false);
        const newReply = commentBlock.querySelector('.reply');
        newReply.addEventListener("click", userReplyClick);
        commentBlock.classList.add("fade");
        commentArea.insertBefore(commentBlock, commentArea.children[0]);
    }

    // insert a new sub comment block
    function insertNewSubCommentBlock(comment, commentBlock){
        const replyBlock = createCommentBlock(comment, true);
        replyBlock.classList.add('subCommentBlock');
        commentBlock.removeChild(replyForm);
        commentBlock.classList.add("fade");
        commentBlock.insertBefore(replyBlock, commentBlock.children[5]);
    }

    /*-- Helper functions for DOM stuff here ---------------------*/

    // get the profile picture of user by username
    function getProfilePicture(username) {
        for (let i = 0 ; i < users.length ; i++) {
            if (username === users[i].usrName) {
                return users[i].pic;
            }
        }
    }

    // helper to get the time string
    function getTimeString(date) {
        const dateString = monthNames[date.getMonth()] + " " + date.getDate() + ", " 
                        + date.getHours() + ":" 
                        + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
        return dateString;
    }

    /*----------------------------------------------------------------------*/
    /*-- This part here is used for event listeners-------------------------*/
    /*-- Some involving create new elements using the DOM functions above---*/
    /*-- All base elements are assumed to be created here ------------------*/
    /*----------------------------------------------------------------------*/

    // close the pop-up
    function backgroundClick(e) {
        if (e.target.id == 'popUpBackground' && e.target.id != 'close') {
            closePopUp.bind(this)();
        }
    }

    function closeClick(e) {
            closePopUp.bind(this)();
    }

    function closePopUp() {
        console.log("here");
        this.popUp.parentElement.removeChild(this.popUp);
        for (let i = 0 ; i < 100 ; i++) {
            clearTimeout(i);
        }
        if (exitRefresh) {
            window.location.reload(true); 
        }
    }

    // for join button click
    function joinButtonClick(e) {
        if (e.target.innerText == 'I Want to Join') {
            joinEvent();
        }
        else {
            unJoinEvent();
        }
    }

    // for reply function
    function userReplyClick(e) {
        e.preventDefault();
        replyInput.placeholder = "Your reply..";
        replyInput.classList.remove("redInput");
        if (replyForm.parentElement != null) {
            replyForm.parentElement.removeChild(replyForm);
        }
        e.target.parentElement.parentElement.insertBefore(replyForm, e.target.parentElement.parentElement.children[5]);
    }

    // for delete function
    function userDeleteClick(e) {
        e.preventDefault();

        const commentBlock =  e.target.parentElement.parentElement;        
        // send server request to delete
        if (commentBlock.classList.contains("subCommentBlock")) {
            deleteReply(commentBlock, e.target);
        }
        else {
            deleteComment(commentBlock, e.target);
        }
    }

    // for delete function
    function userRecoverClick(e) {
        e.preventDefault();

        const commentBlock =  e.target.parentElement.parentElement;        
        // send server request to recover
        if (commentBlock.classList.contains("subCommentBlock")) {
            recoverReply(commentBlock, e.target);
        }
        else {
            recoverComment(commentBlock, e.target);
        }
    }

    function userRemoveClick(e) {
        e.preventDefault();

        const commentBlock =  e.target.parentElement.parentElement;        
        // send server request to remove
        if (commentBlock.classList.contains("subCommentBlock")) {
            removeReply(commentBlock);
        }
        else {
            removeComment(commentBlock);
        }
    }

    // for img slider
    function slideImg(e) {
        e.preventDefault();

        // check if there is img to slide
        // minimum 2 img (one fore img one back img)
        if (imgSlideContent.length == 2) {
            return;
        }
        let newIndex = 0;
        if (e.target.id == 'leftArrow') {
            newIndex = imgSlideIndex - 2 < 0 ? imgSlideContent.length - 2 : imgSlideIndex - 2;
        }
        else {
            newIndex = imgSlideIndex + 2 == imgSlideContent.length ? 0 : imgSlideIndex + 2;
        }
        // set class to new img and remove class from old img
        imgSlideContent[imgSlideIndex].classList.remove("backImg");
        imgSlideContent[imgSlideIndex+1].classList.remove("foreImg");
        imgSlideContent[imgSlideIndex].classList.remove("fade");
        imgSlideContent[imgSlideIndex+1].classList.remove("fade");
        imgSlideContent[imgSlideIndex].classList.add("hiddenImg");
        imgSlideContent[imgSlideIndex+1].classList.add("hiddenImg");

        imgSlideContent[newIndex].classList.add("backImg");
        imgSlideContent[newIndex+1].classList.add("foreImg");
        imgSlideContent[newIndex].classList.remove("hiddenImg");
        imgSlideContent[newIndex+1].classList.remove("hiddenImg");
        imgSlideContent[newIndex].classList.add("fade");
        imgSlideContent[newIndex+1].classList.add("fade");

        imgSlideIndex = newIndex;
    }

    // helper to get the correct comment by id 
    function getCommentById(id) {
        for (let i = 0 ; i < comments.length ; i++) {
            if (id == comments[i]._id) {
                return comments[i];
            }
        }
    }

    function removeCommentsById(id) {
        for (let i = 0 ; i < comments.length ; i++) {
            if (id == comments[i]._id) {
                comments.splice(i, 1);
                console.log("why not here");
            }
        }
    }

   
    /*-- Event listeners that do server calls and modify global data structure --*/

    // comment function
    function makeComment(e) {
        e.preventDefault();

        const text = inputComment.value;
        // the line below could be changed when doing server part
        if (text.trim() != "") {
            // add new comment to the database
            addCommentToServer(text);
        }
    }

    // make reply
    function makeReply(e) {
        e.preventDefault();
        const text = replyInput.value;
        if (text.trim() != "") {
            const commentBlock = e.target.parentElement.parentElement;
            // add new reply to the datebase
            addReplyToServer(text, commentBlock);
        }
    }

    // for more bar
    // comment list is assumed to be sorted already
    function moreBarClick(e) {
        e.preventDefault();
        if (e.target.id == 'moreComment') {
            getComments(event);
        }
        // more reply clicked
        else {
            const comment = getCommentById(e.target.parentElement.id);
            const commentBlock = e.target.parentElement.parentElement;
            commentBlock.removeChild(e.target.parentElement);
            const counter = comment.replyLoaded + loadNumber;

            for (let i = comment.replyLoaded ; i < comment.reply.length && i < counter ; i++) {
                const newBlock = createCommentBlock(comment.reply[i], true);
                newBlock.classList.add('subCommentBlock');
                const newDelete = newBlock.querySelector('.deleteComment');
                if (newDelete) {
                    newDelete.addEventListener('click', userDeleteClick);
                }
                commentBlock.appendChild(newBlock);
                comment.replyLoaded += 1;
            }
            if (comment.replyLoaded < comment.reply.length) {
                commentBlock.appendChild(e.target.parentElement);
            }
        }
    }
}

EventPopUp.prototype.getEventPopUp = function() {
    return this.popUp;
}
