/**
	@constructor
*/
JSDOC.JsPlate = function(templateFile) {
	if (templateFile) this.template = IO.readFile(templateFile);
	
	this.templateFile = templateFile;
	this.code = "";
	this.parse();
};

JSDOC.JsPlate.prototype.parse = function() {
	var template = this.template.
			replace(/\n/g,"").
			replace(/\{#[\s\S]+?#\}/g,"");

	var code = "sys[out++]=\u001e"+template;

	code = code.replace(
		/<for +each="(.+?)" +in="(.+?)" *>/gi, 
		function (match, eachName, inName) {
			return "\u001e;\rdef('$"+eachName+"_keys', keys("+inName+"));\rfor(def('$"+eachName+"_i', 0),def('$"+eachName+"_length',$"+eachName+"_keys.length); $"+eachName+"_i < $"+eachName+"_length; $"+eachName+"_i++) {\rdef('$"+eachName+"_last', ($"+eachName+"_i == $"+eachName+"_length-1));\rdef('$"+eachName+"_key', $"+eachName+"_keys[$"+eachName+"_i]);\rdef('"+eachName+"', "+inName+"[$"+eachName+"_key]);\rsys[out++]=\u001e";
		}
	);
	
	/*
	var blockSimpleMatch =
	{
		"else":   "\u001e;}\relse { sys[out++]=\u001e",
		"/if":    "\u001e;\r};\rsys[out++]=\u001e",
		"/for":   "\u001e;\r};\rsys[out++]=\u001e"
	};

	var blockAdvancedMatch =
	{
		"if":     "\u001e;\rif (",
		"elseif": "\u001e;\r}\relse if ("
	};

	var reIfParams = /test="(.+?)"/;

	code = code.replace(/<(if|elseif|else|\/if|\/for)(\s\w.+?)?>/g, 
		function (match, type, params) {
			var result = blockSimpleMatch[type];
			if (result)
				return result;
		
			else if (type.indexOf("if") != -1)
			{
				var p = params.match(reIfParams);
				result = blockAdvancedMatch[type] + p[1] + ") { sys[out++]=\u001e";
				return result;
			}
		}
	);
	/**/
	
	
	code = code.replace(/<if test="(.+?)">/g, "\u001e;\rif ($1) { sys[out++]=\u001e");
	code = code.replace(/<elseif test="(.+?)"\s*\/>/g, "\u001e;}\relse if ($1) { sys[out++]=\u001e");
	code = code.replace(/<else\s*\/>/g, "\u001e;}\relse { sys[out++]=\u001e");
	code = code.replace(/<\/(if|for)>/g, "\u001e;\r};\rsys[out++]=\u001e");
	/**/
	code = code.replace(
		/\{\+\s*([\s\S]+?)\s*\+\}/gi,
		function (match, code) {
			code = code.replace(/"/g, "\u001e"); // prevent qoute-escaping of inline code
			//code = code.replace(/(\r?\n)/g, " ");
			return "\u001e+ ("+code+") +\u001e";
		}
	);
	code = code.replace(
		/\{!\s*([\s\S]+?)\s*!\}/gi,
		function (match, code) {
			code = code.replace(/"/g, "\u001e"); // prevent qoute-escaping of inline code
			//code = code.replace(/\n/g, " ");
			return "\u001e; "+code+";\rsys[out++]=\u001e";
		}
	);
	
	code = code+"\u001e;\rsys=sys.join('');";

	//code = code.replace(/(\r?\n)/g, "\\n");
	code = code.replace(/"/g, "\\\"");
	code = code.replace(/\u001e/g, "\"");
	this.code = code;
};

JSDOC.JsPlate.prototype.toCode = function() {
	return this.code;
};

JSDOC.JsPlate.keys = function(obj) {
	var keys = [], ki = 0;
	if (obj.constructor.toString().indexOf("Array") > -1) {
		for (var i = 0, l = obj.length; i < l; i++) {
			keys[ki++] = i;
		}
	}
	else {
		for (var i in obj) {
			keys[ki++] = i;
		}
	}
	return keys;
};

JSDOC.JsPlate.values = function(obj) {
	var values = [], vi = 0;
	if (obj.constructor.toString().indexOf("Array") > -1) {
		for (var i = 0, l = obj.length; i < l; i++) {
			values[vi++] = obj[i];
		}
	}
	else {
		for (var i in obj) {
			values[vi++] = obj[i];
		}
	}
	return values;
};

JSDOC.JsPlate.scope = {
	JSDOC: JSDOC,
	def: function(name, value) {
		this[name] = value;
	}
};

JSDOC.JsPlate.prototype.process = function(_data, _compact) { 

	// prepare the JsPlate scope with the most frequently used variables
	JSDOC.JsPlate.scope.keys = JSDOC.JsPlate.keys;
	JSDOC.JsPlate.scope.values = JSDOC.JsPlate.values;
	
	JSDOC.JsPlate.scope.data = _data;
	JSDOC.JsPlate.scope.compact = _compact;
	
	JSDOC.JsPlate.scope.sys = [];
	JSDOC.JsPlate.scope.out = 0;
	
	// add JsPlate scope to the top of the scope chain to improve the name
	// looking during the heavy processing function that will be evaluated
	with(JSDOC.JsPlate.scope) {

		try {
			eval(this.code);
		}
		catch (e) {
			print(">> There was an error evaluating the compiled code from template: "+this.templateFile);
			print("   The error was on line "+e.lineNumber+" "+e.name+": "+e.message);
			var lines = this.code.split("\r");
			if (e.lineNumber-2 >= 0) print("line "+(e.lineNumber-1)+": "+lines[e.lineNumber-2]);
			print("line "+e.lineNumber+": "+lines[e.lineNumber-1]);
			print("");
		}
		/*
		if (compact) { // patch by mcbain.asm
			// Remove lines that contain only space-characters, usually left by lines in the template
			// which originally only contained JSPlate tags or code. This makes it easier to write
			// non-tricky templates which still put out nice code (not bloated with extra lines).
			// Lines purposely left blank (just a line ending) are left alone.
			sys = sys.replace(/\s+?(\r?)\n/g, "$1\n");
		}
		/**/
		
		/*debug*///print(this.code);
		return sys;
	}
};