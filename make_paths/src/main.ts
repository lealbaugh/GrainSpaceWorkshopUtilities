import { Element, G, Svg, SVG } from "@svgdotjs/svg.js";
import { addDownloadButton, flattenAndOptimize, loadFromDOM } from "./util";

// ==================== A data structure ==============================================
type tileSet<tilename extends string> = Record<tilename, Element | G>;
type orientation = 0 | 90 | 180 | 270; // the orientation for a given tile must be one of the cardinal directions (in degrees)

type Tiles<tilename extends string> = {
	tileSize: number,
	tileSet: tileSet<tilename>, // a mapping from a tile name to a
	grid: Array<Array<[tilename, orientation]>>
};

// For example, here is a Tiles for a layout with two tiles (called simply "a" and "b")
// const sampleTiles : Tiles<"a" | "b"> = {
// 	tileSize: 20,
// 	tileSet : {
// 		"a": loadFromDOM("#a"),
// 		"b": loadFromDOM("#b")
// 	},
// 	grid: [
// 		[["a", 0],["a", 90],["a", 0],["a", 0],["a", 0],["a", 270],["a", 90],["a", 0]],
// 		[["b", 0],["a", 270],["a", 0],["a", 0],["a", 180],["a", 0],["a", 0],["a", 0]],
// 		[["a", 0],["a", 180],["b", 0],["a", 0],["a", 0],["a", 0],["a", 0],["a", 180]],
// 		[["a", 0],["a", 0],["a", 0],["a", 90],["b", 0],["a", 90],["a", 0],["a", 270]],
// 		[["a", 180],["a", 0],["a", 0],["a", 0],["a", 0],["a", 270],["a", 0],["a", 0]],
// 	]
// }

// Random from a list.
function randomOf<listType extends any>(list: Array<listType>) : listType {
	return list[Math.floor(Math.random()*list.length)];
}


// Get the base "tile" svg data from what is loaded into the html
function getTileSetFromDOM<tilename extends string>(tilenames: Array<tilename>) : tileSet<tilename> {
	let set : Partial<tileSet<tilename>> = {};
	for (let tilename of tilenames) {
		set[tilename] = loadFromDOM("#"+tilename);
	}
	return set as tileSet<tilename>;
}

// make and fill a grid with default tiles, in default orientation
function makeDefaultTilesFromDOM<tilename extends string>(tilenames: Array<tilename>, params: {tileSize: number, width : number, height : number}) : Tiles<tilename> {
	// get a list of names of tiles, to choose randomly between
	let tileSet: tileSet<tilename> = getTileSetFromDOM(tilenames);

	let name : tilename = tilenames[0];
	let dir : orientation = 0;
	let grid : Array<Array<[tilename, orientation]>> = [];
	for (let row=0; row<params.height; row++) {
		let line : Array<[tilename, orientation]>= [];
		for (let cell=0; cell<params.width; cell++) {
			line.push([name, dir]);
		}
		grid.push(line);
	}
	return { tileSize: params.tileSize, tileSet, grid };
}



// ====== Some ways to manipulate it ==================================

// Fill the whole grid with the same tiles
function fill<tilename extends string>(tiles: Tiles<tilename>, type: "random" | "braid") : Tiles<tilename> {
	let tilenames = Object.keys(tiles.tileSet) as Array<tilename>;
	tiles.grid.forEach((row, y) => {
		row.forEach((cell, x) => {
			let name : tilename = tilenames[0];
			let dir : orientation = 0;
			if (type == "random") {
				name = randomOf(tilenames);
				dir = randomOf([0, 90, 180, 270]);
			}
			else if (type == "braid") {
				if (Math.abs(y-x) < 5) {
					name = tilenames[1];
					dir = (y%2 == x%2) ? 0 : 90;
				}
			}
			tiles.grid[y][x] = [name, dir];
		});
	});
	return tiles;
}

// Comb all tiles to the same orientation
function comb<tilename extends string>(tiles: Tiles<tilename>, newAngle: orientation) : Tiles<tilename> {
	tiles.grid.forEach((row, y) => {
		row.forEach((cell, x) => {
			tiles.grid[y][x] = [cell[0], newAngle];
		});
	});
	return tiles;
}

// Comb each quadrant of the grid to its direction, resulting in a diamond-like shape
function alignToDiamond<tilename extends string>(tiles: Tiles<tilename>) : Tiles<tilename> {
	let firstTilename : tilename = Object.keys(tiles.tileSet)[0] as tilename;
	tiles.grid.forEach((row, y) => {
		row.forEach((cell, x) => {
			if (cell[0] == firstTilename) { // only rotate the first type of tile
				let angle : orientation = ((x<tiles.grid[0].length/2 || y<tiles.grid.length/2) && !(x<tiles.grid[0].length/2 && y<tiles.grid.length/2)) ? 90 : 0;
				tiles.grid[y][x] = [firstTilename, angle];
			}
		});
	});
	return tiles;
}


// ====== And a way to compile it to the output format ================
function tileCompile<tilename extends string>(tiles: Tiles<tilename>) : Svg {
	let width = tiles.grid[0].length;
	let height = tiles.grid.length;
	let composition : Svg = SVG();
	composition.size(width*tiles.tileSize, height*tiles.tileSize);

	tiles.grid.forEach((row, y) => {
		row.forEach((cell, x) => {
			let name : tilename = cell[0];
			let tile : Element | G = tiles.tileSet[name];
			let orientation : orientation = cell[1];
			tile.clone().rotate(orientation).addTo(composition).translate(x*tiles.tileSize, y*tiles.tileSize);
		});
	});

	return composition;
}

//  ====== Make it go ================
let randomTiles = makeDefaultTilesFromDOM(["a", "b"], {tileSize: 20, width: 15, height: 15});

let pattern = tileCompile(fill(randomTiles, "random"));

// *either* comment in the next line, *or* use https://plotterfiles.com/tools/optimizer on your output to join into continuous paths
// pattern = await flattenAndOptimize(pattern);

pattern.addTo(document.body);
addDownloadButton(document.body, pattern);