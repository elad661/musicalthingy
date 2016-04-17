// Copyright © 2016 Elad Alfassa <elad@eladalfassa.com>
/* A worker that generates noise texture. I have to use a webworker here because Firefox's performance has regressed severly in this area,
and freezes completely when doing heavy canvas operations.
*/
"use strict"

// it really really sucks that I have to copy code here to use it

var canUseUint8;

//from main.js

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
    if (canUseUint8)
        return create_background_fast(width, height);
    else
        return create_background_slow(width, height);
}

function create_background_slow(width, height) {
    // Create grayscale noise background (slower, for older browsers)
    var canvas_data = new ImageData(width, height);
    var pixel = new Array(3);
    for (var y=0; y<height; y++) {
        for (var x=0; x<width; x++) {
            pixel[0] = Math.round((randint(256)+randint(256)+randint(256))/3);
            pixel[1] = pixel[0];
            pixel[2] = pixel[0];
            pixel[3] = 128;
            canvas_data.setPixel(x, y, pixel);
        }
    }
    return canvas_data;
}

function create_background_fast(width, height) {
    // Create grayscale noise background - about 50% faster in Firefox
    var canvas_data = new ImageData(width, height);
    var buf = new ArrayBuffer(canvas_data.data.length);
    var buf8 = new Uint8ClampedArray(buf);
    var data = new Uint32Array(buf);

    for (var y=0; y<height; y++) {
        for (var x=0; x<width; x++) {
            var color = Math.round((randint(256)+randint(256)+randint(256))/3);
            data[y * width + x] =
                (128   << 24) |   // alpha
                (color << 16) |   // blue
                (color <<  8) |   // green
                color;            // red
        }
    }
    canvas_data.data.set(buf8);
    return canvas_data;
}

// actual worker code

self.addEventListener('message', function(e) {
    console.log('Worker: started');
    var start = new Date().getTime();
    for (var i=0; i < e.data['howmany']; i++) {
        canUseUint8 = e.data['fastpixel'];
        postMessage(create_background(e.data['width']/2, e.data['height']/2));
    }
    var end = new Date().getTime();
    var total = (end - start) / 1000;
    var avg = total / e.data['howmany'];
    console.log('worker done in ' + total + 's (avg ' + avg + 's per frame)');
    self.close();
}, false);

