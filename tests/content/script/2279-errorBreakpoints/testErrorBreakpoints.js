function runTest() {
	FBTestFirebug.openNewTab(basePath + "console/testErrorBreakpoints.html", function(win) {
		fireTest(win);
	});
}

function hasClass(el, className) {
	return (el.getAttribute("class").indexOf(className) != -1);
}
	
function fireTest(win) {
    
    FBTestFirebug.enableConsolePanel(function(win){	
	    var panel = FBTestFirebug.selectPanel("console").panelNode;
	    var panelDoc = FBTestFirebug.getPanelDocument();
	    var lookForLogRow = new MutationRecognizer(panelDoc.defaultView, 'div', {"class": "logRow-errorMessage"});
	
	    var filter = lookForLogRow.onRecognize(function recognize(el) {
	    	FBTest.progress("recognized error row: " + el);

	    	for each (var span in el.getElementsByTagName("span")) {
	    		if (hasClass(span, "objectBox-errorMessage")) {
	    			var objBox = span;
	    			break;
	    		}
	    	}
	    	
	    	if (objBox) {
		    	for each ( var img in objBox.getElementsByTagName("img")) {
		    		if (hasClass(img, "errorBreak")) {
		    			var errBP = img;
		    			break;
		    		}
		    	}
	    	}
	        
	        FBTest.progress("Found Breakpoint button: " + errBP);
	
	        // test unchecked
	        FBTest.ok(!hasClass(objBox, "breakForError"));
	        
	        FBTest.click(errBP);
	        setTimeout(function() {
	        	// test checked
	    		FBTest.ok(hasClass(objBox, "breakForError"));
	
		        FBTest.click(errBP);
		        setTimeout(function() {    	
	     			// test unchecked again
	        		FBTest.ok(!hasClass(objBox, "breakForError"));
	     		    FBTestFirebug.testDone();
		        });
	        });
	    });
	    FBTest.sysout("waiting for "+lookForLogRow.getDescription());

    });
}

