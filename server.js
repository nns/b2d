
/**
 * Module dependencies.
 */

var express = require('express')
	,routes = require('./routes')
	,sio = require('socket.io')
	,Box2D = require('./lib/Box2dWeb-2.1.a.3.js');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
	res.sendfile('index.html');
});

var intervalid;
app.get('/reset',function(req, res){
	clearInterval(intervalid);
	isInit = false;
	res.redirect('/');
});

app.listen(process.argv[2] || 80);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


//Box2D
var	b2Vec2 				= Box2D.Common.Math.b2Vec2
	,b2AABB 			= Box2D.Collision.b2AABB
	,b2BodyDef 			= Box2D.Dynamics.b2BodyDef
	,b2Body 			= Box2D.Dynamics.b2Body
	,b2FixtureDef 		= Box2D.Dynamics.b2FixtureDef
	,b2Fixture 			= Box2D.Dynamics.b2Fixture
	,b2World 			= Box2D.Dynamics.b2World
	,b2MassData 		= Box2D.Collision.Shapes.b2MassData
	,b2PolygonShape 	= Box2D.Collision.Shapes.b2PolygonShape
	,b2CircleShape 		= Box2D.Collision.Shapes.b2CircleShape
	,b2DebugDraw		= Box2D.Dynamics.b2DebugDraw
	,b2MouseJointDef	= Box2D.Dynamics.Joints.b2MouseJointDef
	;

var world;
function init(socket) {
	world = new b2World(new b2Vec2(0, 10),true);
	var fixDef = new b2FixtureDef;
	fixDef.density = 1.0;
	fixDef.friction = 0.5;
	fixDef.restitution = 0.2;
	var bodyDef = new b2BodyDef;
 
	//create ground
	bodyDef.type = b2Body.b2_staticBody;
	fixDef.shape = new b2PolygonShape;
	fixDef.shape.SetAsBox(20,2);
	bodyDef.position.Set(10,400/ 30 + 1.8);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	bodyDef.position.Set(10, -1.8);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	fixDef.shape.SetAsBox(2,14);
	bodyDef.position.Set(-1.8, 13);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	bodyDef.position.Set(21.8, 13);
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	

	//create some objects
	bodyDef.type = b2Body.b2_dynamicBody;
	function setShape(){
		var fixture = new b2FixtureDef();

		var x = Math.floor(Math.random() * 10);
		if(x < 5){
			for(var i = 0; i < 15; ++i) {
				if(Math.random() > 0.5) {
					fixture.shape = new b2PolygonShape;
					fixture.shape.SetAsBox(Math.random() + 0.1, Math.random() + 0.1);
				} else {
					fixture.shape = new b2CircleShape(Math.random() + 0.1);
				}
				bodyDef.position.x = Math.random() * 10;
				bodyDef.position.y = Math.random() * 10;
				fixture.density = Math.random() * 1;
				fixture.friction = Math.random() * 1;
				fixture.restitution = Math.random() * 1;
				world.CreateBody(bodyDef).CreateFixture(fixture);
			}
		}
		if(x >= 5){
			for(var i = 0; i < 100; i++){
				fixture.density = Math.random() * 1;
				fixture.friction = Math.random() >0.5? 1:0;
				fixture.restitution = Math.random() * 1;
				setTimeout(function(){
					fixture.shape = new b2PolygonShape;
					fixture.shape.SetAsBox(0.4,0.4);
					bodyDef.position.x = 5 + (Math.random()+0.1 );
					bodyDef.position.y = 1;
					world.CreateBody(bodyDef).CreateFixture(fixture);
				},100*i);
			}
		}
	}
	setShape();
	//setup debug draw
	var debugDraw = new b2DebugDraw();
	var rm = new RemoteCanvas(socket);
	debugDraw.SetSprite(rm);
	debugDraw.SetDrawScale(30.0);
	debugDraw.SetFillAlpha(0.4);
	debugDraw.SetLineThickness(1.0);
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit );
	world.SetDebugDraw(debugDraw);

	intervalid = setInterval(function(){
		update();
		rm.socket.volatile.emit('action', rm.array);
		rm.array = [];
	}, 1000/24);
}
//var i = 0;
//var isMouseDown;
//var mouseJoint;
//var clientx;
//var clienty;
//var mousePVec;
//var selectedBody;
function update(){
	world.Step(1/24, 10, 10);
	for(var i in mm){
		var data = mm[i];
		if(data.isMouseDown &&(!data.mouseJoint)){
			var body = getBodyAtMouse(data);
			if(body){
				var md = new b2MouseJointDef();
				md.bodyA = world.GetGroundBody();
				md.bodyB = body;
				md.target.Set(data.clientx, clienty);
				md.collideConnected = true;
				md.maxForce = 300.0 * body.GetMass();
				data.mouseJoint = world.CreateJoint(md);
				body.SetAwake(true);
			}
		}
		if(data.mouseJoint){
			if(data.isMouseDown){
				data.mouseJoint.SetTarget(new b2Vec2(data.clientx, data.clienty));
			} else {
				world.DestroyJoint(data.mouseJoint);
				data.mouseJoint = null;
			}
		}
	}//end of for
/*
	if(isMouseDown && (!mouseJoint)){
		var body = getBodyAtMouse();
		if(body){
			var md = new b2MouseJointDef();
			md.bodyA = world.GetGroundBody();
			md.bodyB = body;
			md.target.Set(clientx, clienty);
			md.collideConnected = true;
			md.maxForce = 300.0 * body.GetMass();
			mouseJoint = world.CreateJoint(md);
			body.SetAwake(true);
		}
	}
	if(mouseJoint){
		if(isMouseDown){
			mouseJoint.SetTarget(new b2Vec2(clientx, clienty));
		}else{
			world.DestroyJoint(mouseJoint);
			mouseJoint = null;
		}
	}
*/
	world.DrawDebugData();
	world.ClearForces();
	//var fs = require('fs');
	//fs.writeFileSync('/var/share/img/' + (i++) + '.png',canvas.toBuffer());
}

var currentData;
function getBodyAtMouse(data){
		data.mousePVec = new b2Vec2(data.clientx, data.clienty);
		var aabb = new b2AABB();
		aabb.lowerBound.Set(data.clientx - 0.001, data.clienty - 0.001);
		aabb.upperBound.Set(data.clientx - 0.001, data.clienty + 0.001);
		data.selectedBody = null;
		currentData = data;
		world.QueryAABB(getBodyCB, aabb);
		return data.selectedBody;
//	mousePVec = new b2Vec2(clientx , clienty);
//	var aabb = new b2AABB();
//	aabb.lowerBound.Set(clientx- 0.001, clienty - 0.001);
//	aabb.upperBound.Set(clientx-0.001, clienty + 0.001);
//	selectedBody = null;
//	world.QueryAABB(getBodyCB, aabb);
//	return selectedBody;
}

function getBodyCB(fixture){
	if(fixture.GetBody().GetType() != b2Body.b2_staticBody){
		if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(),currentData.mousePVec)){
			currentData.selectedBody = fixture.GetBody();
			return false;
		}
	}
}

var io = sio.listen(app);
var isInit;
var mm = {};
io.sockets.on('connection', function(socket){
	if(!isInit){
		isInit = true;
		init(io.sockets);
	}
	socket.on('mouse down',function(){
		mm[socket.id] = {};
		mm[socket.id].isMouseDown = true;
		console.log('socket.id:%s mouse down',socket.id);
	});
	socket.on('mouse move',function(data){
		clientx = data.x;
		clienty = data.y;
		mm[socket.id].clientx = data.x;
		mm[socket.id].clienty = data.y;
	});
	socket.on('mouse up',function(){
		mm[socket.id].isMouseDown = false;
		console.log('socket.id:%s mouse up',socket.id);
	});
});

io.configure(function () {
	io.set('transports', ['websocket', 'xhr-polling']);
	io.set('log level',2);
});
io.configure('development', function () {
	io.set('transports', ['websocket', 'xhr-polling']);
	io.enable('log');
});


function RemoteCanvas(socket){
	this.socket = socket;
	this.width = 600;
	this.height = 400;
	this.array = [];
	this.canvas = this;
}
RemoteCanvas.prototype ={
	clearRect:function(sx,sy,ex,ey){
		//this.socket.emit('clearRect',[sx,sy,ex,ey]);
		//this.array.push({process:'clearRect',args: [sx,sy,ex,ey]});
		//this.socket.volatile.emit('action', this.array);
		//this.array = [];
	},
	beginPath:function(){
		this.array.push({process:'beginPath'});
	},

	moveTo:function(x,y){
		this.array.push({process:'moveTo',args:[x,y]});
	},

	lineTo:function(x,y){
		this.array.push({process:'lineTo',args:[x,y]});
	},

	closePath:function(){
		this.array.push({process:'closePath'});
	},
	stroke:function(){
		this.array.push({process:'stroke'});
		/*if(this.array.length > 350){
			console.log(this.array.length);
			this.socket.volatile.emit('action', this.array);
			this.array = [];
		}*/
	},
	setStrokeStyle:function(style){
		this.array.push({process:'strokeStyle',args:style});
	},
	setFillStyle:function(style){
		this.array.push({process:'fillStyle',args:style});
	},

	fill:function(){
		this.array.push({process:'fill'});
	},

	arc:function(x, y, r, val, pi, flg){
		this.array.push({process:'arc',args: [x,y,r,val, pi, flg]});
	}
}
