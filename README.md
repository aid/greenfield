# greenfield
in-browser wayland compositor

Experiment in using [Westfield](https://github.com/udevbe/westfield) together with [webrtc](https://webrtc.org/faq/#what-is-webrtc)/[object-rtc](https://ortc.org/) to create an in-browser wayland compositor.

Installation
============

Clone this repo and inside the cloned directory run:

`npm install`

Next you will need a patched node-gstreamer-superficial.

https://github.com/udevbe/node-gstreamer-superficial

clone it and go back to the greenfield directory.

Now link the node-gstreamer-superficial project so it can be used by greenfield.

`npm link <path to node-gstreamer-superficial>`


You will also need gstreamer-1.x and the following plugins:
- appsrc
- glupload
- glcolorconvert
- glcolorscale
- tee
- glshader
- gldownload
- x264enc
- appsink

Running
=======

`npm start`

Open a browser, preferably Firefox as chrome has frequent crashes when using webworkers with asm.js.

Navigate to `http://localhost:8080`

Next you can try some wayland clients. Preferably the Weston 1.4 (early version) test clients, as xdg_shell support is not yet implemented.