
var allTests = [];

window.log = function(msg)
{
    //window.dump(msg);
    if ((window.location.toString().indexOf("http") != -1) && window.console)
        window.console.log(msg);
    try {
        output.heading(msg);
    } catch (exc) {
    }
}
window.output  = {
    heading: function(prefix)
    {
       var result = document.getElementById('result');
       var h = document.createElement('li');
       h.innerHTML = prefix;
       h.setAttribute("class", "testHeader");
       result.appendChild(h);
       this.testResult = document.createElement('ol');
       result.appendChild(this.testResult);
    },

    report: function(expr, successMessage, failedMessage)
    {
        if (expr) window.dump(successMessage+"\n");
        else window.dump(failedMessage+"\n");
        var line = document.createElement('li');
        if (expr)
        {
            line.innerHTML = successMessage;
            line.setAttribute("class", "testPass");
        }
        else
        {
            line.innerHTML = failedMessage;
            line.setAttribute("class", "testFail");
        }
    
        this.testResult.appendChild(line);
    }
}
function runAllTests()
{
    try 
    {
        for (var i = 0; i < allTests.length; i++)
            allTests[i].call();
    }
    catch (exc)
    {
        window.dump("runAllTests failed: "+exc+"\n");
        for (var p in exc)
            window.dump("exc["+p+"]="+exc[p]+"\n");
    }
}
window.addEventListener('load', runAllTests, false);