import { DelimiterParser, SerialPort, SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes } from '@serialport/bindings-cpp';

import { TypedEmitter } from 'tiny-typed-emitter';
import { serverToPlotter, plotterToServer, move, op, stepDanceConfig} from './message_types';


// Spec from Ilan:
// int16_t TimeBasedInterpolator::add_move(
// uint8_t mode, 
// float32_t move_velocity_per_s, 
// DecimalPosition x, 
// DecimalPosition y, 
// DecimalPosition z, 
// DecimalPosition e, 
// DecimalPosition r, 
// DecimalPosition t
// )

type stepdanceMessage = {
	"name": "interpolator.add_move", 
	"args": [
		0 | 1, // mode: 0 relative, 1 absolute
		number, // velocity mm/s
		number, // x axis
		number, // y axis
		number, // z axis
		0,  // three extra axes I don't need
		0,  // three extra axes I don't need
		0 // three extra axes I don't need
		]
};



export let defaultConfig : stepDanceConfig =  {drawSpeed:20, zSpeed: 5, penUpHeight:5, penDownHeight: 0};


export class stepDanceConnection extends TypedEmitter<plotterToServer> {
	serialPort : SerialPort;
	connected: Boolean = false;
	portPath: String = "";
	version: Array<number> = [0,0,0];
	queue : Array<move> = [];
	pendingMessage : move | false = false;
	currentX: number = 0; // the x as of the end of the queue
	currentY: number = 0; // the y as of the end of the queue
	config: stepDanceConfig;
	fake: boolean = false;
	fakeBuffer : number = 10;


	constructor (port: SerialPortOpenOptions<AutoDetectTypes> | "fake", config: {drawSpeed:number, zSpeed: number, penUpHeight:number, penDownHeight: number}) {
		super();
		this.config = config;
		let self: stepDanceConnection = this;

		if (port != "fake") {
			this.serialPort = new SerialPort(port);

			this.serialPort.on('open', ()=>{
				console.log("connected to board at "+port.path);
				self.connected = true;
				self.portPath = port.path;
				self.emit("connected", {path: port.path});
			});
			this.serialPort.on('close', ()=>{
				console.log("disconnected from board");
				self.connected = false;
				self.emit("disconnected");
			});

			const dataParser = this.serialPort.pipe(new DelimiterParser({ delimiter: '\n' }));
			
			dataParser.on( 'data', this.handleStepdanceResponse);

			this.serialPort.emit(JSON.stringify({"name":"disable"}));

		}
		else {
			this.fake = true;
			self.emit("connected", {path: "fake"});
		}


	}

	updateConfig(config: stepDanceConfig) {
		this.config = config;
	}

	handleStepdanceResponse(message: string) {
		// {result: "ok", "return": 1}
		try {
			let data = JSON.parse(message);
			console.log(data);
			// we *think* will will get something like {result: number}, where the number is the slots remaining in the onboard buffer.
			// if the number is negative, our last message did *not* get added to the queue, and we should re-send it.
			// if the number is zero, our last message *did* get added the queue, but it's out of space and we shouldn't send more.
			if ("result" in data) {
				let bufferRemaining : number = parseInt(data.result);
				if (bufferRemaining > 0) {
					// that message was accepted and we have more room:
					// update the pendingMessage and try sending it
					this.emit("queued", {...data, ...this.pendingMessage});
					this.updatePending();
					this.trySendingPending();
				}
				else if (bufferRemaining == 0) {
					// that message was accepted, but we're out of room:
					// update the pendingMessage, but wait a while before trying to send it
					this.emit("queued", {...data, ...this.pendingMessage});
					this.updatePending();
					this.emit("waiting");
					setTimeout(()=>{this.trySendingPending();}, 1000);
				}
				else {
					// that message was not accepted, and we're out of room
					// don't get the next thing from the buffer, just wait a while and send the same thing again
					this.emit("waiting");
					setTimeout(()=>{this.trySendingPending();}, 1000);
				}
			}
			else {
				console.log("No 'response' in data: ", message, data);
			}
		}
		catch {
			console.log(message);
		}
	}

	updatePending () {
		this.pendingMessage = this.queue.length>0 ? this.queue.shift() : false;
	}

	trySendingPending() : string {
		if (this.pendingMessage !== false) {
			return this.sendToBoard(this.pendingMessage);
		}
		else {
			return "nothing to send";
		}	
	}


	enqueue(move: move) : void {
		this.queue.push(move);
		if (this.pendingMessage == false) {
			this.updatePending();
			this.trySendingPending();
		}
	}

	send(op:op) : void { // for conformance to the sockets protocol
		let move : move;
		if (op.type == "lineTo") {
			this.enqueue({
				id: op.id,
				basis: "absolute",
				speed: "draw",
				x: op.x,
				y: op.y,
				z: "down"
			});
			this.currentX = op.x;
			this.currentY = op.y;
		}
		else if (op.type = "moveTo") {
			this.enqueue({ // take pen up at this location
				id: op.id + 0.1,
				basis: "absolute",
				speed: "changeZ",
				x: this.currentX,
				y: this.currentY,
				z: "up"
			});
			this.enqueue({  // move to next location
				id: op.id + 0.2,
				basis: "absolute",
				speed: "draw",
				x: op.x,
				y: op.y,
				z: "up"
			});
			this.enqueue({  // put pen down
				id: op.id + 0.3,
				basis: "absolute",
				speed: "changeZ",
				x: op.x,
				y: op.y,
				z: "down",
			});

			this.currentX = op.x;
			this.currentY = op.y;
		}
	}


	sendToBoard(move: move) : string {
		this.emit("sending", move);
		let formatted = {
			"name": "interpolator.add_move", 
			"args": [
				move.basis == "relative" ? 0 : 1, // mode: 0 relative, 1 absolute
				move.speed == "draw" ? this.config.drawSpeed : this.config.zSpeed, // velocity mm/s
				move.x, // x axis
				move.y, // y axis
				move.z == "down" ? this.config.penDownHeight : this.config.penUpHeight, // z axis
				0,  // three extra axes I don't need
				0,  // three extra axes I don't need
				0 // three extra axes I don't need
			]
		};

		if (this.fake) {
			this.fakeBuffer --;
			setTimeout(() => {this.handleStepdanceResponse('{"result":'+this.fakeBuffer+'}');}, 100); // fake confirmation
			setTimeout(() => {this.fakeBuffer++;}, 2000); // fake buffer-clearing
			return "ok";
		}
		if (this.connected) {
			this.serialPort.emit(JSON.stringify(formatted));
			return "ok";
		}
		else {
			return "No board connected. Msg: "+JSON.stringify(formatted);
		}
	}
}