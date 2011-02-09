JSDOC.PluginManager.registerPlugin(
	"JSDOC.publishSrcHilite",
	{
		onPublishSrc: function(src) {
			var path = src.path;
			if (path in JsHilite.cache) {
				return; // already generated src code
			}
			else JsHilite.cache[path] = true;
			
			// xxxpedro performance
			var cache = JSDOC.FileCache[path];
			
			var sourceCode = cache.text;
			var lines = cache.lines;
			
			var hiliter = new JsHilite(sourceCode, src.charset, path); // xxxpedro performance - added path param
			src.hilited = hiliter.hilite(sourceCode, lines); // xxxpedro
		}
	}
);

function JsHilite(src, charset, srcPath) { // xxxpedro performance - added srcPath param

	// xxxpedro performance
	this.tokens = JSDOC.TokenReader.getAllTokens(srcPath);
	
	if (!charset) charset = "utf-8";
	
	// xxxpedro
	this.header = '<html><head><meta http-equiv="content-type" content="text/html; charset='+charset+'"> '+
		'<link rel=stylesheet href="../../code.css" type="text/css">' +
		'</head><body>';
	this.footer = "</body></html>";
	this.showLinenumbers = true;
}

JsHilite.cache = {};

JsHilite.prototype.hilite = function(sourceCode, lines) {

	var result = [];
	var lineNumber = 1;
	
	var tokens = this.tokens;
	
	// adjust the base location of links to allow source-to-doc references
	Link.base = "../../";
	
	for (var i=0, length = tokens.length, token; i < length; i++)
	{
		token = tokens[i];
		
		var symbolName = "";
		var symbolProp = "";
		if (token.symbolName)
		{
			symbolName = token.symbolName;
			symbolProp = " symbol=\"" + symbolName + "\"";
		}
		
		if (token.type == "NEWLINE")
			result.push("\n");
	
		else if (token.type == "WHIT")
			result.push(token.data.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
	
		else if (token.type == "NAME")
			result.push("<span class=\"NAME\""+symbolProp+">"+new Link().toSymbol(symbolName||token.data).withText(token.data)+"</span>");
	
		else
			result.push("<span class=\""+token.type+"\""+symbolName+">"+token.data.replace(/</g, "&lt;").replace(/>/g, "&gt;")+"</span>");
	}
	
	// restore the default value
	Link.base = "";
	
	var str = result.join("");
	
	var html = ['</pre><div class="lineNumbers">'];
	var hl = 1;
	
	// render the line number divs
	for(var l=1; l<=lines; l++)
	{
		html[hl++] = '<div><a name="L';
		html[hl++] = l;
		html[hl++] = '" href="#L';
		html[hl++] = l;
		html[hl++] = '">';
		html[hl++] = l;
		html[hl++] = '</a></div>';
	}
	
	html[hl++] = '</div><div id="sourceSpacer" class="lineNumbers"></div>';
	return this.header+str+html.join("")+this.footer;
};