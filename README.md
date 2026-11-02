Install packages with:
`npm install`

Run with:
`npm run watch`

Visit:
http://localhost:3000/


Drag and drop a file. Either:

## SVG file
An SVG file with only straight-line *path* elements (not lines or polylines), such as:
```svg
<path d="M60.2,56.8l50.9,50.9l50.9,50.9 M48.7,71.8l62.4,36l62.4,36 M41.5,89.1l69.5,18.6l69.5,18.6 M39.1,107.8h72h72
	 M41.5,126.4l69.5-18.6l69.5-18.6 M48.7,143.8l62.4-36l62.4-36 M60.2,158.7l50.9-50.9l44.2-44.2l6.7-6.7"/>
```
The size will be scaled to fit an 8.5"x11" canvas. If you don't want yours scaled, make sure `viewBox="0 0 215.9 279.4"` and specify your dimensions in mm.

## JSON file
JSON file with a list of lineTo/moveTo operations

```json
[
	{
		"id": 0, // a unique sequential number
		"type": "moveTo", // "lineTo" or "moveTo"
		"x": 1, // number in mm 
		"y": 2 // number in mm
	},
	{
		"id": 1, // a unique sequential number
		"type": "lineTo", // "lineTo" or "moveTo"
		"x": 10, // number in mm 
		"y": 23 // number in mm
	},
	{
		"id": 2, // a unique sequential number
		"type": "lineTo", // "lineTo" or "moveTo"
		"x": 1, // number in mm 
		"y": 40 // number in mm
	},
	// etc
]
```
The units are assumed to be mm. The code will crop the paths to fit within the 215.9mm x 279.4mm bounds.