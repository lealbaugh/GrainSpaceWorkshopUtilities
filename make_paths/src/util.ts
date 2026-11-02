import { Element, G, Svg, SVG } from "@svgdotjs/svg.js";
import { saveAs } from 'file-saver';

import { readMultilayerSvg, writeSvg, convertLength, execute, readSvg, Document, readSvgByAttributes, ColorMode } from "vpype-js";

export async function flattenAndOptimize(input : Svg, mode?: ColorMode) : Promise<Svg> {
	let inputText = input.svg();
	// we *should* be able to just use "readSvg" to get a single-layer svg, but the implementation is broken
	const svg : Document = readSvgByAttributes(inputText, ["stroke"], convertLength("0.1mm"));
	let optimized = await execute("linemerge -t 0.1mm linesort --two-opt", svg);

	if (typeof mode == undefined) {mode = "default"};
	input.svg(writeSvg(optimized, { colorMode: mode}));
	return input;
}

export function loadFromDOM(selector: string) : G {
	let list = SVG(selector).children();
	let group = SVG().group();
	list.each((child) => {
		child.clone().attr({'stroke':'#000', 'stroke-width':1, 'fill':'none'}).addTo(group);
	});
	return group;
}

export function addDownloadButton(parent: HTMLElement, data: Svg, filename?: string) : HTMLButtonElement {
	if (typeof filename == "undefined") {
		filename = "out.svg";
	}
	let button = document.createElement("button");
	button.innerHTML = "Save";
	button.addEventListener("click", () => {
		var blob = new Blob([data.svg()], {type: "image/svg+xml"});
		saveAs(blob, filename);
		console.log(data);
	});
	parent.appendChild(button);
	return button;
}