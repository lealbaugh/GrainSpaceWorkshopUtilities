const verbosityThreshold : number = 1;
export function report (msg: string, sender: "serial" | "frontend",importance: number) : void {
	if (!importance || (importance && importance > verbosityThreshold)) {
		if (sender == "frontend") console.log("[frontend] "+blueText(msg));
		else if (sender == "serial") console.log("[serial] "+yellowText(msg));
		else console.log(msg);
	}
}
function blueText (txt: string) : string {
	return "\x1b[34m"+txt+"\x1b[0m";
}
function yellowText (txt: string) : string {
	return "\x1b[33m"+txt+"\x1b[0m";
}