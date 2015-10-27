"use strict";
// I'm not minifiying this because I prefer to sacrifice performance in favour of "view source" being useful for people who want to see what I did.
// Note that this code is not exactly clean or well implemented, I'm just doing this for fun.

var bg_animation_frame = new AnimationFrame(24); // Background animates at 24fps
var animation_request = null;
var backgrounds = new Array();
var stack_height = new Array();
var pointerX = null;
var pointerY = null;
var is_mouse_down = false;
var playing = false;
var name_has_faded = false;
var audiocontext = false;
/* This is called possible_chords and not possilbe_notes because you can change it to play more than one note at a time,
and that's why it's a 2D array and not a 1D array.

I thought I'll make it more complicated later, but I like it the way it is now.
*/
var possible_chords = [['C5'], ['D5'], ['E5'], ['F5'], ['G5'], ['A5'], ['B5']]
var possible_chords_bass = [['C2'], ['D2'], ['E2'], ['F2'], ['G2'], ['A2'], ['B2']]
var piano;
var bass;
var lineout_main;
if (window.AudioContext != undefined) {
    var wad_context = all_contexts[0];
    var lineout_main = new WebAudiox.LineOut(wad_context);
    lineout_main.volume = 0.8;
    piano = new Wad({
                source : 'square',
                volume: 0.8,
                destination: lineout_main.destination,
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
        bass = new Wad({
            source : 'sine',
            volume: 0.5,
            destination: lineout_main.destination,
            env : {
                attack : .02,
                decay : .1,
                sustain : .9,
                hold : .4,
                release : .1
            }
        });
} else
    unsupportedBrowser(); // :(

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
    // Animate background noise. Why noise? Because I can
    if (!animation_request)
        return false;
    animation_request = bg_animation_frame.request(animate_background);
    var canvas = document.getElementById('background_canvas');
    var context = canvas.getContext('2d');
    var background = null;
    if (backgrounds.length < 64) {
        // Create 64 backgrounds, then cycle through them instead of wasting time generating a new one every frame
        background = create_background(canvas.width, canvas.height);
        backgrounds.push(background);
    } else {
        background = backgrounds[randint(backgrounds.length-1)]
    }
    context.putImageData(background, 0, 0);
}

function create_note_bubble(note) {
    var bubble = document.createElement('div');
    bubble.className = 'notebubble';
    $(bubble).css({'top': pointerY + 'px', 'left': pointerX  + 'px'})
             .text(note)
             .addClass(note[0].charAt(0))
             .on('animationend', function() {
                var $this = $(this);
                var left = this.offsetLeft;
                var bgcolor = $this.css('backgroundColor');
                bg_animation_frame.request(function() { splat(left, bgcolor); });
                $this.remove();
             });
    $('#musicalzone').append(bubble);
}

function splat(position, color) {
    var canvas = document.getElementById('background_canvas');
    var context = canvas.getContext('2d');
    var temp_canvas = document.createElement('canvas')
    temp_canvas.width = 50;
    temp_canvas.height = 25;
    var temp_context = temp_canvas.getContext('2d');
    var data = new ImageData(50, 25);
    var parsed_color = color.split('(')[1];
    parsed_color = parsed_color.substring(0, parsed_color.length - 1).split(',');
    parsed_color[3] = 200;
    for (var y=0; y<25; y++) {
        for (var x=0; x<50; x++) {
            if (Math.random() > 0.5) // This makes a fuzzy yarn pattern. Maybe I should keep it this way instead of creating a color splat like I intended.
                data.setPixel(x, y, parsed_color);
        }
    }
    temp_context.putImageData(data, 0, 0);
    // Figure out if we need to draw over, or stack
    var heightlevel = canvas.height - 25;
    // Lower resolution positioning so you don't have to stay over the exact same pixel to go up to the next stack level.
    var lowres_position = Math.round((position + canvas.width / 50) % canvas.width / 50);
    if (stack_height[lowres_position] != undefined) {
        heightlevel = stack_height[lowres_position]['y'];
        stack_height[lowres_position]['count']++;
        if (stack_height[lowres_position]['count'] > 10) {
            heightlevel = heightlevel - 25;
            stack_height[lowres_position]['count'] = 0;
            stack_height[lowres_position]['y'] = heightlevel;
        }
     } else {
        stack_height[lowres_position] = {'y': heightlevel,
                                         'count': 0}
    }
    context.drawImage(temp_canvas, position, heightlevel)
}

function play_loop() {
    if (pointerY == null) // This is, of course, prone to race conditions. I like it this way, in a thing like this, random unexpected sounds are fun
        return false;
    playing = setTimeout(play_loop, 350);
    var current_chord = possible_chords[(pointerY + possible_chords.length) % possible_chords.length];
    $(current_chord).each(function() {
        piano.play({'pitch': this, 'env': {hold: 0.35}});
    });
    create_note_bubble(current_chord);
    if (is_mouse_down) {
        var current_chord = possible_chords_bass[(pointerY + possible_chords_bass.length) % possible_chords_bass.length];
        $(current_chord).each(function() {
            bass.play({'pitch': this, 'env': {hold: 0.35}});
        });
    }
}

function supported() {
    return Modernizr.cssanimations && Modernizr.canvas;
}

function unsupportedBrowser() {
    $('#musicalzone').hide();
    $('#unsupported').removeClass('hidden');
}

function resize_canvases() {
    $('#musicalzone canvas').each(function() {
        this.width = $(this.parentNode).width(); // Set actual width to CSS width
        this.height = $(this.parentNode).height(); // Set actual height to CSS height
    });
    stack_height = [];
}

function make_some_noise() {
    // originally from http://noisehack.com/generate-noise-web-audio-api/
    // Modified to use the modern Web Audio API.
    if (audiocontext)
        stop_noise();
    audiocontext = new AudioContext();
    var bufferSize = 2 * audiocontext.sampleRate; // 2 seconds long noise buffer
    var noiseBuffer = audiocontext.createBuffer(1, bufferSize, audiocontext.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var lineout = new WebAudiox.LineOut(audiocontext);
    lineout.volume = 0.09;
    for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    var whiteNoise = audiocontext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    whiteNoise.start(0);

    whiteNoise.connect(lineout.destination);
}
function stop_noise() {
    if (audiocontext) {
        audiocontext.close();
        audiocontext = null;
    }
}

function positive() {
    var messages = ['everything will be okay.',
                    'you do matter.',
                    'things will get better.',
                    'just hold on.'];
    var current_message = 0;
    var container = document.createElement('div');
    container.className = 'positive';
    $(container).text(messages[0]).on('animationend', function() {
        if ($(this).hasClass('blurout')) {
            current_message++;
            if (current_message > messages.length -1)
                current_message = 0;
            $(this).text(messages[current_message])
                   .removeClass('blurout');
        } else {
            $(this).addClass('blurout');
        }
    });
    $('#musicalzone').append(container);
}

function fade_name() {
    name_has_faded = true;
    setTimeout(function() {
               $('#gamename').fadeOut(2700, function() {
                                                         $(this).remove()
                                                         });
               }, 1000);

}

function main() {
    if (!supported())
        return unsupportedBrowser();
    AnimationFrame.shim(); // https://github.com/kof/animation-frame
    resize_canvases();
    $(window).resize(resize_canvases);

    // handle mouse and touch events on the musical zone
    $('#musicalzone').on('mousemove', function(e) {
        pointerX = e.offsetX;
        pointerY = e.offsetY;
        piano.panning.location = parseFloat(pointerX / $(this).width());
        bass.panning.location = piano.panning.location;
        if (playing==false) {
            playing = setTimeout(play_loop, 0);
        }
        if (!name_has_faded)
            fade_name();
    })
    .on('mouseout touchend', function(e) {
        pointerX = null;
        pointerY = null;
        is_mouse_down = false;
        clearTimeout(playing);
        playing = false;
    }).on('mousedown', function(e) {
        is_mouse_down = true;
    }).on('mouseup', function(e) {
        is_mouse_down = false;
    }).on('touchmove touchstart', function(e) {
        var last_touch = e.originalEvent.changedTouches[e.originalEvent.changedTouches.length - 1];
        pointerX = last_touch.screenX;
        pointerY = last_touch.screenY;
        piano.panning.location = parseFloat(pointerX / $(this).width());
        bass.panning.location = piano.panning.location;
        if (!playing) {
            playing = setTimeout(play_loop, 0);
        }
        if (!name_has_faded)
            fade_name();
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
    $('svg').on('click', function() {
        if (animation_request == null) {
            animation_request = bg_animation_frame.request(animate_background);
            make_some_noise();
            positive();
            stack_height = [];
        } else {
            bg_animation_frame.cancel(animation_request);
            var canvas = document.getElementById('background_canvas');
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            animation_request = null;
            stop_noise();
            $('#musicalzone .positive').remove();
            stack_height = [];
        }
    })
}

$(document).ready(main);
