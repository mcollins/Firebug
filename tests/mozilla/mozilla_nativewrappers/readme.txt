	
* Testing Mozilla native wrappers
	
problem is noticed with FF 4 + fbug 1.7 
	
you need to install the extension , and load page "mozilla_nativewrappers.html"
	
result messages will be written in Firebug Console using the following mechanism:
	
	function sysout(msg) {
		Components.utils.reportError(msg);
		dump(msg + "\n");
	}
you need to enable "Show Chrome Errors/Messages" in Firebug Console menu
	
	