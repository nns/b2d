var Box2D = require('./lib/Box2dWeb-2.1.a.3.js');
var sio = require('socket.io');

var world;

function init(socket) {
 var   b2Vec2 = Box2D.Common.Math.b2Vec2
 	,	b2BodyDef = Box2D.Dynamics.b2BodyDef
 	,	b2Body = Box2D.Dynamics.b2Body
 	,	b2FixtureDef = Box2D.Dynamics.b2FixtureDef
 	,	b2Fixture = Box2D.Dynamics.b2Fixture
 	,	b2World = Box2D.Dynamics.b2World
 	,	b2MassData = Box2D.Collision.Shapes.b2MassData
 	,	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
 	,	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
 	,	b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ;
 
 world = new b2World(
       new b2Vec2(0, 10)    //gravity
    ,  true                 //allow sleep
 );
 
 var fixDef = new b2FixtureDef;
 fixDef.density = 1.0;
 fixDef.friction = 0.5;
 fixDef.restitution = 0.2;
 
 var bodyDef = new b2BodyDef;
 
 //create ground
 bodyDef.type = b2Body.b2_staticBody;
 bodyDef.position.x = 9;
 bodyDef.position.y = 13;
 fixDef.shape = new b2PolygonShape;
 fixDef.shape.SetAsBox(10, 0.5);
 world.CreateBody(bodyDef).CreateFixture(fixDef);
 
 //create some objects
 bodyDef.type = b2Body.b2_dynamicBody;
 for(var i = 0; i < 10; ++i) {
    if(Math.random() > 0.5) {
       fixDef.shape = new b2PolygonShape;
       fixDef.shape.SetAsBox(
             Math.random() + 0.1 //half width
          ,  Math.random() + 0.1 //half height
       );
    } else {
       fixDef.shape = new b2CircleShape(
          Math.random() + 0.1 //radius
       );
    }
    bodyDef.position.x = Math.random() * 10;
    bodyDef.position.y = Math.random() * 10;
    world.CreateBody(bodyDef).CreateFixture(fixDef);
 }
 
 //setup debug draw
 var debugDraw = new b2DebugDraw();
 var rm = new RemoteCanvas(socket);
	debugDraw.SetSprite(rm);
	//debugDraw.SetSprite(ctx);
	debugDraw.SetDrawScale(30.0);
	debugDraw.SetFillAlpha(0.3);
	debugDraw.SetLineThickness(1.0);
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
	world.SetDebugDraw(debugDraw);
 
 setInterval(update, 1000/30);
};

//var i = 0;
function update() {
 world.Step(
       1/60   //frame-rate
    ,  10       //velocity iterations
    ,  10       //position iterations
 );

 world.DrawDebugData();
 world.ClearForces();
 //process.exit(0);
 //var fs = require('fs');
 //fs.writeFileSync('/var/share/img/' + (i++) + '.png',canvas.toBuffer());

};

var io = sio.listen(3000);

io.sockets.on('connection', function(socket){
	init(socket);
});
io.configure(function () {
	io.set('transports', ['websocket']);
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
	this.count = 0;
	this.array = [];
	this.canvas = this;
};
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
		this.count++;
		if(this.count > 10){
			this.socket.volatile.emit('action', this.array);
			this.array = [];
			this.count = 0;
		}
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
};


