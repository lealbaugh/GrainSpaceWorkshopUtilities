import parse from 'parse-svg-path';
import { rawOp, op } from '../server/message_types';

const targetWidth = 215.9; // 8.5" in mm
const targetHeight = 279.4; // 11' in mm

// Convert paths from svg to simple moveTo/lineTo, with absolute coords
export let svgToOps: (fileResult: string)=>Array<op> = (fileResult:string) => {
	let processed : Array<op> = [];
	if (typeof fileResult == "string") { // a good idea to check, I guess
		const parser = new DOMParser();
		const doc : Document = parser.parseFromString(fileResult, "image/svg+xml");

		const svgRoot = doc.documentElement as unknown as SVGSVGElement;
		const scale = scaleToLetter(svgRoot);

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
					processed.push({id: id++, type: "moveTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "m") {
					currentX += (op[1]);
					currentY += (op[2]);
					processed.push({id: id++, type: "moveTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "H") {
					currentX = (op[1]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "h") {
					currentX += (op[1]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "V") {
					currentY = (op[1]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "v") {
					currentY += (op[1]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "L") {
					currentX = (op[1]);
					currentY = (op[2]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
				else if (op[0] == "l") {
					currentX += (op[1]);
					currentY += (op[2]);
					processed.push({id: id++, type: "lineTo", x: currentX*scale, y:currentY*scale});
				}
			});
		});

	}
	
	return processed;
}


let scaleToLetter  = (svgRoot: SVGSVGElement): number => {
	let scale:number;

	const vb = svgRoot.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
	const vbWidth = vb && vb.length >= 4 ? vb[2] : null;
	const vbHeight = vb && vb.length >= 4 ? vb[3] : null;

	const widthScale = targetWidth / vbWidth;
	const heightScale = targetHeight / vbHeight;

	return Math.min(widthScale, heightScale);

}

export let cropToTarget =  (paths: Array<op>):Array<op> => {
	paths.forEach((path:op) => {
		path.x = Math.min(path.x, targetWidth);
		path.x = Math.max(path.x, 0);

		path.y = Math.min(path.y, targetHeight);
		path.y = Math.max(path.y, 0);
	})
	return paths;
}


// From Anup's code!

// figure out how many mm one source user-unit equals.
// reads the width attribute (e.g. "210mm", "595.28px") and divides by viewBox width.
// if there's no useful info, assume 1 user unit = 1 mm and warn.
function computeScale(svgRoot: SVGSVGElement): number {
  const widthMm = parseAttrToMm(svgRoot.getAttribute('width') ?? '');
  const vb = svgRoot.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  const vbWidth = vb && vb.length >= 4 ? vb[2] : null;

  if (widthMm !== null && vbWidth && vbWidth > 0) return widthMm / vbWidth;
  if (widthMm !== null) return 1; // no viewBox, just assume 1:1

  console.warn('plotutil: no width attribute with units found, assuming 1 user unit = 1 mm');
  return 1;
}

// parse "210mm", "8.5in", "595px" etc. into a mm number. returns null if unrecognised.
// bare numbers treated as px at 96dpi per svg spec
function parseAttrToMm(attr: string): number | null {
  const s = attr.trim();
  if (!s) return null;
  if (s.endsWith('mm')) return parseFloat(s);
  if (s.endsWith('cm')) return parseFloat(s) * 10;
  if (s.endsWith('in')) return parseFloat(s) * 25.4;
  if (s.endsWith('pt')) return parseFloat(s) * (25.4 / 72);
  if (s.endsWith('px')) return parseFloat(s) * (25.4 / 96);
  const n = parseFloat(s);
  return isNaN(n) ? null : n * (25.4 / 96);
}
