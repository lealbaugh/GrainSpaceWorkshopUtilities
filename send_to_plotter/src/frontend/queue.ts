export class queue<dataType> {
	data: Array<dataType>;

	constructor(){
		this.data = [];
	}

	setData(newData: Array<dataType>) {
		this.data = newData;
		console.log(this.data.length + " ops in queue");
	}

	length (): number {
		return this.data.length;
	}

	shift() : dataType {
		return this.data.shift();
	}
}