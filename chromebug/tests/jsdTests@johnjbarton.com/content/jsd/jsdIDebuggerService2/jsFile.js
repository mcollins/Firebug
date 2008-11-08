function jsFile_Step()
{
    return true;
}
function jsFile()
{
    jsFile_Step(); // set breakpoint on this line
    jsFile_Step();
}
jsFile();