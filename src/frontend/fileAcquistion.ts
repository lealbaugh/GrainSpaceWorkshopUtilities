import { cursorTo } from 'node:readline';
import parse from 'parse-svg-path';

type fileConfig = {extension: string, readAs: "dataURL", callback : (file: ArrayBuffer) => any} | {extension: string, readAs: "text", callback : (file: string) => any};

export class fileAcquirer {

	// constructor (dropArea:HTMLElement, divs : (name: string) => HTMLElement, callback : (svg: Document) => any ) {
	constructor (dropArea:HTMLElement, config: fileConfig ) {
		function onDragOver(e : DragEvent) {
			// divs("main").classList.add("hovered");
			dropArea.classList.add("hovered");
			e.preventDefault();
		}
		function onDragEnter(e : DragEvent) {
			e.preventDefault();
		}
		function onDragLeave(e : DragEvent) {
			// divs("main").classList.remove("hovered");
			dropArea.classList.remove("hovered");
			e.preventDefault();
		}
		function onDrop(e : DragEvent) {
			// divs("main").classList.remove("hovered");
			dropArea.classList.remove("hovered");
			if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				var files : FileList = e.dataTransfer.files;
				for (let i: number = 0; i<files.length; i++) {
					try {
						if (typeof files.item(i) != "undefined") {
							let file : File | null = files.item(i);
							if (file) {
								console.log("reading...");
								var fileReader = new FileReader();
								if (file.name.endsWith(config.extension)) {
									fileReader.onload = function ( event : ProgressEvent<FileReader> ) {
										if (event.target) {
											if (event.target.result) {
												if (config.readAs=="text") {
													let result = event.target.result as string;
													try {
														config.callback(result);
													}
													catch (error) {
														console.log("failed to import text file: "+file.name);
														console.log(error);
													}
												}
												else if (config.readAs=="dataURL") {
													let result = event.target.result as ArrayBuffer;
													try {
														config.callback(result);
													}
													catch (error) {
														console.log("failed to import data file: "+file.name);
														console.log(error);
													}
												}
											}
										}
									};
									if (config.readAs == "text") fileReader.readAsText(file);
									else if (config.readAs == "dataURL") fileReader.readAsDataURL(file);
									
								}
								else {
									console.log("not an svg (probably)");
								}
							}
						}
					}
					catch {
						console.log("undefined file");
					}
				}
				
			}
			e.preventDefault();
		}


		dropArea.addEventListener('drop', (e : DragEvent ) => onDrop(e), false);
		dropArea.addEventListener("dragover", (e : DragEvent) =>onDragOver(e), false);
		dropArea.addEventListener("dragenter", (e : DragEvent) =>onDragEnter(e), false);
		dropArea.addEventListener("dragleave", (e : DragEvent) =>onDragLeave(e), false);
	}
}

type rawOp = ["M"|"L"|"m"|"l", number, number];
type processedOp = {op: "moveTo"|"lineTo", x: number, y:number};


let svgToObject: (fileResult: any)=>Array<processedOp> = (fileResult:any) => {
	let processed : Array<processedOp> = [];
	if (typeof fileResult == "string") {
		const parser = new DOMParser();
		const doc : Document = parser.parseFromString(fileResult, "image/svg+xml");
		const rawPaths = Array.from(doc.querySelectorAll('path'));


		let currentX = 0; // store for relative locations
		let currentY = 0;

		rawPaths.forEach((path: SVGPathElement) => {
			let data = path.getAttribute("d");
			let instructions = parse(data);

			instructions.forEach((op:rawOp)=>{
				if (op[0] == "M") {
					currentX = (op[1])/10;
					currentY = (op[2])/10;
					processed.push({op: "moveTo", x: currentX, y:currentY});
				}
				else if (op[0] == "m") {
					currentX += (op[1])/10;
					currentY += (op[2])/10;
					processed.push({op: "moveTo", x: currentX, y:currentY});
				}
				else if (op[0] == "L") {
					currentX = (op[1])/10;
					currentY = (op[2])/10;
					processed.push({op: "lineTo", x: currentX, y:currentY});
				}
				else if (op[0] == "l") {
					currentX += (op[1])/10;
					currentY += (op[2])/10;
					processed.push({op: "lineTo", x: currentX, y:currentY});
				}
			});
		});

	}
	
	return processed;
}
