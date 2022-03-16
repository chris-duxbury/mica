var canvas = document.getElementById("magCanvas");
var context = canvas.getContext("2d");

var updateRateHz = 10;
var count = 0; // beware count is a float
var degreesPerBin = 18;
var numBuckets = Math.floor(360/degreesPerBin);
var buckets = Array.apply(null, Array(numBuckets)).map(Number.prototype.valueOf, 0);
var intervalID = window.setInterval(getData, 1000/updateRateHz);
const MIN_SAMPLES_PER_BUCKET = 1;
var state = 0;

$("#btn").click(incrementState);

// States are defined by:
// name (text)
// ax, ay: which accelerometer axes to use to determine level
// mx, my: which mag axes to use for data gathering
// gz : which gyro axis tells us rate
var states = Array(
    {"name": "Ready for cal",      "ax": 1, "ay": 0, "az": 2,
                                   "sax": -1, "say": 1, "saz": 1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": -1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Top Up",             "ax": 1, "ay": 0, "az": 2,
                                   "sax": -1, "say": 1, "saz": -1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": -1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Top Down",           "ax": 1, "ay": 0, "az": 2,
                                   "sax": 1, "say": 1, "saz": 1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Nose Up",            "ax": 1, "ay": 2, "az": 0,
                                   "sax": -1, "say": 1, "saz": 1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Nose Down",          "ax": 1, "ay": 2, "az": 0,
                                   "sax": -1, "say": -1, "saz": -1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Right Wingtip Up",   "ax": 2, "ay": 0, "az": 1,
                                   "sax": -1, "say": 1, "saz": 1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Right Wingtip Down", "ax": 2, "ay": 0, "az": 1,
                                   "sax": 1, "say": 1, "saz": -1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1},
    {"name": "Done calibrating",   "ax": 0, "ay": 1, "az": 2,
                                   "sax": 1, "say": 1, "saz": 1, 
                                   "mx": 0, "my": 1, "mz": 2, 
                                   "smx": 1, "smy": 1, "smz": 1,
                                   "gz": 0, "sgz": 1}
);

function incrementState(){
    state++;
    state = Math.min(state,states.length-1);
    if (state == 0){
        $("#btn").text("Start3 calibration");
    }else if (state < states.length-1){
        $("#btn").text("Cancel calibration");
        buckets = Array.apply(null, Array(numBuckets)).map(Number.prototype.valueOf, 0);
    }else if (state == states.length-1){
        $("#btn").text("Restart Calibration");
        state = 0; // will go straight to 1
    }
    
    updateStateText();
}

function updateStateText(){
    $("#state").text(states[state].name);
}

function manangeState(){
    if(state > 0){
        min = Math.min.apply(null,buckets);
        if(min > MIN_SAMPLES_PER_BUCKET){
            incrementState();
        }
    }else{
        updateStateText();
    }
}

function updateUI(data){
    var d = data;
    for(i=0;i<3;i++){
        $("#a"+i).text(data.accel[i]);
        $("#m"+i).text(data.mag[i]);
        $("#g"+i).text(data.gyro[i]*180.0/Math.PI);
    }
    drawUI(canvas, context, d.accel, d.gyro, d.mag);
    manangeState();
    count += (1/updateRateHz);
}

function getData(){
    var output = {}
    return $.getJSON('/dls_imu', updateUI);
}

function getFakeData(){
    return{
        "accel": [Math.sin(count),Math.cos(count),Math.tan(count)], 
        "gyro": [Math.random(),Math.random(),Math.random()], 
        "mag": [Math.cos(count),Math.sin(count),Math.random()],
    }
};

function drawCircle(ctx, x, y, r){
    ctx.beginPath();
    ctx.arc(x,y,r,0,2*Math.PI);
    ctx.stroke();
};

// Draw a wedge at center x,y, radius r1 to r2, from angle a1 to a2 optionally filled
// it's assumed that a2 is bigger than a1
function drawWedge(ctx, x, y, r1, r2, a1, a2){
    var x0=x+r1*Math.sin(a1);
    var y0=y-r1*Math.cos(a1);
    var x2=x+r2*Math.sin(a2);
    var y2=y-r2*Math.cos(a2);
    
    a1 -= Math.PI/2; 
    a2 -= Math.PI/2;
    ctx.beginPath();
    ctx.arc(x,y,r2,a2,a1,true); // outside arc (counter-clockwise)
    ctx.lineTo(x0,y0);          // line to outside arc
    ctx.arc(x,y,r1,a1,a2);      // inside arc (clockwise)
    ctx.lineTo(x2,y2);          // line to inside arc
    
    ctx.stroke();
}

function drawLine(ctx, x, y, r1, r2, a){
    var x1=x+r1*Math.sin(a);
    var y1=y-r1*Math.cos(a);
    var x2=x+r2*Math.sin(a);
    var y2=y-r2*Math.cos(a);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}

var minb = numBuckets;
var maxb = 0;

function drawUI(cvs, ctx, a, x, m){
    // Clear the context
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // the inside and outside radii
    var cx = cvs.width/2;
    var cy = cvs.height/2;
    // Fixed stuff
    var insideRadius=150;
    var outsideRadius=190;
    var levelCircleRadius=40;
    // Draw fixed level circle
    ctx.strokeStyle="lightgray";
    ctx.lineWidth=2;
    drawCircle(ctx, cx, cy, levelCircleRadius);
    
    // Moving circle
    var ax = a[states[state].ax] * states[state].sax * 10;
    var ay = a[states[state].ay] * states[state].say * 10;
    var az = a[states[state].az] * states[state].saz
    var am = Math.sqrt(ax*ax+ay*ay);
    var bx = ax + cx; // bubble x
    var by = ay + cy; // bubble y
    var levelEnough = (am < levelCircleRadius && az < -4.5);
    if (levelEnough){
        ctx.fillStyle="black";       
    }else{
        ctx.fillStyle="red"
    }
    drawCircle(ctx, bx, by, 20);
    ctx.fill();
    ctx.fillStyle="black"

    // Wedges
    // first handle adding new data samples to state
    if (levelEnough){
        magx = m[states[state].mx] * states[state].smx;
        magy = m[states[state].my] * states[state].smy;
        var ang = (Math.atan2(magy,magx));
        console.log(ang*180.0/Math.PI);
        ctx.globalAlpha=1;
        ctx.strokeStyle="green";
        ctx.lineWidth=3;
        drawLine(ctx,cx,cy,insideRadius-20,insideRadius-2, ang);
        //determine bucket
        var b = ang; // atan2 returns -PI to PI
        if (ang < 0){ang+=Math.PI*2;}
        b = Math.floor(b * numBuckets / (Math.PI*2));
        if (b<0){ b+= numBuckets;}
        buckets[b]++;
        if(b < minb){ 
            minb = b;
        }
        else if (b>maxb){
            maxb = b;
        }
    }
    
    
    ctx.lineWidth=1;
    var step = (Math.PI*2) / numBuckets;
    for(var i=0;i<numBuckets;i++){
        ctx.strokeStyle="lightgray";
        drawWedge(ctx,cx,cy,insideRadius,outsideRadius,i*step,(i*step)+step);
        ctx.strokeStyle="black";
        if(buckets[i] !== null && buckets[i] > 1){
            ctx.globalAlpha=0.2;
            for(var j = 0;j<buckets[i] && j<10; j++){
                drawWedge(ctx,cx,cy,insideRadius,outsideRadius,i*step,(i*step)+step);
                ctx.fill();
            }
        }
        ctx.globalAlpha=1;
    }

}

