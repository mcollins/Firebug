/* See license.txt for terms of usage */

/* This code runs in the Firebug panel browser */

/* Create the editor:
        - parent is the containing div element
        - readonly by default, but can specify class="writable"
        - use the given stylesheet  */
try
{
    window.orion = {};

    var orionInPanel = document.getElementById('orionInPanel');
    orionInPanel.addEventListener('orionEdit', function updateText(event)
    {
        try
        {
            orion.parent = document.getElementsByClassName('panelNode-orion')[0];

            orion.editor = new eclipse.Editor({
                parent: orion.parent,
                readonly: false,
                stylesheet: "http://download.eclipse.org/e4/orion/js/org.eclipse.orion.client.editor/editor.css"
            });

            // use javascript styler for now, there is no html/xml syntax highlighting yet
            orion.styler = new eclipse.TextStyler(orion.editor, "js");
            // add a ruler with line numbers to the left side
            orion.lines = new eclipse.LineNumberRuler("left", {styleClass: "ruler_lines"}, {styleClass: "ruler_lines_odd"}, {styleClass: "ruler_lines_even"});

            orion.editor.addRuler(orion.lines);

            var text = orion.editText;  // set by firebug
            orion.editor.setText(text);
            window.FBTrace.sysout("orionInPanel.orion.editor.setText ", orion.editor);
        }
        catch(exc)
        {
            orion.error = exc;
            orion.dispatch("orionError", orionInPanel);
            window.dump("orion.editor.setText ERROR "+exc+"\n");
            window.FBTrace("orion.editor.setText ERROR "+exc, exc);
        }
    }, true);

    orion.dispatch = function(eventName, elt)
    {
         var ev = elt.ownerDocument.createEvent("Events");
         ev.initEvent(eventName, true, false);
         window.FBTrace.sysout("orionInPanel.orion.dispatch "+eventName);
         elt.dispatchEvent(ev);
    },
    orion.dispatch("orionReady", orionInPanel);

    window.FBTrace.sysout("orionInPanel outer function ends", {orion: orion, orionInPanel: orionInPanel});
}
catch (exc)
{
    window.dump("orion ERROR "+exc+"\n");
}