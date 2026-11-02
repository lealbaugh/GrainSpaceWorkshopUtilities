import { op } from '../server/message_types';
import { queue } from './queue';
import { fileViewer } from './fileViewer';
import { serialSender } from './sender';



window.addEventListener("load", (e) => {
	let pathQueue : queue<op> = new queue();

	let viewer = new fileViewer(document.body, pathQueue, "SVG");

	let sender = new serialSender(document.body, pathQueue, viewer);
});




