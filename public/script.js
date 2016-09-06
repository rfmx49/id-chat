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
	//on tab load
	$('.nav-tabs a').on('shown.bs.tab', function(event) {
		//$(event.target).text(); //target tab
		onPageLoad($(event.target).text());
	});
	//on tab close
	$('.nav-tabs a').on('hidden.bs.tab', function(event) {
		onPageClose($(event.target).text());
	});
	submitButton.click(function() {sentMessage();});
	$('#messageInput').keypress(function (e) {
	if (e.which == 13) {sentMessage();}});
	$('body').on('click', 'a.user-list-item', function() {
		loadUser($(this.children[0]).text());
	});

	//chat tab handlers
	$('body').on('click', 'a.user-chat-item', function() {
		console.log(this.text);
		$("#chatEntries").html("");
		var chatTitle = $.trim(this.text);
		if (chatTitle == 'Global Chat') {
			$("#chatTitle").text(chatTitle);
			msgStoreRestore(chatTitle);
		}
		else {
			$("#chatTitle").text('Chatting with ' + chatTitle);
			msgStoreRestore('Chatting with ' + chatTitle);
		}
		sessionStorage.lastActiveChat = chatTitle;
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
		var lastActiveChat = sessionStorage.lastActiveChat;
		if (lastActiveChat == chatName) {
			//remove the chat choose a different last active from current chats list or pick global if none availible
			if (currentActiveChats.length == 0) {
				//set global chat as last active
				sessionStorage.lastActiveChat = 'Global Chat';
			}
			else {
				//set next active chat as last active
				//sessionStorage.lastActiveChat = currentActiveChats[0].name;
			}
		}
		//go to closed tab list when no other tabs availible.
		//TODO add tab to closed tabs list
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
	//check if mobile and change layout
	if (mobileCheck()) { mobileLayout(); }
	
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
	onPageLoad('Chat');
	//setup messageTracking storage
	var messageTracker = sessionStorage.messageTracker;
	if (typeof messageTracker === 'undefined') {
		sessionStorage.messageTracker = JSON.stringify([]);
	}
});

//Socket.io
var socket = io.connect();

//socket messages
socket.on('connect', function() {
	console.log('connected');
});
socket.on('nbUsers', function(msg) {
	$("#nbUsers").html(msg.nb);
});
socket.on('pseudoStatus', function(data) {
	console.log("User Status " + data);
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
});
//attepmt login with uuid
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
		sessionStorage.clear();
		sessionStorage['UUID'] = uuid();
		if (location.pathname == '/' ) {
			$('#modalPseudo').modal('show');
		}
		else {
			location.href = '/';
		}
	}
});
//for global messages
socket.on('message', function(data) {
	//are we on the global chat if not discard
	var chatTitle = $('#chatTitle').text().replace('Chatting with ','');
	if (chatTitle == 'Global Chat') {
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
	//let server know message was received
	socket.emit('messageStatusUpdate', {muid: data.muid, status: 3});
});
//Messagestatus
socket.on('messageStatus', function(data) {
	messageTrackingUpdate(data.muid, data.status);
});
//retrieve users list
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
});

//PAGE handling
function onPageLoad(pageName) {
	//check if this is system page
	if (pageName == 'Chat') {
		$("#alertPseudo").hide();
		setPseudoHideAlerts();
		//load chat tabs
		//private chat window
		//load all chat tabs and display the most recent		
		var activeChats = sessionStorage.activeChats;
		if (typeof activeChats === 'undefined') {
			//no active chats Global chat will remian active
			msgStoreRestore('Global Chat');
			return;
		}
		else {
			activeChats = JSON.parse(activeChats);
			var tabHtml;
			var lastActive = sessionStorage.lastActiveChat;
			for (var i=0;i < activeChats.length; i++) {
				//create tabs
				if (activeChats[i].username == lastActive) {
					tabHtml = '<li role="presentation" class="active"><a class="user-chat-item" id="' + activeChats[i].username + '"href="#"><span class="glyphicon glyphicon glyphicon-envelope mail-read" id="' + activeChats[i].username + '-mail"></span> ' + activeChats[i].username + ' <span class="glyphicon glyphicon glyphicon-remove"></span></a></li>';
					$("#chatTitle").text('Chatting with ' + activeChats[i].username);
					msgStoreRestore('Chatting with ' + activeChats[i].username);
				}
				else {
					tabHtml = '<li role="presentation" ><a class="user-chat-item" id="' + activeChats[i].username + '"href="#"><span class="glyphicon glyphicon glyphicon-envelope mail-read" id="' + activeChats[i].username + '-mail"></span> ' + activeChats[i].username + ' <span class="glyphicon glyphicon glyphicon-remove"></span></a></li>';
				}
				$('#userChatBar').append(tabHtml);
			}
			//go to active tab
		}
		//get chat name
		var chatName = $('#chatTitle').text();
		if (chatName == 'Global Chat') {
			msgStoreRestore(chatName);
		}
	}
	else if (pageName == "Users") {
		//generate user list
		setHeightUsers();
		getNetworkUsers();
		$(".user-list-item").click(function() {loadUser(this)});
	}
	else if (pageName == "Private") {
		
	}
}

function onPageClose(pageName) {
	if (pageName == 'Chat') {
		clearChat();
		//clear tab bar
		var defualtChatBar = '<li role="presentation"><a class="user-chat-item">Global Chat</a></li>';
		$('#userChatBar').html(defualtChatBar);
	}
}

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
			var messagePM = {uuid: sessionStorage['UUID'], recpiant: chatTitle, message : messageContainer.val(), muid: msgUID()};
			if (chatTitle == 'Global Chat') {
				socket.emit('message', messagePM);
				//add message to tracker.
				messageTrackingUpdate(messagePM.muid,1);	
				addMessage({msg: messagePM.message, pseudo: "Me", date: new Date().toISOString(), self:true, save: true,  read: true, muid: messagePM.muid});
				messageContainer.val('');
				submitButton.button('loading');
				//check for server reply
			}
			else {
				socket.emit('messagePrivate', messagePM);
				//add message to tracker.
				messageTrackingUpdate(messagePM.muid,1);	
				addMessage({msg: messagePM.message, pseudo: "Me", date: new Date().toISOString(), self:true, save: true,  read: true, muid: messagePM.muid});
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
		$("#chatEntries").append('<div class="' + classDiv + '"><p class="infos"><span class="pseudo">' + messageData.pseudo + '</span>, <time class="date" title="' + messageData.date + '">' + messageData.date + '</time>  <span id="' + messageData.muid + '-status" class="glyphicon ' + getMessageStatus(messageData.muid) + '"></span></p><p>' + messageData.msg + '</p></div>');
		time();		
		$("#chatEntries").slimScroll({ scrollTo: $("#chatEntries")[0].scrollHeight +'px'})
		if (messageData.save) { msgStoreSave(messageData, $('#chatTitle').text()); }
	}
	else {
		//check if sender is an activechat if not add to list and save message store
		//[{"username":"chat 7","unread":0}]
		var currentActiveChats = sessionStorage.activeChats;
		if (typeof currentActiveChats === 'undefined') { 
			currentActiveChats = []; 
		}
		else {
			currentActiveChats = JSON.parse(currentActiveChats);
		}
		//usersArray.find(x=> x.username ==='Jason').uuid
		var result = currentActiveChats.findIndex(x=> x.username === messageData.pseudo);
		if (result == -1) {
			//chat does not exists add to store
			//add user to active chat
			currentActiveChats.unshift({username: messageData.pseudo, unread:true});
			messageData.read = true;
			msgStoreSave(messageData, 'Chatting with ' + messageData.pseudo);
		}
		else {
			msgStoreSave(messageData, 'Chatting with ' + messageData.pseudo);
			messageData.read = true;
			currentActiveChats[result].unread = true;
		}
		sessionStorage.activeChats = JSON.stringify(currentActiveChats);
		
	}
	//mark message waiting
	messageData.read = true;

	
	//save message to storage
	//get room name
	//span#chatTitle GlobalChat 
}

function messageTrackingUpdate(muid, status) {	
	if (status == 1) {
		//add message to tracker.
		var messageTracker = JSON.parse(sessionStorage.messageTracker);
		messageTracker.push({muid: muid, status:1});
		sessionStorage.messageTracker = JSON.stringify(messageTracker);
	}
	else if (status == 2) {
		//private message received from server
		messageTrackingUpdateStatus(muid, status, false)
	}
	else if (status == 4) {	
		//private message received by server and recipiant
		messageTrackingUpdateStatus(muid, status, true)
	}
	else if (status == 5) {
		//global message recieved by server
		messageTrackingUpdateStatus(muid, status, true)
	}	
}

function messageTrackingUpdateStatus(muid, newStatus, removeMsg) {
	var messageTracker = JSON.parse(sessionStorage.messageTracker);
	//DEBUG TODO
	removeMsg = false;
	var result = messageTracker.findIndex(x=> x.muid === muid);
	if (result == -1) {
		console.log('message not found');
		return;
	}
	else {
		if (removeMsg) {
			messageTracker.splice(result,1)
		}
		else {
			messageTracker[result].status = newStatus;
		}
	}	
	sessionStorage.messageTracker = JSON.stringify(messageTracker);
}

function getMessageStatus(muid) {
	var messageTracker = JSON.parse(sessionStorage.messageTracker);
	var result = messageTracker.findIndex(x=> x.muid === muid);
	var glyph;
	if (result == -1) {
		glyph = "glyphicon-alert";
		return glyph;
	}
	else {
		var messageStatus = messageTracker[result].status;
		switch(messageStatus) {
			case 1:
				//message sent
				glyph = "glyphicon-transfer";
				return glyph;
			case 2:
				//message received on server
				glyph = "glyphicon-saved";
				return glyph;
			case 4:
				//message received by user
				glyph = "glyphicon-ok-sign";
				return glyph;
			case 5:
				//message received on server
				glyph = "glyphicon-saved";
				return glyph;
		}
	}	
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
	$("#usersListLarge").html("");
	socket.emit('retrieveUserList', currentPage);
}

function displayUser(userData) {
	var userRowHtml;
	userRowHtml = '<div class="row">';
	for (var i = 0; i < userData.length; i++) {
		userRowHtml = userRowHtml + '<div class="col-md-4"><a href="#" class="list-group-item user-list-item"><h4 class="list-group-item-heading">' + userData[i].username + '</h4><p class="list-group-item-text">' + userData[i].age + userData[i].sex +'</p></a></div>'
	}
	userRowHtml = userRowHtml + '</div>';
	$('#usersListLarge').append(userRowHtml);
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
		currentActiveChats.unshift({username: username, unread:false});
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
	//location.href = 'chat';
	$('.nav-tabs a[href="#homeAnchor"]').tab('show');
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


//clear chat window

function clearChat() {
	$("#chatEntries").html("");
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

//genereate a messageID
function msgUID() {
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
    return 'Mxxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
}

function time() {
	$("time").each(function(){
		$(this).text($.timeago($(this).attr('title')));
	});
}

function mobileCheck() {
	if ($('#desktopTest').is(':hidden')) {
		//mobile device
		return true;
	}
	else {
		//return device is not small
		return false;
	}
}

//change mobile layout so that the sidePanel is on bottom
function mobileLayout() {
	//chage order
	$('#middlePanel').insertBefore('#sidePanel');
	//fix margins
	$('#messageInput').css({'margin-top':'10px'});
	$('#middlePanel').css({'padding-right':'0'});
	$('#sidePanel').css({'padding-left':'0'});

}

function setHeight() {
	var slimHeight = $(window).height() * .6;
	$("#chatEntries").height(slimHeight);
	$("#chatEntries").height()-($(document).height()-$(window).height())
	$("#chatEntries").slimScroll({height: 'auto', start: 'bottom'});
	
	$("#userEntries").height($($('#chatEntries').parent()).height() + $('#entries').height());
	$("#userEntries").slimScroll({height: 'auto', start: 'top'});
	//$(".slimScrollDiv").height('auto');
}

function setHeightUsers() {
	if (($("#usersListLarge").parent()).attr('class') != 'slimScrollDiv') {
		var slimHeight = $(window).height() * .7;
		$("#usersListLarge").height(slimHeight);
		$("#usersListLarge").height()-($(document).height()-$(window).height())
		$("#usersListLarge").slimScroll({height: 'auto', start: 'bottom'});
		//$(".slimScrollDiv").height('auto');
	}
}
