Firefocus is a simple Firebug extension that tracks the element that currently
has focus. Its primary purpose is to assist the debugging of advanced keyboard
implementations without having to rely on platform specific tools such as MSAA
Inspect.

Features:
 - Logging of focus changes
 - Highlighting of the element with the current focus within the HTML panel

Usage:
Individual Firefocus components can be enabled or disabled through the Firefocus
options dialog (Accessible through the Firefox Add-ons dialog).
 - Log Focus: Log focus changes to the console.
 - Highlight Focus: Highlight the focus element in the HTML panel. This functionality
    is also linked to the HTML panel’s highlight changes options. The highlight behavior
    will change based on the HTML panel’s Highlight Changes, Expand Changes, and
    Scroll Changes into View options.
    
In a later version of Firebug the configuration of these parameters will be integrated into
the Firebug UI. (Progress on this issue is tracked under fbug issue 2443)

Dependencies:
Firefocus 1.2 requires Firebug 1.4 or higher.
