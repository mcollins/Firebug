/**
 * Software License Agreement (BSD License)
 * 
 * Copyright (c) 2010 IBM Corporation.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 * 
 * * Neither the name of IBM nor the names of its
 *   contributors may be used to endorse or promote products
 *   derived from this software without specific prior
 *   written permission of IBM.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * An example command line debugger implementation for the browser tools interface that
 * connects to a Crossfire server.
 * <p>
 * Use 'help' to get a list of supported commands.
 * </p>
 * @constructor
 * @type BTICommandLine
 * @return a {@link BTICommandLine}
 * @version 1.0
 */
function BTICommandLine() {
	this.browser = null;
	this.activeContext = null;
	importPackage(java.io);
	var stdin = new java.io.BufferedReader(new java.io.InputStreamReader(java.lang.System['in']));

	// read stdin buffer until EOF (or skip)
	var command = stdin.readLine();
	while(command){
		if (command) {
			var pieces = (new String(command)).split(" ");
			var handler = this[pieces[0]];
			if (handler) {
				// call the function associated with the command
				handler.apply(this, pieces.slice(1));
			} else {
				print("Unknown command");
			}
		}
		command = stdin.readLine();
	}
	print("done");
}

/** 
 * Sets the active context via the 0-based index.
 * 
 * @function
 * @param index 0-based index into list of contexts.
 */
BTICommandLine.prototype.context = function(index) {
	if (this.browser) {
		var contexts = this.browser.getBrowserContexts();
		if (index > 0 && index <= contexts.length) {
			this.activeContext = contexts[index - 1];
			print("Active Context: " + this.activeContext.getURL());
		} else {
			print("Context number out of range");
		}
	} else {
		print("Not connected to a browser");
	}
};

/**
 * Lists compilation units in the active context.
 * 
 * @function
 */
BTICommandLine.prototype.scripts = function() {
	if (this.browser) {
		var curr = this.getActiveContext();
		if (curr) {
			var units = curr.getCompilationUnits(function(units){
				if (units.length == 0) {
					print("No scripts loaded");
				} else {
					for ( var i = 0; i < units.length; i++) {
						var unit = units[i];
						print("{" + i + "} " + unit.getURL());
					}
				}
			});
			return;
		}
	}
	print("No active context");
};

/**
 * Connects to a remote browser at the specified host and port.
 * 
 * @function
 * @param host
 * @param port
 */
BTICommandLine.prototype.connect = function(host, port) {
	if (this.browser) {
		this.disconnect();
	}
	this.browser = new CFBrowser(host, port);
	this.browser.connect();
	print("Connected to " + host + ":" + port);
};

/**
 * Disconnects from the remote browser.
 * 
 * @function
 */
BTICommandLine.prototype.disconnect = function() {
	if (this.browser) {
		this.browser.disconnect();
	}
};

/**
 * Displays the Crossfire version.
 * 
 * @function
 */
BTICommandLine.prototype.version = function() {
	if (this.browser) {
		this.browser.version();
	}
};

/**
 * Returns the browser context that commands are directed at or <code>null</code>
 * if none.
 * 
 * @returns the active browser context or <code>null</code> if none
 */
BTICommandLine.prototype.getActiveContext = function() {
	if (this.browser) {
		return this.activeContext;
	}
	return null;
};

/**
 * Lists known contexts.
 * 
 * @function
 */
BTICommandLine.prototype.contexts = function() {
	var active = this.getActiveContext(); 
	var contexts = this.browser.getBrowserContexts();
	for ( var i = 0; i < contexts.length; i++) {
		var prefix = "";
		if (contexts[i] == active) {
			prefix = "*";
		}
		print(prefix + "{" + (i + 1) + "} [" + contexts[i].getId() + "] " + contexts[i].getURL());
	}
};

/**
 * Retrieves the source for the script in the focus context as specified
 * by the script number.
 * 
 * @function
 * @param scriptNumber
 */
BTICommandLine.prototype.source = function(scriptNumber) {
	var curr = this.getActiveContext();
	if (curr) {
		var units = curr.getCompilationUnits(function(units){
			if (units.length == 0) {
				print("No scripts loaded");
			} else {
				if (scriptNumber < units.length && scriptNumber >= 0) {
					units[scriptNumber].getSource(function(source) {
						print(source);
					});
				} else {
					print("Script number not in valid range");
				}
			}
		});
		return;
	}
	print("No active context");
};

/**
 * Sets a breakpoint at the specified line of the specified script.
 * 
 * @param lineNumber
 * @param scriptNumber
 * @function
 */
BTICommandLine.prototype.breakpoint = function(lineNumber, scriptNumber) {
	var bc = this.getActiveContext();
	if (bc) {
		bc.getCompilationUnits(function(cus){
			if (scriptNumber < cus.length) {
				cus[scriptNumber].setBreakpoint(lineNumber);
			} else {
				print("script number out of range");
			}
		});
	} else {
		print("No active context");
	}
};

/**
 * Clears a breakpoint at the specified line of the specified script.
 * 
 * @param lineNumber
 * @param scriptNumber
 * @function
 */
BTICommandLine.prototype.clear = function(lineNumber, scriptNumber) {
	var bc = this.getActiveContext();
	if (bc) {
		bc.getCompilationUnits(function(cus){
			if (scriptNumber < cus.length) {
				var bps = cus[scriptNumber].getBreakpoints();
				for ( var i = 0; i < bps.length; i++) {
					var bp = bps[i];
					if (bp.getLineNumber() == lineNumber) {
						bp.clear();
						return;
					}
				}
				print("no breakpoint on line " + lineNumber);
			} else {
				print("script number out of range");
			}
		});
	} else {
		print("No active context");
	}
};

/**
 * Lists all breakpoints in the focus context.
 * 
 * @function
 */
BTICommandLine.prototype.breakpoints = function() {
	var bc = this.getActiveContext();
	if (bc) {
		bc.getCompilationUnits(function(cus){
			for ( var i = 0; i < cus.length; i++) {
				var cu = cus[i];
				var breakpoints=cu.getBreakpoints();
				for ( var j = 0; j < breakpoints.length; j++) {
					var bp = breakpoints[j];
					var text = "";
					if (bp.isInstalled()) {
						text += "[installed]";
					}
					text += "[line: " + bp.getLineNumber() + "] ";
					text += cu.getURL();
					print(text);
				}
			}
		});
	} else {
		print("No active context");
	}
};

/**
 * Sends the 'continue' Crossfire command to resume execution.
 * 
 * @function
 */
BTICommandLine.prototype.resume = function() {
	var context = this.getActiveContext();
	if (context) {
		var js = context.getJavaScriptContext();
		if (js) {
			if (js.isSuspended()) {
				js.resume();
			} else {
				print("JavaScript context is already running");
			}
		} else {
			print("No JavaScript context available");
		}
		
	} else {
		print("No active context");
	}
};

/**
 * Lists known commands.
 * 
 * @function
 */
BTICommandLine.prototype.help = function() {
	print("breakpoint [1-based line number] [0-based script number]");
	print("breakpoints");
	print("clear [1-based line number] [0-based script number]");
	print("connect [host] [port]");
	print("context [1-based context number]");
	print("contexts");
	print("disconnect");
	print("resume");
	print("scripts");
	print("source [0-based script number]");
	print("version");
};

new BTICommandLine();