
type fileConfig = {extension: string, readAs: "dataURL", callback : (file: ArrayBuffer) => any} | {extension: string, readAs: "text", callback : (file: string) => any};

export let fileAcquirer = (dropArea:HTMLElement, configs: Array<fileConfig> ) => {
	let onDragOver = (e : DragEvent) => {
		dropArea.classList.add("hovered");
		e.preventDefault();
	}
	let onDragEnter = (e : DragEvent) => {
		e.preventDefault();
	}
	let onDragLeave = (e : DragEvent) => {
		dropArea.classList.remove("hovered");
		e.preventDefault();
	}
	let onDrop = (e : DragEvent) => {
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
							let satisfactory :boolean = false; // does this file meet any of our criteria?
							for (let config of configs) {
								if (file.name.endsWith(config.extension)) { // just the ones with the file type we asked for (very hacky way to ask about file type...)
									satisfactory = true;
									fileReader.onload = function ( event : ProgressEvent<FileReader> ) {
										if (event.target && event.target.result) {
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
									};
									if (config.readAs == "text") fileReader.readAsText(file);
									else if (config.readAs == "dataURL") fileReader.readAsDataURL(file);
									
								}
							}
							if (!satisfactory) console.log("no suitable file found -- upload an svg or a json");
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


	dropArea.addEventListener('drop', (e : DragEvent ) =>  onDrop(e), false);
	dropArea.addEventListener("dragover", (e : DragEvent) => onDragOver(e), false);
	dropArea.addEventListener("dragenter", (e : DragEvent) => onDragEnter(e), false);
	dropArea.addEventListener("dragleave", (e : DragEvent) => onDragLeave(e), false);
}

