/* See license.txt for terms of usage */

/* This code runs in the Firebug panel browser */

/* Create the editor:
        - parent is the containing div element
        - readonly by default, but can specify class="writable"
        - use the given stylesheet  */
try
{
    window.orion = {};
    orion.parent = document.getElementsByClassName('orionEditor')[0];

    orion.editor = new eclipse.Editor({
        parent: orion.parent,
        readonly: false,
        stylesheet: "http://download.eclipse.org/e4/orion/js/org.eclipse.orion.client.editor/editor.css"
    });

    // use javascript styler for now, there is no html/xml syntax highlighting yet
    orion.styler = new eclipse.TextStyler(orion.editor, "js");
    // add a ruler with line numbers to the left side
   // orion.lines = new eclipse.LineNumberRuler("left", {styleClass: "ruler_lines"}, {styleClass: "ruler_lines_odd"}, {styleClass: "ruler_lines_even"});

  //  orion.editor.addRuler(orion.lines);


    orion.parent.addEventListener('orionEdit', function updateText(event)
    {
        var text = orion.editText;  // set by firebug
        window.dump("orion text "+text+"\n");
        try
        {
            orion.editor.setText(text);
            //fix the height of the containing div
            orion.parent.style.height = (orion.editor.getLineHeight() * (orion.editor.getModel().getLineCount() + 1)) + 2 + 'px';

            window.FBTrace.sysout("orion.editor.setText ", orion.editor);
        }
        catch(exc)
        {
            window.dump("orion.editor.setText ERROR "+exc+"\n");
            window.FBTrace("orion.editor.setText ERROR "+exc, exc);
        }
    }, true);

    window.dump("orionEditor "+orion.parent+"\n");
}
catch (exc)
{
    window.dump("orion ERROR "+exc+"\n");
}