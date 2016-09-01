//	Customization

var appPort = 1200;

// Librairies

var express = require('express'), app = express();
var http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);


var pug = require('pug');
// var io = require('socket.io').listen(app);
//var pseudoArray = ['admin']; //block the admin username (you can disable it)
var usersArray = ['admin'];

var DataStore = require('nedb');
db = {};
db.users = new DataStore({filename: 'users.db', autoload: true});



//user object

function userObj(data) {
	this.username = data.username;
	this.userid = data.userid;
	this.sex = data.sex;
	this.age = data.age;
	this.address = data.address;
	this.uuid = data.uuid;
	this.lastactive = new Date().toISOString();
}

// Views Options

app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.set("view options", { layout: false });

app.use(express.static(__dirname + '/public'));

// Render and send the main page

app.get('/', function(req, res){
  res.render('home.pug');
});

server.listen(appPort);
// app.listen(appPort);
console.log("Server listening on port " + appPort); 

// Handle the socket.io connections

var users = 0; //count the users

io.sockets.on('connection', function (socket) { // First connection
	users += 1; // Add 1 to the count
	reloadUsers(); // Send the count to all the users
	socket.on('message', function (data) { // Broadcast the message to all
		if(pseudoSet(socket)){
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data.message};
			socket.broadcast.emit('message', transmit);
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
		else {
			console.log("User not logged in");
			sendGlobalMessageUuid(data, socket);
			
		}
	});
	socket.on('messagePrivate', function (data) { // Broadcast the message to one
		if(pseudoSet(socket)) {
			sendPrivateMessage(data, socket);
		}
		else {
			sendPrivateMessageUuid(data, socket);
		}
	});
	socket.on('setPseudo', function (data) { // Assign a name to the user
		//if (pseudoArray.indexOf(data.username) == -1) // Test if the name is already taken

		if (data.username == "") {
			console.log("alertPseudoBlank");
			socket.emit('alertPseudoBlank', 'ok');
			return;
		}
		else if (data.username.length > 14) {
			console.log("alertPseudoLong");
			socket.emit('alertPseudoLong', 'ok');
			return;
		}
		else if (typeof data.country === 'undefined') {
			console.log("alertPseudoCountry");
			socket.emit('alertPseudoCountry', 'ok');
			return;
		}
		else if (data.region == "") {
			console.log("alertPseudoRegion");
			socket.emit('alertPseudoRegion', 'ok');
			return;
		}
		
		if (usersArray.findIndex(x=> x.username == data.username) == -1) 
		{
			//check for blank entries, JS on cleint side should have picked this up unless socket request is sent seperatly.
			
			//pseudoArray.push(data.username);
			console.log(data.uuid);
			socket.nickname = data.username;
			var newUser = new userObj({username: data.username, userid: socket.id, sex:data.sex, age:data.age, address: socket.handshake.address, uuid: data.uuid});
			//usersArray.push(newUser);
			//nedb add to database
			db.users.insert(newUser, function (err, newdoc) { 
				console.log("New user added to database - " + JSON.stringify(newdoc) + " --- " + err);
			});
			console.log(socket.sessionId);
			socket.emit('pseudoStatus', 'ok');
			console.log("user " + data.username + " connected");
		}
		else
		{
			socket.emit('pseudoStatus', 'error') // Send the error
		}
	});
	socket.on('disconnect', function () { // Disconnection of the client
		users -= 1;
		reloadUsers();
		if (pseudoSet(socket))
		{
			console.log("disconnect...");
			var pseudo;
			pseudo = socket.nickname;
			//var index = pseudoArray.indexOf(pseudo);
			//pseudoArray.slice(index - 1, 1);
		}
	});
	socket.on('uuidLogin', function(uuid) { // Attempt to login with uuid
		var olduser = db.users.find({"uuid": uuid}, function (err, docs) {
			console.log("UUID Found = " + JSON.stringify(docs));
			console.log(docs.length);
			if (docs.length == 0) {
				console.log("Login Failed for " + uuid);
				socket.emit('loginStatus', 'failed');
				return;
			}
			else {
				console.log("User found");
				var logonUser = docs[0];
				console.log(logonUser);		
				logonUser.userid = socket.id;
				socket.nickname = logonUser.username;
				//update doc in DB
				db.users.update({_id: logonUser._id}, logonUser,{ upsert: true }, function() {});
				socket.emit('pseudoStatus', 'ok');
				socket.emit('loginStatus', logonUser);
			}
		});		
	});
	socket.on('findUser', function (username) { // Attempt to login with uuid
		if (username != null) {
			getUserAccountByName(username);
		}		
	});
	socket.on('findUuidUser', function (uuid) { // Attempt to login with uuid
		if (uuid != null) {
			getUserAccountByUUID(uuid);
		}		
	});
	socket.on('retrieveUserList', function (data) { // Attempt to login with uuid
				getUsers(50, socket);
	});
	socket.on('debugFunction', function (data) { // Attempt to login with uuid
				getUsers();
	});
});

function sendGlobalMessageUuid(data, socket) {
	//check if uuid is active
	var uuidSender = db.users.find({"uuid": data.uuid}, function (err, docs) {
		console.log("UUID Found = " + JSON.stringify(docs));
		console.log(docs.length);
		if (docs.length == 0) {
			console.log("false uuid " + data.uuid);
			socket.emit('loginStatus', 'failed');
			return;
		}
		else {
			console.log("User found");
			var logonUser = docs[0];
			console.log(logonUser);		
			logonUser.userid = socket.id;
			socket.nickname = logonUser.username;
			//update doc in DB
			db.users.update({_id: logonUser._id}, logonUser,{ upsert: true }, function() {});
			socket.emit('pseudoStatus', 'ok');
			socket.emit('loginStatus', logonUser);
			//send message
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data.message};
			socket.broadcast.emit('message', transmit);
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
	});
}

function sendPrivateMessageUuid(data, socket) {
	//check if uuid is active
	var uuidSender = db.users.find({"uuid": data.uuid}, function (err, docs) {
		console.log("UUID Found = " + JSON.stringify(docs));
		console.log(docs.length);
		if (docs.length == 0) {
			console.log("false uuid " + data.uuid);
			socket.emit('loginStatus', 'failed');
			return;
		}
		else {
			console.log("User found");
			var logonUser = docs[0];
			console.log(logonUser);		
			logonUser.userid = socket.id;
			socket.nickname = logonUser.username;
			//update doc in DB
			db.users.update({_id: logonUser._id}, logonUser,{ upsert: true }, function() {});
			socket.emit('pseudoStatus', 'ok');
			socket.emit('loginStatus', logonUser);
			//send message
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data.message};
			//send message to recipiant
			socket.broadcast.to(docs[0].userid).emit('messagePrivate', transmit);
			//send acknoledgement to sender
			socket.emit('messagePrivateStatus', 1);
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
	});
}

function sendPrivateMessage(data, socket) {
	//get user from database
	console.log("Data post 1: " + JSON.stringify(data));
	var recpiant = db.users.find({"username": data.recpiant}, function (err, docs) {
		console.log("UserName found = " + JSON.stringify(docs[0]));
		console.log("Data post 2: " + JSON.stringify(data));
		if (docs.length == 0) {
			console.log("PM to unidentified user " + data.uuid);
			socket.emit('pmStatus', 'user-not-exist');
			return;
		}
		else {
			/*console.log("PM received for " + data.recpiant + " found the following user " + docs[0].username);
			console.log("the message is " + data.message + " to " + docs[0].userid + " from " + socket.nickname);*/
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data.message};
			//send message to recipiant
			socket.broadcast.to(docs[0].userid).emit('messagePrivate', transmit);
			//send acknoledgement to sender
			socket.emit('messagePrivateStatus', 1);
		}			
	});
}

function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', {"nb": users});
}
function pseudoSet(socket) { // Test if the user has a name
	var test;
	if (socket.nickname == null ) test = false;
	else test = true;
	return test;
}

function getUserAccountByName(username) {
	var result = db.users.find({"username": username}, function (err, docs) {
		console.log("Doc = " + JSON.stringify(docs));
		console.log("err = " + err);		
	});
}

function getUserAccountByUUID(uuid) {
	var result = db.users.find({"uuid": uuid}, function (err, docs) {
		console.log("Doc = " + JSON.stringify(docs));
		console.log("err = " + err);		
	});
}

function getUsers(qty, socket) {
	//var result = db.users.find({"uuid": {$exists: true}}, {username: 1, age: 1, sex: 1}, function (err, docs) {
	var result = db.users.find({"uuid": {$exists: true}}, {username: 1, age: 1, sex: 1, _id: 0}).sort({lastactive: 1}).exec(function (err, docs) {	
		//console.log("Doc = " + JSON.stringify(docs));
		//console.log("err = " + err);
		console.log("test = " + socket.id);
		socket.emit('userListAnswer', docs);
	});
}
