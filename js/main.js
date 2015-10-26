"use strict";
// I'm not minifiying this because I prefer to sacrifice performance in favour of "view source" being useful for people who want to see what I did.
// Note that this code is not exactly clean or well implemented, I'm just doing this for fun.

var bg_animation_frame = new AnimationFrame(24); // Background animates at 24fps
var playgraph_animation_frame = new AnimationFrame();
var backgrounds = new Array();
var pointerX = null;
var pointerY = null;
var playing = false;
var possible_chords = [['A5'], ['B5'], ['C5'], ['D5'], ['E5'], ['F5'], ['G5']]
var piano = new Wad({
            source : 'square',
            env : {
                attack : .01,
                decay : .005,
                sustain : .2,
                hold : .015,
                release : .3
            },
            filter : {
                type : 'lowpass',
                frequency : 1200,
                q : 8.5,
                env : {
                    attack : .2,
                    frequency : 600
                }
            }
        });

ImageData.prototype.setPixel = function(x, y, pixel) {
    // Makes it easier to set a pixel on an imagedata
    // pixel is an array with four cells, representing RGBA
	var index = (x + y * this.width) * 4;
	this.data[index+0] = pixel[0];
	this.data[index+1] = pixel[1];
	this.data[index+2] = pixel[2];
	this.data[index+3] = pixel[3];
}

function randint(max) {
    // Return a random int
    return Math.round(Math.random() * max);
}

function create_background(width, height) {
    // Create grayscale noise background
    var canvas_data = new ImageData(width, height);
    for (var y=0; y<height; y++) {
        for (var x=0; x<width; x++) {
            var pixel=new Array();
            pixel[0] = Math.round((randint(256)+randint(256)+randint(256)+randint(256))/4);
            pixel[1] = pixel[0];
            pixel[2] = pixel[0];
            pixel[3] = 128;
            canvas_data.setPixel(x, y, pixel);
        }
    }
    return canvas_data;
}

function animate_background(timestamp) {
    bg_animation_frame.request(animate_background);
    var canvas = document.getElementById('background_canvas');
    var context = canvas.getContext('2d');
    var background = null;
    if (backgrounds.length < 256) {
        // Create 256 backgrounds, then cycle through them instead of wasting time generating a new one every frame
        background = create_background(canvas.width, canvas.height);
        backgrounds.push(background);
    } else {
        background = backgrounds[randint(backgrounds.length-1)]
    }
    context.putImageData(background, 0, 0);
}
function play_loop() {
    playing = setTimeout(play_loop, 350);
    var corrent_chord = possible_chords[(pointerY + possible_chords.length) % possible_chords.length];
    $(corrent_chord).each(function() {
        piano.play({'pitch': this, 'env': {hold: 0.35}});
    });
}

function main() {
    AnimationFrame.shim(); // https://github.com/kof/animation-frame
    $('#canvas_container canvas').each(function() {
        this.width = $(this).width(); // Set actual width to CSS width
        this.height = $(this).height(); // Set actual height to CSS height
    });

    bg_animation_frame.request(animate_background);
    var fgcanvas = document.getElementById('foreground_canvas');
    var fgcontext = fgcanvas.getContext('2d');
    $('#canvas_container').on('mousemove', function(e) {
        fgcontext.clearRect(0, 0, fgcanvas.width, fgcanvas.height);
        pointerX = e.offsetX;
        pointerY = e.offsetY;
	    var radius = 16;
	    fgcontext.beginPath();
	    fgcontext.globalAlpha = 0.6;
	    fgcontext.arc(pointerX, pointerY, radius, 0, (Math.PI/180)*360, false);
	    fgcontext.fill();
	    fgcontext.closePath();

        piano.panning.location = parseFloat(pointerX / fgcanvas.width);
        if (!playing) {
            playing = setTimeout(play_loop, 0);
        }
    })
    .on('mouseout', function(e) {
        pointerX = null;
        pointerY = null;
        fgcontext.clearRect(0, 0, fgcanvas.width, fgcanvas.height);
        clearTimeout(playing);
        playing = false;
    });
    $(document).on('hide blur', function() {
        if(playing) {
            clearTimeout(playing);
            playing = false;
    	}
    }).on('show focus', function() {
        if (pointerX != null) {
    	    playing = setTimeout(play_loop, 0);
    	}
    });
}

$(document).ready(main);
