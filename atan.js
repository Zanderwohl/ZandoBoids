var c;
var r = 0;

function main(){
	
	c = document.getElementById("world");
	
	graphicsTimer = setInterval(graphicalFrame, 10);
	return graphicsTimer;
}

function graphicalFrame(){
	var mouse = getMousePos(c);
	r = atan(pos.y, pos.x);
	
	clear();
	ctx = c.getContext("2d");
	ctx.strokeStyle = "#DD3333";
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(c.width / 2, c.height / 2);
	ctx.lineTo((c.width / 2) + Math.cos(r) * 300, (c.height / 2) + Math.sin(r) * 300);
	ctx.stroke();
 }
 
function clear(){
	var c = document.getElementById("world");
	var ctx = c.getContext("2d");
	
	ctx.clearRect(0, 0, c.width, c.height);
 }