import { PortInfo } from '@serialport/bindings-cpp';
import { frontendToServer, serverToFrontend, move, stepDanceConfig, op } from "../server/message_types";
import { io, Socket } from "socket.io-client";
import { fileViewer } from './fileViewer';
import { queue } from './queue';


export class serialSender {
	plotterConfigValues : stepDanceConfig = {drawSpeed:20, zSpeed: 5, penUpHeight:5, penDownHeight: 0};
	configControlInputs : Record<keyof stepDanceConfig, HTMLInputElement> = {};

	socket: Socket<serverToFrontend, frontendToServer>;

	firstSendSize = 1;
	connected : boolean = false;
	streaming : boolean = false;

	constructor(parent:HTMLElement, pathQueue: queue<op>, viewer?:fileViewer) {

		const configButton = this.initConfigPanel(parent);
	// Get refs for elements that will have listeners
		const connectButton = document.getElementById("connect") as HTMLButtonElement;
		const fakemode = document.getElementById("fakemode") as HTMLInputElement;
		const goButton = document.getElementById("go") as HTMLButtonElement;
		const stopButton = document.getElementById("stop") as HTMLButtonElement;

	// ...or will have their visibility changed
		const portSelectorDiv = document.getElementById("portSelection");
		const startStopControls = document.getElementById("startStopControls") as HTMLDivElement;

	// Start some comms
		let socket : Socket<serverToFrontend, frontendToServer> = io();

	// ===== Port selector ==========
		socket.on("portsAvailable", (portsAvailable:PortInfo[]) : void => {
			portSelectorDiv.classList.remove("hidden");

			const dropdown = document.getElementById("dropdown") as HTMLSelectElement;
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


	// ===== Board events ==========

		let sendNextOp : ()=> void = ()=> {
			if (pathQueue.length()>0) {
				let op = pathQueue.shift();
				console.log(op);
				socket.emit("op", op);
			}
			else {
				console.log("No more data needed to send.")
			}
		}

		socket.on("boardConnected", () => {
			this.connected = true;
			document.body.classList.add("connected");
			document.getElementById("portSelection")?.classList.add("hidden");
			startStopControls.classList.remove("hidden");
		});

		socket.on("boardDisconnected", () => {
			this.connected = false;
			document.body.classList.remove("connected");
			startStopControls.classList.add("hidden");
		});

		socket.on("queued", (data: move&{return:number}) => { //meaning that something has been successfully queued
			if (viewer && data.id in viewer.drawnLinesDict) {
				viewer.drawnLinesDict[data.id].setAttribute("stroke", "#ff0000");
			}
			if (data.id == Math.floor(data.id) || data.id-0.3 == Math.floor(data.id)) { // if this was an integer-numbered id or the third of the sub-ids
				if (data.return >= 0 && this.streaming) { // needs to send even if there's no space left in the stepdance buffer ("0"), because there needs to be something waiting for it when it checks
					sendNextOp();
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

	// ===== UI events ==========
		goButton.addEventListener("click", (e:MouseEvent)=>{
			if (this.connected) {
				this.streaming = true;
				document.body.classList.add("streaming");
				for (let i=0; i<this.firstSendSize; i++) {
					sendNextOp();
				}
			}
		});

		stopButton.addEventListener("click", (e:MouseEvent)=>{
			this.streaming = false;
			document.body.classList.remove("streaming");
		});

		fakemode.addEventListener("change", (e:Event) => {
			let value = fakemode.checked;
			socket.emit("updateFakeMode", value);
		});

		configButton.addEventListener("click", (e:MouseEvent)=>{
			for (let key in this.plotterConfigValues) {
				this.plotterConfigValues[key] = parseInt(this.configControlInputs[key].value);
			}
			socket.emit("newConfig", this.plotterConfigValues);
		});
	}

	initConfigPanel (parent:HTMLElement) : HTMLButtonElement {
		const plotterConfigDiv = document.getElementById("plotterConfig") as HTMLDivElement;
		for (let key in this.plotterConfigValues) {
			let entryBox = document.createElement("input");
			entryBox.type = "text";
			entryBox.id = key;
			entryBox.value = ""+ this.plotterConfigValues[key];
			this.configControlInputs[key] = entryBox;

			let entryBoxLabel = document.createElement("label") as HTMLLabelElement;
			entryBoxLabel.setAttribute("for",key);
			entryBoxLabel.innerText = key;

			let br = document.createElement("br");

			plotterConfigDiv.appendChild(entryBox);
			plotterConfigDiv.appendChild(entryBoxLabel);
			plotterConfigDiv.appendChild(br);
		}
		let sendConfigButton = document.createElement("button");
		sendConfigButton.innerText = "update plotterConfig";
		plotterConfigDiv.appendChild(sendConfigButton);

		return sendConfigButton;
	}
}