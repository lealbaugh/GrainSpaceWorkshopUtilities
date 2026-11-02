Install packages with:
`npm install`

Run with:
`npm run watch`

Visit:
http://localhost:3000/

Try:
1) Drag and drop an 8.5x11 svg file with *path* elements (not polyline). Paths should display in the white box on the page. Console should log "[n] ops in queue", corresponding to the number of moveTo/lineTo operations in the file.

2) If the "fakemode" tickbox is ticked, the server will send it to a fake buffer (with ten slots and a 1-second delay in clearing those slots). If you hit the "go" button, you should see a) a red line at the right edge of the screen, indicating "sending," and b) line segments turning red as they are accepted by the fake buffer.

3) Un-tick "fakemode" and refresh the page. You should get a dropdown menu of serial ports to connect to. Select the serial port of the stepdance board and hit "connect to port". Hopefully, the board should connect and a blue line should appear at the left side of the browser to indicate connected.

4) With the actual board connected, try hitting "go" again. Hopefully the paths get sent and the plotter does its thing.

5) You can change the speed of moves (separate values for drawing vs pen-up/pen-down) and the pen height with the entry boxes and button at the left of the screen. These get applied at the sending-to-board stage, so if you "stop" sending, update the config, and "go" again, the new values should be part of the operations that haven't been queued onto the board yet. (Which could be laggy since I'm just shoving as much into the queue as it will hold. Ideally, we'd choose how much to queue based on like, not terribly many linear inches in the buffer at any given time, but this is low priority...)



I think these are true:
1) The board buffer is bigger than 10
2) the serial port name always contains "usbmodem"
3) 