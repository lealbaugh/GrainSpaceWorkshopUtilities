import { PortInfo } from '@serialport/bindings-cpp';
import { frontendToServer, serverToFrontend, op, move, stepDanceConfig } from "../server/message_types";
import { fileAcquirer } from "./fileAcquistion";
import {svgToOps } from "./svgParsing";
import { io, Socket } from "socket.io-client";

const svgNS = "http://www.w3.org/2000/svg";

let connected : boolean = false;
let pathQueue : Array<op> = [];

let drawnLinesDict : Record <number, SVGLineElement> = {};
let plotterConfigValues : stepDanceConfig = {drawSpeed:20, zSpeed: 5, penUpHeight:5, penDownHeight: 0};
let configControlInputs : Record<keyof stepDanceConfig, HTMLInputElement> = {};

let streaming = false;

let processAndShow = (file: string) : void => {
	let processed = svgToOps(file);
	pathQueue = processed;
	console.log(pathQueue.length + " ops in queue");
	displaySimpleSvg(pathQueue);
}

let displayOnCanvas  = (paths: Array<op>):void => {
	let canvas = document.createElement("canvas");
	canvas.height = 792;
	canvas.width = 612;
	let ctx = canvas.getContext("2d");
	ctx.strokeStyle = "black";

	document.body.appendChild(canvas);

	ctx.beginPath();
	paths.forEach((path:op) => {
		if (path.type == "moveTo") ctx.moveTo(path.x, path.y);
		else if (path.type == "lineTo") ctx.lineTo(path.x, path.y);
	});

	ctx.stroke();
}


let displaySimpleSvg = (paths: Array<op>): Record <number, SVGLineElement> => {
	let svg : SVGSVGElement = document.querySelector("svg");
	drawnLinesDict = {};
	let currentX = 0;
	let currentY = 0;
	paths.forEach((path : op) => {
		if (path.type == "lineTo") {
			let line = document.createElementNS(svgNS, "line");
			line.setAttribute("x1", ""+currentX);
			line.setAttribute("y1", ""+currentY);

			line.setAttribute("x2", ""+path.x);
			line.setAttribute("y2", ""+path.y);
			line.setAttribute("stroke", "#000000");
			drawnLinesDict[path.id] = line;
			svg.append(line);
		}
		currentX = path.x;
		currentY = path.y;
	});

	return drawnLinesDict;
}


window.addEventListener("load", (e) => {

	fileAcquirer(document.body, {extension:".svg", readAs:"text", callback:processAndShow} );

	const portSelectorDiv = document.getElementById("portSelection");
	const dropdown = document.getElementById("dropdown") as HTMLSelectElement;
	const connectButton = document.getElementById("connect") as HTMLButtonElement;
	const fakemode = document.getElementById("fakemode") as HTMLInputElement;
	const startStopControls = document.getElementById("startStopControls") as HTMLDivElement;
	const goButton = document.getElementById("go") as HTMLButtonElement;
	const stopButton = document.getElementById("stop") as HTMLButtonElement;
	const plotterConfigDiv = document.getElementById("plotterConfig") as HTMLDivElement;

	for (let key in plotterConfigValues) {
		let entryBox = document.createElement("input");
		entryBox.type = "text";
		entryBox.id = key;
		entryBox.value = ""+ plotterConfigValues[key];
		configControlInputs[key] = entryBox;

		let entryBoxLabel = document.createElement("label") as HTMLLabelElement;
		entryBoxLabel.setAttribute("for",key);
		entryBoxLabel.innerText = key;

		plotterConfigDiv.appendChild(entryBoxLabel);
		plotterConfigDiv.appendChild(entryBox);
	}
	let sendConfigButton = document.createElement("button");
	sendConfigButton.innerText = "update plotterConfig";
	plotterConfigDiv.appendChild(sendConfigButton);


	let socket : Socket<serverToFrontend, frontendToServer> = io();

	socket.on("portsAvailable", (portsAvailable:PortInfo[]) : void => {
		portSelectorDiv.classList.remove("hidden");
		dropdown.innerHTML = "";

		portsAvailable.forEach((info: PortInfo, index:number) => {
			let newOpt = document.createElement("option");
			newOpt.innerText = info.path;
			newOpt.value = ""+index;
			dropdown.appendChild(newOpt);
		});

		connectButton.addEventListener("click", (e: MouseEvent)=> {
			for (let i=0; i<dropdown.children.length; i++) {
				let opt = dropdown.children[i] as HTMLOptionElement;
				if (opt.selected) {
					socket.emit("portSelection", portsAvailable[parseInt(opt.value)]);
				}
			}
		})

	});

	socket.on("boardConnected", () => {
		connected = true;
		document.body.classList.add("connected");
		document.getElementById("portSelection")?.classList.add("hidden");
		startStopControls.classList.remove("hidden");
	});

	socket.on("boardDisconnected", () => {
		connected = false;
		document.body.classList.remove("connected");
		startStopControls.classList.add("hidden");
	});


	socket.on("queued", (data: move&{result:number}) => { //meaning that something has been successfully queued
		if (data.id in drawnLinesDict) {
			drawnLinesDict[data.id].setAttribute("stroke", "#ff0000");
		}
		if (data.id == Math.floor(data.id) || data.id-0.3 == Math.floor(data.id)) { // if this was an integer-numbered id or the third of the sub-ids
			if (data.result >= 0 && streaming) { // needs to send even if there's no space left in the stepdance buffer, because there needs to be something waiting for it when it checks
				if (pathQueue.length>0) {
					let op = pathQueue.shift();
					console.log(op);
					socket.emit("op", op);
				}
			}
		}
	});

	socket.on("updateFakeMode", (state:boolean) =>{
		if (state == true) {
			fakemode.setAttribute("checked", "");
		}
		else {
			fakemode.removeAttribute("checked");
		}
	})

	goButton.addEventListener("click", (e:MouseEvent)=>{
		if (connected) {
			streaming = true;
			document.body.classList.add("streaming");
			if (pathQueue.length>0) {
				let op = pathQueue.shift();
				console.log(op);
				socket.emit("op", op);
			}
		}
	});

	stopButton.addEventListener("click", (e:MouseEvent)=>{
		streaming = false;
		document.body.classList.remove("streaming");
	});

	fakemode.addEventListener("change", (e:Event) => {
		let value = fakemode.checked;
		socket.emit("updateFakeMode", value);
	});

	sendConfigButton.addEventListener("click", (e:MouseEvent)=>{
		for (let key in plotterConfigValues) {
			plotterConfigValues[key] = parseInt(configControlInputs[key].value);
		}
		socket.emit("newConfig", plotterConfigValues);
	});
});




