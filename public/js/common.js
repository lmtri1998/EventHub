
// helper to create new element
function createNewElement(type, clss, id, txt) {
    const container = document.createElement(type);
    if ( (typeof clss !== "undefined") && clss != null ){
        container.className = clss;
    }
    if ( (typeof txt !== "undefined") && txt != null ){
        container.appendChild(document.createTextNode(txt));
    }
    if ((typeof id !== "undefined") && id != null) {
        container.id = id;
    }
    return container;
}

$li = $('#topBar li').click(function() {
    $li.removeClass('selected');
    $(this).addClass('selected');

});

function openLogInPopup(msg) {
    const logo = createNewElement("img", "logo");
    logo.src = "/pictures/webPic/logo.png";
    const message = createNewElement("h2", null, null, msg);
    const username = createNewElement("h3", null, null, "Username");
    const usernameInput = createNewElement("input");
    usernameInput.type = "text";
    usernameInput.name = "uname";
    usernameInput.placeholder = "Enter Username";
    const password = createNewElement("h3", null, null, "Password");
    const passwordInput = createNewElement("input");
    passwordInput.type = "password";
    passwordInput.name = "psw";
    passwordInput.placeholder = "Enter Password";
    const errMsg = createNewElement("h5", "errMsg", null, "");
    const submit = createNewElement("input");
    submit.type = "submit";
    submit.value = "Log In";
    const signUp = createNewElement("a", null, null, "Sign Up");
    signUp.href = "/signup"
    const signUpMsg = createNewElement("h5", null, null, "Dont have an account? ");
    signUpMsg.appendChild(signUp);
    signUpMsg.appendChild(document.createTextNode(" Here!"));
    const loginPop = createNewElement("form", null, "loginPop");
    loginPop.append(logo, message, username, usernameInput, password, passwordInput, errMsg, submit, signUpMsg);
    const background = createNewElement("div", null, "loginPopBackground");
    background.appendChild(loginPop);
    document.body.appendChild(background);

    return new Promise((resolve, reject) => {
        background.addEventListener('click', e => {
            if (e.target.id == "loginPopBackground"){
                e.preventDefault();
                e.target.remove();
                reject();
            }
        })
        submit.addEventListener("click", function(e){
            e.preventDefault();
            $("#loginPop").ajaxSubmit({
                method:'POST',
                url: '/users/login',
                dataType: 'json',
                statusCode: {
                    401: function() {
                        while (errMsg.firstChild){
                            errMsg.removeChild(errMsg.firstChild)
                        }
                        errMsg.appendChild(document.createTextNode("Incorect Username/Password!"))
                    },
                    200: function() {
                        background.remove();
                        resolve();
                    }
                }
            });
        })
    })
}
