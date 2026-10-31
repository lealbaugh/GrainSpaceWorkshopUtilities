import parse from 'parse-svg-path';
import { rawOp, op } from '../server/message_types';



// Convert paths from svg to simple moveTo/lineTo, with absolute coords
export let svgToOps: (fileResult: string)=>Array<op> = (fileResult:string) => {
	let processed : Array<op> = [];
	if (typeof fileResult == "string") { // a good idea to check, I guess
		const parser = new DOMParser();
		const doc : Document = parser.parseFromString(fileResult, "image/svg+xml");
		const rawPaths = Array.from(doc.querySelectorAll('path'));


		let currentX = 0; // store for relative locations
		let currentY = 0;
		let id = 0;

		// console.log("rawPaths", rawPaths);
		rawPaths.forEach((path: SVGPathElement) => {
			let data = path.getAttribute("d");
			let instructions = parse(data);

			instructions.forEach((op:rawOp)=>{
				if (op[0] == "M") {
					currentX = (op[1]);
					currentY = (op[2]);
					processed.push({id: id++, type: "moveTo", x: currentX, y:currentY});
				}
				else if (op[0] == "m") {
					currentX += (op[1]);
					currentY += (op[2]);
					processed.push({id: id++, type: "moveTo", x: currentX, y:currentY});
				}
				else if (op[0] == "L") {
					currentX = (op[1]);
					currentY = (op[2]);
					processed.push({id: id++, type: "lineTo", x: currentX, y:currentY});
				}
				else if (op[0] == "l") {
					currentX += (op[1]);
					currentY += (op[2]);
					processed.push({id: id++, type: "lineTo", x: currentX, y:currentY});
				}
			});
		});

	}
	
	return processed;
}
