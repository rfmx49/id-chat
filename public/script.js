var messageContainer, submitButton;
var pseudo = "";

// Init
$(function() {
	messageContainer = $('#messageInput');
	submitButton = $("#submit");
	bindButton();
	checkUUID();
	window.setInterval(time, 1000*10);
	$("#alertPseudo").hide();
	//Navbar
	$("#navHome").click(function() {navHome()});
	$("#navInbox").click(function() {navInbox()});
	$("#navChat").click(function() {navChat()});
	setHeight();
	submitButton.click(function() {sentMessage();});
	$('#messageInput').keypress(function (e) {
	if (e.which == 13) {sentMessage();}});
	if (typeof sessionStorage['username'] === 'undefined') {
		$('#modalPseudo').modal('show');
		//set button functions
	} 
	$("#pseudoSubmit").click(function() {setPseudo()});
	onPageLoad();	
});

function onPageLoad() {
	//get page name
	var pageName = $('#chatTitle').text();
	//check if this is system page
	if (pageName.indexOf("Chat") != -1) {
		msgStoreRestore(pageName)
	}
	
}

//Socket.io
var socket = io.connect();
socket.on('connect', function() {
	console.log('connected');
});
socket.on('nbUsers', function(msg) {
	$("#nbUsers").html(msg.nb);
});
socket.on('pseudoStatus', function(msg) {
	console.log("User Status " + msg);
});
socket.on('message', function(data) {
	addMessage({msg: data['message'], pseudo: data['pseudo'], date: new Date().toISOString(), self:false, save: true});
	console.log(data);
});

//Help functions
function sentMessage() {
	console.log("Clicked");
	if (messageContainer.val() != "") 
	{
		if (pseudo == "") 
		{
			$('#modalPseudo').modal('show');
		}
		else 
		{
			socket.emit('message', messageContainer.val());
			addMessage({msg: messageContainer.val(), pseudo: "Me", date: new Date().toISOString(), self:true, save: true});
			messageContainer.val('');
			submitButton.button('loading');
		}
	}
}
function addMessage(messageData) {
	if(messageData.self) var classDiv = "row message self";
	else var classDiv = "row message";
	$("#chatEntries").append('<div class="'+classDiv+'"><p class="infos"><span class="pseudo">'+messageData.pseudo+'</span>, <time class="date" title="'+messageData.date+'">'+messageData.date+'</time></p><p>' + messageData.msg + '</p></div>');
	time();
	//save message to storage
	//get room name
	//span#chatTitle GlobalChat
	if (messageData.save) { msgStoreSave(messageData, $('#chatTitle').text()); }
}

function bindButton() {
	submitButton.button('loading');
	messageContainer.on('input', function() {
		if (messageContainer.val() == "") submitButton.button('loading');
		else submitButton.button('reset');
	});
}
function setPseudo() {
	if ($("#pseudoInput").val() != "")
	{
		var userData = {username: $("#pseudoInput").val(),age: $("#pseudoAgeInput").val(),sex: $("#pseudoSexInput").val(), uuid: sessionStorage['UUID']}
		socket.emit('setPseudo', userData);
		socket.on('pseudoStatus', function(data){
			if(data == "ok")
			{
				$('#modalPseudo').modal('hide');
				$("#alertPseudo").hide();
				pseudo = $("#pseudoInput").val();
			}
			else
			{
				$("#alertPseudo").slideDown();
			}
		})
	}
}

//Message Storage/restore

function msgStoreSave(data, room) {
	var currentStore;
	if (typeof sessionStorage['msgStore-' + room] === 'undefined') {
		currentStore = []
	}
	else {
		currentStore = sessionStorage['msgStore-' + room];
		currentStore = JSON.parse(currentStore);
	}	
	currentStore.push(data);
	sessionStorage['msgStore-' + room] = JSON.stringify(currentStore);
}

function msgStoreRestore(room) { 
	if (typeof sessionStorage['msgStore-' + room] !== 'undefined') {
		var currentStore = sessionStorage['msgStore-' + room];
		currentStore = JSON.parse(currentStore);
		//loop data and send to addMessage(messageData)
		var restoreMessage;
		while (currentStore.length) {
			restoreMessage = currentStore.shift();			
			restoreMessage.save = false; //do not resave message
			addMessage(restoreMessage);
		}
	}	
}

//navigation

function navHome() {
	console.log('Clicked Home');
	$('#mainContent').html("");
}

function navInbox() {
	console.log('Clicked Inbox');
	$('#mainContent').html("");
}

function navChat() {
	console.log('Clicked Chat');
}


//check to see if uuid is already created
function checkUUID() {
	if (typeof sessionStorage['UUID'] === 'undefined') {
		//no uuid in session storage generate one
		sessionStorage['UUID'] = uuid();
	}
	else {
		//check cached login
		if (typeof sessionStorage['username'] !== 'undefined') {
			//enter old username to prevent reg screen from popping up
			pseudo = sessionStorage['username'];
		}
		//attempt login with server
		socket.emit('uuidLogin', sessionStorage['UUID']);
		socket.on('loginStatus', function(data){
			if(data != "failed")
			{
				$('#modalPseudo').modal('hide');
				$("#alertPseudo").hide();
				pseudo = data.username;
				sessionStorage['username'] = data.username;
				console.log(data);
			}
			else
			{
				sessionStorage['UUID'] = uuid();
				$('#modalPseudo').modal('show');
			}
		})
	}
}

//genereate a uuid
function uuid() {
    function randomDigit() {
        if (crypto && crypto.getRandomValues) {
            var rands = new Uint8Array(1);
            crypto.getRandomValues(rands);
            return (rands[0] % 16).toString(16);
        } else {
            return ((Math.random() * 16) | 0).toString(16);
        }
    }
    var crypto = window.crypto || window.msCrypto;
    return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
}

function time() {
	$("time").each(function(){
		$(this).text($.timeago($(this).attr('title')));
	});
}
function setHeight() {
	var slimHeight;
	slimHeight = $(window).height() *.50;
	$("#chatEntries").height(slimHeight);
	$("#chatEntries").slimScroll({height: 'auto'});
	//$(".slimScrollDiv").height('auto');
}
