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
	
});

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
	addMessage(data['message'], data['pseudo'], new Date().toISOString(), false);
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
			addMessage(messageContainer.val(), "Me", new Date().toISOString(), true);
			messageContainer.val('');
			submitButton.button('loading');
		}
	}
}
function addMessage(msg, pseudo, date, self) {
	if(self) var classDiv = "row message self";
	else var classDiv = "row message";
	$("#chatEntries").append('<div class="'+classDiv+'"><p class="infos"><span class="pseudo">'+pseudo+'</span>, <time class="date" title="'+date+'">'+date+'</time></p><p>' + msg + '</p></div>');
	time();
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
	/*('#mainContent').html('<div id="chatEntriesPanel" class="panel panel-primary">\
	<div class="panel-heading">\
		<h3><span id=Private Chat</hr>\
	</div>\
	<div class="panel-body">\
	<div id="#chatEntries"></div>\
	<div class="row" id="#entries">\
	<input type="text" id="messageInput></input>\
	<div class="btn-group" id="submit" data-loading-text="Sending">Send</div>\
	</div>\
	</div>');
	/*
	div#chatEntriesPanel(class="panel panel-primary ")
					div(class="panel-heading")
						h3
							span#chatTitle GlobalChat
					div(class="panel-body")
						div#chatEntries
						div.row#entries
							input(type='text')#messageInput
							div.btn-group
								button.btn#submit(data-loading-text="Send") Send*/
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
