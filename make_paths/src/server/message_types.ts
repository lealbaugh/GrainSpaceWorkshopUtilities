import { PortInfo } from '@serialport/bindings-cpp';


// ====== Who says what to whom? ===========
export type frontendToServer = {
	"op" : (op: op) => void,
	"portSelection" : (port: PortInfo) => void,
	"newConfig" : (config: stepDanceConfig) => void,
	"updateFakeMode" : (falseness : boolean) => void
}

export type serverToFrontend = {
	"portsAvailable" : (portsAvailable:  PortInfo[]) => void,
	"boardConnected" : () => void,
	"boardDisconnected" : () => void,
	"queued" : (data: move&{return:number}) => void,
	"updateFakeMode" : (falseness : boolean) => void
}

export type plotterToServer = {
	"connected" : (data: {path: string}) => void,
	"disconnected" : () => void,
	"waiting" : () => void,
	"sending" : (data: move) => void,
	"queued" : (data: move&{return:number}) => void,
	"serialMessage" : (data: string) => void,
}

export type serverToPlotter = {
	"send" : (move: move) => any
}

export interface stepDanceConfig extends Record<string, number> {drawSpeed:number, zSpeed: number, penUpHeight:number, penDownHeight: number};

// ====== What does data look like? ===========

// rawOp is what we get from the small third-party `parse-svg-path` library.
export type rawOp = ["M"|"L"|"m"|"l"|"H"|"h"|"V"|"v", number, number];

// op is the main interchange format we want to use (e.g. could come from raw json instead of an svg)
export type op = {type: "moveTo"|"lineTo", id: number, x: number, y:number};

// move is a *plotter* move -- that is, it also has the pen up / pen down movements. specific speed/z-locations are applied at point of sending to plotter (based on plotter config)
export type move = {id: number, basis?: "relative"|"absolute", speed?: "draw"|"changeZ", x: number, y: number, z: "up"|"down"};