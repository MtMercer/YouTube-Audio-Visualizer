//the visualization var, global
var vis;

function barsScene(barsColor, backgroundColor, backgroundOpacity) {
    //the instance
    var inst = this;

    //the bars color
    inst.barsColor = barsColor || 0xfc3030;

    //background color
    inst.backgroundColor = backgroundColor || 0x000000;

    //background opacity
    inst.backgroundOpacity = backgroundOpacity || 0;

    //exclude some "dead bars"
    inst.excludeRatio = 33;

    //renders the scene, using the container, graphics, renderer & freqDataArray
    inst.render = function(c, g, r, d) {
        //the animation

        //a constant to calculate the bar width responsively
        inst.widthConstant = (100 / (vis.freqDataArray.length - inst.excludeRatio));

        //clears the graphics
        g.clear();

        if (inst.backgroundOpacity) {
            //draw the background
            g.beginFill(inst.backgroundColor, inst.backgroundOpacity);
            g.drawRect(-10, -10, r.width + 10, r.height + 10);

            //ends the fill for background
            g.endFill();
        }

        //draw the bars
        g.beginFill(inst.barsColor, 1);

        //generate the bars based on i dataArray audio percentage
        for (i = 0; i < d.length - inst.excludeRatio; i++) {
            //the bar width based on the widthConstant
            barWidth = inst.widthConstant * (r.width / 100);

            //draw the rectangle
            g.drawRect(barWidth * i, r.height - (r.height * d[i]), barWidth, r.height * d[i]);
        }

        //finally, add the generated stuff to the container (aka scene)
        c.addChild(g);

        //render the scene
        r.render(c);
    }

}

function ocilloscopeScene(lineColor, lineWidth, backgroundColor, backgroundOpacity) {
    //the instance
    var inst = this;

    //the line style
    inst.lineColor = lineColor || 0xfc3030;
    inst.lineWidth = lineWidth || 2;

    //background color
    inst.backgroundColor = backgroundColor || 0x000000;

    //background opacity
    inst.backgroundOpacity = backgroundOpacity || 0;

    //renders the scene, using container, graphics, renderer & timeData
    inst.render = function(c, g, r, d) {
        //the animation

        //a constant to calculate the line width responsively
        inst.widthConstant = (100 / vis.freqDataArray.length);

        //clears the graphics
        g.clear();

        if (inst.backgroundOpacity) {
            //draw the background
            g.beginFill(inst.backgroundColor, inst.backgroundOpacity);
            g.drawRect(-10, -10, r.width + 10, r.height + 10);

            //ends the fill for background
            g.endFill();
        }

        //move the drawer to start point
        g.moveTo(0, (r.height / 2) + (r.height * d[0] / 1.5));

        //the line style
        g.lineStyle(inst.lineWidth, inst.lineColor);

        //start drawing with a color & oppacity
        g.beginFill(inst.lineColor, 0);

        for (i = 1; i < d.length; i++) {
            //the line width based on the widthConstant
            lineWidth = inst.widthConstant * (r.width / 100);

            //draw the line, in the next loop, the drawer will be at the given coord
            g.lineTo(lineWidth * i, (r.height / 2) + (r.height * d[i] / 1.5));
        }

        //finally, add the generated stuff to the container (aka scene)
        c.addChild(g);

        //render the scene
        r.render(c);
    };
}

function audioVisualizer(width, height, containerSelector, sourceSelector, playerSelector, analyserData) {
    //the instance
    var inst = this;

    //the type of scenes, using an index to control it
    //private
    var sceneTypes = [
        "bars",
        "ocilloscope"
    ];
    //private
    var sceneIndex = 0;

    //the video dom used to find the size
    inst.$player = $(playerSelector);

    //view size
    inst.width = inst.$player.width();
    inst.height = inst.$player.height();

    //the container
    inst.$container = $(containerSelector);

    //the sound source
    inst.$source = $(sourceSelector);

    //the options for fft analysis
    inst.analyserData = analyserData || {
        fftSize: 256,
        minDecibels: -50,
        maxDecibels: 0,
        smoothingTimeConstant: 0.75
    };

    //is paused or not, private
    var paused = false;

    inst.init = function() {
        //the renderer
        inst.renderer = new PIXI.autoDetectRenderer(inst.width, inst.height, {
            transparent: true
        });

        //the scene
        inst.container = new PIXI.Container(0x66ff99);

        //the view
        inst.$view = $(inst.renderer.view);

        //pauses the animation when the canvas is clicked
        //but you can see color changes since the scenes
        //are rendered the same way
        inst.$view.click(function() {
            vis.pp();
        });

        //attach the renderer to the DOM element
        inst.$container.prepend(inst.$view);

        //generate the PIXI graphics for draw
        inst.g = new PIXI.Graphics();

        //get audio apis from different browsers
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        //create the audio context
        inst.audioCtx = new AudioContext();

        //setup the analyser node
        inst.analyser = inst.audioCtx.createAnalyser();
        inst.analyser.fftSize = inst.analyserData.fftSize;
        inst.analyser.minDecibels = inst.analyserData.minDecibels;
        inst.analyser.maxDecibels = inst.analyserData.maxDecibels;
        inst.analyser.smoothingTimeConstant = inst.analyserData.smoothingTimeConstant;

        //create the audio media source
        inst.source = inst.audioCtx.createMediaElementSource(inst.$source[0]);

        //connect the source to analyser & speakers
        inst.source.connect(inst.analyser);
        inst.source.connect(inst.audioCtx.destination);

        //initialize the freq data array with the size of the buffer
        inst.freqDataArray = new Float32Array(inst.analyser.frequencyBinCount);
        inst.analyser.getFloatFrequencyData(inst.freqDataArray);
        inst.cleanUpFreqDataArray();

        //initialize the time domain data array with the size of the buffer
        inst.timeDataArray = new Float32Array(inst.analyser.frequencyBinCount);
        inst.analyser.getFloatTimeDomainData(inst.timeDataArray);

        //the instance of the scenes
        inst.bars = new barsScene();

        inst.ocillo = new ocilloscopeScene();
    }

    inst.render = function() {
        if (!paused) {
            //get the audio dada & clean it
            inst.analyser.getFloatFrequencyData(inst.freqDataArray);
            inst.cleanUpFreqDataArray();

            //get the wave data
            inst.analyser.getFloatTimeDomainData(inst.timeDataArray);
        }

        //renders the current scene
        switch (sceneTypes[sceneIndex]) {
            case "ocilloscope":
                inst.ocillo.render(inst.container, inst.g, inst.renderer, inst.timeDataArray);
                break;
            case "bars":
            default:
                inst.bars.render(inst.container, inst.g, inst.renderer, inst.freqDataArray);
        }

        requestAnimationFrame(inst.render);
    }

    //transform freqData to percentages
    inst.cleanUpFreqDataArray = function() {
        for (i in inst.freqDataArray) {
            if (inst.freqDataArray[i] <= -100 || inst.freqDataArray[i] == -80) {
                inst.freqDataArray[i] = 0;
                continue;
            }
            inst.freqDataArray[i] = (inst.freqDataArray[i] + 100) / 100;
        }
    }

    //go to the next scene
    inst.nextScene = function() {
        sceneIndex += sceneIndex == sceneTypes.length - 1 ? -sceneIndex : 1;
    }

    //Pause/Play the scene
    inst.pp = function() {
        paused = paused ? false : true;
    }

    //set the fftSize
    inst.setFFT = function(size) {
        inst.analyser.fftSize = size;
        inst.freqDataArray = new Float32Array(inst.analyser.frequencyBinCount);
        inst.timeDataArray = new Float32Array(inst.analyser.frequencyBinCount);
    }
}

$(document).ready(function() {
    vis = new audioVisualizer(640, 360, "#player", "video", "#player-api");
    vis.init();
    vis.render();
});
