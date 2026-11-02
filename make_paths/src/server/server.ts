// const fs = require("fs");
import express from "express";
import { SerialPort, SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes, PortInfo } from '@serialport/bindings-cpp';
import { Server, Socket } from 'socket.io';
import favicon from 'serve-favicon';

import { frontendToServer, serverToFrontend, move, op, stepDanceConfig } from './message_types';
import { report } from "./report";
import path from "path";
import { stepDanceConnection, defaultConfig } from "./stepdanceConnection";

const PORT = process.env.PORT || 3000;
let fakemode = false;

let portsAvailable : PortInfo[] = [];
let machineConnected = false;
let stepDance : stepDanceConnection | undefined;
let machineConfig = defaultConfig;


// ======== web server for frontend =========
const server = express()
	.use(favicon(path.join(__dirname, '..', "frontend", "diamond.ico")))
	.use(express.static(path.join(__dirname, '..', 'frontend')))
	.listen(PORT, () => console.log(`Listening on ${PORT}`));


// ======== serial port discovery =========
SerialPort.list().then((ports : PortInfo[]) => {
	portsAvailable = ports;
	for (var i=0;  i<ports.length; i++) {
		if (ports[i].path.indexOf("Stepdance1") > -1) {
			connectToPort(ports[i]);
		}
	}
	let paths: Array<string> = ports.reduce((acc, curr)=>{acc.push(curr.path); return acc}, []);
	report("Available: "+paths.join(", "), "serial", 3);
	io.emit("portsAvailable", portsAvailable);
});

let connectToPort = (portInfo: PortInfo | "fake") => {
	if (!machineConnected || typeof stepDance == "undefined") {
		if (portInfo != "fake") {
			let port : SerialPortOpenOptions<AutoDetectTypes> = {"path": portInfo.path, "baudRate": 115200}; 
			stepDance = new stepDanceConnection(port, machineConfig);
		}
		else {
			stepDance = new stepDanceConnection("fake", machineConfig);
		}

		stepDance.on("connected", (data:{path:string})=> {
			machineConnected = true;
			report("Connected to "+data.path, "serial", 4);
			io.emit("boardConnected");
		})

		stepDance.on("sending", (data: move)=>{
			report("sending: "+data.id, "serial", 4);
		});

		stepDance.on("waiting", ()=>{
			report("...waiting...", "serial", 4);
		});

		stepDance.on("serialMessage", (message: string)=>{
			report("Message: "+message, "serial", 2);
		});


		stepDance.on("queued", (data: move&{return:number})=>{
			report("-> queued: "+data.id+" ("+data.return+" slots remaining)", "serial", 4);
			io.emit("queued", data);
		});

		stepDance.on("disconnected", ()=> {
			machineConnected = false;
			report("disconnected", "serial", 4);
			io.emit("boardDisconnected");
		});
	}
}

// ======== Socket.io communication =========
const io : Server<frontendToServer, serverToFrontend> = new Server(server, { connectionStateRecovery: { 
		maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: true}
}); // https://socket.io/docs/v4/connection-state-recovery


io.on("connection", function(socket:Socket<frontendToServer, serverToFrontend>) : void  {
	report("Frontend connected.", "frontend", 5);
	socket.on("disconnect", function() : void { // built-in socket.io event
		report("Frontend disconnected.", "frontend", 5);
	});

	// ==== Pattern Streaming ====
	socket.on("op", (op: op)=>{
		report("Op "+op.id+": "+op.type+" "+op.x+" "+op.y, "frontend", 3);
		if (machineConnected || fakemode) {
			stepDance.send(op);
		}
	})

	socket.on("newConfig", (config: stepDanceConfig) => {
		machineConfig = config;

		report("New config: "+JSON.stringify(config), "frontend", 5);
		stepDance.updateConfig(machineConfig);
	});

	socket.on("updateFakeMode", (falseness: boolean) => {
		fakemode = falseness;
		report("Fakemode: "+fakemode, "frontend", 5);
	});

	// ==== Port Selection =======
	if (fakemode) {
		connectToPort("fake");
		socket.emit("updateFakeMode", fakemode);
	}
	else {
		socket.on("portSelection", connectToPort);
	}

	if (machineConnected || fakemode) {
		socket.emit("boardConnected");
	}
	else if ((!machineConnected && !fakemode )|| typeof stepDance == "undefined") {
		if (portsAvailable.length>0) {
			socket.emit("portsAvailable", portsAvailable);
		}
	}

});


