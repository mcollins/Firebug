/* See license.txt for terms of usage */

// ************************************************************************************************
// Command Line Implementation

var TraceCommandLine =
{
    currentWindow: null,

    toggleCommandLine: function()
    {
        var splitter = document.getElementById("fbTraceSplitter");
        var commandLine = document.getElementById("fbTraceCommandLine");

        // Toggle visibility of the command line.
        var shouldShow = FBL.isCollapsed(splitter);
        FBL.collapse(splitter, !shouldShow);
        FBL.collapse(commandLine, !shouldShow);

        // Update menu item.
        var showCommandLine = document.getElementById("showCommandLine");
        showCommandLine.setAttribute("checked", shouldShow);

        // Select the first browser window by default.
        if (!this.currentWindow)
        {
            var self = this;
            FBL.iterateBrowserWindows("navigator:browser", function(win)
            {
                return self.currentWindow = win;
            });
        }

        this.updateLabel()
    },

    onContextMenuShowing: function(popup)
    {
        // Collect all browser windows with Firebug.
        var windows = [];
        FBL.iterateBrowserWindows("navigator:browser", function(win)
        {
            windows.push(win);
        });

        // Populate the menu with entries.
        for (var i=0; i<windows.length; ++i)
        {
            var win = windows[i];
            var item = {
                nol10n: true,
                label: win.document.title,
                type: "radio",
                checked: this.currentWindow == win,
                command: FBL.bindFixed(this.selectContext, this, win)
            };
            FBL.createMenuItem(popup, item);
        }
    },

    selectContext: function(win)
    {
        this.currentWindow = win;
    },

    updateLabel: function()
    {
        if (!this.currentWindow)
            return;

        var button = document.getElementById("cmdLineContext");
        button.setAttribute("label", "in:   " + this.currentWindow.document.title + " ");
    },

    onContextMenuHidden: function(popup)
    {
        while (popup.childNodes.length > 0)
            popup.removeChild(popup.lastChild);
    },

    evaluate: function()
    {
        if (!this.currentWindow)
        {
            FBTrace.sysout("ERROR: You need to select target browser window!");
            return;
        }

        try
        {
            var scriptBox = document.getElementById("fbTraceScriptBox");
            var result = this.currentWindow.eval(scriptBox.value);
            FBTrace.sysout("Result: " + result, result);
        }
        catch (exc)
        {
            FBTrace.sysout("EXCEPTION " + exc, exc);
        }
    }
};

// ************************************************************************************************
