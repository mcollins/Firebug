Command Line Debugger Example README

This folder contains JavaScript source for an example JavaScript command line debugger
that communicates via Crossfire with a Firefox browser. The code is based on version 0.3
of Crossfire. The code serves as an example implementation of the proposed JavaScript
"Browser Tools Interface", being developed in Firebug 1.7
(https://fbug.googlecode.com/svn/firebug1.7/content/firebug/interface).

The command line debugger runs in Rhino. Run the "BTICommandLine.js" file. The code is
being developed using Eclipse JSDT and the associated project folder is:
	https://fbug.googlecode.com/svn/examples/firebug1.7/CommandLineDebugger

To run the example, you need an implementation of JSON.stringify(...) and JSON.parse(...).
These are not provided with the source, so those wanting to run the code will need to
use their favorite implementation.