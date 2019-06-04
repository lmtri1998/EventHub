const log = console.log;
const logo = document.querySelector(".logoImg");
logo.addEventListener('click', goHome);

function goHome(e) {
	if(e.target.className == "logoImg") {
		e.preventDefault();
		window.location.href = "/";
	}
}
