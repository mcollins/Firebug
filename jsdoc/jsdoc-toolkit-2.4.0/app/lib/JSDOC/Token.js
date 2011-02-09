if (typeof JSDOC == "undefined") JSDOC = {};

/**
	@constructor
*/
JSDOC.Token = function(data, type, name, stream) {
	this.data = data;
	this.type = type;
	this.name = name;
	
	// TODO: xxxpedro
	this.lineNumber = stream ? stream.lineNumber : -1;
};

JSDOC.Token.prototype.toString = function() { 
	return "<"+this.type+" name=\""+this.name+"\">"+this.data+"</"+this.type+">";
};

JSDOC.Token.prototype.is = function(what) {
	return this.name === what || this.type === what;
};