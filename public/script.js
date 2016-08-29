var messageContainer, submitButton;
var pseudo = "";

// Init
$(function() {
	messageContainer = $('#messageInput');
	submitButton = $("#submit");
	bindButton();
	checkUUID();
	window.setInterval(time, 1000*10);
	//Click handlers
	$("#navHome").click(function() {navHome()});
	$("#navInbox").click(function() {navInbox()});
	$("#navChat").click(function() {navChat()});
	submitButton.click(function() {sentMessage();});
	$('#messageInput').keypress(function (e) {
	if (e.which == 13) {sentMessage();}});
	$('body').on('click', 'a.user-list-item', function() {
		loadUser($(this.children[0]).text());
	});
	/*$('body').on('click', 'select#pseudoAgeInput', function() {
		console.log('Age List Clicked');
		var ageListHtml;
		for (var i = 18;i<90;i++) {
			ageListHtml = ageListHtml + '<option value="' + i + '">' + i + '</option>';
		}
		$('#pseudoAgeInput').html(ageListHtml);
	});*/
	
	setHeight();
	if (typeof sessionStorage['username'] === 'undefined') {
		if (location.pathname == '/' ) {
			$('#modalPseudo').modal('show');
		}
		else {
			location.href = '/';
		}
		//set button functions
	} 
	$("#pseudoSubmit").click(function() {setPseudo()});
	onPageLoad();	
});

//PAGE handling
function onPageLoad() {
	//get page name
	var pageName = $('#chatTitle').text();
	//check if this is system page
	if (pageName == 'GlobalChat') {
		$("#alertPseudo").hide();
		$("#alertPseudoBlank").hide();
		$("#alertPseudoLong").hide();
		$("#alertPseudoCountry").hide();
		$("#alertPseudoRegion").hide();
	}
	if (pageName.indexOf("Chat") != -1) {
		msgStoreRestore(pageName);
	}
	else if (pageName == "User List") {
		//generate user list
		getNetworkUsers();
		$(".user-list-item").click(function() {loadUser(this)});
	}
	else if (pageName == "Private") {
		//private chat window
		//load all chat tabs and display the most recent
		$('body').on('click', 'a.user-chat-item', function() {
			console.log(this.text);
			$("#chatEntries").html("");
			$("#chatTitle").text('Chatting with ' + this.text);
			msgStoreRestore('Chatting with ' + this.text);
			sessionStorage.lastActiveChat = this.text;
			$(this.parentElement).addClass('active').siblings().removeClass('active');
		});
		//close tab
		$('body').on('click', 'span.glyphicon-remove', function(event) {
			event.stopPropagation();
			var chatName = $($('span.glyphicon-remove')[0].closest('a')).text();
			//remove name from active chat list
			var currentActiveChats = sessionStorage.activeChats;
			currentActiveChats = JSON.parse(currentActiveChats);
			var currentChat = currentActiveChats.findIndex(x=> x.username === chatName);
			currentActiveChats.splice(currentChat,1);
			sessionStorage.activeChats = JSON.stringify(currentActiveChats);
			$($(this)[0].closest('li')).remove();
			//what to do when closing active tab...
			//go to nearest tab
			//go to closed tab list when no other tabs availible.
			//TODO add tab to closed tabs list
		});
		var activeChats = sessionStorage.activeChats;
		if (typeof activeChats === 'undefined') {
			location.href = 'users';
			return;
		}
		else {
			activeChats = JSON.parse(activeChats);
			var tabHtml;
			var lastActive = sessionStorage.lastActiveChat;
			for (var i=0;i < activeChats.length; i++) {
				//create tabs
				if (activeChats[i].username == lastActive) {
					tabHtml = '<li role="presentation" class="active"><a class="user-chat-item" id="' + activeChats[i].username + '"href="#">' + activeChats[i].username + '<span class="glyphicon glyphicon glyphicon-remove"></span></a></li>';
					$("#chatTitle").text('Chatting with ' + activeChats[i].username);
					msgStoreRestore('Chatting with ' + activeChats[i].username);
				}
				else {
					tabHtml = '<li role="presentation" ><a class="user-chat-item" id="' + activeChats[i].username + '"href="#">' + activeChats[i].username + '<span class="glyphicon glyphicon glyphicon-remove"></span></a></li>';
				}
				$('#userChatBar').append(tabHtml);
			}
			//go to active tab
		}
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
//for global messages
socket.on('message', function(data) {
	//are we on the global chat if not discard
	var chatTitle = $('#chatTitle').text().replace('Chatting with ','');
	if (chatTitle == 'GlobalChat') {
		addMessage({msg: data.message, pseudo: data.pseudo, date: new Date().toISOString(), self:false, save: true, read: true});
	}
	else {
		//save message for later.
		//chage to discard to save build up
		return;
		//addMessage({msg: data.message, pseudo: data.pseudo, date: new Date().toISOString(), self:false, save: true, read: false});
	}
});
//for private messages
socket.on('messagePrivate', function(data) {
	//are we on the window?
	//get chat title.
	var chatTitle = $('#chatTitle').text().replace('Chatting with ','');
	if (chatTitle == data.pseudo) { 
		addMessage({msg: data.message, pseudo: data.pseudo, date: new Date().toISOString(), self:false, save: true, read: true});
	}
	else {
		//save message for later.
		addMessage({msg: data.message, pseudo: data.pseudo, date: new Date().toISOString(), self:false, save: true, read: false});
	}
});

//Help functions
function sentMessage() {
	console.log("Clicked");
	if (messageContainer.val() != "") 
	{
		if (pseudo == "") 
		{
			if (location.pathname == '/' ) {
				$('#modalPseudo').modal('show');
			}
			else {
				location.href = '/';
			}
		}
		else 
		{
			//check if this is a private message
			//get chattitle
			var chatTitle = $('#chatTitle').text().replace('Chatting with ','');
			if (chatTitle == 'GlobalChat') {
				socket.emit('message', messageContainer.val());
				addMessage({msg: messageContainer.val(), pseudo: "Me", date: new Date().toISOString(), self:true, save: true,  read: true});
				messageContainer.val('');
				submitButton.button('loading');
			}
			else {
				var messagePM = {recpiant: chatTitle, message : messageContainer.val()};
				
				socket.emit('messagePrivate', messagePM);
				addMessage({msg: messageContainer.val(), pseudo: "Me", date: new Date().toISOString(), self:true, save: true,  read: true});
				messageContainer.val('');
				submitButton.button('loading');
			}
			
		}
	}
}
function addMessage(messageData) {
	if	(messageData.self) {
		var classDiv = "row message self";
	}
	else {
		var classDiv = "row message";
	}
	if (messageData.read) {
		$("#chatEntries").append('<div class="'+classDiv+'"><p class="infos"><span class="pseudo">'+messageData.pseudo+'</span>, <time class="date" title="'+messageData.date+'">'+messageData.date+'</time></p><p>' + messageData.msg + '</p></div>');
		time();		
		$("#chatEntries").slimScroll({ scrollTo: $("#chatEntries")[0].scrollHeight +'px'})
	}
	//mark message waiting
	messageData.read = true;

	
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

//User login
function setPseudo() {
	var uuidStorage = sessionStorage['UUID'];
	sessionStorage.clear();
	sessionStorage['UUID'] = uuidStorage;
	//clear chat window
	//get varibles from form
	
	var userData = {username: $("#pseudoInput").val(),age: $("#pseudoAgeInput").val(),sex: $("#pseudoSexInput").val(), uuid: uuidStorage, country: $("#pseudoCountryInput").val(), region: $("#pseudoRegionInput").val()};
	//client side check of varibles
	//Name not blacnk and smaller than 14 characters
	if (userData.username == "") {
		setPseudoHideAlerts();
		$("#alertPseudoBlank").show();
		console.log("alertPseudoBlank");
		return;
	}
	else if (userData.username.length > 14) {
		setPseudoHideAlerts();
		$("#alertPseudoLong").show();
		console.log("alertPseudoLong");
		return;
	}
	else if (typeof userData.country === 'undefined') {
		setPseudoHideAlerts();
		$("#alertPseudoCountry").show();
		console.log("alertPseudoCountry");
		return;
	}
	else if (userData.region == "") {
		setPseudoHideAlerts();
		$("#alertPseudoRegion").show();
		console.log("alertPseudoRegion");
		return;
	}
	//Age above 18

	//country selected

	//region selected
	socket.emit('setPseudo', userData);
	socket.on('pseudoStatus', function(data){
		if(data == "ok")
		{
			$('#modalPseudo').modal('hide');
			setPseudoHideAlerts();
			pseudo = $("#pseudoInput").val();
		}
		else
		{
			$("#alertPseudo").slideDown();
		}
	})
}

function setPseudoHideAlerts() {
	$("#alertPseudo").hide();
	$("#alertPseudoBlank").hide();
	$("#alertPseudoLong").hide();
	$("#alertPseudoCountry").hide();
	$("#alertPseudoRegion").hide();
}

function getNetworkUsers(page) {
	var currentPage = 1;
	$("#chatEntries").html("");
	socket.emit('retrieveUserList', currentPage);

	socket.on('userListAnswer', function(data){
			console.log(data);
			var displayRow = [];
			for (var i = 0; i < data.length; i++) {
				console.log("Displaying user " + i + ": " + data[i].username);
				if (i !=0 && ((i+1)%3 == 0 || i+1 == data.length)) {
					displayRow.push(data[i]);
					displayUser(displayRow);
					displayRow = [];
				}
				else {
					displayRow.push(data[i]);
				}
			}
		})
}

function displayUser(userData) {
	var userRowHtml;
	userRowHtml = '<div class="row">';
	for (var i = 0; i < userData.length; i++) {
		userRowHtml = userRowHtml + '<div class="col-md-4"><a href="#" class="list-group-item user-list-item"><h4 class="list-group-item-heading">' + userData[i].username + '</h4><p class="list-group-item-text">' + userData[i].age + userData[i].sex +'</p></a></div>'
	}
	userRowHtml = userRowHtml + '</div>';
	$('#chatEntries').append(userRowHtml);
}

function loadUser(username) {
	console.log(username);
	//add to activechat seesions
	var currentActiveChats = sessionStorage.activeChats;
	if (typeof currentActiveChats === 'undefined') { 
		currentActiveChats = []; 
	}
	else {
		currentActiveChats = JSON.parse(currentActiveChats);
	}
	//usersArray.find(x=> x.username ==='Jason').uuid
	var result = currentActiveChats.findIndex(x=> x.username === username)
	if (result == -1) {
		//has not been added add to front of list.
		currentActiveChats.unshift({username: username, unread:0});
	}
	else {
		//place back at front of list
		var userDetails = currentActiveChats[result];
		currentActiveChats.splice(result, 1);
		currentActiveChats.unshift(userDetails);
	}
	sessionStorage.activeChats = JSON.stringify(currentActiveChats);
	sessionStorage.lastActiveChat = username;
	//load chat window
	location.href = 'chat';
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
	sessionStorage.lastActiveChat = 'GlobalChat';
	console.log('Clicked Home');
}

function navInbox() {
	console.log('Clicked Inbox');
}

function navChat() {
	console.log('Clicked Chat');
}

function navUsers() {
	console.log('Clicked Users');
}

//clear chat window

function clearChat() {
	$("#chatEntries").html("");
}

//check to see if uuid is already created
function checkUUID() {
	if (typeof sessionStorage['UUID'] === 'undefined') {
		//no uuid in session storage generate one
		sessionStorage.clear();
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
				if (location.pathname == '/' ) {
					$('#modalPseudo').modal('show');
				}
				else {
					location.href = '/';
				}
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
	$("#chatEntries").slimScroll({height: 'auto', start: 'bottom'});
	//$(".slimScrollDiv").height('auto');
}
