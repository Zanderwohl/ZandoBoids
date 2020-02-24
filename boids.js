var boids = Array(200);
var visionDebug = $("#debugVision").is(':checked');
var numberVision = $("#numberVision").is(':checked');
var separate = true;
var align = true;
var cohese = true;
var c;
var zeroBrain = false; //The brain of Boid zero is shown.

//var context = new (window.AudioContext || window.webkitAudioContext)();	//web audio kit api

var separationStrength = .3; // .3
var alignmentStrength = .1; // .07
var cohesionStrength = .2;   //.1
var colorSimilarity = 30;


var previousTime = (new Date).getTime();

function main() {
    //console.log("Hello!");
    c = document.getElementById("world");

    for (var i = 0; i < boids.length; i++) {
		var color = randomColor();
        //color = "#FFFFFF";
        boids[i] = new Boid(i, c.width * Math.random(), c.height * Math.random(), 2 * Math.PI * Math.random(), color);
    }

    physicsTimer = setInterval(physicalFrame, 50);
    graphicsTimer = setInterval(graphicalFrame, 10);
    return [graphicsTimer, physicsTimer];
}

function randomColor(){
	n = Math.round(Math.random() * 4);
	if(n == 0){
		return "#2222FF";
	}
	if(n == 3){
		return "#22FF22";
	}
	if(n == 2){
		return "#FF2222";
	}
	if(n == 1){
		return "#DD0000";
	}
}

//https://stackoverflow.com/a/11410079
function clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
}

function graphicalFrame() {
	var now = new Date();
	deltaTime = now.getTime() - previousTime;
	previousTime = now;
    clear();
    ctx = c.getContext("2d");
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, 0, c.width, c.height);
    for (var i = 0; i < boids.length; i++) {
        boids[i].step(deltaTime);
		if(visionDebug || (i == 0 && zeroBrain)){
			boids[i].sameNearby = boids[i].allWithinRange(boids[i].range);
		}
        if (visionDebug /*&& this.n == 0*/) {
            //boids[i].visionRange();
            //boids[i].visionR();
            //boids[i].visionP();
            //boids[i].visionC();
            //boids[i].visionAvoidAngle();
            boids[i].visionLinks();
        }
		if (i == 0 && zeroBrain) {
            boids[0].visionRange();
            //boids[0].visionR();
            boids[0].visionP();
            //boids[0].visionC();
            boids[0].visionAvoidAngle();
            boids[0].visionLinks();
        }
        boids[i].draw();
    }
}

function physicalFrame() {
    for (var i = 0; i < boids.length; i++) {
        boids[i].react();
    }

}

function clear() {
    var c = document.getElementById("world");
    var ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
}

function Boid(n, x, y, r, color) {
    this.n = n;
    this.x = x;
    this.y = y;
    this.r = r;
    this.dp = (1 + (Math.random() - .3) * 2) * .07; //foward velocity
    this.dr = 0; //angular velocity
    this.drd = 0; //sideways drift velocity
    this.scale = 1;
	
	console.log(color);
    this.color = color;
	if(color != undefined){
		this.red = parseInt(color.substring(1, 3), 16);
		this.green = parseInt(color.substring(3, 5), 16);
		this.blue = parseInt(color.substring(5, 7), 16);
	} else {
		this.color = "#FFFFFF";
		this.red = parseInt("FF", 16);
		this.green = parseInt("FF", 16);
		this.blue = parseInt("FF", 16);
	}
	
    this.c = document.getElementById("world");
    this.range = 40;
    this.closeness = 20; //minimum closeness of
    this.nearby; //list of nearby boids within range
	this.sameNearby;
    this.tooClose; //list of boids that are too close.
    this.averageR; //average rotation of nearby boids
    this.averageP; //average position of nearby boids
    this.averagePAngle; //angle from self to average position of nearby boids
    this.averageDp; //average speed of nearby boids
    this.avoidAngle; //angle to go to avoid nearby boids
	
	//this.osc = context.createOscillator(); // instantiate an oscillator
	//this.osc.connect(context.destination); // connect it to the destination
	//this.osc.start();
}

Boid.prototype.step = function (deltaTime) {
    this.r += this.dr * deltaTime;
	if(this.r < 0){
		this.r += 2 * Math.PI;
	}
    this.x += this.dp * Math.cos(this.r) * deltaTime;
    this.y += this.dp * Math.sin(this.r) * deltaTime;
    this.bound();
	//var range = ((this.r / (2 * Math.PI)));
	var range = (Math.sqrt(this.x * this.x + this.y * this.y) / Math.sqrt(c.height * c.height + c.width * c.width));
	var rounded = Math.round(range * 80) / 80;
	var twelfthRoot = Math.pow(2, (1/12));
	//console.log(twelfthRoot);
	//var pitch = Math.pow(rounded, twelfthRoot);
	//console.log(rounded + " " + pitch);
	//this.osc.frequency.value = 220 * pitch;// Hz
}

Boid.prototype.react = function () {
	//this.bound();
    this.nearby = this.allWithinRange(this.range);
    this.tooClose = this.allWithinRange(this.closeness);
	
	this.sameNearby = this.allSameWithinRange(this.range);
	
    this.calcAverageV();
    this.calcAverageP();
    if (separate) {
        this.separate();
    }
    if (align) {
        this.align();
    }
    if (cohese) {
        this.cohese();
    }
	
    //this.wander();
}

Boid.prototype.separate = function () {
    if (typeof this.tooClose !== 'undefined' && this.tooClose.length > 0) {

        var averageX = 0;
        var averageY = 0;

        for (var i = 0; i < this.tooClose.length; i++) {
            var otherX = this.x - this.tooClose[i].x;
            var otherY = this.y - this.tooClose[i].y;

            //normalize the vector
            var distance = Math.sqrt(otherX * otherX + otherY * otherY);
            otherX /= distance;
            otherY /= distance;

            otherX /= this.distanceTo(this.tooClose[i]);
            otherY /= this.distanceTo(this.tooClose[i]);

            averageX += otherX;
            averageY += otherY;

        }
        //averageX /= this.tooClose.length;
        //averageY /= this.tooClose.length;

        //averageX = -averageX;
        //averageY = -averageY;

        var angle = Math.atan2(averageY, averageX);

        //if(angle < 0){
        //	 angle += 2 * Math.PI;
        //}

        this.avoidAngle = angle;

        //if(this.n == 0){
        //	 console.log(averageX + " " + averageY);
        //	 console.log(this.dr + "\t" + this.avoidAngle + "\t" + ((this.dr * 0.9) + (this.avoidAngle * 0.1)));
        //}

        this.r = this.partwayAngle(1 - separationStrength, this.r, this.avoidAngle);
    } else {
        this.avoidAngle = this.r;
    }
}

Boid.prototype.visionRange = function () {
    ctx = this.c.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "#D0D0D0";
    ctx.arc(this.x, this.y, this.range, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.closeness, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000000";
}

Boid.prototype.visionAvoidAngle = function () {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#EEEE22";

    //avoid angle
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(20 * Math.cos(this.avoidAngle) + this.x, 20 * Math.sin(this.avoidAngle) + this.y);
    ctx.stroke();
}

Boid.prototype.visionLinks = function () {

    ctx.lineWidth = 1;
    for (var i = 0; i < this.sameNearby.length; i++) {

        var distance = (this.distanceTo(this.sameNearby[i]) - this.closeness) / this.range;
        var red = Math.round(200 * (1 - distance) + 35);
        var green = Math.round(200 * distance + 35);

        ctx.strokeStyle = "#" + red.toString(16) + green.toString(16) + "33";

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.sameNearby[i].x, this.sameNearby[i].y);
        ctx.stroke();
    }
}

Boid.prototype.visionR = function () {
    ctx = this.c.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "#2222DD";
    ctx.moveTo(this.x, this.y);
    //ctx.lineWidth = 1;
    ctx.lineTo(this.x + Math.cos(this.averageR) * 40, this.y + Math.sin(this.averageR) * 40);
    ctx.stroke();
    //ctx.lineWidth = 1;
}

Boid.prototype.visionC = function () {
    ctx = this.c.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "#22DD22";
    ctx.moveTo(this.x, this.y);
    ctx.lineWidth = 3;
    ctx.lineTo(this.x + Math.cos(this.averageR) * 30, this.y + Math.sin(this.averageR) * 30);
    ctx.stroke();
    ctx.lineWidth = 1;
}

Boid.prototype.visionP = function () {
    ctx = this.c.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "#22EEAA";
    ctx.lineWidth = 10;
    ctx.arc(this.averageP[0], this.averageP[1], 5, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.averageP[0], this.averageP[1]);
    ctx.stroke();

    ctx.strokeStyle = "#000000";
}

Boid.prototype.calcAverageV = function () {
    var averageX = 0;
    var averageY = 0;
    for (var i = 0; i < this.sameNearby.length; i++) {
        averageX += Math.cos(this.sameNearby[i].r);
        averageY += Math.sin(this.sameNearby[i].r);
    }
    averageX /= this.sameNearby.length;
    averageY /= this.sameNearby.length;
    this.averageR = Math.atan2(averageY, averageX);

    var average = 0;
    for (var i = 0; i < this.sameNearby.length; i++) {
        average += this.sameNearby[i].dp;
    }

    this.averageDp = average / this.sameNearby.length;
}

Boid.prototype.calcAverageP = function () {
    var averageX = 0;
    var averageY = 0;
    for (var i = 0; i < this.sameNearby.length; i++) {
        averageX += this.sameNearby[i].x;
        averageY += this.sameNearby[i].y;
    }
    averageX /= this.sameNearby.length;
    averageY /= this.sameNearby.length;
    this.averageP = [averageX, averageY];

    this.averagePAngle = Math.atan2( - (this.y - averageY),  - (this.x - averageX));
}

Boid.prototype.align = function () {

    //console.log(average);

    if (!isNaN(this.averageR && this.sameNearby.length > 0)) {
        var angle = this.partwayAngle(1 - alignmentStrength, this.r, this.averageR);
        this.r = clamp(angle, -170, 170);
        this.dp = (this.dp * 0.9) + (this.averageDp * 0.1);
    } else { //nobody nearby, wander
        //this.wander();
    }
}

Boid.prototype.partwayAngle = function (distance, angle1, angle2) {
    idistance = 1 - distance;
    //console.log("My angle: " + angle1 + " Other: " + angle2);
    var newX = Math.cos(angle1) * distance + Math.cos(angle2) * idistance;
    var newY = Math.sin(angle1) * distance + Math.sin(angle2) * idistance;
    var newAngle = Math.atan2(newY, newX);
    //console.log("New angle: " + newAngle);
    return newAngle;
}

Boid.prototype.wander = function () {
    this.dr = Math.sin((new Date).getTime() / 1000) / 100;
}

Boid.prototype.cohese = function () {
    //if(this.n == 0){
    //	 console.log(this.averagePAngle * (360 / (Math.PI * 2)));
    //}
    if (!isNaN(this.averagePAngle)) {
        this.r = this.partwayAngle(1 - cohesionStrength, this.r, this.averagePAngle);
    }
}

//gets all Boids within a specified distance.
Boid.prototype.allWithinRange = function (distance) {
    var list = new Array();
    for (var i = 0; i < boids.length; i++) {
        if (!(boids[i] === this) && this.distanceTo(boids[i]) <= distance) {
            list.push(boids[i]);
        }
    }
    return list;
}

//gets all Boids within a specified distance.
Boid.prototype.allSameWithinRange = function (distance) {
    var list = new Array();
    for (var i = 0; i < boids.length; i++) {
        if (this.sameColor(boids[i]) && !(boids[i] === this) && this.distanceTo(boids[i]) <= distance) {
            list.push(boids[i]);
        }
    }
    return list;
}

Boid.prototype.sameColor = function (other){
	//return (other.color == this.color);
	
	similarRed = (Math.abs(this.red - other.red) < colorSimilarity);
	similarGreen = (Math.abs(this.green - other.green) < colorSimilarity);
	similarBlue = (Math.abs(this.blue - other.blue) < colorSimilarity);
	
	return similarRed && similarGreen && similarBlue;
}

//Gets the distance between Boid that function is called on, and another object provided it has an x and y value.
Boid.prototype.distanceTo = function (other) {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
}

//Makes the Boid teleport to the opposite edge if it flies off one edge.
Boid.prototype.bound = function () {

    var maxX = this.c.width;
    var maxY = this.c.height;

    if (this.x < 0) {
        this.x = maxX;
    }
    if (this.x > maxX) {
        this.x = 0;
    }
    if (this.y < 0) {
        this.y = maxY;
    }
    if (this.y > maxY) {
        this.y = 0;
    }
}

//places the Boid on the canvas, plus another on the opposite edge if it's over the edge on one side
Boid.prototype.draw = function () {
    var ctx = this.c.getContext("2d");

    var points = this.makePoints(this.x, this.y, this.r, this.scale);	//get the shape of the boid as points.
    this.drawBoid(ctx, points);

    //this.color2 = this.color;
    //this.color = "#FF0000";
    var border = 40 * this.scale;			//border scales with how big the boid is.
    if (this.x + border >= this.c.width) {
        points = this.makePoints(this.x - this.c.width, this.y, this.r, this.scale);	//adjust points for opposite edge
        this.drawBoid(ctx, points);
    }
    if (this.x - border <= 0) {
        points = this.makePoints(this.x + this.c.width, this.y, this.r, this.scale);
        this.drawBoid(ctx, points);
    }
    if (this.y + border >= this.c.height) {
        points = this.makePoints(this.x, this.y - this.c.height, this.r, this.scale);
        this.drawBoid(ctx, points);
    }
    if (this.y - border <= 0) {
        points = this.makePoints(this.x, this.y + this.c.height, this.r, this.scale);
        this.drawBoid(ctx, points);
    }
	
	if(numberVision){
		ctx.strokeText(this.n, this.x - 10, this.y - 10);
	}
}

//Takes a set of points and draws a shape from the points, in order.
//first point should be repeated as last point.
Boid.prototype.drawBoid = function (ctx, points) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
        ctx.stroke();
    }
    ctx.fillStyle = this.color;
    ctx.fill();
}

//Returns a set of points that represent the outline of the boid in space.
Boid.prototype.makePoints = function (x, y, r, scale) {

    var points = Array(5); //Five hardcoded points
    points[0] = [5, 0];
    points[1] = [-2, -2];
    points[2] = [-1, 0];
    points[3] = [-2, 2];
    points[4] = [5, 0];

    for (var i = 0; i < points.length; i++) {
        var oldX = points[i][0]; //Remember the starting x and y, since they get changed
        var oldY = points[i][1];

        points[i][0] = oldX * Math.cos(r) - oldY * Math.sin(r); //rotate them around the origin
        points[i][1] = oldY * Math.cos(r) + oldX * Math.sin(r);

        points[i][0] = points[i][0] * scale; //scale them
        points[i][1] = points[i][1] * scale;

        points[i][0] = points[i][0] + x; //translate them to the location in space
        points[i][1] = points[i][1] + y;
    }

    return points;
}
