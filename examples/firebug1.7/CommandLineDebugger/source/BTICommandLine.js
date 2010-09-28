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
 * Supported commands:
 * <ul>
 * <li>connect [host] [port] - attaches to the specified Crossfire server</li>
 * <li>contexts - lists all known browser contexts</li>
 * <li>disconnect - disconnects from the Crossfire server</li>
 * </ul>
 * </p>
 * @constructor
 * @type BTICommandLine
 * @return a {@link BTICommandLine}
 * @version 1.0
 */
function BTICommandLine() {
	this.browser = null;
	importPackage(java.io);
	var stdin = new java.io.BufferedReader(new java.io.InputStreamReader(java.lang.System['in']));

	// read stdin buffer until EOF (or skip)
	var command = stdin.readLine();
	while(command){
		if (command) {
			var pieces = (new String(command)).split(" ");
			if (pieces[0] == "connect" && pieces.length == 3) {
				this.connect(pieces[1], pieces[2]);
			} else if (pieces[0] == "disconnect") {
				this.disconnect();
			} else if (pieces[0] == "contexts") {
				this.listcontexts();
			} else if (pieces[0] == "version") {
				this.version();
			} else if (pieces[0] == "scripts") {
				this.scripts();
			} else if (pieces[0] == "source") {
				// source N (where N is the 0-based script number to display source for)
				this.source(pieces[1]);
			} else if (pieces[0] == "break") {
				// break <line number> <script number> - sets a breakpoint
				this.setBreakpoint(pieces[1], pieces[2]);
			} else if (pieces[0] == "breakpoints") {
				this.listBreakpoints();
			} else if (pieces[0] == "clear") {
				// clear <line number> <script number> - clears a breakpoint
				this.clearBreakpoint(pieces[1], pieces[2]);
			}
		}
		command = stdin.readLine();
	}
	print("done");
}

/**
 * Lists compilation units in the active context.
 * 
 * @function
 */
BTICommandLine.prototype.scripts = function() {
	if (this.browser) {
		var curr = this.browser.getFocusBrowserContext();
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

BTICommandLine.prototype.connect = function(host, port) {
	if (this.browser) {
		this.disconnect();
	}
	this.browser = new CFBrowser(host, port);
	this.browser.connect();
	print("Connected to " + host + ":" + port);
};

BTICommandLine.prototype.disconnect = function() {
	if (this.browser) {
		this.browser.disconnect();
	}
};

BTICommandLine.prototype.version = function() {
	if (this.browser) {
		this.browser.version();
	}
};

/**
 * Returns the browser context that currently has focus or <code>null</code>
 * if none.
 * 
 * @returns the focus browser context or <code>null</code> if none
 */
BTICommandLine.prototype.getFocusContext = function() {
	if (this.browser) {
		return this.browser.getFocusBrowserContext();
	}
	return null;
};

BTICommandLine.prototype.listcontexts = function() {
	var active = this.getFocusContext(); 
	if (active) {
		var contexts = this.browser.getBrowserContexts();
		for ( var i = 0; i < contexts.length; i++) {
			var prefix = "";
			if (contexts[i] == active) {
				prefix = "*";
			}
			print(prefix + "{" + (i + 1) + "} [" + contexts[i].getId() + "] " + contexts[i].getURL());
		}
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
	var curr = this.getFocusContext();
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
BTICommandLine.prototype.setBreakpoint = function(lineNumber, scriptNumber) {
	var bc = this.getFocusContext();
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
BTICommandLine.prototype.clearBreakpoint = function(lineNumber, scriptNumber) {
	var bc = this.getFocusContext();
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
BTICommandLine.prototype.listBreakpoints = function() {
	var bc = this.getFocusContext();
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

new BTICommandLine();