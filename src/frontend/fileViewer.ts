import { fileAcquirer } from "./fileAcquistion";
import {cropToTarget, svgToOps } from "./svgParsing";

import { op } from "../server/message_types";


const svgNS = "http://www.w3.org/2000/svg";

export class fileViewer {
	drawnLinesDict : Record <number, SVGLineElement> = {};
	pathQueue : Array<op> = [];

	constructor(dropDiv:HTMLElement, viewMode: "SVG"|"canvas") {
		fileAcquirer(dropDiv, [
				{
					extension:".svg", 
					readAs:"text", 
					callback:(file: string) : void => {
						let processed = svgToOps(file);
						this.queueAndDisplay(processed, viewMode);
					}
				}, 
				{
					extension:".json", 
					readAs:"text", 
					callback:(file: string) : void => {
						let processed = JSON.parse(file);
						processed = cropToTarget(processed);
						this.queueAndDisplay(processed, viewMode);
					}
				}, 
			] 
		);
	}

	queueAndDisplay = (paths: Array<op>, viewMode: "SVG"|"canvas"):void => {
		this.pathQueue = paths;
		console.log(JSON.stringify(paths));
		console.log(this.pathQueue.length + " ops in queue");
		if (viewMode == "SVG") this.displaySimpleSvg(this.pathQueue);
		else if (viewMode == "canvas") this.displayOnCanvas(this.pathQueue);
	}

	displayOnCanvas  = (paths: Array<op>):void => {
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


	displaySimpleSvg = (paths: Array<op>): Record <number, SVGLineElement> => {
		let svg : SVGSVGElement = document.querySelector("svg");
		this.drawnLinesDict = {};
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
				this.drawnLinesDict[path.id] = line;
				svg.append(line);
			}
			currentX = path.x;
			currentY = path.y;
		});

		return this.drawnLinesDict;
	}
}
