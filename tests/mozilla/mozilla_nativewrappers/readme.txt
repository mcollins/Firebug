
* Testing Mozilla native wrappers

problem is noticed with FF 4 + fbug 1.7

you need to install the extension , and open the file within the extension "mozilla_nativewrappers.html"

result messages will be written to the Error Console and OS Console using the following mechanism:

    function sysout(msg) {
        Components.utils.reportError(msg);
        dump(msg + "\n");
    }


