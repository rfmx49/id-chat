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

function userObj(data) {
	this.username = data.username;
	this.userid = data.userid;
	this.sex = data.sex;
	this.age = data.age;
	this.address = data.address;
	this.uuid = data.uuid;
	this.created = new Date().toISOString();
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
		if(pseudoSet(socket))
		{
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data};
			socket.broadcast.emit('message', transmit);
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
		else {
			console.log("User not logged in");
		}
	});
	socket.on('privateMessage', function (data) { // Broadcast the message to one
		var recpiant = getUserAccountByName(data.recpiant);
		if (recpiant == false) {
			socket.emit('pmStatus', 'nouser');
		}
		else {
			console.log(usersArray[recpiant]);
			if(pseudoSet(socket))
			{
				var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : "PRIVATE: " + data};
				//io.sockets.socket(usernames[usr]).emit('msg_user_handle', username, msg);
				//socket.broadcast.emit('message', transmit);
				socket.broadcast.to(usersArray[recpiant].userid).emit('message', transmit);
				console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
			}
		}
	});
	socket.on('setPseudo', function (data) { // Assign a name to the user
		//if (pseudoArray.indexOf(data.username) == -1) // Test if the name is already taken
		if (usersArray.findIndex(x=> x.username == data.username) == -1) 
		{
			//pseudoArray.push(data.username);
			console.log(data.uuid);
			socket.nickname = data.username;
			usersArray.push(new userObj({username: data.username, userid: socket.id, sex:data.sex, age:data.age, address: socket.handshake.address, uuid: data.uuid}));
			console.log(JSON.stringify(usersArray));
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
	socket.on('uuidLogin', function (uuid) { // Attempt to login with uuid
		var oldUser = getUserAccountByUUID(uuid);
		//console.log("user search returned " + oldUser);
		if (oldUser === false) {
			console.log("Login Failed for " + uuid);
			socket.emit('loginStatus', 'failed');
		}
		else {
			console.log(usersArray[oldUser]);
			usersArray[oldUser].userid = socket.id;
			socket.nickname = usersArray[oldUser].username;
			socket.emit('pseudoStatus', 'ok');
			socket.emit('loginStatus', usersArray[oldUser]);
		}		
	});
});

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
	//object1.find(x=> x.name === 'Jason').uuid
	//usersArray.find(x=> x.username ==='Jason').uuid
	var result = usersArray.findIndex(x=> x.username == username)
	if (result === -1) {
		return false;
	}
	else {
		return result;
	}
}

function getUserAccountByUUID(uuid) {
	//object1.find(x=> x.name === 'Jason').uuid
	//usersArray.find(x=> x.username ==='Jason').uuid
	console.log("searching for uuid " + uuid);
	var result = usersArray.findIndex(x=> x.uuid == uuid)
	if (result === -1) {
		return false;
	}
	else {
		return result;
	}
}
